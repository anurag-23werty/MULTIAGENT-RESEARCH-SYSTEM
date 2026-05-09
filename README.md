# Multi-Agent Research System

ResearchMind is a multi-agent research app with:

- a FastAPI backend for deployment
- an interactive browser frontend
- the original Streamlit UI in `app.py`
- LangChain agents for search, reading, writing, and critique

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add your real keys to `.env`:

```bash
MISTRAL_API_KEY=...
TAVILY_API_KEY=...
```

Start the deployable web app:

```bash
uvicorn backend:app --reload
```

Open `http://127.0.0.1:8000`.

## Optional Streamlit app

```bash
streamlit run app.py
```

## Deploy on Render

1. Push this repo to GitHub.
2. In Render, create a new Web Service from the repository.
3. Use these settings:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn backend:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `MISTRAL_API_KEY`
   - `TAVILY_API_KEY`
   - `CORS_ORIGINS=*`
5. Deploy and open the Render URL.

The included `render.yaml` can also be used as a Render Blueprint.
