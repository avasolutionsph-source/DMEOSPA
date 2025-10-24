import express from 'express';
import User from '../../models/User.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { uploadSingleImage, handleUploadError, deleteOldFile } from '../../middleware/upload.js';

const router = express.Router();

/**
 * GET /api/branding/public
 * Get public branding settings (first admin's branding)
 * Public route - returns branding for display on About/Services pages
 */
router.get('/public', async (req, res) => {
  try {
    console.log('[BRANDING-PUBLIC] Fetching public branding data');

    // Find first admin user with branding data
    const adminUser = await User.findOne({
      role: { $in: ['admin', 'superAdmin'] }
    }).select('branding businessName').sort({ createdAt: -1 });

    console.log('[BRANDING-PUBLIC] Admin user found:', adminUser ? 'Yes' : 'No');
    console.log('[BRANDING-PUBLIC] Has branding:', adminUser?.branding ? 'Yes' : 'No');

    // If no admin user found, return defaults
    if (!adminUser) {
      console.log('[BRANDING-PUBLIC] No admin user found, returning defaults');
      return res.json({
        success: true,
        data: {
          businessName: 'ABC Massage and Spa',
          aboutHeroTitle: 'About ABC Massage and Spa',
          aboutHeroSubtitle: 'Your premier destination for relaxation and wellness',
          aboutStory: '',
          aboutMission: '',
          aboutLocation: 'ABC, Camarines Norte',
          aboutPhone: '09518999577',
          aboutHours: 'Monday - Sunday: 9:00 AM - 9:00 PM',
          values: [],
          teamStats: [],
          servicesHeroTitle: 'Our Services',
          servicesHeroSubtitle: 'Professional massage therapy and spa treatments',
          servicesCategoryTitle: 'Massage Therapy',
          servicesCategoryDesc: 'Our skilled therapists offer a variety of massage techniques',
          services: []
        }
      });
    }

    // Return complete branding settings including About and Services
    const branding = {
      businessName: adminUser.businessName,
      heroImageUrl: adminUser.branding.heroImageUrl || null,
      heroTemplate: adminUser.branding.heroTemplate || 'template1',
      heroTitle: adminUser.branding.heroTitle || 'Massage & Spa',
      heroSubtitle: adminUser.branding.heroSubtitle || 'Where tranquility meets expertise',
      ctaButtonText: adminUser.branding.ctaButtonText || 'Book Now',
      ctaButtonLink: adminUser.branding.ctaButtonLink || '/book-appointment',
      logoUrl: adminUser.branding.logoUrl || null,
      primaryColor: adminUser.branding.primaryColor || '#2c3e50',
      accentColor: adminUser.branding.accentColor || '#3498db',
      showHeroBanner: adminUser.branding.showHeroBanner !== false,
      // About page content
      aboutHeroTitle: adminUser.branding.aboutHeroTitle || 'About ABC Massage and Spa',
      aboutHeroSubtitle: adminUser.branding.aboutHeroSubtitle || 'Your premier destination for relaxation and wellness',
      aboutStory: adminUser.branding.aboutStory || '',
      aboutMission: adminUser.branding.aboutMission || '',
      aboutLocation: adminUser.branding.aboutLocation || 'ABC, Camarines Norte',
      aboutPhone: adminUser.branding.aboutPhone || '09518999577',
      aboutHours: adminUser.branding.aboutHours || 'Monday - Sunday: 9:00 AM - 9:00 PM',
      values: adminUser.branding.values || [],
      teamStats: adminUser.branding.teamStats || [],
      // Services page content
      servicesHeroTitle: adminUser.branding.servicesHeroTitle || 'Our Services',
      servicesHeroSubtitle: adminUser.branding.servicesHeroSubtitle || 'Professional massage therapy and spa treatments',
      servicesCategoryTitle: adminUser.branding.servicesCategoryTitle || 'Massage Therapy',
      servicesCategoryDesc: adminUser.branding.servicesCategoryDesc || 'Our skilled therapists offer a variety of massage techniques',
      services: adminUser.branding.services || []
    };

    res.json({
      success: true,
      data: branding
    });

  } catch (error) {
    console.error('Error fetching public branding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branding settings'
    });
  }
});

