# Ray AI Shopper Backend

AI-powered fashion recommendation service using GPT-4o mini, DALL-E, and RAG (Retrieval-Augmented Generation) with FAISS vector search.

## Overview

This backend implements the OpenAI cookbook approach for combining GPT-4o with RAG for outfit recommendations. It features:

- **GPT-4o mini** for query enhancement, recommendation ranking, and chat assistance
- **DALL-E 3** for virtual try-on image generation
- **FAISS vector search** for fast similarity matching across 44k+ clothing items
- **Stateless architecture** optimized for serverless deployment
- **Dynamic recommendation refresh** maintaining top-20 items display

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   OpenAI APIs   │
│   (React)       │───▶│   (FastAPI)      │───▶│   GPT-4o mini   │
│                 │    │                  │    │   DALL-E 3      │
└─────────────────┘    └──────────────────┘    │   Embeddings    │
                                ▼              └─────────────────┘
                       ┌──────────────────┐
                       │   FAISS Vector   │
                       │   Store (44k+)   │
                       └──────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Generate Embeddings

First, ensure you have the sample data:
```bash
# The data/sample_styles.csv should be present
# This contains 44k+ clothing items from the OpenAI cookbook
```

Generate embeddings and create FAISS index:
```bash
python scripts/generate_embeddings.py
```

This will:
- Load the sample clothing data
- Generate embeddings using OpenAI API
- Create FAISS index for fast similarity search
- Create mock store location data

### 3. Start the Server

```bash
python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/api/v1/health

## API Endpoints

### Core Endpoints

#### `POST /api/v1/recommendations`
Get personalized outfit recommendations using the full RAG pipeline:
1. Analyzes user profile with GPT-4o mini
2. Enhances search query with inspiration image analysis
3. Performs vector similarity search
4. Re-ranks results with GPT-4o mini
5. Returns top-20 recommendations

#### `POST /api/v1/chat`
Chat with Ray, the fashion assistant powered by GPT-4o mini with session context.

#### `POST /api/v1/tryon`
Generate virtual try-on images using DALL-E 3.

#### `POST /api/v1/feedback`
Process user feedback (like/dislike/save) and get fresh recommendations for dislikes.

#### `POST /api/v1/refresh`
Get fresh recommendations to replace disliked items, maintaining the top-20 display.

### Example Request

```json
POST /api/v1/recommendations
{
  "user_profile": {
    "shopping_prompt": "elegant dinner outfit for a romantic evening",
    "gender": "Women",
    "preferred_styles": ["Elegant", "Formal"],
    "preferred_colors": ["Black", "Navy Blue"],
    "size": "M",
    "inspiration_images": ["base64_image_data..."]
  },
  "top_k": 20
}
```

## Configuration

Key settings in `app/config.py`:

```python
# OpenAI Configuration
openai_api_key: str = "your-api-key"
gpt_model: str = "gpt-4o-mini"
embedding_model: str = "text-embedding-3-large"

# Vector Search Configuration
similarity_threshold: float = 0.7
max_search_results: int = 100
default_top_k: int = 20
```

## Data Pipeline

### 1. Embedding Generation
Following the cookbook's approach:
- Rich product descriptions combining multiple fields
- Batch processing for cost efficiency
- Truncation handling for context limits
- Cost estimation and logging

### 2. Vector Search
- FAISS L2 distance index for fast similarity search
- Dynamic exclusion handling for fresh recommendations
- Metadata preservation for product details
- GitHub-proxied image serving

### 3. GPT Enhancement
- Query optimization from user profiles
- Inspiration image analysis with vision capabilities
- Intelligent recommendation ranking
- Context-aware chat assistance

## Development

### Project Structure

```
backend/
├── app/
│   ├── api/              # FastAPI routes
│   ├── models/           # Pydantic models
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   ├── config.py         # Configuration
│   └── main.py           # FastAPI app
├── scripts/              # Utility scripts
├── data/                 # Data files
└── requirements.txt      # Dependencies
```

### Key Services

- **RecommendationService**: Orchestrates the full RAG pipeline
- **VectorSearchService**: FAISS-based similarity search
- **OpenAIService**: GPT-4o mini and DALL-E integration
- **EmbeddingGenerator**: Batch embedding generation

### Error Handling & Logging

- Comprehensive retry logic with exponential backoff
- Request ID tracking for debugging
- Structured logging to console
- Graceful error responses

## Production Deployment

### Vercel Deployment

The backend is designed for serverless deployment on Vercel:

1. **Stateless Design**: No persistent database required
2. **Fast Cold Starts**: Pre-built FAISS index loaded on startup
3. **Optimized Dependencies**: Minimal package footprint
4. **Environment Variables**: Secure configuration management

### Performance Optimizations

- **Batch Processing**: Efficient OpenAI API usage
- **Vector Caching**: Pre-computed embeddings
- **Session Caching**: In-memory session state
- **Parallel Processing**: Concurrent API calls where possible

## Cost Optimization

Following cookbook best practices:

- **Embedding Reuse**: Generate once, search many times
- **Batch API Calls**: Reduce per-request overhead
- **Smart Truncation**: Respect token limits
- **Cost Logging**: Track API usage

Estimated costs for 44k products:
- **Embedding Generation**: ~$5.72 (one-time)
- **Per Recommendation**: ~$0.01-0.02
- **Virtual Try-on**: ~$0.04 per image

## Monitoring & Health

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

Returns service status, model versions, and vector store health.

### Logging
All operations logged with:
- Request IDs for tracing
- Performance metrics
- Error details
- API usage statistics

## Troubleshooting

### Common Issues

1. **"FAISS index not found"**
   - Run `python scripts/generate_embeddings.py` first

2. **OpenAI API errors**
   - Check API key configuration
   - Verify rate limits and quotas

3. **Memory issues**
   - FAISS index requires ~2GB RAM for 44k items
   - Consider using smaller dataset for development

### Debug Mode

Set `ENVIRONMENT=development` for:
- Detailed error messages
- Query embedding in responses
- Enhanced logging
- Auto-reload on code changes

## Contributing

1. Follow the established patterns for services and models
2. Add comprehensive logging for new features
3. Include error handling with retry logic
4. Update API documentation for new endpoints
5. Test with the embedding generation script

## License

This project implements the OpenAI cookbook methodology for educational and commercial use. 