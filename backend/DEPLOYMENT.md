# Vercel Deployment Guide

## 🚀 Deploy Ray AI Shopper Backend to Vercel

This guide walks you through deploying the FastAPI backend to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```
3. **GitHub Repository**: Push your backend code to GitHub

## Step 1: Prepare Data Files

Since the FAISS index and embeddings are too large for Git, we need to generate and upload them separately.

### Option A: Generate Locally (Recommended)
```bash
# In your local backend directory
python3 scripts/generate_embeddings.py
```

This creates:
- `data/clothing.index` (~200MB)
- `data/metadata.pkl` (~50MB)
- `data/sample_styles_with_embeddings.csv` (~500MB)
- `data/storeLocationMap.json` (~1KB)

### Option B: Use Pre-generated Files
Contact the team for pre-generated data files if local generation fails.

## Step 2: Upload Data to Vercel

Since Vercel has deployment size limits, we'll upload the data files separately:

```bash
# Login to Vercel
vercel login

# Navigate to backend directory
cd backend

# Deploy (this will create the project)
vercel

# Upload data files using Vercel's file system
vercel --prod
```

## Step 3: Set Environment Variables

In your Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add these variables:

```
OPENAI_API_KEY=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
ENVIRONMENT=production
LOG_LEVEL=INFO
```

## Step 4: Configure vercel.json

The `vercel.json` file is already configured with:
- Python runtime for FastAPI
- 50MB max lambda size (for FAISS index)
- 60-second timeout for AI operations
- Proper routing for API endpoints

## Step 5: Deploy

```bash
# Deploy to production
vercel --prod
```

Your API will be available at: `https://your-project-name.vercel.app`

## Step 6: Test Deployment

Test the deployed API:

```bash
# Health check
curl https://your-project-name.vercel.app/api/v1/health

# Test recommendations
curl -X POST "https://your-project-name.vercel.app/api/v1/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_profile": {
      "shopping_prompt": "casual summer outfit",
      "gender": "Women",
      "preferred_styles": ["Casual"],
      "size": "M"
    }
  }'
```

## Alternative: GitHub Integration

For continuous deployment:

1. **Connect GitHub**: In Vercel dashboard, import your GitHub repository
2. **Auto-deploy**: Every push to main branch will trigger deployment
3. **Environment Variables**: Set in Vercel dashboard as above

## Data File Management

### Large Files Challenge
FAISS index files are too large for standard deployment. Solutions:

#### Option 1: Vercel Blob Storage (Recommended)
```python
# Update vector_service.py to load from Vercel Blob
import requests

async def load_from_vercel_blob():
    # Download FAISS index from Vercel Blob storage
    response = requests.get(VERCEL_BLOB_URL)
    # Save temporarily and load
```

#### Option 2: External Storage
Upload data files to:
- AWS S3
- Google Cloud Storage
- GitHub Releases (for public data)

Update `app/config.py` to load from external URLs.

#### Option 3: Smaller Dataset
Use a subset of the 44k items for faster deployment:
```python
# In generate_embeddings.py
df = df.head(5000)  # Use only 5k items
```

## Performance Optimization

### Cold Start Optimization
```python
# In app/main.py
@app.on_event("startup")
async def startup():
    # Pre-load FAISS index to reduce cold starts
    await recommendation_service.initialize()
```

### Memory Management
- FAISS index: ~2GB RAM
- Vercel Pro: 3GB RAM limit
- Consider using FAISS-GPU for larger datasets

## Monitoring

### Built-in Monitoring
Vercel provides:
- Function logs
- Performance metrics
- Error tracking
- Usage analytics

### Custom Monitoring
Add to your FastAPI app:
```python
import time
from fastapi import Request

@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Log to Vercel
    print(f"Request: {request.url.path} took {process_time:.3f}s")
    return response
```

## Troubleshooting

### Common Issues

#### 1. "Function timeout"
- Increase timeout in `vercel.json`
- Optimize FAISS index loading
- Use smaller dataset for testing

#### 2. "Memory limit exceeded"
- Upgrade to Vercel Pro
- Optimize data structures
- Use external storage for large files

#### 3. "Module not found"
- Check `requirements.txt` includes all dependencies
- Verify Python path in `vercel.json`

#### 4. "FAISS index not found"
- Ensure data files are uploaded
- Check file paths in config
- Use external storage URLs

### Debug Deployment
```bash
# Check deployment logs
vercel logs your-project-name

# Run local development
vercel dev
```

## Production Checklist

- [ ] Environment variables configured
- [ ] CORS origins restricted to your domain
- [ ] Data files uploaded/accessible
- [ ] Health check endpoint working
- [ ] API endpoints tested
- [ ] Error handling verified
- [ ] Performance monitoring enabled

## Cost Considerations

### Vercel Costs
- **Hobby Plan**: Free (limited functions/bandwidth)
- **Pro Plan**: $20/month (recommended for production)

### OpenAI API Costs
- Embeddings: ~$5.72 for initial generation
- Recommendations: ~$0.01-0.02 per request
- Virtual try-on: ~$0.04 per DALL-E image

## Next Steps

1. **Frontend Integration**: Update your React app to use the Vercel API URL
2. **Custom Domain**: Add your domain in Vercel settings
3. **SSL**: Automatic with Vercel
4. **Analytics**: Monitor usage and performance
5. **Scaling**: Consider Vercel Pro for higher limits

---

**Expected Deployment Time**: 10-15 minutes (excluding data generation) 