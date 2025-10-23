// Admin Branding Panel JavaScript
// Handles template selection, image upload, and branding customization

// API Configuration
window.API_BASE_URL = window.API_BASE_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:4001'
    : 'https://daetspa-backend.onrender.com');

// State
let currentBranding = {
  heroTemplate: 'template1',
  heroImageUrl: null,
  heroTitle: 'Massage & Spa',
  heroSubtitle: 'Where tranquility meets expertise',
  ctaButtonText: 'Book Now',
  ctaButtonLink: '/book-appointment',
  primaryColor: '#2c3e50',
  accentColor: '#3498db'
};

let selectedImage = null;
let userId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Get userId from localStorage (from login) - try multiple token names
  const adminToken = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || localStorage.getItem('token');
  if (!adminToken) {
    console.error('No authentication token found');
    window.location.href = '/admin-login.html';
    return;
  }

  // Decode JWT to get userId
  try {
    const payload = JSON.parse(atob(adminToken.split('.')[1]));
    userId = payload.userId || payload.id; // Try both field names
    console.log('User ID extracted:', userId);
    console.log('User role:', payload.role);

    // Check if user is admin or superAdmin
    if (payload.role !== 'admin' && payload.role !== 'superAdmin') {
      console.error('Access denied: User role is not admin or superAdmin');
      showAlert('Access denied. Admin privileges required.', 'error');
      setTimeout(() => window.location.href = '/', 2000);
      return;
    }

    if (!userId) {
      throw new Error('User ID not found in token');
    }

    loadBrandingSettings();
  } catch (error) {
    console.error('Error decoding token:', error);
    showAlert('Invalid session. Please login again.', 'error');
    setTimeout(() => window.location.href = '/admin-login.html', 2000);
  }

  // Setup drag and drop
  setupDragAndDrop();

  // Setup live preview updates
  setupLivePreview();
});

// Load existing branding settings
async function loadBrandingSettings() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/branding/${userId}`);
    const data = await response.json();

    if (data.success) {
      currentBranding = data.data;
      applyBrandingToForm();
      updateLivePreview();
    }
  } catch (error) {
    console.error('Error loading branding:', error);
    showAlert('Failed to load branding settings', 'error');
  }
}

// Apply loaded branding to form
function applyBrandingToForm() {
  document.getElementById('hero-title').value = currentBranding.heroTitle || '';
  document.getElementById('hero-subtitle').value = currentBranding.heroSubtitle || '';
  document.getElementById('cta-text').value = currentBranding.ctaButtonText || '';
  document.getElementById('cta-link').value = currentBranding.ctaButtonLink || '';
  document.getElementById('primary-color').value = currentBranding.primaryColor || '#2c3e50';
  document.getElementById('accent-color').value = currentBranding.accentColor || '#3498db';

  // Select current template
  const templates = document.querySelectorAll('.template-preview-card');
  templates.forEach(card => {
    if (card.dataset.template === currentBranding.heroTemplate) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Show custom template if custom image exists
  if (currentBranding.heroTemplate === 'custom' && currentBranding.heroImageUrl) {
    const customCard = document.getElementById('custom-template-card');
    customCard.style.backgroundImage = `url(${window.API_BASE_URL}${currentBranding.heroImageUrl})`;
    customCard.style.backgroundSize = 'cover';
    customCard.style.backgroundPosition = 'center';
  }
}

// Template selection
function selectTemplate(templateName) {
  currentBranding.heroTemplate = templateName;

  // Update UI
  const templates = document.querySelectorAll('.template-preview-card');
  templates.forEach(card => {
    if (card.dataset.template === templateName) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Show/hide upload section
  const uploadSection = document.getElementById('upload-section');
  if (templateName === 'custom') {
    uploadSection.style.display = 'block';
  } else {
    uploadSection.style.display = 'none';
    currentBranding.heroImageUrl = null; // Clear custom image if switching to template
  }

  updateLivePreview();
}

// Drag and drop setup
function setupDragAndDrop() {
  const uploadArea = document.getElementById('upload-area');

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragging');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragging');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragging');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
  });
}

// Handle image selection
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (file) {
    handleImageFile(file);
  }
}

// Process image file
function handleImageFile(file) {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showAlert('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.', 'error');
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showAlert('File too large. Maximum size is 5MB.', 'error');
    return;
  }

  selectedImage = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('image-preview');
    preview.src = e.target.result;
    document.getElementById('image-preview-container').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// Clear image preview
function clearImagePreview() {
  selectedImage = null;
  document.getElementById('image-preview-container').style.display = 'none';
  document.getElementById('hero-image-input').value = '';
}

// Upload hero image
async function uploadHeroImage() {
  if (!selectedImage) {
    showAlert('Please select an image first', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('image', selectedImage);

  try {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE_URL}/api/branding/${userId}/upload-hero`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      currentBranding.heroImageUrl = data.data.imageUrl;
      currentBranding.heroTemplate = 'custom';

      // Update custom template card
      const customCard = document.getElementById('custom-template-card');
      customCard.style.backgroundImage = `url(${window.API_BASE_URL}${data.data.imageUrl})`;
      customCard.style.backgroundSize = 'cover';
      customCard.style.backgroundPosition = 'center';

      showAlert('Image uploaded successfully!', 'success');
      clearImagePreview();
      updateLivePreview();
    } else {
      showAlert(data.message || 'Failed to upload image', 'error');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    showAlert('Failed to upload image', 'error');
  }
}

