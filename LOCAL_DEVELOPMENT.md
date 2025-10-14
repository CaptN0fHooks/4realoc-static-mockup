# Local Development Setup

## The CORS Problem

When you open `index.html` directly in your browser (file://), the Repliers API will fail due to CORS (Cross-Origin Resource Sharing) restrictions. This is normal and expected.

## Solutions

### Option 1: Use the Local Server Scripts (Recommended)

**Windows:**
1. Double-click `serve.bat`
2. Open http://localhost:8080 in your browser

**Mac/Linux:**
1. Run `chmod +x serve.sh`
2. Run `./serve.sh`
3. Open http://localhost:8080 in your browser

### Option 2: Use Node.js (if you have it installed)

```bash
npm install
npm run serve
```

Then open http://localhost:8080

### Option 3: Use Python (if you have it installed)

```bash
python -m http.server 8080
```

Then open http://localhost:8080

## What Happens

- **Without local server**: You'll see mock data (realistic Orange County properties)
- **With local server**: You'll get real data from the Repliers API (if the API key is valid)

## Current Status

The system is designed to work in both scenarios:
- ✅ **Mock Data**: Always works, shows realistic Orange County properties
- ✅ **Real API**: Works when hosted or running on local server with valid API key

## Testing the API

1. Open browser console (F12)
2. Look for API request logs
3. If you see CORS errors, use one of the local server options above
4. If you see API errors, the Repliers API key may need verification

## Next Steps

1. Test with local server to verify API integration
2. When ready to go live, host the site on a real domain
3. The API will work perfectly once hosted


