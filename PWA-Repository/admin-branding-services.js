// Services Page Management Functions

// Load Services Page data
function loadServicesPage() {
  // Load Services page fields
  document.getElementById('servicesHeroTitle').value = currentBranding.servicesHeroTitle || 'Our Services';
  document.getElementById('servicesHeroSubtitle').value = currentBranding.servicesHeroSubtitle || 'Professional massage therapy and spa treatments designed for your ultimate relaxation and wellness';
  document.getElementById('servicesCategoryTitle').value = currentBranding.servicesCategoryTitle || 'Massage Therapy';
  document.getElementById('servicesCategoryDesc').value = currentBranding.servicesCategoryDesc || 'Our skilled therapists offer a variety of massage techniques to address your specific needs and preferences.';

  // Setup listeners
  document.getElementById('servicesHeroTitle').addEventListener('input', updateServicesPreviewIframe);
  document.getElementById('servicesHeroSubtitle').addEventListener('input', updateServicesPreviewIframe);
  document.getElementById('servicesCategoryTitle').addEventListener('input', updateServicesPreviewIframe);
  document.getElementById('servicesCategoryDesc').addEventListener('input', updateServicesPreviewIframe);

  // Initial preview update
  updateServicesPreviewIframe();
}

// Full Page Preview for Services
function updateServicesPreviewIframe() {
  const iframe = document.getElementById('servicesPagePreview');
  if (!iframe) return;

  // Get all the data
  const servicesData = {
    heroTitle: document.getElementById('servicesHeroTitle')?.value || 'Our Services',
    heroSubtitle: document.getElementById('servicesHeroSubtitle')?.value || 'Professional massage therapy and spa treatments',
    categoryTitle: document.getElementById('servicesCategoryTitle')?.value || 'Massage Therapy',
    categoryDesc: document.getElementById('servicesCategoryDesc')?.value || 'Our skilled therapists offer a variety of massage techniques',
    services: services || []
  };

  // Create preview HTML
  const previewHTML = generateServicesPreviewHTML(servicesData);

  // Write to iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(previewHTML);
  iframeDoc.close();
}

function generateServicesPreviewHTML(data) {
  // Icon mapping (same as in services.html)
  const iconMap = {
    'swedish': 'fa-spa',
    'deep tissue': 'fa-hand-rock',
    'hot stone': 'fa-fire',
    'aromatherapy': 'fa-seedling',
    'prenatal': 'fa-baby',
    'sports': 'fa-running',
    'thai': 'fa-user-ninja',
    'couples': 'fa-heart',
    'reflexology': 'fa-shoe-prints',
    'body scrub': 'fa-shower',
    'facial': 'fa-smile-beam',
    'manicure': 'fa-hand-sparkles',
    'pedicure': 'fa-socks',
    'waxing': 'fa-leaf',
    'default': 'fa-spa'
  };

  function getServiceIcon(serviceName) {
    const name = serviceName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (name.includes(key)) return icon;
    }
    return 'fa-spa';
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Services - Preview</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <link rel="stylesheet" href="${window.location.origin}/assets/style.css">
    </head>
    <body>
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <div class="hero-content">
            <h1>${data.heroTitle || 'Our Services'}</h1>
            <p class="hero-subtitle">${data.heroSubtitle || 'Professional massage therapy and spa treatments'}</p>
          </div>
        </div>
      </section>

      <!-- Services Content -->
      <section class="services-section">
        <div class="container">
          <!-- Service Category -->
          <div class="service-category">
            <h2>${data.categoryTitle || 'Massage Therapy'}</h2>
            <p>${data.categoryDesc || 'Our skilled therapists offer a variety of massage techniques to address your specific needs and preferences.'}</p>

            <div class="services-grid">
              ${data.services && data.services.length > 0 ? data.services.map(service => `
                <div class="service-card">
                  <div class="service-icon">
                    <i class="fas ${getServiceIcon(service.name)}"></i>
                  </div>
                  <h3>${service.name || 'Service Name'}</h3>
                  <p>${service.description || 'Service description'}</p>
                  <div class="service-details">
                    <span class="duration">${service.duration || '60 min'}</span>
                    <span class="price">₱${service.price || '0'}</span>
                  </div>
                </div>
              `).join('') : '<p style="text-align: center; color: #6e6e73; padding: 2rem;">No services added yet. Click "+ Add New Service" to get started.</p>'}
            </div>
          </div>
        </div>
      </section>
    </body>
    </html>
  `;
}

function openServicesPreview() {
  const iframe = document.getElementById('servicesPagePreview');
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  const newWindow = window.open();
  newWindow.document.write(iframeDoc.documentElement.outerHTML);
  newWindow.document.close();
}
