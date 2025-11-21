# Analytics Setup Instructions

## 1. Create Free Upstash Redis Database

1. Go to [upstash.com](https://upstash.com) and sign up (free)
2. Click **Create Database**
3. Choose a name (e.g., "3d-qr-analytics")
4. Select a region close to your users
5. Click **Create**

## 2. Get Your Connection Details

After creating the database:
1. Click on your database
2. Scroll to **REST API** section
3. Copy these values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 3. Add to Netlify Environment Variables

1. Go to your Netlify site dashboard
2. **Site configuration** → **Environment variables**
3. Add these three variables:
   - `UPSTASH_REDIS_REST_URL` = (paste URL from Upstash)
   - `UPSTASH_REDIS_REST_TOKEN` = (paste token from Upstash)
   - `ANALYTICS_PASSWORD` = (your secure password)

## 4. Redeploy

Netlify will automatically redeploy with the new environment variables.

## 5. Access Analytics

Visit `https://your-site.netlify.app/analytics` and enter your password!

---

## Free Tier Limits

Upstash free tier includes:
- 10,000 commands per day
- 256 MB storage
- More than enough for analytics!
