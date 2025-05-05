const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const { seedData } = require('../utils/seeder');

// @route   GET /admin/seed
// @desc    Seed the database
// @access  Admin only
router.get('/seed', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    console.log('Seeding database...'); // Log the seeding process
    const result = await seedData();
    if (result.success) {
      res.json({ success: true, message: 'Database seeded successfully' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ success: false, error: 'Error seeding database' });
  }
});

module.exports = router;