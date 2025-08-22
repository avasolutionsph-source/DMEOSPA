import express from 'express';

const router = express.Router();

// GET / route
router.get('/', (req, res) => {
  res.json({ message: 'Admin route placeholder' });
});

// GET /dashboard route
router.get('/dashboard', (req, res) => {
  res.json({ message: 'Admin dashboard placeholder' });
});

export default router;