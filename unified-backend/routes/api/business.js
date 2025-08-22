import express from 'express';

const router = express.Router();

// GET /api/business
router.get('/', async (req, res) => {
  res.json({ 
    message: 'Business info placeholder',
    business: {
      id: 'placeholder-id',
      name: 'Sample Business',
      type: 'retail'
    }
  });
});

// POST /api/business
router.post('/', async (req, res) => {
  res.json({ 
    message: 'Business created placeholder',
    success: true 
  });
});

// PUT /api/business/:id
router.put('/:id', async (req, res) => {
  res.json({ 
    message: 'Business updated placeholder',
    success: true 
  });
});

// DELETE /api/business/:id
router.delete('/:id', async (req, res) => {
  res.json({ 
    message: 'Business deleted placeholder',
    success: true 
  });
});

export default router;