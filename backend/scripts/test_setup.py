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

def test_imports():
    """Test that all required packages can be imported"""
    print("🔍 Testing package imports...")
    
    try:
        import fastapi
        print(f"✅ FastAPI {fastapi.__version__}")
    except ImportError as e:
        print(f"❌ FastAPI import failed: {e}")
        return False
    
    try:
        import openai
        print(f"✅ OpenAI {openai.__version__}")
    except ImportError as e:
        print(f"❌ OpenAI import failed: {e}")
        return False
    
    try:
        import faiss
        print(f"✅ FAISS")
    except ImportError as e:
        print(f"❌ FAISS import failed: {e}")
        return False
    
    try:
        import pandas as pd
        print(f"✅ Pandas {pd.__version__}")
    except ImportError as e:
        print(f"❌ Pandas import failed: {e}")
        return False
    
    try:
        import numpy as np
        print(f"✅ NumPy {np.__version__}")
    except ImportError as e:
        print(f"❌ NumPy import failed: {e}")
        return False
    
    return True

def test_app_imports():
    """Test that app modules can be imported"""
    print("\n🔍 Testing app module imports...")
    
    try:
        from app.config import settings
        print(f"✅ App config loaded")
        print(f"   - GPT Model: {settings.gpt_model}")
        print(f"   - Embedding Model: {settings.embedding_model}")
        print(f"   - Environment: {settings.environment}")
    except ImportError as e:
        print(f"❌ App config import failed: {e}")
        return False
    
    try:
        from app.services.openai_service import OpenAIService
        print(f"✅ OpenAI service")
    except ImportError as e:
        print(f"❌ OpenAI service import failed: {e}")
        return False
    
    try:
        from app.services.vector_service import VectorSearchService
        print(f"✅ Vector search service")
    except ImportError as e:
        print(f"❌ Vector search service import failed: {e}")
        return False
    
    try:
        from app.services.recommendation_service import RecommendationService
        print(f"✅ Recommendation service")
    except ImportError as e:
        print(f"❌ Recommendation service import failed: {e}")
        return False
    
    return True

def test_data_files():
    """Test that required data files exist"""
    print("\n🔍 Testing data files...")
    
    from app.config import settings
    
    # Check if sample data exists
    if os.path.exists(settings.styles_csv_path):
        print(f"✅ Sample styles CSV found: {settings.styles_csv_path}")
        
        # Check file size
        import pandas as pd
        try:
            df = pd.read_csv(settings.styles_csv_path)
            print(f"   - Contains {len(df)} products")
            print(f"   - Columns: {list(df.columns)}")
        except Exception as e:
            print(f"⚠️  Could not read CSV: {e}")
    else:
        print(f"⚠️  Sample styles CSV not found: {settings.styles_csv_path}")
        print("   Run the embedding generation script after adding the data file")
    
    # Check if embeddings exist
    if os.path.exists(settings.faiss_index_path):
        print(f"✅ FAISS index found: {settings.faiss_index_path}")
    else:
        print(f"⚠️  FAISS index not found: {settings.faiss_index_path}")
        print("   Run: python scripts/generate_embeddings.py")
    
    return True

def test_openai_connection():
    """Test OpenAI API connection (optional)"""
    print("\n🔍 Testing OpenAI API connection...")
    
    try:
        from app.config import settings
        
        if not settings.openai_api_key or settings.openai_api_key == "your-api-key-here":
            print("⚠️  OpenAI API key not configured")
            print("   Update the API key in app/config.py")
            return False
        
        # Test a simple API call
        import asyncio
        from app.services.openai_service import OpenAIService
        
        async def test_api():
            service = OpenAIService()
            try:
                # Test embedding generation with a simple text
                embedding = await service.get_query_embedding("test query")
                if embedding and len(embedding) > 0:
                    print(f"✅ OpenAI API connection successful")
                    print(f"   - Embedding dimension: {len(embedding)}")
                    return True
                else:
                    print("❌ OpenAI API returned empty embedding")
                    return False
            except Exception as e:
                print(f"❌ OpenAI API connection failed: {e}")
                return False
        
        return asyncio.run(test_api())
        
    except Exception as e:
        print(f"❌ OpenAI connection test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Ray AI Shopper Backend Setup Test\n")
    
    tests = [
        ("Package Imports", test_imports),
        ("App Module Imports", test_app_imports),
        ("Data Files", test_data_files),
        ("OpenAI Connection", test_openai_connection),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*50)
    print("📊 Test Summary:")
    print("="*50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nPassed: {passed}/{len(results)} tests")
    
    if passed == len(results):
        print("\n🎉 All tests passed! Your backend setup is ready.")
        print("\nNext steps:")
        print("1. Generate embeddings: python scripts/generate_embeddings.py")
        print("2. Start the server: python -m uvicorn app.main:app --reload")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 