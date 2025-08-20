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
      const { email, password } = JSON.parse(event.body || '{}');
      
      console.log('🔑 Login attempt for:', email);
      
      // For now, let's create a simple test response
      // TODO: Add real database authentication
      if (email && password) {
        const token = 'test-token-' + Date.now();
        const user = {
          id: 'test-user-id',
          email: email,
          firstName: email.split('@')[0],
          lastName: 'User',
          role: 'owner',
          businessName: 'Test Business',
          businessType: 'spa'
        };

        console.log('✅ Login successful for:', email);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            token,
            user
          })
        };
      } else {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Email and password required'
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