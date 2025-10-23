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
      loadServices(); // Load services after branding data is loaded
      loadAboutPage(); // Load About page content
      loadServicesPage(); // Load Services page content
    }
  } catch (error) {
    console.error('Error loading branding:', error);
    showAlert('Failed to load branding settings', 'error');
    loadServices(); // Load default services even if branding fails
    loadAboutPage(); // Load default About page content
    loadServicesPage(); // Load default Services page content
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

  // Load About page content
  document.getElementById('aboutStory').value = currentBranding.aboutStory || '';
  document.getElementById('aboutMission').value = currentBranding.aboutMission || '';
  document.getElementById('aboutLocation').value = currentBranding.aboutLocation || 'ABC, Camarines Norte';

  // Update About preview after loading
  updateAboutPreview();

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
    const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || localStorage.getItem('token');
    console.log('Upload - Token:', token ? 'Found' : 'Missing', 'User ID:', userId);

    if (!token) {
      showAlert('No authentication token found. Please login again.', 'error');
      return;
    }

    if (!userId) {
      showAlert('User ID not found. Please refresh the page.', 'error');
      return;
    }

    const response = await fetch(`${window.API_BASE_URL}/api/branding/${userId}/upload-hero`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('Upload - Response status:', response.status);
    const data = await response.json();
    console.log('Upload - Response data:', data);

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
      console.error('Upload failed:', data.message);
      showAlert(data.message || 'Failed to upload image', 'error');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    showAlert('Failed to upload image: ' + error.message, 'error');
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

  // Add About page listeners
  document.getElementById('aboutStory').addEventListener('input', updateAboutPreview);
  document.getElementById('aboutMission').addEventListener('input', updateAboutPreview);
  document.getElementById('aboutLocation').addEventListener('input', updateAboutPreview);
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
    showHeroBanner: true,
    // About page content
    aboutHeroTitle: document.getElementById('aboutHeroTitle').value,
    aboutHeroSubtitle: document.getElementById('aboutHeroSubtitle').value,
    aboutStory: document.getElementById('aboutStory').value,
    aboutMission: document.getElementById('aboutMission').value,
    aboutLocation: document.getElementById('aboutLocation').value,
    aboutPhone: document.getElementById('aboutPhone').value,
    aboutHours: document.getElementById('aboutHours').value,
    values: window.values || [],
    teamStats: window.teamStats || [],
    // Services page content
    servicesHeroTitle: document.getElementById('servicesHeroTitle')?.value,
    servicesHeroSubtitle: document.getElementById('servicesHeroSubtitle')?.value,
    servicesCategoryTitle: document.getElementById('servicesCategoryTitle')?.value,
    servicesCategoryDesc: document.getElementById('servicesCategoryDesc')?.value,
    services: services
  };

  try {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || localStorage.getItem('token');
    console.log('Save - Token:', token ? 'Found' : 'Missing', 'User ID:', userId);
    console.log('Save - Branding data:', brandingData);

    if (!token) {
      showAlert('No authentication token found. Please login again.', 'error');
      return;
    }

    if (!userId) {
      showAlert('User ID not found. Please refresh the page.', 'error');
      return;
    }

    const response = await fetch(`${window.API_BASE_URL}/api/branding/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(brandingData)
    });

    console.log('Save - Response status:', response.status);
    const data = await response.json();
    console.log('Save - Response data:', data);

    if (data.success) {
      showAlert('Branding settings saved successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } else {
      console.error('Save failed:', data.message);
      showAlert(data.message || 'Failed to save branding', 'error');
    }
  } catch (error) {
    console.error('Error saving branding:', error);
    showAlert('Failed to save branding settings: ' + error.message, 'error');
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

// Service Management
let services = [];

// Load services on page load
function loadServices() {
  // Default services if none exist
  if (!currentBranding.services || currentBranding.services.length === 0) {
    services = [
      { name: 'Swedish Massage', description: 'Classic relaxation massage using long, flowing strokes to ease tension and promote circulation.', duration: '60 min', price: '800' },
      { name: 'Deep Tissue Massage', description: 'Therapeutic massage targeting deep muscle layers to relieve chronic tension and pain.', duration: '60 min', price: '1,000' },
      { name: 'Hot Stone Massage', description: 'Relaxing massage using heated stones to melt away tension and stress.', duration: '75 min', price: '1,200' },
      { name: 'Aromatherapy Massage', description: 'Therapeutic massage enhanced with essential oils for mind and body wellness.', duration: '60 min', price: '900' },
      { name: 'Prenatal Massage', description: 'Gentle massage specially designed for expecting mothers to relieve pregnancy discomfort.', duration: '60 min', price: '950' },
      { name: 'Sports Massage', description: 'Targeted massage for athletes to prevent injury and enhance performance.', duration: '60 min', price: '1,100' }
    ];
  } else {
    services = currentBranding.services;
  }
  renderServices();
}

// Render services to the UI
function renderServices() {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = '';

  services.forEach((service, index) => {
    const serviceCard = document.createElement('div');
    serviceCard.className = 'branding-section';
    serviceCard.style.marginBottom = '16px';
    serviceCard.style.padding = '20px';
    serviceCard.style.border = '1px solid #e5e7eb';

    serviceCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0;">Service ${index + 1}</h3>
        <button class="btn btn-danger" onclick="removeService(${index})" style="font-size: 0.875rem; padding: 6px 12px;">Remove</button>
      </div>

      <div class="form-group">
        <label>Service Name</label>
        <input type="text" value="${service.name}" onchange="updateService(${index}, 'name', this.value)" placeholder="e.g., Swedish Massage">
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea rows="2" onchange="updateService(${index}, 'description', this.value)" placeholder="Brief description of the service">${service.description}</textarea>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="form-group">
          <label>Duration</label>
          <input type="text" value="${service.duration}" onchange="updateService(${index}, 'duration', this.value)" placeholder="e.g., 60 min">
        </div>

        <div class="form-group">
          <label>Price (₱)</label>
          <input type="text" value="${service.price}" onchange="updateService(${index}, 'price', this.value)" placeholder="e.g., 800">
        </div>
      </div>
    `;

    container.appendChild(serviceCard);
  });

  // Update services preview after rendering
  updateServicesPreview();
}

