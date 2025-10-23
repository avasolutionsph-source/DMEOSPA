// About Page Management Functions
// This file contains all functions for managing the About page content

// Make these global so they can be accessed from both files
window.values = window.values || [];
window.teamStats = window.teamStats || [];

// Icon options for Font Awesome
const iconOptions = [
  'fa-heart', 'fa-star', 'fa-leaf', 'fa-shield-alt', 'fa-users', 'fa-handshake',
  'fa-award', 'fa-gem', 'fa-spa', 'fa-smile', 'fa-thumbs-up', 'fa-certificate',
  'fa-check-circle', 'fa-lightbulb', 'fa-fire', 'fa-bolt', 'fa-crown', 'fa-trophy'
];

// Load About Page data
function loadAboutPage() {
  // Use window.values and window.teamStats for global access
  const values = window.values;
  const teamStats = window.teamStats;
  // Load values
  if (currentBranding.values && currentBranding.values.length > 0) {
    window.values = currentBranding.values;
  } else {
    // Default values
    window.values = [
      { icon: 'fa-heart', title: 'Care & Compassion', description: 'We treat every client with genuine care and attention to their individual needs.' },
      { icon: 'fa-star', title: 'Excellence', description: 'We strive for the highest standards in all our treatments and services.' },
      { icon: 'fa-leaf', title: 'Natural Healing', description: 'We believe in the power of natural therapeutic treatments for holistic wellness.' },
      { icon: 'fa-shield-alt', title: 'Safety & Hygiene', description: 'We maintain the highest standards of cleanliness and safety protocols.' }
    ];
  }
  renderValues();

  // Load team stats
  if (currentBranding.teamStats && currentBranding.teamStats.length > 0) {
    window.teamStats = currentBranding.teamStats;
  } else {
    // Default stats
    window.teamStats = [
      { number: '5+', label: 'Years of Experience' },
      { number: '10+', label: 'Licensed Therapists' },
      { number: '1000+', label: 'Happy Clients' },
      { number: '15+', label: 'Treatment Options' }
    ];
  }
  renderTeamStats();

  // Load other About fields
  document.getElementById('aboutHeroTitle').value = currentBranding.aboutHeroTitle || 'About ABC Massage and Spa';
  document.getElementById('aboutHeroSubtitle').value = currentBranding.aboutHeroSubtitle || 'Your premier destination for relaxation and wellness';
  document.getElementById('aboutPhone').value = currentBranding.aboutPhone || '09518999577';
  document.getElementById('aboutHours').value = currentBranding.aboutHours || 'Monday - Sunday: 9:00 AM - 9:00 PM';

  // Setup listeners for live updates
  document.getElementById('aboutHeroTitle').addEventListener('input', applyAboutContentToIframe);
  document.getElementById('aboutHeroSubtitle').addEventListener('input', applyAboutContentToIframe);
  document.getElementById('aboutStory').addEventListener('input', applyAboutContentToIframe);
  document.getElementById('aboutMission').addEventListener('input', applyAboutContentToIframe);
  document.getElementById('aboutPhone').addEventListener('input', applyAboutContentToIframe);
  document.getElementById('aboutHours').addEventListener('input', applyAboutContentToIframe);
  document.getElementById('aboutLocation').addEventListener('input', applyAboutContentToIframe);

  // Initial load of actual About page in iframe
  updateAboutPreviewIframe();
}

