# Ray AI Shopper Backend - Deployment Guide

## Deploy Ray AI Shopper Backend to Vercel

This guide walks you through deploying the Ray AI Shopper backend to Vercel with proper configuration for both lightweight and full AI modes.

### Prerequisites
- GitHub account
- Vercel account
- OpenAI API key (for full AI features)

### Quick Deploy Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Deploy Ray AI Shopper backend"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `backend`
   - Framework: Other
   - Deploy

3. **Configure Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ENVIRONMENT=production
   ```

4. **Test Your Deployment**
   ```bash
   curl https://your-project.vercel.app/health
   ```

### Deployment Modes

The backend automatically adapts to available resources:

**Lightweight Mode (Default on Vercel)**
- No FAISS index required
- Uses keyword-based similarity search
- Random product recommendations as fallback
- All API endpoints work normally
- Perfect for demos and development

**Full AI Mode (Optional)**
- Requires FAISS index and embeddings
- Semantic similarity search
- OpenAI-powered recommendations
- Better accuracy and relevance

### Configuration Files

The backend includes these deployment-ready files:

**vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/app/main.py"
    }
  ],
  "functions": {
    "app/main.py": {
      "maxDuration": 30
    }
  }
}
```

**requirements.txt**
```
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
openai==1.3.7
httpx==0.25.2
python-multipart==0.0.6
python-dotenv==1.0.0
pandas==2.1.4
```

### Environment Configuration

**Development (.env)**
```env
OPENAI_API_KEY=your-api-key-here
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

**Production (Vercel Environment Variables)**
```
OPENAI_API_KEY=your-api-key-here
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### API Endpoints

All endpoints are available after deployment:

**Core Endpoints**
- `GET /health` - Service health check
- `GET /docs` - Interactive API documentation
- `POST /api/recommendations` - Get clothing recommendations
- `POST /api/chat` - Chat with AI assistant
- `POST /api/tryon` - Virtual try-on generation

**Health Check Response**
```json
{
  "status": "healthy",
  "mode": "lightweight",
  "features": {
    "recommendations": true,
    "chat": true,
    "virtual_tryon": true,
    "semantic_search": false
  }
}
```

### Testing Your Deployment

**1. Health Check**
```bash
curl https://your-project.vercel.app/health
```

**2. Get Recommendations**
```bash
curl -X POST https://your-project.vercel.app/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "user_profile": {
      "style_preferences": ["casual", "modern"],
      "color_preferences": ["blue", "black"],
      "occasion": "work"
    }
  }'
```

**3. Test Chat**
```bash
curl -X POST https://your-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me find a professional outfit",
    "context": {}
  }'
```

### Performance Optimization

**Vercel Function Limits**
- Memory: 1024 MB (Hobby), 3008 MB (Pro)
- Timeout: 10s (Hobby), 60s (Pro)
- Cold start: ~1-2 seconds

**Optimization Strategies**
- Lightweight dependencies
- Efficient fallback modes
- Minimal memory usage
- Fast startup times

### Monitoring and Debugging

**Vercel Dashboard**
- Function logs and metrics
- Performance monitoring
- Error tracking
- Usage statistics

**Debug Commands**
```bash
# View deployment logs
vercel logs your-project-name

# Local development with Vercel
vercel dev
```

### Upgrading to Full AI Mode

To enable full semantic search:

1. **Generate embeddings locally:**
   ```bash
   python scripts/generate_embeddings.py
   ```

2. **Upload to cloud storage:**
   - Upload FAISS index to S3/GCS
   - Upload product metadata

3. **Update configuration:**
   ```python
   # In config.py
   FAISS_INDEX_URL = "https://your-storage/index.faiss"
   METADATA_URL = "https://your-storage/metadata.pkl"
   ```

### Troubleshooting

**Common Issues**

*Build Failures*
- Check Python version compatibility
- Verify requirements.txt
- Check for missing dependencies

*Function Timeouts*
- Increase timeout in vercel.json
- Optimize slow operations
- Use background processing

*Memory Errors*
- Reduce data loading
- Use streaming for large files
- Upgrade to Vercel Pro

*CORS Issues*
- Update allowed origins
- Check frontend domain
- Verify headers

**Debug Steps**
1. Check Vercel function logs
2. Test endpoints individually
3. Verify environment variables
4. Check local development

### Support

For deployment issues:
1. Check Vercel function logs
2. Verify all environment variables are set
3. Test the same configuration locally
4. Consult Vercel documentation

The backend is designed to be deployment-friendly with automatic fallbacks and lightweight operation modes. 