# Ray AI Shopper Backend Setup Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- OpenAI API key

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or using pip3:
```bash
pip3 install -r requirements.txt
```

### Step 2: Verify Installation

```bash
python3 scripts/test_setup.py
```

This will test:
- ✅ Package imports (FastAPI, OpenAI, FAISS, etc.)
- ✅ App module imports
- ✅ Data files presence
- ✅ OpenAI API connection

### Step 3: Generate Embeddings

```bash
python3 scripts/generate_embeddings.py
```

This will:
- Load the 44k+ clothing items from `data/sample_styles.csv`
- Generate embeddings using OpenAI API (~$5.72 cost)
- Create FAISS index for fast similarity search
- Save everything to the `data/` directory

### Step 4: Start the Server

```bash
python3 start.py
```

Or manually:
```bash
python3 -m uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

## 🔧 Detailed Setup

### Virtual Environment (Recommended)

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt
```

### Configuration

The backend uses these key settings (in `app/config.py`):

```python
# OpenAI Configuration
openai_api_key: str = "your-api-key-here"
gpt_model: str = "gpt-4o-mini"
embedding_model: str = "text-embedding-3-large"

# Data Configuration
styles_csv_path: str = "data/sample_styles.csv"
faiss_index_path: str = "data/clothing.index"
```

### Data Requirements

Ensure you have:
- `data/sample_styles.csv` - The 44k clothing items dataset
- Generated files (after running embedding script):
  - `data/clothing.index` - FAISS vector index
  - `data/metadata.pkl` - Product metadata
  - `data/sample_styles_with_embeddings.csv` - CSV with embeddings
  - `data/storeLocationMap.json` - Mock store locations

## 🧪 Testing

### Test Individual Components

```bash
# Test setup
python3 scripts/test_setup.py

# Test embedding generation (dry run)
python3 scripts/generate_embeddings.py

# Test API endpoints
curl http://localhost:8000/api/v1/health
```

### Example API Calls

#### Get Recommendations
```bash
curl -X POST "http://localhost:8000/api/v1/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_profile": {
      "shopping_prompt": "elegant dinner outfit",
      "gender": "Women",
      "preferred_styles": ["Elegant"],
      "preferred_colors": ["Black"],
      "size": "M"
    },
    "top_k": 20
  }'
```

#### Chat with Assistant
```bash
curl -X POST "http://localhost:8000/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need help finding a casual outfit",
    "history": []
  }'
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "No module named 'fastapi'"
```bash
pip3 install -r requirements.txt
```

#### 2. "FAISS index not found"
```bash
python3 scripts/generate_embeddings.py
```

#### 3. "OpenAI API error"
- Check your API key in `app/config.py`
- Verify you have sufficient OpenAI credits
- Check rate limits

#### 4. "Memory error during embedding generation"
- FAISS requires ~2GB RAM for 44k items
- Consider using a smaller dataset for testing
- Close other applications to free memory

#### 5. Port already in use
```bash
python3 start.py --port 8001
```

### Debug Mode

For detailed logging:
```bash
# Set environment to development in app/config.py
environment: str = "development"

# Start with debug logging
python3 -m uvicorn app.main:app --reload --log-level debug
```

### Checking Logs

All logs go to console. Look for:
- ✅ Successful operations
- ⚠️ Warnings (non-critical issues)
- ❌ Errors (require attention)

## 📊 Performance

### Expected Performance
- **Embedding Generation**: ~10-15 minutes for 44k items
- **API Response Time**: 
  - Recommendations: 2-5 seconds
  - Chat: 1-2 seconds
  - Virtual Try-on: 10-15 seconds
- **Memory Usage**: ~2-3GB with FAISS index loaded

### Optimization Tips
- Use SSD storage for faster FAISS index loading
- Increase available RAM for better performance
- Consider using GPU-enabled FAISS for larger datasets

## 🔒 Security

### API Key Security
- Never commit API keys to version control
- Use environment variables in production
- Rotate keys regularly

### CORS Configuration
Current setup allows all origins (`["*"]`). For production:
```python
cors_origins: list = ["https://yourdomain.com"]
```

## 🚀 Deployment

### Local Development
```bash
python3 start.py
```

### Production (Vercel)
The backend is designed for serverless deployment:
1. Pre-generate embeddings locally
2. Upload FAISS index files
3. Configure environment variables
4. Deploy with Vercel CLI

## 📈 Monitoring

### Health Checks
```bash
curl http://localhost:8000/api/v1/health
```

Returns:
- Service status
- Model versions
- Vector store health
- Total products loaded

### Metrics to Monitor
- API response times
- OpenAI API usage/costs
- Memory usage
- Error rates
- Session activity

## 🤝 Support

If you encounter issues:
1. Check this setup guide
2. Run the test script: `python3 scripts/test_setup.py`
3. Check the console logs for detailed error messages
4. Verify your OpenAI API key and credits

## 📚 Next Steps

Once setup is complete:
1. Test the API endpoints using the interactive docs at `/docs`
2. Integrate with your React frontend
3. Customize the recommendation logic
4. Add your own product catalog
5. Deploy to production

---

**Estimated Setup Time**: 15-30 minutes (including embedding generation) 