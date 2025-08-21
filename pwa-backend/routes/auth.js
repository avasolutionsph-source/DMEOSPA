import express from 'express';

const router = express.Router();

// PWA Authentication - connects to marketing website users
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // For PWA, we'll create a simple user session
    // In production, you'd validate against the marketing website's user database
    // For now, accept any email/password combination for demo purposes
    const jwt = await import('jsonwebtoken');
    
    const token = jwt.default.sign(
      { 
        userId: `pwa-${email.replace('@', '-').replace('.', '-')}`,
        email: email,
        source: 'pwa'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: `pwa-${email.replace('@', '-').replace('.', '-')}`,
        email: email,
        businessName: email.split('@')[0] + ' Business',
        subscriptionPlan: 'pro', // Default to pro for PWA users
        role: 'businessOwner' // They own/manage their business
      },
      entitlements: {
        pos: true,
        dashboard: 'advanced',
        transactions: -1,
        inventory: true,
        employees: true,
        aiAssistant: true,
        analytics: 'advanced',
        support: 'phone-email'
      }
    });
  } catch (error) {
    console.error('PWA login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, businessName, firstName, lastName } = req.body;
    
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'Email, password, and business name required' });
    }

    const jwt = await import('jsonwebtoken');
    
    const token = jwt.default.sign(
      { 
        userId: `pwa-${email.replace('@', '-').replace('.', '-')}`,
        email: email,
        source: 'pwa'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );

    res.json({
      success: true,
      message: 'Registration successful',
      token: token,
      user: {
        id: `pwa-${email.replace('@', '-').replace('.', '-')}`,
        email: email,
        firstName: firstName || email.split('@')[0],
        lastName: lastName || 'User',
        businessName: businessName,
        subscriptionPlan: 'pro', // Default to pro for PWA users
        role: 'businessOwner' // They own/manage their business
      },
      entitlements: {
        pos: true,
        dashboard: 'advanced',
        transactions: -1,
        inventory: true,
        employees: true,
        aiAssistant: true,
        analytics: 'advanced',
        support: 'phone-email'
      }
    });
  } catch (error) {
    console.error('PWA registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
