import express from 'express';
import { authenticateJWT, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/sync/status - Check sync system status
router.get('/status', optionalAuth, (req, res) => {
  res.json({ 
    status: 'operational',
    authenticated: !!req.user,
    timestamp: new Date().toISOString()
  });
});

// POST /api/sync/products - Sync products
router.post('/products', optionalAuth, async (req, res) => {
  try {
    const { products, lastSync } = req.body;
    
    // For now, just acknowledge the sync
    res.json({ 
      success: true,
      message: 'Products sync received',
      count: products?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Products sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/transactions - Sync transactions
router.post('/transactions', optionalAuth, async (req, res) => {
  try {
    const { transactions, lastSync } = req.body;
    
    res.json({ 
      success: true,
      message: 'Transactions sync received',
      count: transactions?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transactions sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/employees - Sync employees
router.post('/employees', optionalAuth, async (req, res) => {
  try {
    const { employees, lastSync } = req.body;
    
    res.json({ 
      success: true,
      message: 'Employees sync received',
      count: employees?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Employees sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/inventory - Sync inventory
router.post('/inventory', optionalAuth, async (req, res) => {
  try {
    const { inventory, lastSync } = req.body;
    
    res.json({ 
      success: true,
      message: 'Inventory sync received',
      count: inventory?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Inventory sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/chatbot-history - Sync chatbot history
router.post('/chatbot-history', optionalAuth, async (req, res) => {
  try {
    const { history, lastSync } = req.body;
    
    res.json({ 
      success: true,
      message: 'Chatbot history sync received',
      count: history?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chatbot history sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/all - Sync all data
router.post('/all', optionalAuth, async (req, res) => {
  try {
    const { data, lastSync } = req.body;
    
    res.json({ 
      success: true,
      message: 'Full sync received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Full sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// GET /api/sync/last - Get last sync timestamp
router.get('/last', authenticateJWT, async (req, res) => {
  try {
    // In production, fetch from database
    res.json({ 
      lastSync: new Date().toISOString(),
      userId: req.userId
    });
  } catch (error) {
    console.error('Get last sync error:', error);
    res.status(500).json({ error: 'Failed to get last sync', details: error.message });
  }
});

export default router;