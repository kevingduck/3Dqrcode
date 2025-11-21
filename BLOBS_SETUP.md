# Netlify Blobs Setup

## Setup (2 environment variables)

### 1. Create a Personal Access Token

1. Go to https://app.netlify.com/user/applications
2. Click **New access token**
3. Give it a name like "Blobs Access"
4. Copy the token (you'll only see it once!)

### 2. Add Environment Variables in Netlify

Go to your site → **Site configuration** → **Environment variables**

Add these TWO variables:

```
NETLIFY_TOKEN = (your personal access token from step 1)
ANALYTICS_PASSWORD = (your secure analytics password)
```

**Note**: You do NOT need to set `SITE_ID` - Netlify provides this automatically!

### 3. Redeploy

Netlify will automatically redeploy with the new variables. Visit `/analytics` and it should work!