// Add new service
function addService() {
  services.push({
    name: 'New Service',
    description: 'Service description',
    duration: '60 min',
    price: '0'
  });
  renderServices();
}

// Remove service
function removeService(index) {
  if (confirm('Are you sure you want to remove this service?')) {
    services.splice(index, 1);
    renderServices();
  }
}

// Update service field
function updateService(index, field, value) {
  services[index][field] = value;
  updateServicesPreview();
}

// Update About preview
function updateAboutPreview() {
  const preview = document.getElementById('aboutPreview');
  const story = document.getElementById('aboutStory').value;
  const mission = document.getElementById('aboutMission').value;
  const location = document.getElementById('aboutLocation').value;

  let html = '';

  if (story) {
    html += `<div style="margin-bottom: 20px;">
      <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #1d1d1f;">Our Story</h4>
      <p style="margin: 0; white-space: pre-wrap;">${story}</p>
    </div>`;
  }

  if (mission) {
    html += `<div style="margin-bottom: 20px;">
      <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #1d1d1f;">Our Mission</h4>
      <p style="margin: 0; white-space: pre-wrap;">${mission}</p>
    </div>`;
  }

  if (location) {
    html += `<div>
      <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #1d1d1f;">Location</h4>
      <p style="margin: 0;">${location}</p>
    </div>`;
  }

  if (!html) {
    html = '<p style="color: #86868b; font-style: italic;">Your About page preview will appear here as you type...</p>';
  }

  preview.innerHTML = html;
}

// Update Services preview
function updateServicesPreview() {
  const preview = document.getElementById('servicesPreview');

  if (services.length === 0) {
    preview.innerHTML = '<p style="color: #86868b; font-style: italic; grid-column: 1/-1; text-align: center;">Your services will appear here. Click "+ Add New Service" to get started.</p>';
    return;
  }

  preview.innerHTML = '';

  services.forEach(service => {
    const card = document.createElement('div');
    card.style.cssText = 'background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e5; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';

    card.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px;">
        <i class="fas fa-spa" style="font-size: 32px; color: #0066cc;"></i>
      </div>
      <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #1d1d1f; text-align: center;">${service.name || 'Service Name'}</h4>
      <p style="font-size: 13px; color: #6e6e73; margin: 0 0 12px 0; line-height: 1.4; text-align: center;">${service.description || 'Service description'}</p>
      <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #f0f0f0;">
        <span style="font-size: 13px; color: #6e6e73;">${service.duration || '60 min'}</span>
        <span style="font-size: 15px; font-weight: 600; color: #0066cc;">₱${service.price || '0'}</span>
      </div>
    `;

    preview.appendChild(card);
  });
}
