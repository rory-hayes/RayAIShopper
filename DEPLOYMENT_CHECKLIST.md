# Ray AI Shopper Deployment Checklist

## Quick Deploy to Vercel

### Frontend Deployment
1. **Prepare the frontend:**
   ```bash
   cd RayAIShopper
   npm install
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   npx vercel --prod
   ```

3. **Configure environment variables in Vercel dashboard:**
   - `VITE_API_BASE_URL`: Your backend API URL
   - Any other frontend environment variables

### Backend Deployment
1. **Prepare the backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Deploy backend to Vercel:**
   ```bash
   cd backend
   npx vercel --prod
   ```

3. **Configure environment variables in Vercel dashboard:**
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ENVIRONMENT`: "production"
   - Any other backend environment variables

4. **Update frontend API URL:**
   - Update `VITE_API_BASE_URL` in frontend Vercel settings
   - Point to your deployed backend URL

### Quick Test
- Visit your deployed frontend URL
- Complete the wizard flow
- Test recommendations and chat features
- Verify virtual try-on functionality

---

## Pre-Deployment Checklist

### Frontend Checklist
- [ ] All dependencies installed (`npm install`)
- [ ] Build succeeds without errors (`npm run build`)
- [ ] Environment variables configured
- [ ] API endpoints point to production backend
- [ ] All routes work correctly
- [ ] Mobile responsiveness tested
- [ ] Cross-browser compatibility verified

### Backend Checklist
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] Environment variables configured
- [ ] OpenAI API key valid and working
- [ ] CORS settings allow frontend domain
- [ ] All endpoints return proper responses
- [ ] Error handling implemented
- [ ] Rate limiting configured (if needed)

### Testing Checklist
- [ ] Complete wizard flow works end-to-end
- [ ] API endpoints return expected data
- [ ] Error states handled gracefully
- [ ] Loading states work properly
- [ ] Chat functionality operational
- [ ] Virtual try-on generates images
- [ ] Mobile experience optimized

### Performance Checklist
- [ ] Frontend bundle size optimized
- [ ] Images optimized and compressed
- [ ] API response times acceptable
- [ ] Caching strategies implemented
- [ ] CDN configured (if applicable)

---

## Expected Results

**Lightweight Mode (Without Full AI Features):**
- API endpoints work normally
- Returns random product recommendations
- Chat and try-on features work
- WARNING: No semantic similarity matching
- WARNING: Health check shows "degraded" status

**Full Mode (With OpenAI API and Embeddings):**
- Health endpoint returns `200 OK`
- Status: "healthy" (full functionality)
- Interactive docs at `/docs`
- Recommendations use semantic similarity
- Chat assistant works with full context
- All endpoints respond correctly

---

## Post-Deployment Verification

### Frontend Verification
1. **Load the application:**
   - Visit the deployed URL
   - Verify the welcome page loads
   - Check that all assets load correctly

2. **Test the wizard flow:**
   - Complete all 8 steps
   - Upload images (inspiration and selfie)
   - Verify data persistence between steps
   - Test navigation (forward/back)

3. **Test interactive features:**
   - Chat assistant functionality
   - Virtual try-on modal
   - Like/dislike interactions
   - Cart management

### Backend Verification
1. **Check health endpoint:**
   ```bash
   curl https://your-backend-url.vercel.app/health
   ```

2. **Test API endpoints:**
   ```bash
   curl https://your-backend-url.vercel.app/api/recommendations
   curl https://your-backend-url.vercel.app/api/chat
   ```

3. **Verify documentation:**
   - Visit `/docs` endpoint
   - Test endpoints through Swagger UI

## Troubleshooting

### Common Issues

**Frontend Build Errors:**
- Check Node.js version (18+ required)
- Verify all dependencies are installed
- Check for TypeScript errors
- Ensure environment variables are set

**Backend Deployment Errors:**
- Check Python version (3.8+ required)
- Verify requirements.txt is complete
- Check for import errors
- Ensure environment variables are set

**API Connection Issues:**
- Verify CORS settings
- Check API URL configuration
- Verify network connectivity
- Check for rate limiting

**OpenAI API Issues:**
- Verify API key is valid
- Check API quota and billing
- Verify model availability
- Check for rate limiting

### Performance Issues

**Slow Loading:**
- Check bundle size
- Optimize images
- Enable compression
- Use CDN for static assets

**API Timeouts:**
- Increase timeout values
- Optimize database queries
- Implement caching
- Use background processing

### Environment-Specific Issues

**Development vs Production:**
- Check environment variables
- Verify API endpoints
- Check CORS settings
- Verify SSL certificates

**Mobile Issues:**
- Test on actual devices
- Check responsive design
- Verify touch interactions
- Test image upload on mobile

---

## Monitoring and Maintenance

### Health Checks
- Set up monitoring for `/health` endpoint
- Monitor API response times
- Track error rates
- Monitor resource usage

### Logging
- Configure proper logging levels
- Monitor application logs
- Set up error alerting
- Track user interactions

### Updates
- Keep dependencies updated
- Monitor security advisories
- Test updates in staging
- Plan rollback procedures

---

## Support

For deployment issues:
1. Check the logs in Vercel dashboard
2. Verify all environment variables
3. Test locally first
4. Check this checklist again

The application is designed to be deployment-friendly with fallback modes for various constraints. 