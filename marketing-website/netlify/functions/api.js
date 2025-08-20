// Netlify Function to handle API requests
// Simple implementation without Express wrapper

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Parse the path to determine the endpoint
  const path = event.path.replace('/.netlify/functions/api', '');
  
  console.log('🔑 Netlify Function called:', event.httpMethod, path);

  // Handle login endpoint
  if (event.httpMethod === 'POST' && path === '/auth/login') {
    try {
      console.log('🔑 Netlify Function: Processing login request');
      console.log('🔑 Request method:', event.httpMethod);
      console.log('🔑 Request path:', path);
      console.log('🔑 Request headers:', event.headers);
      console.log('🔑 Request body length:', event.body?.length || 0);
      
      const { email, password } = JSON.parse(event.body || '{}');
      
      console.log('🔑 Parsed email:', email);
      console.log('🔑 Password provided:', !!password);
      
      // Enhanced test authentication - accept multiple test accounts
      if (email && password) {
        
        // Define test accounts
        const testAccounts = {
          'test@spa.com': { password: 'test123', name: 'Test User', business: 'Test Spa' },
          'demo@spa.com': { password: 'demo123', name: 'Demo User', business: 'Demo Spa' },
          'smnaga@gmail.com': { password: 'any', name: 'SM Naga', business: 'Naga Business' },
          'admin@test.com': { password: 'admin', name: 'Admin User', business: 'Admin Business' }
        };
        
        // Check if it's a test account or accept any credentials
        const testAccount = testAccounts[email.toLowerCase()];
        const isValidLogin = testAccount ? 
          (testAccount.password === password || testAccount.password === 'any') : 
          true; // Accept any email/password combination for testing
        
        if (isValidLogin) {
          const token = 'netlify-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          
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

          console.log('✅ Login successful for:', email);
          console.log('✅ Generated token:', token.substring(0, 20) + '...');
          console.log('✅ User data:', user);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              token,
              user,
              debug: {
                timestamp: new Date().toISOString(),
                functionVersion: '1.1.0',
                testMode: true
              }
            })
          };
        } else {
          console.log('❌ Invalid credentials for test account:', email);
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Invalid credentials for test account'
            })
          };
        }
      } else {
        console.log('❌ Missing email or password');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Email and password required',
            received: { email: !!email, password: !!password }
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