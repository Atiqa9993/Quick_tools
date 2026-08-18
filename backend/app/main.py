"""
app/main.py
===========
FastAPI application entry point.
- Registers all routers
- Configures CORS
- Runs lifespan startup (loads ML singletons)
- Health check endpoints
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai_tools    import router as ai_router
from app.api.image_tools import router as image_router
from app.api.pdf_tools   import router as pdf_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: warm up ML model singletons so the first real request is instant.
    ml_sessions.py already initialises REMBG_SESSION at import time.
    TrOCR is lazy-loaded on demand.
    """
    import app.utils.ml_sessions  # noqa: F401 — triggers REMBG + Tesseract init
    print("=" * 60)
    print("  QuickTools API — Ready")
    print("  Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)
    yield
    # Shutdown cleanup (if needed in future)


# ── App factory ────────────────────────────────────────────────────────────────
application = FastAPI(
    title="QuickTools API",
    version="2.0.0",
    description="High-performance image & PDF processing backend.",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
application.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
application.include_router(pdf_router)
application.include_router(image_router)
application.include_router(ai_router)


# ── Health endpoints ───────────────────────────────────────────────────────────
@application.get("/")
def root():
    return {"message": "QuickTools API v2.0 — operational"}


@application.get("/api/health")
def health():
    return {"status": "ok", "service": "QuickTools API", "version": "2.0.0"}
