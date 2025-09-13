# Production Deployment Guide

## Overview

This guide covers deploying the Ava Solutions multi-service platform to production environments. The system consists of three main services that can be deployed separately or together.

## Architecture Overview

```mermaid
graph TB
    Users[Users] --> LB[Load Balancer]
    LB --> Marketing[Marketing Website :3002]
    LB --> PWA[PWA Frontend :8080]
    
    Marketing --> Backend[Backend API :4001]
    PWA --> Backend
    
    Backend --> DB[(MongoDB Atlas)]
    Marketing --> DB
    
    Marketing --> Redis[(Redis Cache)]
    Backend --> Redis
```

## Deployment Options

### Option 1: Cloud Platform Deployment (Recommended)

#### Vercel Deployment

**Marketing Website + PWA:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy marketing website
cd marketing-website
vercel --prod

# Deploy PWA
cd ../PWA-Repository  
vercel --prod
```

**vercel.json (Marketing Website):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "MONGODB_URI": "@mongodb-uri",
    "JWT_SECRET": "@jwt-secret"
  }
}
```

**vercel.json (PWA):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

#### Render Deployment

**Backend API:**
```yaml
# render.yaml
services:
  - type: web
    name: ava-backend-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: ava-mongodb
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
        
databases:
  - name: ava-mongodb
    databaseName: ava-marketing-website
    user: ava-admin
```

**Marketing Website:**
```yaml
services:
  - type: web
    name: ava-marketing-website
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PWA_BACKEND_URL
        value: https://ava-backend-api.onrender.com
```

### Option 2: VPS Deployment

#### Server Requirements

**Minimum Specifications:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Bandwidth: 100GB/month
- OS: Ubuntu 20.04+ or CentOS 8+

**Recommended Specifications:**
- CPU: 4 cores
- RAM: 8GB  
- Storage: 40GB SSD
- Bandwidth: 500GB/month

#### VPS Setup

```bash
# Connect to server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install SSL certificates (Let's Encrypt)
apt install certbot python3-certbot-nginx -y
```

#### Application Deployment

```bash
# Clone repository
git clone https://github.com/your-repo/ava-solutions.git
cd ava-solutions

# Setup backend
cd backend
npm install --production
cp .env.example .env
nano .env  # Configure production environment

# Setup marketing website
cd ../marketing-website
npm install --production
cp .env.example .env
nano .env  # Configure production environment

# Setup PWA (copy files to Nginx directory)
cd ../PWA-Repository
cp -r * /var/www/pwa/
```

#### PM2 Configuration

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'ava-backend',
      script: './backend/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: '/var/log/pm2/ava-backend-error.log',
      out_file: '/var/log/pm2/ava-backend-out.log',
      log_file: '/var/log/pm2/ava-backend-combined.log'
    },
    {
      name: 'ava-marketing',
      script: './marketing-website/server.js',
      instances: 2,
      exec_mode: 'cluster', 
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/var/log/pm2/ava-marketing-error.log',
      out_file: '/var/log/pm2/ava-marketing-out.log',
      log_file: '/var/log/pm2/ava-marketing-combined.log'
    }
  ]
};
```

```bash
# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### Nginx Configuration

**/etc/nginx/sites-available/ava-solutions:**
```nginx
# PWA Frontend
server {
    listen 80;
    server_name pwa.yourdomain.com;
    
    root /var/www/pwa;
    index index.html;
    
    # PWA specific headers
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Service Worker
        location /service-worker.js {
            expires off;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        # Manifest
        location /manifest.json {
            expires 1d;
            add_header Cache-Control "public";
        }
    }
}

# Marketing Website
server {
    listen 80;
    server_name admin.yourdomain.com yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API  
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # API rate limiting
        limit_req zone=api burst=20 nodelay;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/ava-solutions /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

#### SSL Certificate Setup

```bash
# Install SSL certificates
certbot --nginx -d yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com -d pwa.yourdomain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Configuration

### MongoDB Atlas Setup

```javascript
// Production connection string
const MONGODB_URI = 'mongodb+srv://prod-user:secure-password@prod-cluster.mongodb.net/ava-production?retryWrites=true&w=majority&appName=AvaProduction';

// Connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  retryWrites: true,
  w: 'majority'
};
```

### Database Security

```javascript
// Create production database user
db.createUser({
  user: "ava-prod-api",
  pwd: "secure-random-password",
  roles: [
    { role: "readWrite", db: "ava-production" },
    { role: "dbAdmin", db: "ava-production" }
  ]
});

// Create backup user
db.createUser({
  user: "ava-backup",
  pwd: "backup-password",
  roles: [
    { role: "backup", db: "admin" },
    { role: "restore", db: "admin" }
  ]
});
```

### Database Indexes

```javascript
// Create production indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, createdAt: -1 });
db.users.createIndex({ createdBy: 1, role: 1 });
db.users.createIndex({ 
  email: "text", 
  businessName: "text", 
  firstName: "text", 
  lastName: "text" 
});
```

## Environment Configuration

### Production Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/ava-production
JWT_SECRET=super-secure-production-jwt-secret-key-256-bits
PORT=4001

# Logging
LOG_LEVEL=warn
LOG_SLOW_QUERIES=true

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com,https://pwa.yourdomain.com

# Performance
CLUSTER_WORKERS=0
CACHE_TTL=3600

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

**Marketing Website (.env):**
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/ava-production
JWT_SECRET=super-secure-production-jwt-secret-key-256-bits
JWT_EXPIRE=30d
PORT=3002

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password-change-me

