# Ava Solutions - Unified Spa Management System

A complete spa management solution with unified backend and three frontend applications.

## 🏗️ Architecture

```
NEW AVA/
├── backend/                 # Unified Node.js/Express backend
├── frontend-marketing/      # Marketing website
├── frontend-pwa/           # PWA business dashboard
├── frontend-booking/       # Customer booking website
└── README.md
```

## 🚀 Features

### Backend (Unified)
- **MongoDB Only** - No local storage, no demo accounts
- **JWT Authentication** - Secure token-based auth
- **User Management** - Registration, login, roles
- **Admin Dashboard** - Real user statistics
- **CORS Configured** - Works with all frontends

### Frontend - Marketing Website
- **Landing Page** - Business information and features
- **Login/Register** - Clean modal-based authentication
- **Admin Dashboard** - Real-time user statistics
- **Responsive Design** - Mobile-friendly

### Frontend - PWA Dashboard
- **Business Dashboard** - Overview of business metrics
- **Feature Access** - POS, bookings, inventory, etc.
- **User Profile** - Shows real business name
- **Mobile-First** - PWA-ready design

### Frontend - Booking Website
- **Service Selection** - Choose from available services
- **Appointment Booking** - Date and time selection
- **Customer Information** - Contact details form
- **Booking Summary** - Review before submission

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
The `.env` file is already configured with:
```
PORT=4000
MONGO_URI=mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-unified-backend?retryWrites=true&w=majority&appName=Avasolutions
JWT_SECRET=ava-solutions-super-secure-jwt-key-2024-unified-backend-authentication-system
JWT_EXPIRE=999y
NODE_ENV=development
```

### 3. Start the Backend
```bash
cd backend
npm run dev
# or for production
npm start
```

Backend will run on: http://localhost:4000

### 4. Start the Frontends

#### Option A: Simple HTTP Server
```bash
# Marketing Website
cd frontend-marketing
python -m http.server 3000

# PWA Dashboard  
cd frontend-pwa
python -m http.server 3001

# Booking Website
cd frontend-booking
python -m http.server 3002
```

#### Option B: Live Server (VS Code Extension)
Open each frontend folder in VS Code and use Live Server extension.

## 🌐 Access URLs

- **Backend API**: http://localhost:4000
- **Marketing**: http://localhost:3000
- **PWA Dashboard**: http://localhost:3001  
- **Booking**: http://localhost:3002

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/validate` - Validate token

### Admin (Requires admin role)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/subscription` - Update user subscription

### Health Check
- `GET /api/health` - Server and database status

## 🔐 Authentication Flow

1. **Register**: Create account via marketing website
2. **Login**: Authenticate and receive JWT token
3. **Redirect**: Based on role (admin → admin dashboard, user → PWA)
4. **Token Storage**: Stored in localStorage for persistence

## 💾 Database Structure

### User Model
```javascript
{
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  businessName: String,
  phone: String,
  role: String (owner/admin/superAdmin),
  subscriptionPlan: String (pro/enterprise),
  subscriptionStatus: String (active/inactive),
  permissions: Object,
  businessMetrics: Object,
  products: Array,
  employees: Array,
  isActive: Boolean,
  timestamps: true
}
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-restart on changes
```

### Frontend Development
- Edit HTML/CSS/JS files directly
- Changes reflected immediately with live server
- No build process required

## 🚀 Deployment

### Backend (Render/Heroku)
1. Connect GitHub repository
2. Set environment variables
3. Deploy from main branch

### Frontends (Netlify/Vercel)
1. Connect GitHub repository  
2. Set build directory to respective frontend folder
3. Deploy from main branch

## 🔑 Default Admin Account
Create a superAdmin account by registering with:
- Email: avasolutionsph@gmail.com
- Then manually update role to 'superAdmin' in database

## 🧪 Testing

1. **Register**: Create new account via marketing website
2. **Login**: Use credentials to access dashboard
3. **Admin**: Create admin account and access admin panel
4. **Booking**: Test customer booking flow

## 📁 File Structure Details

```
backend/
├── config/db.js           # MongoDB connection
├── models/User.js         # User schema
├── routes/auth.js         # Authentication routes
├── routes/admin.js        # Admin routes
├── server.js             # Main server file
├── package.json          # Dependencies
└── .env                  # Environment variables

frontend-marketing/
├── index.html            # Landing page
├── admin.html           # Admin dashboard
└── js/auth.js           # Authentication logic

frontend-pwa/
└── index.html           # Business dashboard

frontend-booking/
└── index.html           # Booking interface
```

## 🔧 Troubleshooting

### CORS Issues
- Ensure backend is running on port 4000
- Check CORS configuration in server.js
- Verify frontend URLs in allowed origins

### Database Connection
- Check MongoDB URI in .env
- Verify network access to MongoDB Atlas
- Check health endpoint: /api/health

### Authentication Problems
- Clear localStorage and try again
- Check JWT token validity
- Verify user exists in database

## 🎯 Next Steps

1. **Add Real Features**: POS, inventory, bookings
2. **Payment Integration**: Stripe/PayPal
3. **Email Notifications**: Booking confirmations
4. **Mobile App**: React Native/Flutter
5. **Advanced Analytics**: Charts and reports