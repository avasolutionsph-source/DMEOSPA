// Authentication handler for marketing website
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:4000/api' 
    : 'https://ava-pwa-backend.onrender.com/api';

// Modal functions
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchToRegister() {
    closeModal('loginModal');
    openRegisterModal();
}

function switchToLogin() {
    closeModal('registerModal');
    openLoginModal();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (event.target === loginModal) {
        closeModal('loginModal');
    }
    if (event.target === registerModal) {
        closeModal('registerModal');
    }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        console.log('🔐 Attempting login...');
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Login successful');
            
            // Store auth data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            alert('Login successful! Redirecting to dashboard...');
            
            // Redirect based on role
            if (data.user.role === 'admin' || data.user.role === 'superAdmin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/pwa';
            }
        } else {
            console.error('❌ Login failed:', data.error);
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        alert('Network error. Please try again.');
    }
});

// Register form handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const businessName = document.getElementById('businessName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        console.log('📝 Attempting registration...');
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName,
                lastName,
                businessName,
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Registration successful');
            
            // Store auth data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            alert('Account created successfully! Redirecting to dashboard...');
            
            // Redirect to PWA
            window.location.href = '/pwa';
        } else {
            console.error('❌ Registration failed:', data.error);
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('❌ Registration error:', error);
        alert('Network error. Please try again.');
    }
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        console.log('✅ User already logged in');
        // Could redirect or update UI to show logged in state
    }
});