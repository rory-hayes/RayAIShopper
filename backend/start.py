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
    
    print("Ray AI Shopper Backend Startup")
    print("=" * 40)
    print(f"Environment: {settings.environment}")
    print(f"Port: {args.port}")
    
    print("\nStep 1: Running setup tests...")
    
    # Import and run setup tests
    from scripts.test_setup import run_all_tests
    
    try:
        test_success = run_all_tests()
        if not test_success:
            print("WARNING: Some setup tests failed. Continuing in degraded mode...")
    except Exception as e:
        print(f"WARNING: Setup test failed: {e}")
    
    print("\nStep 2: Checking embeddings...")
    
    # Check if embeddings exist
    if os.path.exists(settings.faiss_index_path):
        print("FAISS index found - full functionality enabled")
    else:
        print("FAISS index not found - using lightweight mode")
        print("Run 'python scripts/generate_embeddings.py' for full features")
    
    # Check OpenAI API
    if settings.openai_api_key and settings.openai_api_key != "your-api-key-here":
        print("OpenAI API key configured")
    else:
        print("WARNING: OpenAI API key not configured - some features disabled")
    
    print(f"\nStep 3: Starting FastAPI server on port {args.port}...")
    
    # Start the server
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
            reload=args.reload and settings.environment == "development",
            log_level="info"
        )
        
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"ERROR: Failed to start server: {e}")
        sys.exit(1)
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 