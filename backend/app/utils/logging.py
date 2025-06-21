import logging
import sys
from typing import Optional
from app.config import settings

def setup_logging(level: Optional[str] = None) -> None:
    """
    Setup logging configuration for the application
    """
    log_level = level or settings.log_level
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),  # Console output
        ]
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    # Create application-specific loggers
    get_logger("openai_service")
    get_logger("vector_service")
    get_logger("recommendation_service")
    get_logger("api")

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for the given name
    """
    return logging.getLogger(name) 