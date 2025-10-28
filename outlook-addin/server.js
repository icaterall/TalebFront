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

// Create self-signed certificate for HTTPS
const options = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.crt'))
};

// Start HTTPS server
https.createServer(options, app).listen(PORT, () => {
  console.log(`Outlook Add-in server running on https://localhost:${PORT}`);
  console.log('Files available:');
  console.log(`- https://localhost:${PORT}/index.html`);
  console.log(`- https://localhost:${PORT}/manifest.xml`);
  console.log(`- https://localhost:${PORT}/functions.html`);
  console.log(`- https://localhost:${PORT}/icon-32.png`);
  console.log(`- https://localhost:${PORT}/icon-80.png`);
});