# Service URLs
PWA_BACKEND_URL=https://api.yourdomain.com
PWA_FRONTEND_URL=https://pwa.yourdomain.com

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com,https://pwa.yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Email (if implemented)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=email-password
```

## Security Hardening

### Server Security

```bash
# Create non-root user
adduser ava-deploy
usermod -aG sudo ava-deploy

# Disable root SSH login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Setup SSH key authentication
ssh-copy-id ava-deploy@your-server-ip

# Configure firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable

# Install fail2ban
apt install fail2ban -y
systemctl enable fail2ban
```

### Application Security

```javascript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.yourdomain.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false
});
```

## Monitoring and Logging

### Application Monitoring

**Winston Logging Configuration:**
```javascript
const winston = require('winston');
const { combine, timestamp, printf, colorize, errors } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}]: ${message}${stack ? '\n' + stack : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: combine(
        colorize(),
        printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    })
  ]
});
```

### Health Checks

```javascript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

app.get('/health/detailed', async (req, res) => {
  try {
    // Check database connection
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: 'healthy',
      checks: {
        database: 'connected',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Monitoring Scripts

```bash
#!/bin/bash
# monitoring.sh

# Check application health
check_health() {
    local service_url=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" $service_url/health)
    
    if [ $response -eq 200 ]; then
        echo "✅ $service_url - Healthy"
    else
        echo "❌ $service_url - Unhealthy (HTTP $response)"
        # Send alert (email, Slack, etc.)
    fi
}

# Check all services
check_health "https://api.yourdomain.com"
check_health "https://admin.yourdomain.com" 
check_health "https://pwa.yourdomain.com"

# Check PM2 processes
pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | "❌ Process \(.name) is \(.pm2_env.status)"'
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
DB_NAME="ava-production"

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# MongoDB backup
mongodump --uri="$MONGODB_URI" --db=$DB_NAME --out=$BACKUP_DIR/$DATE/

# Compress backup
tar -czf $BACKUP_DIR/ava-backup-$DATE.tar.gz -C $BACKUP_DIR/$DATE .

# Upload to cloud storage (AWS S3, Google Cloud, etc.)
aws s3 cp $BACKUP_DIR/ava-backup-$DATE.tar.gz s3://your-backup-bucket/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "ava-backup-*.tar.gz" -mtime +30 -delete

echo "Backup completed: ava-backup-$DATE.tar.gz"
```

### Application Backup

```bash
#!/bin/bash
# app-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/ava-solutions"
BACKUP_DIR="/opt/backups"

# Create application backup
tar -czf $BACKUP_DIR/app-backup-$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=.git \
  $APP_DIR

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/app-backup-$DATE.tar.gz s3://your-backup-bucket/apps/

echo "Application backup completed: app-backup-$DATE.tar.gz"
```

### Recovery Procedures

```bash
# Database recovery
mongorestore --uri="$MONGODB_URI" --db=ava-production /path/to/backup/

# Application recovery
cd /opt
tar -xzf /path/to/app-backup-DATE.tar.gz
cd ava-solutions
npm install --production
pm2 restart ecosystem.config.js
```

## Performance Optimization

### Application Performance

```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Enable HTTP/2
const http2 = require('http2');
const server = http2.createSecureServer(options, app);

// Database connection pooling
const mongoOptions = {
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000
};

// Caching with Redis
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

const cache = (duration) => {
  return async (req, res, next) => {
    const key = req.originalUrl;
    const cached = await client.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      client.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

### Nginx Performance

```nginx
# /etc/nginx/nginx.conf

worker_processes auto;
worker_connections 1024;

http {
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Browser caching
    map $sent_http_content_type $expires {
        default                    off;
        text/html                  epoch;
        text/css                   max;
        application/javascript     max;
        ~image/                    max;
    }
    
    expires $expires;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

## Deployment Automation

### GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd backend && npm ci --production
        cd ../marketing-website && npm ci --production
        
    - name: Run tests
      run: |
        cd backend && npm test
        
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.4
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/ava-solutions
          git pull origin main
          cd backend && npm ci --production
          cd ../marketing-website && npm ci --production
          pm2 restart ecosystem.config.js
          pm2 save
```

### Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Backend deployment
echo "📦 Deploying backend..."
cd backend
npm ci --production
cd ..

# Marketing website deployment  
echo "📦 Deploying marketing website..."
cd marketing-website
npm ci --production
cd ..

# Restart services
echo "🔄 Restarting services..."
pm2 restart ecosystem.config.js
pm2 save

# Health check
echo "🏥 Running health checks..."
sleep 10

curl -f https://api.yourdomain.com/health || exit 1
curl -f https://admin.yourdomain.com/api/health || exit 1

echo "✅ Deployment completed successfully!"
```

## Troubleshooting

### Common Production Issues

#### High CPU Usage
```bash
# Check PM2 processes
pm2 monit

# Check system resources
top
htop

# Analyze slow queries
tail -f /var/log/mongodb/mongod.log | grep "slow"
```

#### Memory Leaks
```bash
# Check memory usage
pm2 show ava-backend

# Heap dump analysis
node --inspect server.js
# Use Chrome DevTools

# Restart if necessary
pm2 restart ava-backend --update-env
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongosh "$MONGODB_URI"

# Check connection pool
db.runCommand({ "serverStatus": 1 }).connections

# Monitor slow operations
db.setProfilingLevel(1, { slowms: 100 })
```

### Log Analysis

```bash
# Application logs
tail -f /var/log/pm2/ava-backend-combined.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

---

**Last Updated**: September 7, 2025
**Version**: 1.0.0