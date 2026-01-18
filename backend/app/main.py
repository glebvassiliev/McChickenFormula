"""
F1 Strategy ML Platform - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import telemetry, strategy, chatbot, models, sessions
from app.services.openf1_client import OpenF1Client
from app.services.fastf1_client import FastF1Client
from app.services.model_manager import ModelManager
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🏎️ Starting F1 Strategy ML Platform...")
    
    # Initialize OpenF1 client
    app.state.openf1_client = OpenF1Client()
    app.state.fastf1_client = FastF1Client()
    
    # Initialize model manager and load models
    app.state.model_manager = ModelManager()
    await app.state.model_manager.initialize()
    
    logger.info("✅ F1 Strategy Platform ready!")
    yield
    
    # Cleanup
    logger.info("🏁 Shutting down F1 Strategy Platform...")


app = FastAPI(
    title="F1 Strategy ML Platform",
    description="Machine Learning powered Formula 1 strategy analysis and predictions",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Telemetry"])
app.include_router(strategy.router, prefix="/api/strategy", tags=["Strategy"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])
app.include_router(models.router, prefix="/api/models", tags=["ML Models"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])


@app.get("/")
async def root():
    return {
        "message": "F1 Strategy ML Platform",
        "version": "1.0.0",
        "endpoints": {
            "telemetry": "/api/telemetry",
            "strategy": "/api/strategy",
            "chatbot": "/api/chatbot",
            "models": "/api/models",
            "sessions": "/api/sessions",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "f1-strategy-ml"}
