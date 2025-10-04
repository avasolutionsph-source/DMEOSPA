import express from 'express';
import CashDrawerSession from '../../models/CashDrawerSession.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(authenticateToken);

// Get current active session
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId;
    const terminal = req.query.terminal || 'POS Terminal';

    const activeSession = await CashDrawerSession.findActiveSession(userId, terminal);

    if (!activeSession) {
      return res.json({
        success: true,
        data: null,
        message: 'No active cash drawer session found'
      });
    }

    res.json({
      success: true,
      data: activeSession.getSummary()
    });

  } catch (error) {
    console.error('Error getting current cash drawer session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current session',
      details: error.message
    });
  }
});

// Create new cash drawer session (open drawer)
router.post('/sessions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      openingFloat, 
      notes, 
      terminal = 'POS Terminal',
      sessionId,
      openedBy,
      openedByName 
    } = req.body;

    // Validate required fields
    if (!openingFloat || openingFloat < 0) {
      return res.status(400).json({
        success: false,
        error: 'Opening float is required and must be non-negative'
      });
    }

    // Check if there's already an active session
    const existingSession = await CashDrawerSession.findActiveSession(userId, terminal);
    if (existingSession) {
      return res.status(400).json({
        success: false,
        error: 'Cash drawer is already open',
        data: existingSession.getSummary()
      });
    }

    // Create new session
    const newSession = new CashDrawerSession({
      userId,
      sessionId: sessionId || `drawer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      openedBy: openedBy || req.user.email || req.user.userId,
      openedByName: openedByName || req.user.name || req.user.email,
      openingFloat: parseFloat(openingFloat),
      expectedBalance: parseFloat(openingFloat),
      notes,
      terminal,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await newSession.save();

    console.log(`✅ Cash drawer session created: ${newSession.sessionId} by ${newSession.openedByName}`);

    res.status(201).json({
      success: true,
      data: newSession.getSummary(),
      message: 'Cash drawer opened successfully'
    });

  } catch (error) {
    console.error('Error creating cash drawer session:', error);
    
    // Handle duplicate session ID error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Session ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to open cash drawer',
      details: error.message
    });
  }
});

// Update cash drawer session (close drawer)
router.put('/sessions/:sessionId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const { 
      closingBalance, 
      notes,
      closedBy,
      closedByName,
      status 
    } = req.body;

    // Find the session
    const session = await CashDrawerSession.findOne({
      $or: [
        { sessionId },
        { _id: sessionId }
      ],
      userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Cash drawer session not found'
      });
    }

    if (session.status === 'closed') {
      return res.status(400).json({
        success: false,
        error: 'Cash drawer session is already closed'
      });
    }

    // If closing the session
    if (status === 'closed' || closingBalance !== undefined) {
      if (closingBalance === undefined || closingBalance < 0) {
        return res.status(400).json({
          success: false,
          error: 'Closing balance is required and must be non-negative'
        });
      }

      await session.closeSession(
        parseFloat(closingBalance),
        closedBy || req.user.email || req.user.userId,
        closedByName || req.user.name || req.user.email,
        notes
      );

      console.log(`✅ Cash drawer session closed: ${session.sessionId} by ${session.closedByName}`);
    } else {
      // General update
      if (notes !== undefined) session.notes = notes;
      await session.save();
    }

    res.json({
      success: true,
      data: session.getSummary(),
      message: session.status === 'closed' ? 'Cash drawer closed successfully' : 'Session updated successfully'
    });

  } catch (error) {
    console.error('Error updating cash drawer session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cash drawer session',
      details: error.message
    });
  }
});

// Add cash transaction to current session
router.post('/transactions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      transactionId, 
      amount, 
      terminal = 'POS Terminal' 
    } = req.body;

    if (!transactionId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID and positive amount are required'
      });
    }

    // Find active session
    const activeSession = await CashDrawerSession.findActiveSession(userId, terminal);
    
    if (!activeSession) {
      return res.status(400).json({
        success: false,
        error: 'No active cash drawer session found'
      });
    }

    // Add transaction to session
    await activeSession.addCashTransaction(transactionId, parseFloat(amount));

    res.json({
      success: true,
      data: activeSession.getSummary(),
      message: 'Cash transaction added to drawer session'
    });

  } catch (error) {
    console.error('Error adding cash transaction to drawer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add transaction to drawer',
      details: error.message
    });
  }
});

// Get session history
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // 'open', 'closed', or undefined for all

    let query = { userId };
    if (status) {
      query.status = status;
    }

    const sessions = await CashDrawerSession.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100)) // Cap at 100 for performance
      .select('-cashTransactions'); // Exclude transaction details

    const sessionSummaries = sessions.map(session => session.getSummary());

    res.json({
      success: true,
      data: sessionSummaries,
      count: sessionSummaries.length
    });

  } catch (error) {
    console.error('Error getting cash drawer session history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session history',
      details: error.message
    });
  }
});

// Get specific session details
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;

    const session = await CashDrawerSession.findOne({
      $or: [
        { sessionId },
        { _id: sessionId }
      ],
      userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Cash drawer session not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...session.getSummary(),
        cashTransactions: session.cashTransactions
      }
    });

  } catch (error) {
    console.error('Error getting cash drawer session details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session details',
      details: error.message
    });
  }
});

// Get cash drawer statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fromDate, toDate } = req.query;

    const stats = await CashDrawerSession.getSessionStats(userId, fromDate, toDate);

    res.json({
      success: true,
      data: stats[0] || {
        totalSessions: 0,
        totalCashSales: 0,
        totalTransactions: 0,
        totalVariance: 0,
        avgVariance: 0,
        maxVariance: 0,
        minVariance: 0
      }
    });

  } catch (error) {
    console.error('Error getting cash drawer statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

// Force close session (manager override)
router.post('/sessions/:sessionId/force-close', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const { notes, managerCode } = req.body;

    // TODO: Add manager authorization check
    // For now, allow any authenticated user to force close

    const session = await CashDrawerSession.findOne({
      $or: [
        { sessionId },
        { _id: sessionId }
      ],
      userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Cash drawer session not found'
      });
    }

    if (session.status === 'closed') {
      return res.status(400).json({
        success: false,
        error: 'Session is already closed'
      });
    }

    // Force close with current expected balance
    await session.closeSession(
      session.expectedBalance, // Use expected balance as closing balance
      req.user.email || req.user.userId,
      `${req.user.name || req.user.email} (FORCE CLOSE)`,
      `FORCE CLOSED: ${notes || 'No notes provided'}`
    );

    console.log(`⚠️ Cash drawer session force closed: ${session.sessionId} by ${req.user.name || req.user.email}`);

    res.json({
      success: true,
      data: session.getSummary(),
      message: 'Cash drawer session force closed'
    });

  } catch (error) {
    console.error('Error force closing cash drawer session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force close session',
      details: error.message
    });
  }
});

export default router;