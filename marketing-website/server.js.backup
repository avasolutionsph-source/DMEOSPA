const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
    origin: [
        'https://ava-solutions-pwa.netlify.app',
        'https://ava-pwa-backend.onrender.com',
        'http://localhost:3000'
    ],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/features', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'features.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Ava Solutions Marketing' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Marketing server running on port ${PORT}`);
});