from langchain.tools import tool
import requests
from bs4 import BeautifulSoup
from tavily import TavilyClient
import os
from rich import print
from dotenv import load_dotenv

load_dotenv()
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
@tool
def websearch(query:str)->str:
    """Search the web for recent and reliable information on a topic. Returns Tiles,URLs and snippets"""

    response = tavily.search(query=query,max_results=5)

    out=[]
    for r in response['results']:
        out.append(
            f"TITLE:{r['title']}\nURL: {r['url']}\nSUMMARY: {r['content'][:300]}\n"
        )
    return "\n---\n".join(out)   
@tool
def scrape_url(url:str)->str:
    """ scrape and return clean text content from the given url for deeper reading."""
    try:
        resp=requests.get(url,timeout=8,headers={"User-Agent":"Mozilla/5.0"})
        soup = BeautifulSoup(resp.text,"html.parser")
        for tag in soup(['script','style','nav','footer']):
            tag.decompose()
        return soup.get_text(separator=" ",strip=True)
    except Exception as e:
        return f"could not scrape url :{str(e)}"
  
        


