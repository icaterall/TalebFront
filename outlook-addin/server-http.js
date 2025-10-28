const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve SVG icons as PNG (simple conversion)
app.get('/icon-32.png', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(path.join(__dirname, 'icon-32.svg'));
});

app.get('/icon-80.png', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(path.join(__dirname, 'icon-80.svg'));
});

// For development, we'll use HTTP instead of HTTPS
// In production, you should use proper HTTPS certificates
app.listen(PORT, () => {
  console.log(`Outlook Add-in server running on http://localhost:${PORT}`);
  console.log('Files available:');
  console.log(`- http://localhost:${PORT}/index.html`);
  console.log(`- http://localhost:${PORT}/manifest.xml`);
  console.log(`- http://localhost:${PORT}/functions.html`);
  console.log(`- http://localhost:${PORT}/icon-32.png`);
  console.log(`- http://localhost:${PORT}/icon-80.png`);
  console.log('');
  console.log('Note: For Outlook add-ins, you need HTTPS. Consider using ngrok or similar service.');
});
