import express from 'express';
import User from '../../models/User.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { uploadSingleImage, handleUploadError, deleteOldFile } from '../../middleware/upload.js';

const router = express.Router();

/**
 * GET /api/branding/:userId
 * Get branding settings for a specific user/business
 * Public route - anyone can view branding settings
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('branding businessName');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return branding settings with defaults if not set
    const branding = {
      businessName: user.businessName,
      heroImageUrl: user.branding?.heroImageUrl || null,
      heroTemplate: user.branding?.heroTemplate || 'template1',
      heroTitle: user.branding?.heroTitle || 'Massage & Spa',
      heroSubtitle: user.branding?.heroSubtitle || 'Where tranquility meets expertise',
      ctaButtonText: user.branding?.ctaButtonText || 'Book Now',
      ctaButtonLink: user.branding?.ctaButtonLink || '/book-appointment',
      logoUrl: user.branding?.logoUrl || null,
      primaryColor: user.branding?.primaryColor || '#2c3e50',
      accentColor: user.branding?.accentColor || '#3498db',
      showHeroBanner: user.branding?.showHeroBanner !== false // Default to true
    };

    res.json({
      success: true,
      data: branding
    });

  } catch (error) {
    console.error('Error fetching branding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branding settings'
    });
  }
});

/**
 * PUT /api/branding/:userId
 * Update branding settings
 * Protected route - requires authentication
 */
router.put('/:userId', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      heroTemplate,
      heroTitle,
      heroSubtitle,
      ctaButtonText,
      ctaButtonLink,
      primaryColor,
      accentColor,
      gradientColor1,
      gradientColor2,
      gradientAngle,
      useCustomGradient,
      showHeroBanner
    } = req.body;

    // Verify user owns this account or is admin/superAdmin
    if (req.user.userId !== userId && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this branding'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update branding fields
    if (!user.branding) {
      user.branding = {};
    }

    if (heroTemplate !== undefined) user.branding.heroTemplate = heroTemplate;
    if (heroTitle !== undefined) user.branding.heroTitle = heroTitle;
    if (heroSubtitle !== undefined) user.branding.heroSubtitle = heroSubtitle;
    if (ctaButtonText !== undefined) user.branding.ctaButtonText = ctaButtonText;
    if (ctaButtonLink !== undefined) user.branding.ctaButtonLink = ctaButtonLink;
    if (primaryColor !== undefined) user.branding.primaryColor = primaryColor;
    if (accentColor !== undefined) user.branding.accentColor = accentColor;
    if (gradientColor1 !== undefined) user.branding.gradientColor1 = gradientColor1;
    if (gradientColor2 !== undefined) user.branding.gradientColor2 = gradientColor2;
    if (gradientAngle !== undefined) user.branding.gradientAngle = gradientAngle;
    if (useCustomGradient !== undefined) user.branding.useCustomGradient = useCustomGradient;
    if (showHeroBanner !== undefined) user.branding.showHeroBanner = showHeroBanner;

    user.branding.lastUpdated = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Branding settings updated successfully',
      data: user.branding
    });

  } catch (error) {
    console.error('Error updating branding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update branding settings'
    });
  }
});

/**
 * POST /api/branding/:userId/upload-hero
 * Upload custom hero image
 * Protected route - requires authentication
 */
router.post('/:userId/upload-hero', authenticateJWT, uploadSingleImage, handleUploadError, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user owns this account or is admin/superAdmin
    if (req.user.userId !== userId && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to upload image'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old hero image if exists
    if (user.branding?.heroImageUrl) {
      deleteOldFile(user.branding.heroImageUrl);
    }

    // Initialize branding object if it doesn't exist
    if (!user.branding) {
      user.branding = {};
    }

    // Save new image URL
    const imageUrl = `/uploads/branding/${req.file.filename}`;
    user.branding.heroImageUrl = imageUrl;
    user.branding.heroTemplate = 'custom'; // Mark as custom template
    user.branding.lastUpdated = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Hero image uploaded successfully',
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('Error uploading hero image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload hero image'
    });
  }
});

/**
 * POST /api/branding/:userId/upload-logo
 * Upload custom logo
 * Protected route - requires authentication
 */
router.post('/:userId/upload-logo', authenticateJWT, uploadSingleImage, handleUploadError, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user owns this account or is admin/superAdmin
    if (req.user.userId !== userId && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to upload logo'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old logo if exists
    if (user.branding?.logoUrl) {
      deleteOldFile(user.branding.logoUrl);
    }

    // Initialize branding object if it doesn't exist
    if (!user.branding) {
      user.branding = {};
    }

    // Save new logo URL
    const logoUrl = `/uploads/branding/${req.file.filename}`;
    user.branding.logoUrl = logoUrl;
    user.branding.lastUpdated = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUrl: logoUrl,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo'
    });
  }
});

/**
 * DELETE /api/branding/:userId/hero-image
 * Delete custom hero image (revert to template)
 * Protected route - requires authentication
 */
router.delete('/:userId/hero-image', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user owns this account or is admin/superAdmin
    if (req.user.userId !== userId && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete image'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete the file
    if (user.branding?.heroImageUrl) {
      deleteOldFile(user.branding.heroImageUrl);
      user.branding.heroImageUrl = null;
      user.branding.heroTemplate = 'template1'; // Revert to default template
      user.branding.lastUpdated = new Date();
      await user.save();
    }

    res.json({
      success: true,
      message: 'Hero image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting hero image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete hero image'
    });
  }
});

export default router;
