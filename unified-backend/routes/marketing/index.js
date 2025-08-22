import express from 'express';

const router = express.Router();

// GET / route
router.get('/', (req, res) => {
  res.json({ message: 'Marketing route placeholder' });
});

// GET /health route
router.get('/health', (req, res) => {
  res.json({ message: 'Marketing health check placeholder' });
});

export default router;