// Values Management
function renderValues() {
  const container = document.getElementById('valuesContainer');
  if (!container) return;

  container.innerHTML = '';

  window.values.forEach((value, index) => {
    const valueCard = document.createElement('div');
    valueCard.style.cssText = 'background: #f9f9fb; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb;';

    valueCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin: 0; font-size: 15px;">Value ${index + 1}</h4>
        <button class="btn btn-danger" onclick="removeValue(${index})" style="font-size: 0.75rem; padding: 4px 8px;">Remove</button>
      </div>

      <div class="form-group">
        <label>Icon</label>
        <select onchange="updateValue(${index}, 'icon', this.value)" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;">
          ${iconOptions.map(icon => `<option value="${icon}" ${value.icon === icon ? 'selected' : ''}>${icon}</option>`).join('')}
        </select>
        <div style="margin-top: 8px; font-size: 24px; color: #0066cc;"><i class="fas ${value.icon}"></i></div>
      </div>

      <div class="form-group">
        <label>Title</label>
        <input type="text" value="${value.title}" onchange="updateValue(${index}, 'title', this.value)" placeholder="e.g., Care & Compassion">
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea rows="2" onchange="updateValue(${index}, 'description', this.value)" placeholder="Brief description">${value.description}</textarea>
      </div>
    `;

    container.appendChild(valueCard);
  });

  updateAboutPreviewIframe();
}

function addValue() {
  window.values.push({
    icon: 'fa-heart',
    title: 'New Value',
    description: 'Description of this value'
  });
  renderValues();
}

function removeValue(index) {
  if (confirm('Are you sure you want to remove this value?')) {
    window.values.splice(index, 1);
    renderValues();
  }
}

function updateValue(index, field, value) {
  window.values[index][field] = value;
  updateAboutPreviewIframe();
}

// Team Stats Management
function renderTeamStats() {
  const container = document.getElementById('teamStatsContainer');
  if (!container) return;

  container.innerHTML = '';

  window.teamStats.forEach((stat, index) => {
    const statCard = document.createElement('div');
    statCard.style.cssText = 'background: #f9f9fb; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: end;';

    statCard.innerHTML = `
      <div class="form-group" style="margin: 0;">
        <label>Number</label>
        <input type="text" value="${stat.number}" onchange="updateTeamStat(${index}, 'number', this.value)" placeholder="e.g., 5+">
      </div>

      <div class="form-group" style="margin: 0;">
        <label>Label</label>
        <input type="text" value="${stat.label}" onchange="updateTeamStat(${index}, 'label', this.value)" placeholder="e.g., Years of Experience">
      </div>

      <button class="btn btn-danger" onclick="removeTeamStat(${index})" style="font-size: 0.75rem; padding: 8px 12px;">Remove</button>
    `;

    container.appendChild(statCard);
  });

  updateAboutPreviewIframe();
}

function addTeamStat() {
  window.teamStats.push({
    number: '0+',
    label: 'New Stat'
  });
  renderTeamStats();
}

function removeTeamStat(index) {
  if (confirm('Are you sure you want to remove this stat?')) {
    window.teamStats.splice(index, 1);
    renderTeamStats();
  }
}

function updateTeamStat(index, field, value) {
  window.teamStats[index][field] = value;
  updateAboutPreviewIframe();
}

// Full Page Preview
function updateAboutPreviewIframe() {
  const iframe = document.getElementById('aboutPagePreview');
  if (!iframe) return;

  // Load the actual about page if not already loaded
  if (!iframe.src || iframe.src === 'about:blank' || iframe.src === '') {
    iframe.src = window.location.origin + '/about';

    // Wait for iframe to load, then update content
    iframe.onload = function() {
      setTimeout(() => applyAboutContentToIframe(), 500);
    };
  } else {
    // Iframe already loaded, just update content
    applyAboutContentToIframe();
  }
}

function applyAboutContentToIframe() {
  const iframe = document.getElementById('aboutPagePreview');
  if (!iframe || !iframe.contentWindow) return;

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return;

    // Update hero title
    const heroTitle = iframeDoc.querySelector('.hero-section h1, .about-hero h1, h1');
    if (heroTitle) {
      heroTitle.textContent = document.getElementById('aboutHeroTitle')?.value || 'About ABC Massage and Spa';
    }

    // Update hero subtitle
    const heroSubtitle = iframeDoc.querySelector('.hero-section .hero-subtitle, .hero-section p');
    if (heroSubtitle) {
      heroSubtitle.textContent = document.getElementById('aboutHeroSubtitle')?.value || 'Your premier destination for relaxation and wellness';
    }

    // Update story
    const aboutStory = iframeDoc.querySelector('.about-section h2');
    if (aboutStory && aboutStory.textContent === 'Our Story') {
      const storyDiv = aboutStory.nextElementSibling;
      const storyValue = document.getElementById('aboutStory')?.value || '';
      if (storyDiv && storyValue) {
        storyDiv.innerHTML = storyValue.split('\n\n').map(p => `<p>${p}</p>`).join('');
      }
    }

    // Update mission
    const missionHeading = Array.from(iframeDoc.querySelectorAll('h2')).find(h => h.textContent === 'Our Mission');
    if (missionHeading) {
      const missionP = missionHeading.nextElementSibling;
      if (missionP) {
        missionP.textContent = document.getElementById('aboutMission')?.value || '';
      }
    }

    // Update values
    const valuesHeading = Array.from(iframeDoc.querySelectorAll('h2')).find(h => h.textContent === 'Our Values');
    if (valuesHeading && window.values && window.values.length > 0) {
      const valuesGrid = valuesHeading.nextElementSibling;
      if (valuesGrid) {
        valuesGrid.innerHTML = window.values.map(value => `
          <div class="value-card">
            <i class="fas ${value.icon}" style="font-size: 48px; color: #0066cc; margin-bottom: 16px;"></i>
            <h3>${value.title}</h3>
            <p>${value.description}</p>
          </div>
        `).join('');
      }
    }

    // Update team stats
    const teamHeading = Array.from(iframeDoc.querySelectorAll('h2')).find(h => h.textContent.includes('Team'));
    if (teamHeading && window.teamStats && window.teamStats.length > 0) {
      const statsContainer = teamHeading.nextElementSibling;
      if (statsContainer) {
        statsContainer.innerHTML = window.teamStats.map(stat => `
          <div class="stat-card">
            <h3 style="font-size: 48px; color: #0066cc;">${stat.number}</h3>
            <p>${stat.label}</p>
          </div>
        `).join('');
      }
    }

  } catch (error) {
    console.error('Error updating About iframe:', error);
  }
}

function generateAboutPreviewHTML(data) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>About Us - Preview</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <link rel="stylesheet" href="${window.location.origin}/assets/style.css">
    </head>
    <body>
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <div class="hero-content">
            <h1>${data.heroTitle || 'About ABC Massage and Spa'}</h1>
            <p class="hero-subtitle">${data.heroSubtitle || 'Your premier destination for relaxation and wellness'}</p>
          </div>
        </div>
      </section>

      <!-- About Content -->
      <section class="about-section">
        <div class="container">
          <div class="about-content">
            ${data.story ? `
            <div class="about-story">
              <h2>Our Story</h2>
              <div>${data.story.split('\\n\\n').map(p => `<p>${p}</p>`).join('')}</div>
            </div>
            ` : ''}

            ${data.mission ? `
            <div class="about-mission">
              <h2>Our Mission</h2>
              <p>${data.mission}</p>
            </div>
            ` : ''}

            ${data.values && data.values.length > 0 ? `
            <div class="about-values">
              <h2>Our Values</h2>
              <div class="values-grid">
                ${data.values.map(value => `
                  <div class="value-item">
                    <i class="fas ${value.icon}"></i>
                    <h3>${value.title}</h3>
                    <p>${value.description}</p>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}

            ${data.teamStats && data.teamStats.length > 0 ? `
            <div class="about-team">
              <h2>Our Team</h2>
              <div class="team-stats">
                ${data.teamStats.map(stat => `
                  <div class="stat-item">
                    <h3>${stat.number}</h3>
                    <p>${stat.label}</p>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <div class="about-location">
              <h2>Our Location</h2>
              <p>Conveniently located in the heart of ${data.location || 'ABC, Camarines Norte'}</p>
              <div class="location-info">
                <div class="info-item">
                  <i class="fas fa-map-marker-alt"></i>
                  <div>
                    <h4>Address</h4>
                    <p>${data.location || 'ABC, Camarines Norte'}, Philippines</p>
                  </div>
                </div>
                <div class="info-item">
                  <i class="fas fa-phone"></i>
                  <div>
                    <h4>Phone</h4>
                    <p>${data.phone || '09518999577'}</p>
                  </div>
                </div>
                <div class="info-item">
                  <i class="fas fa-clock"></i>
                  <div>
                    <h4>Hours</h4>
                    <p>${data.hours || 'Monday - Sunday: 9:00 AM - 9:00 PM'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </body>
    </html>
  `;
}

function openAboutPreview() {
  const iframe = document.getElementById('aboutPagePreview');
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  const newWindow = window.open();
  newWindow.document.write(iframeDoc.documentElement.outerHTML);
  newWindow.document.close();
}
