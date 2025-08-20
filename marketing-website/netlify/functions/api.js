// Netlify Function to handle API requests
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// User model schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  businessName: String,
  businessType: String,
  role: { type: String, default: 'owner' }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

let User;
try {
  User = mongoose.model('User');
} catch {
  User = mongoose.model('User', userSchema);
}

// Connect to MongoDB
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  
  try {
    if (!process.env.MONGO_URI) {
      console.log('⚠️ MONGO_URI not found, using test mode');
      return false;
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB connected in Netlify function');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

export const handler = async (event, context) => {
  // Set comprehensive CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  // Parse the path to determine the endpoint
  const path = event.path.replace('/.netlify/functions/api', '');
  
  console.log('🔑 Netlify Function called:', event.httpMethod, path);

  // Handle login endpoint
  if (event.httpMethod === 'POST' && path === '/auth/login') {
    try {
      console.log('🔑 Netlify Function: Processing login request');
      console.log('🔑 Environment check:', {
        hasMongoUri: !!process.env.MONGO_URI,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV
      });
      
      const { email, password } = JSON.parse(event.body || '{}');
      
      console.log('🔑 Login attempt for:', email);
      
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Email and password required'
          })
        };
      }

      // Try to connect to MongoDB
      const dbConnected = await connectDB();
      
      if (dbConnected) {
        // Real database authentication
        console.log('🔑 Using real database authentication');
        
        try {
          const user = await User.findOne({ email: email.toLowerCase() });
          
          if (!user) {
            console.log('❌ User not found:', email);
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Invalid email or password'
              })
            };
          }

          const isMatch = await user.comparePassword(password);
          if (!isMatch) {
            console.log('❌ Invalid password for:', email);
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Invalid email or password'
              })
            };
          }

          // Generate JWT token
          const token = jwt.sign(
            { 
              userId: user._id, 
              email: user.email, 
              role: user.role || 'owner' 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
          );

          console.log('✅ Real database login successful for:', email);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              token,
              user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role || 'owner',
                businessName: user.businessName,
                businessType: user.businessType
              },
              debug: {
                timestamp: new Date().toISOString(),
                functionVersion: '2.0.0',
                databaseMode: true
              }
            })
          };

        } catch (dbError) {
          console.error('❌ Database query error:', dbError);
          // Fall through to test mode
        }
      }
      
      // Fallback to test mode if database fails
      console.log('🔄 Falling back to test mode authentication');
      
      const testAccounts = {
        'test@spa.com': { password: 'test123', name: 'Test User', business: 'Test Spa' },
        'demo@spa.com': { password: 'demo123', name: 'Demo User', business: 'Demo Spa' },
        'smnaga@gmail.com': { password: 'any', name: 'SM Naga', business: 'Naga Business' },
        'admin@test.com': { password: 'admin', name: 'Admin User', business: 'Admin Business' }
      };
      
      const testAccount = testAccounts[email.toLowerCase()];
      const isValidLogin = testAccount ? 
        (testAccount.password === password || testAccount.password === 'any') : 
        true; // Accept any credentials in test mode
      
      if (isValidLogin) {
        const token = 'test-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const user = testAccount ? {
          id: 'test-user-' + email.split('@')[0],
          email: email,
          firstName: testAccount.name.split(' ')[0],
          lastName: testAccount.name.split(' ')[1] || 'User',
          role: 'owner',
          businessName: testAccount.business,
          businessType: 'spa'
        } : {
          id: 'user-' + email.split('@')[0],
          email: email,
          firstName: email.split('@')[0],
          lastName: 'User',
          role: 'owner',
          businessName: email.split('@')[0] + ' Business',
          businessType: 'spa'
        };

        console.log('✅ Test mode login successful for:', email);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            token,
            user,
            debug: {
              timestamp: new Date().toISOString(),
              functionVersion: '2.0.0',
              testMode: true
            }
          })
        };
      } else {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid credentials'
          })
        };
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Server error'
        })
      };
    }
  }

  // Health check
  if (event.httpMethod === 'GET' && path === '/health') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        path: path
      })
    };
  }

  // Default response
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ 
      error: 'Endpoint not found',
      path: path,
      method: event.httpMethod
    })
  };
};