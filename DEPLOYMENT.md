# Deploy Backend on Render

## Step 1: Prepare Your Code

1. Push your code to GitHub
2. Ensure all dependencies are in package.json
3. Add environment variables to render.yaml

## Step 2: Set up Render Account

1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub
3. Click "New" → "Web Service"

## Step 3: Connect Repository

1. Select your GitHub repository
2. Choose the backend folder
3. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Runtime**: Node

## Step 4: Add Environment Variables

Add these environment variables in Render dashboard:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongo_url
REDIS_URL=your_redis_url
```

## Step 5: Set up Databases

### Option A: Use Render's Managed Services

1. **MongoDB**:
   - Click "New" → "PostgreSQL" (or use MongoDB Atlas)
   - Choose free plan
   - Get connection string

2. **Redis**:
   - Click "New" → "Redis"
   - Choose free plan
   - Get connection string

### Option B: Use External Services

1. **MongoDB Atlas** (Free):
   - Go to [cloud.mongodb.com](https://cloud.mongodb.com)
   - Create free cluster
   - Get connection string

2. **Redis Cloud** (Free):
   - Go to [redis.com/try-free](https://redis.com/try-free)
   - Create free database
   - Get connection string

## Step 6: Update API URL in Frontend

In your frontend ProductTable.js, update the API URL:

```javascript
const res = await axios.get(
  "https://your-backend-url.onrender.com/api/products/paginated?${params}"
);
```

## Step 7: Deploy

1. Click "Create Web Service"
2. Wait for deployment (2-3 minutes)
3. Test your API: `https://your-app.onrender.com/api/products`

## Troubleshooting

### Common Issues:

1. **Port binding**: Use `process.env.PORT || 5000`
2. **Database connection**: Check connection strings
3. **Build fails**: Check package.json scripts
4. **CORS errors**: Ensure cors middleware is enabled

### Logs:

- View logs in Render dashboard
- Check build logs for errors
- Monitor service logs for runtime issues

## Free Tier Limits:

- **Web Service**: 750 hours/month
- **Database**: 512MB RAM, 1GB storage
- **Redis**: 25MB memory, 256MB storage

## Production Tips:

1. Add health check endpoint
2. Implement proper error handling
3. Set up monitoring
4. Use environment-specific configs
5. Add logging for debugging
