#!/usr/bin/env python3
"""
Ray AI Shopper Backend Startup Script

This script handles the complete setup and startup process:
1. Tests the setup
2. Generates embeddings if needed
3. Starts the FastAPI server

Usage:
    python start.py [--skip-embeddings] [--port 8000]
"""

import sys
import os
import argparse
import asyncio
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    parser = argparse.ArgumentParser(description="Ray AI Shopper Backend Startup")
    parser.add_argument("--skip-embeddings", action="store_true", 
                       help="Skip embedding generation")
    parser.add_argument("--port", type=int, default=8000, 
                       help="Port to run the server on")
    parser.add_argument("--skip-tests", action="store_true",
                       help="Skip setup tests")
    
    args = parser.parse_args()
    
    print("🚀 Ray AI Shopper Backend Startup")
    print("=" * 50)
    
    # Step 1: Run setup tests
    if not args.skip_tests:
        print("\n📋 Step 1: Running setup tests...")
        try:
            from scripts.test_setup import main as test_main
            if not test_main():
                print("❌ Setup tests failed. Please fix the issues above.")
                return False
        except Exception as e:
            print(f"❌ Setup test failed: {e}")
            return False
    
    # Step 2: Generate embeddings if needed
    if not args.skip_embeddings:
        print("\n📋 Step 2: Checking embeddings...")
        try:
            from app.config import settings
            
            if not os.path.exists(settings.faiss_index_path):
                print("🔄 FAISS index not found. Generating embeddings...")
                from scripts.generate_embeddings import main as generate_main
                success = asyncio.run(generate_main())
                if not success:
                    print("❌ Embedding generation failed.")
                    return False
            else:
                print("✅ FAISS index found. Skipping embedding generation.")
        except Exception as e:
            print(f"❌ Embedding check failed: {e}")
            return False
    
    # Step 3: Start the server
    print(f"\n📋 Step 3: Starting FastAPI server on port {args.port}...")
    try:
        import uvicorn
        print(f"🌐 Server will be available at:")
        print(f"   - API: http://localhost:{args.port}")
        print(f"   - Docs: http://localhost:{args.port}/docs")
        print(f"   - Health: http://localhost:{args.port}/api/v1/health")
        print(f"\n🔄 Starting server... (Press Ctrl+C to stop)")
        
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=args.port,
            reload=True,
            log_level="info"
        )
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user.")
        return True
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 