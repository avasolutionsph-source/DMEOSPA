# Ava Solutions Marketing Website

Professional marketing website with user authentication and business management features.

## Architecture

- **Frontend**: Static HTML/CSS/JS files in `public/` directory
- **Backend**: Node.js/Express API server (`server.js`)
- **Database**: MongoDB (hosted separately)
- **Deployment**: 
  - Static files → Netlify
  - API server → Render.com

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Verify build setup
npm run verify
```

## Deployment

### Frontend (Netlify)
- Deploys static files from `public/` directory
- API calls are proxied to Render backend via `_redirects`
- Build command: `npm run build`

### Backend (Render.com)
- Deploys the Express server
- Handles `/api/*` routes
- Start command: `npm start`

## Build Configuration

- `netlify.toml`: Netlify deployment settings
- `public/_redirects`: URL redirects and API proxy
- `public/_headers`: Security headers and caching
- `.nvmrc`: Node.js version for builds

## Files Structure

```
marketing-website/
├── public/              # Static website files (deployed to Netlify)
│   ├── index.html       # Homepage
│   ├── _redirects       # Netlify redirects
│   ├── _headers         # Netlify headers
│   └── assets/          # CSS, JS, images
├── routes/              # API routes (deployed to Render)
├── models/              # Database models
├── config/              # Configuration files
├── server.js            # Express server
└── netlify.toml         # Netlify configuration
```

## Environment Variables

Required for backend deployment:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT token secret
- `NODE_ENV`: Environment (production/development)