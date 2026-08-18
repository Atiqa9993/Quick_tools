"""
run.py
======
Production Uvicorn runner for QuickTools API.
Run with: python run.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:application",
        host="127.0.0.1",
        port=8000,
        reload=False,
        workers=1,         # Single worker — rembg global session is not fork-safe
        log_level="info",
        access_log=True,
    )
