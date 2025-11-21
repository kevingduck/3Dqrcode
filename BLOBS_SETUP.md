# Netlify Blobs Setup

If you're getting "MissingBlobsEnvironmentError", you need to set these environment variables in Netlify:

## 1. Get Your Site ID

1. Go to your site in Netlify
2. **Project configuration** → **General** → **Project information**
3. Copy the **Project ID** (this is your Site ID)

## 2. Create a Personal Access Token

1. Go to https://app.netlify.com/user/applications
2. Click **New access token**
3. Give it a name like "Blobs Access"
4. Copy the token (you'll only see it once!)

## 3. Add to Netlify Environment Variables

Go to your site → **Site configuration** → **Environment variables**

Add these THREE variables:

```
SITE_ID = (paste your project ID from step 1)
NETLIFY_TOKEN = (paste your token from step 2)
ANALYTICS_PASSWORD = (your secure analytics password)
```

## 4. Redeploy

Netlify will automatically redeploy with the new variables. Visit `/analytics` and it should work!
