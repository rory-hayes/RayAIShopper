#!/usr/bin/env python3
"""
Test script to verify backend setup and dependencies.

Usage:
    python scripts/test_setup.py
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def test_package_imports():
    """Test that all required packages can be imported"""
    print("Testing package imports...")
    
    # Test core imports
    try:
        import fastapi
        import pydantic
        import uvicorn
        import openai
        import httpx
        import python_dotenv
        print("Core packages: OK")
    except ImportError as e:
        print(f"Missing core package: {e}")
        return False
    
    # Test optional packages
    try:
        import pandas
        print("Optional pandas: OK")
    except ImportError:
        print("WARNING: pandas not available - using lightweight mode")
    
    try:
        import numpy
        print("Optional numpy: OK")
    except ImportError:
        print("WARNING: numpy not available - using lightweight mode")
    
    try:
        import faiss
        print("Optional FAISS: OK")
    except ImportError:
        print("WARNING: FAISS not available - using lightweight similarity")
    
    return True

def test_app_imports():
    """Test that app modules can be imported"""
    print("\nTesting app module imports...")
    
    try:
        from app.config import settings
        print("Settings: OK")
    except ImportError as e:
        print(f"Settings import failed: {e}")
        return False
    
    try:
        from app.services.similarity_service import LightweightSimilarityService
        print("Similarity service: OK")
    except ImportError as e:
        print(f"Similarity service import failed: {e}")
        return False
    
    try:
        from app.utils.embeddings import EmbeddingGenerator
        print("Embedding generator: OK")
    except ImportError as e:
        print(f"Embedding generator import failed: {e}")
        return False
    
    try:
        from app.main import app
        print("FastAPI app: OK")
    except ImportError as e:
        print(f"FastAPI app import failed: {e}")
        return False
    
    return True

def test_data_files():
    """Test data file availability"""
    print("\nTesting data files...")
    
    from app.config import settings
    
    # Test CSV file
    try:
        import csv
        with open(settings.styles_csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            sample_rows = list(csv_reader)[:5]
            print(f"Sample styles CSV: OK ({len(sample_rows)} sample rows)")
    except FileNotFoundError:
        print(f"WARNING: Sample styles CSV not found: {settings.styles_csv_path}")
    except Exception as e:
        print(f"WARNING: Could not read CSV: {e}")
    
    # Test FAISS index (optional)
    try:
        import faiss
        index = faiss.read_index(settings.faiss_index_path)
        print(f"FAISS index: OK ({index.ntotal} vectors)")
    except FileNotFoundError:
        print(f"WARNING: FAISS index not found: {settings.faiss_index_path}")
    except ImportError:
        print("INFO: FAISS not available - using lightweight similarity")
    except Exception as e:
        print(f"WARNING: Could not load FAISS index: {e}")

def test_openai_connection():
    """Test OpenAI API connection"""
    print("\nTesting OpenAI API connection...")
    
    from app.config import settings
    
    if not settings.openai_api_key:
        print("WARNING: OpenAI API key not configured")
        return False
    
    try:
        import openai
        client = openai.OpenAI(api_key=settings.openai_api_key)
        
        # Test with a simple embedding request
        response = client.embeddings.create(
            input="test",
            model="text-embedding-ada-002"
        )
        
        if response.data and len(response.data) > 0:
            print("OpenAI API: OK")
            return True
        else:
            print("WARNING: OpenAI API returned empty response")
            return False
            
    except Exception as e:
        print(f"WARNING: OpenAI API test failed: {e}")
        return False

def run_all_tests():
    """Run all setup tests"""
    print("Ray AI Shopper Backend Setup Test\n")
    print("=" * 50)
    
    results = {
        'packages': test_package_imports(),
        'app_modules': test_app_imports(),
        'openai': test_openai_connection()
    }
    
    # Data files test (non-critical)
    test_data_files()
    
    # Summary
    print("Test Summary:")
    print("-" * 20)
    
    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\nAll tests passed! Your backend setup is ready.")
        print("You can now run: python start.py")
        return True
    else:
        print("\nSome tests failed. Please check the errors above.")
        print("The backend may still work in degraded mode.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1) 