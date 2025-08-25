# Ava Solutions Marketing Website

Professional marketing website with subscription management for Ava Solutions business management system.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd marketing-website
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration:
   - Set your MongoDB connection string
   - Configure JWT secret
   - Set admin credentials
   - Configure Stripe keys (for subscriptions)

3. **Seed Admin User**
   ```bash
   npm run seed
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or use MongoDB Atlas.

5. **Run the Website**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the Website**
   - Homepage: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Pricing: http://localhost:3000/pricing

## Features

- Professional landing page
- Subscription management with Stripe
- Admin dashboard for user management
- PWA download page
- Contact and support pages

## Admin Access

Use the credentials you set in the `.env` file to access the admin panel at `/admin`.

## Integration with PWA

The PWA can redirect users to this website for:
- Account upgrades: `/upgrade?plan=basic&email=user@example.com`
- Support: `/contact`
- Feature information: `/features`
