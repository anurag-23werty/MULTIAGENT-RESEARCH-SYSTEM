const form = document.querySelector("#researchForm");
const topicInput = document.querySelector("#topic");
const runButton = document.querySelector("#runButton");
const message = document.querySelector("#message");
const statusPill = document.querySelector("#apiStatus");
const resultsSection = document.querySelector("#results");
const resultTitle = document.querySelector("#resultTitle");
const reportPanel = document.querySelector("#reportPanel");
const feedbackPanel = document.querySelector("#feedbackPanel");
const sourcesPanel = document.querySelector("#sourcesPanel");
const rawPanel = document.querySelector("#rawPanel");
const copyButton = document.querySelector("#copyButton");
const downloadButton = document.querySelector("#downloadButton");

let latestReport = "";
let latestTopic = "research-report";
let progressTimer = null;

const steps = ["search", "reader", "writer", "critic"];

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function setStepState(activeIndex, doneAll = false) {
  document.querySelectorAll(".step").forEach((step, index) => {
    step.classList.remove("active", "done");
    const label = step.querySelector("small");

    if (doneAll || index < activeIndex) {
      step.classList.add("done");
      label.textContent = "Done";
    } else if (index === activeIndex) {
      step.classList.add("active");
      label.textContent = "Running";
    } else {
      label.textContent = "Waiting";
    }
  });
}

function startProgress() {
  let active = 0;
  setStepState(active);
  progressTimer = window.setInterval(() => {
    active = Math.min(active + 1, steps.length - 1);
    setStepState(active);
  }, 4500);
}

function stopProgress(doneAll = false) {
  window.clearInterval(progressTimer);
  progressTimer = null;
  setStepState(doneAll ? steps.length : -1, doneAll);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMarkdown(value) {
  if (window.marked) {
    return marked.parse(value || "");
  }
  return `<pre>${escapeHtml(value || "")}</pre>`;
}

function extractSources(text) {
  const urls = new Set(String(text || "").match(/https?:\/\/[^\s)]+/g) || []);
  return [...urls].map((url) => url.replace(/[.,;]+$/, ""));
}

function showResults(topic, payload) {
  const { results, duration_seconds: durationSeconds } = payload;
  latestTopic = topic;
  latestReport = results.report || results.writer || "";

  resultTitle.textContent = topic;
  reportPanel.innerHTML = renderMarkdown(latestReport);
  feedbackPanel.innerHTML = renderMarkdown(results.feedback || results.critic || "");

  const sources = extractSources(`${results.search_results || ""}\n${latestReport}`);
  sourcesPanel.innerHTML = sources.length
    ? `<ol class="source-list">${sources
        .map((url) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a></li>`)
        .join("")}</ol>`
    : "<p>No source URLs were returned by the pipeline.</p>";

  rawPanel.innerHTML = `<pre>${escapeHtml(JSON.stringify(results, null, 2))}</pre>`;
  resultsSection.hidden = false;
  setMessage(`Completed in ${durationSeconds}s.`);
}

async function checkApi() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("API failed");
    statusPill.classList.add("ok");
    statusPill.classList.remove("error");
    statusPill.lastChild.textContent = " API online";
  } catch {
    statusPill.classList.add("error");
    statusPill.classList.remove("ok");
    statusPill.lastChild.textContent = " API offline";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const topic = topicInput.value.trim();
  if (!topic) {
    setMessage("Please enter a research topic.", true);
    return;
  }

  runButton.disabled = true;
  runButton.querySelector("span").textContent = "Running";
  setMessage("Research pipeline is running. This can take a minute.");
  resultsSection.hidden = true;
  startProgress();

  try {
    const response = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Research failed.");
    }
    stopProgress(true);
    showResults(topic, payload);
  } catch (error) {
    stopProgress(false);
    setMessage(error.message, true);
  } finally {
    runButton.disabled = false;
    runButton.querySelector("span").textContent = "Run";
  }
});

document.querySelectorAll("[data-topic]").forEach((button) => {
  button.addEventListener("click", () => {
    topicInput.value = button.dataset.topic;
    topicInput.focus();
  });
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.panel}Panel`).classList.add("active");
  });
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(latestReport);
  setMessage("Report copied to clipboard.");
});

downloadButton.addEventListener("click", () => {
  const blob = new Blob([latestReport], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${latestTopic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
  link.click();
  URL.revokeObjectURL(link.href);
});

checkApi();
