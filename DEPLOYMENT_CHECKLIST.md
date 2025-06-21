# Ray AI Shopper - Deployment Checklist

## 🚀 Quick Deploy to Vercel

### Step 1: Push to GitHub
```bash
# In your project root
git add .
git commit -m "Add Ray AI Shopper backend with Vercel config"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set **Root Directory** to `backend`
5. **Framework Preset**: Other
6. **Build Command**: (leave empty)
7. **Output Directory**: (leave empty)
8. **Install Command**: `pip install -r requirements.txt`

#### Option B: Vercel CLI
```bash
cd backend
npx vercel --prod
```

### Step 3: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

```
OPENAI_API_KEY=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
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Step 4: Test Deployment

Your API will be at: `https://your-project-name.vercel.app`

Test endpoints:
```bash
# Health check
curl https://your-project-name.vercel.app/api/v1/health

# Interactive docs
https://your-project-name.vercel.app/docs
```

## 📋 Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `backend/` directory contains all necessary files
- [ ] `vercel.json` configuration present
- [ ] `requirements.txt` includes all dependencies
- [ ] Environment variables configured in Vercel
- [ ] Sample data file (`data/sample_styles.csv`) committed to repo

## 🔧 Key Files for Deployment

### Required Files
- `backend/vercel.json` - Vercel configuration
- `backend/requirements.txt` - Python dependencies
- `backend/app/main.py` - FastAPI application entry point
- `backend/data/sample_styles.csv` - Product data (44k items)

### Configuration Files
- `backend/app/config.py` - Environment-aware settings
- `backend/.gitignore` - Excludes large generated files
- `.github/workflows/deploy.yml` - Auto-deployment (optional)

## 🚨 Important Notes

### Data Files
- The FAISS index files are **NOT** in Git (too large)
- Backend will run in **fallback mode** initially
- Fallback mode uses random product selection instead of AI similarity
- This allows testing the API without full embedding generation

### Fallback Mode
When FAISS index is not available:
- ✅ API endpoints work normally
- ✅ Returns random product recommendations
- ✅ Chat and try-on features work
- ⚠️ No semantic similarity matching
- ⚠️ Health check shows "degraded" status

### Full AI Mode (Optional)
To enable full AI similarity search:
1. Generate embeddings locally: `python scripts/generate_embeddings.py`
2. Upload files to external storage (S3, etc.)
3. Update config to load from external URLs

## 🎯 Expected Results

### Successful Deployment
- ✅ Health endpoint returns `200 OK`
- ✅ Status: "degraded" (fallback mode)
- ✅ Interactive docs at `/docs`
- ✅ Recommendations return random products
- ✅ Chat assistant works
- ✅ All endpoints respond correctly

### API Endpoints Available
- `GET /api/v1/health` - Service status
- `POST /api/v1/recommendations` - Get outfit recommendations
- `POST /api/v1/chat` - Chat with fashion assistant
- `POST /api/v1/tryon` - Virtual try-on with DALL-E
- `POST /api/v1/feedback` - Process user feedback
- `POST /api/v1/refresh` - Get fresh recommendations

## 🔗 Next Steps After Deployment

1. **Test the API** using the interactive docs
2. **Update your React frontend** to use the Vercel URL
3. **Monitor performance** in Vercel dashboard
4. **Optional**: Set up full AI mode with proper embeddings
5. **Optional**: Configure custom domain

## 💡 Troubleshooting

### Common Issues
- **Build fails**: Check `requirements.txt` and Python version
- **Function timeout**: Increase timeout in `vercel.json`
- **Memory limit**: Upgrade to Vercel Pro for more RAM
- **CORS errors**: Update `cors_origins` in config

### Debug Commands
```bash
# Check deployment logs
vercel logs your-project-name

# Local development
cd backend && vercel dev
```

---

**Estimated deployment time**: 5-10 minutes 