/**
 * GET /api/branding/:userId
 * Get branding settings for a specific user/business
 * Public route - anyone can view branding settings
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[BRANDING-GET] Fetching branding for user:', userId);

    const user = await User.findById(userId).select('branding businessName firstName lastName');

    if (!user) {
      console.log('[BRANDING-GET] User not found, returning default branding');
      // Return default branding instead of 404 to allow initialization
      return res.json({
        success: true,
        data: {
          businessName: 'My Business',
          heroImageUrl: null,
          heroTemplate: 'template1',
          heroTitle: 'Massage & Spa',
          heroSubtitle: 'Where tranquility meets expertise',
          ctaButtonText: 'Book Now',
          ctaButtonLink: '/book-appointment',
          logoUrl: null,
          primaryColor: '#2c3e50',
          accentColor: '#3498db',
          gradientColor1: '#667eea',
          gradientColor2: '#764ba2',
          gradientAngle: '135',
          useCustomGradient: false,
          showHeroBanner: true,
          aboutHeroTitle: 'About ABC Massage and Spa',
          aboutHeroSubtitle: 'Your premier destination for relaxation and wellness',
          aboutStory: '',
          aboutMission: '',
          aboutLocation: 'ABC, Camarines Norte',
          aboutPhone: '09518999577',
          aboutHours: 'Monday - Sunday: 9:00 AM - 9:00 PM',
          values: [],
          teamStats: [],
          servicesHeroTitle: 'Our Services',
          servicesHeroSubtitle: 'Professional massage therapy and spa treatments designed for your ultimate relaxation and wellness',
          servicesCategoryTitle: 'Massage Therapy',
          servicesCategoryDesc: 'Our skilled therapists offer a variety of massage techniques to address your specific needs and preferences.',
          services: []
        }
      });
    }

    console.log('[BRANDING-GET] User found, returning branding');

    // Return branding settings with defaults if not set
    const branding = {
      businessName: user.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'My Business',
      heroImageUrl: user.branding?.heroImageUrl || null,
      heroTemplate: user.branding?.heroTemplate || 'template1',
      heroTitle: user.branding?.heroTitle || 'Massage & Spa',
      heroSubtitle: user.branding?.heroSubtitle || 'Where tranquility meets expertise',
      ctaButtonText: user.branding?.ctaButtonText || 'Book Now',
      ctaButtonLink: user.branding?.ctaButtonLink || '/book-appointment',
      logoUrl: user.branding?.logoUrl || null,
      primaryColor: user.branding?.primaryColor || '#2c3e50',
      accentColor: user.branding?.accentColor || '#3498db',
      gradientColor1: user.branding?.gradientColor1 || '#667eea',
      gradientColor2: user.branding?.gradientColor2 || '#764ba2',
      gradientAngle: user.branding?.gradientAngle || '135',
      useCustomGradient: user.branding?.useCustomGradient || false,
      showHeroBanner: user.branding?.showHeroBanner !== false,
      aboutHeroTitle: user.branding?.aboutHeroTitle || 'About ABC Massage and Spa',
      aboutHeroSubtitle: user.branding?.aboutHeroSubtitle || 'Your premier destination for relaxation and wellness',
      aboutStory: user.branding?.aboutStory || '',
      aboutMission: user.branding?.aboutMission || '',
      aboutLocation: user.branding?.aboutLocation || 'ABC, Camarines Norte',
      aboutPhone: user.branding?.aboutPhone || '09518999577',
      aboutHours: user.branding?.aboutHours || 'Monday - Sunday: 9:00 AM - 9:00 PM',
      values: user.branding?.values || [],
      teamStats: user.branding?.teamStats || [],
      servicesHeroTitle: user.branding?.servicesHeroTitle || 'Our Services',
      servicesHeroSubtitle: user.branding?.servicesHeroSubtitle || 'Professional massage therapy and spa treatments designed for your ultimate relaxation and wellness',
      servicesCategoryTitle: user.branding?.servicesCategoryTitle || 'Massage Therapy',
      servicesCategoryDesc: user.branding?.servicesCategoryDesc || 'Our skilled therapists offer a variety of massage techniques to address your specific needs and preferences.',
      services: user.branding?.services || []
    };

    res.json({
      success: true,
      data: branding
    });

  } catch (error) {
    console.error('[BRANDING-GET] Error fetching branding:', error);
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
    console.log('[BRANDING-UPDATE] Request from:', {
      requestUserId: userId,
      authUserId: req.user.userId,
      authId: req.user.id,
      role: req.user.role,
      email: req.user.email
    });

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
      showHeroBanner,
      aboutHeroTitle,
      aboutHeroSubtitle,
      aboutStory,
      aboutMission,
      aboutLocation,
      aboutPhone,
      aboutHours,
      values,
      teamStats,
      services,
      servicesHeroTitle,
      servicesHeroSubtitle,
      servicesCategoryTitle,
      servicesCategoryDesc
    } = req.body;

    // Verify user owns this account or is admin/superAdmin
    if (req.user.userId !== userId && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      console.error('[BRANDING-UPDATE] Unauthorized:', {
        requestUserId: userId,
        authUserId: req.user.userId,
        role: req.user.role
      });
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this branding'
      });
    }

    let user = await User.findById(userId);

    // If user doesn't exist, create a basic user record for branding
    if (!user) {
      console.log('[BRANDING-UPDATE] User not found, creating basic user record');
      user = new User({
        _id: userId,
        email: req.user.email || `admin-${userId}@placeholder.com`,
        firstName: req.user.firstName || 'Admin',
        lastName: req.user.lastName || 'User',
        businessName: 'My Business',
        role: req.user.role || 'admin',
        password: 'placeholder-no-login', // Won't be used since admin authenticates elsewhere
        branding: {}
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

    // About page content
    if (aboutHeroTitle !== undefined) user.branding.aboutHeroTitle = aboutHeroTitle;
    if (aboutHeroSubtitle !== undefined) user.branding.aboutHeroSubtitle = aboutHeroSubtitle;
    if (aboutStory !== undefined) user.branding.aboutStory = aboutStory;
    if (aboutMission !== undefined) user.branding.aboutMission = aboutMission;
    if (aboutLocation !== undefined) user.branding.aboutLocation = aboutLocation;
    if (aboutPhone !== undefined) user.branding.aboutPhone = aboutPhone;
    if (aboutHours !== undefined) user.branding.aboutHours = aboutHours;
    if (values !== undefined) user.branding.values = values;
    if (teamStats !== undefined) user.branding.teamStats = teamStats;

    // Services page content
    if (servicesHeroTitle !== undefined) user.branding.servicesHeroTitle = servicesHeroTitle;
    if (servicesHeroSubtitle !== undefined) user.branding.servicesHeroSubtitle = servicesHeroSubtitle;
    if (servicesCategoryTitle !== undefined) user.branding.servicesCategoryTitle = servicesCategoryTitle;
    if (servicesCategoryDesc !== undefined) user.branding.servicesCategoryDesc = servicesCategoryDesc;
    if (services !== undefined) user.branding.services = services;

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
    console.log('[BRANDING-UPLOAD] Request from:', {
      requestUserId: userId,
      authUserId: req.user.userId,
      authId: req.user.id,
      role: req.user.role,
      email: req.user.email,
      hasFile: !!req.file
    });

    // Verify user owns this account or is admin/superAdmin
    if (req.user.userId !== userId && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      console.error('[BRANDING-UPLOAD] Unauthorized:', {
        requestUserId: userId,
        authUserId: req.user.userId,
        role: req.user.role
      });
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to upload image'
      });
    }

    if (!req.file) {
      console.error('[BRANDING-UPLOAD] No file in request');
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