// Setup live preview updates
function setupLivePreview() {
  document.getElementById('hero-title').addEventListener('input', updateLivePreview);
  document.getElementById('hero-subtitle').addEventListener('input', updateLivePreview);
  document.getElementById('cta-text').addEventListener('input', updateLivePreview);
  document.getElementById('primary-color').addEventListener('input', updateLivePreview);
  document.getElementById('accent-color').addEventListener('input', updateLivePreview);

  // Add gradient color listeners
  document.getElementById('gradient-color-1').addEventListener('input', updateLivePreview);
  document.getElementById('gradient-color-2').addEventListener('input', updateLivePreview);
  document.getElementById('gradient-angle').addEventListener('change', updateLivePreview);
  document.getElementById('use-custom-gradient').addEventListener('change', updateLivePreview);
}

// Update live preview
function updateLivePreview() {
  const preview = document.getElementById('live-preview');
  const title = document.getElementById('preview-title');
  const subtitle = document.getElementById('preview-subtitle');
  const cta = document.getElementById('preview-cta');

  // Update text
  title.textContent = document.getElementById('hero-title').value || 'Massage & Spa';
  subtitle.textContent = document.getElementById('hero-subtitle').value || 'Where tranquility meets expertise';
  cta.textContent = document.getElementById('cta-text').value || 'Book Now';

  // Update button colors from brand colors
  const primaryColor = document.getElementById('primary-color').value;
  const accentColor = document.getElementById('accent-color').value;

  // Apply primary color to button background
  cta.style.background = primaryColor;
  cta.style.borderColor = primaryColor;

  // Apply accent color to button text (or keep white if primary is dark)
  // Simple contrast check: if primary color is dark, use white text
  const brightness = getBrightness(primaryColor);
  cta.style.color = brightness > 128 ? '#1d1d1f' : '#ffffff';

  // Update background
  preview.className = 'live-preview';

  // Check if custom gradient is enabled
  const useCustomGradient = document.getElementById('use-custom-gradient').checked;

  if (useCustomGradient) {
    // Apply custom gradient
    const color1 = document.getElementById('gradient-color-1').value;
    const color2 = document.getElementById('gradient-color-2').value;
    const angle = document.getElementById('gradient-angle').value;

    preview.style.background = `linear-gradient(${angle}, ${color1} 0%, ${color2} 100%)`;
    preview.classList.add('template-based'); // Keep template styling for overlay
  } else if (currentBranding.heroTemplate === 'custom' && currentBranding.heroImageUrl) {
    // Use custom uploaded image
    preview.classList.add('hero-custom');
    preview.style.backgroundImage = `url(${window.API_BASE_URL}${currentBranding.heroImageUrl})`;
  } else {
    // Use selected template
    preview.classList.add(`hero-${currentBranding.heroTemplate}`);
    preview.style.background = ''; // Clear custom gradient
  }
}

// Save all branding settings
async function saveBranding() {
  const brandingData = {
    heroTemplate: currentBranding.heroTemplate,
    heroTitle: document.getElementById('hero-title').value,
    heroSubtitle: document.getElementById('hero-subtitle').value,
    ctaButtonText: document.getElementById('cta-text').value,
    ctaButtonLink: document.getElementById('cta-link').value,
    primaryColor: document.getElementById('primary-color').value,
    accentColor: document.getElementById('accent-color').value,
    gradientColor1: document.getElementById('gradient-color-1').value,
    gradientColor2: document.getElementById('gradient-color-2').value,
    gradientAngle: document.getElementById('gradient-angle').value,
    useCustomGradient: document.getElementById('use-custom-gradient').checked,
    showHeroBanner: true
  };

  try {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE_URL}/api/branding/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(brandingData)
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Branding settings saved successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } else {
      showAlert(data.message || 'Failed to save branding', 'error');
    }
  } catch (error) {
    console.error('Error saving branding:', error);
    showAlert('Failed to save branding settings', 'error');
  }
}

// Show alert message
function showAlert(message, type) {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert alert-${type} show`;

  setTimeout(() => {
    alert.classList.remove('show');
  }, 5000);
}

// Helper function to calculate brightness of a color
function getBrightness(color) {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate brightness using standard formula
  return (r * 299 + g * 587 + b * 114) / 1000;
}
