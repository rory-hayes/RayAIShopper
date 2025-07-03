import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    gpt_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-large"
    embedding_cost_per_1k_tokens: float = 0.00013
    
    # Application Configuration
    environment: str = os.getenv("ENVIRONMENT", "production")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    # External URLs
    github_images_base_url: str = "https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/data/sample_clothes/sample_images"
    
    # Data Configuration (Vercel deployment paths)
    data_dir: str = "data"
    styles_csv_path: str = "data/sample_styles.csv"
    embeddings_csv_path: str = "data/sample_styles_with_embeddings.csv"
    faiss_index_path: str = "data/clothing.index"
    metadata_path: str = "data/metadata.pkl"
    store_location_path: str = "data/storeLocationMap.json"
    
    # Vector Search Configuration
    similarity_threshold: float = 0.7
    max_search_results: int = 100
    default_top_k: int = 20
    
    # API Configuration
    api_prefix: str = "/api/v1"
    cors_origins: list = ["*"]  # Update for production
    
    # Feature flags
    enable_complete_the_look: bool = Field(
        default=False,  # Start disabled for safety
        env="ENABLE_COMPLETE_THE_LOOK",
        description="Enable complete the look feature"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings() 