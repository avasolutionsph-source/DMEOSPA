# Ava Solutions PWA Backend

This is the backend API server for the Ava Solutions PWA application. It handles data synchronization and user authentication.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd pwa-backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your configuration:
   - Set your MongoDB connection string
   - Configure JWT secret
   - Set CORS origins

3. **Start MongoDB**
   Make sure MongoDB is running on your system or use MongoDB Atlas.

4. **Run the Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Test the API**
   Visit: http://localhost:4000/api/health

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/products/sync` - Sync products data
- `POST /api/inventory/sync` - Sync inventory data
- `POST /api/employees/sync` - Sync employees data
- `POST /api/transactions/sync` - Sync transactions data
- `GET /api/user/profile` - Get user profile

## Configuration

The PWA will automatically connect to this backend when you set the API URL in the PWA settings to: `http://localhost:4000`

## Notes

- This backend is designed specifically for PWA data synchronization
- It uses a simplified authentication system suitable for offline-first applications
- All data is stored in MongoDB for scalability
