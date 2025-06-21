import os
import csv
from fastapi import APIRouter, HTTPException
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.get("/debug/data")
async def debug_data_status():
    """
    Debug endpoint to check data loading status
    """
    try:
        debug_info = {
            "current_working_directory": os.getcwd(),
            "data_directory_exists": os.path.exists(settings.data_dir),
            "csv_file_exists": os.path.exists(settings.styles_csv_path),
            "csv_file_path": settings.styles_csv_path,
            "data_dir_path": settings.data_dir,
            "directory_contents": []
        }
        
        # List contents of current directory
        try:
            debug_info["current_directory_contents"] = os.listdir(".")
        except Exception as e:
            debug_info["current_directory_error"] = str(e)
        
        # List contents of data directory if it exists
        if os.path.exists(settings.data_dir):
            try:
                debug_info["data_directory_contents"] = os.listdir(settings.data_dir)
            except Exception as e:
                debug_info["data_directory_error"] = str(e)
        
        # Try alternative CSV paths
        alternative_paths = [
            "backend/data/sample_styles.csv",
            "../data/sample_styles.csv", 
            "./data/sample_styles.csv",
            "sample_styles.csv",
            "data/sample_styles.csv"
        ]
        
        debug_info["alternative_csv_paths"] = {}
        for path in alternative_paths:
            debug_info["alternative_csv_paths"][path] = os.path.exists(path)
        
        # If CSV exists, get basic info
        csv_path = None
        if os.path.exists(settings.styles_csv_path):
            csv_path = settings.styles_csv_path
        else:
            # Try alternatives
            for alt_path in alternative_paths:
                if os.path.exists(alt_path):
                    csv_path = alt_path
                    break
        
        if csv_path:
            try:
                with open(csv_path, 'r', encoding='utf-8') as file:
                    csv_reader = csv.DictReader(file)
                    first_row = next(csv_reader, None)
                    
                    # Count total rows
                    file.seek(0)
                    row_count = sum(1 for _ in csv_reader) - 1  # Subtract header
                    
                    debug_info["csv_info"] = {
                        "path_used": csv_path,
                        "row_count": row_count,
                        "columns": list(first_row.keys()) if first_row else [],
                        "first_row_sample": first_row
                    }
            except Exception as e:
                debug_info["csv_error"] = str(e)
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Debug endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/env")
async def debug_environment():
    """
    Debug endpoint to check environment variables
    """
    try:
        return {
            "environment": settings.environment,
            "data_dir": settings.data_dir,
            "styles_csv_path": settings.styles_csv_path,
            "has_openai_api_key": bool(settings.openai_api_key),
            "openai_api_key_length": len(settings.openai_api_key) if settings.openai_api_key else 0,
            "gpt_model": settings.gpt_model,
            "embedding_model": settings.embedding_model,
            "cors_origins": settings.cors_origins
        }
    except Exception as e:
        logger.error(f"Debug env endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 