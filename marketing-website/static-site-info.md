# Marketing Website - Static Site Only

This is a **static website** that should be deployed to Netlify as static files only.

## What Netlify Should Deploy:
- **Source**: `public/` directory only
- **Type**: Static HTML/CSS/JS files
- **Build**: No build process needed
- **API**: Proxy to external backend via `_redirects`

## Files Netlify Should Ignore:
- `server.js` (backend server - deployed separately)
- `routes/` (API routes - not for static site)
- `models/` (database models - not for static site)  
- `config/` (server config - not for static site)
- `package.json` (server dependencies - not needed)

## Netlify Configuration:
- **Publish directory**: `public`
- **Build command**: `echo 'Static site ready'`
- **Node version**: 18 (for build tools only)

## API Handling:
- API calls are proxied to `https://ava-marketing-api.onrender.com`
- See `public/_redirects` for proxy configuration
- No server-side code runs on Netlify

## Troubleshooting:
If build fails, ensure:
1. Only `public/` directory content is being deployed
2. Server files (`server.js`, `routes/`, etc.) are ignored
3. Build command is simple: `echo 'Static site ready'`
4. No npm install of server dependencies

This is a **frontend-only** deployment.
