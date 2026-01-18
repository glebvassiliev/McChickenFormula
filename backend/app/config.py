"""
Configuration settings for F1 Strategy ML Platform
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # API Keys
    gemini_api_key: Optional[str] = None
    
    # OpenF1 API
    openf1_base_url: str = "https://api.openf1.org/v1"

    # FastF1
    fastf1_cache_dir: str = "./data/fastf1_cache"
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./f1_strategy.db"
    
    # Redis (optional caching)
    redis_url: Optional[str] = None
    
    # Model paths
    models_dir: str = "./models"
    data_dir: str = "./data"
    
    # App settings
    debug: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
