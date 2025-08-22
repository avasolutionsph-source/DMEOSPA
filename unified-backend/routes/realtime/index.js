import express from 'express';

const router = express.Router();

// GET / route
router.get('/', (req, res) => {
  res.json({ message: 'Realtime route placeholder' });
});

// GET /connect route
router.get('/connect', (req, res) => {
  res.json({ message: 'Realtime connect placeholder' });
});

export default router;