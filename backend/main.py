"""
QuickTools API - Main Entry Point Wrapper
Forwards to app.main:application for backwards compatibility.
"""
import uvicorn
from app.main import application as app

if __name__ == "__main__":
    uvicorn.run("app.main:application", host="127.0.0.1", port=8000, reload=False)
