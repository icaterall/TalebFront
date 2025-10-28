const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files from current directory
app.use(express.static(__dirname));

// Create HTTPS options using mkcert certificates
const options = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
};

// Start HTTPS server
https.createServer(options, app).listen(PORT, () => {
  console.log(`Outlook Add-in server running on https://localhost:${PORT}`);
  console.log('Files available:');
  console.log(`- https://localhost:${PORT}/index.html`);
  console.log(`- https://localhost:${PORT}/manifest.xml`);
  console.log(`- https://localhost:${PORT}/icon-16.png`);
  console.log(`- https://localhost:${PORT}/icon-32.png`);
  console.log(`- https://localhost:${PORT}/icon-80.png`);
  console.log('');
  console.log('Test these URLs in your browser to ensure they work without certificate warnings:');
  console.log('1. https://localhost:3000/index.html');
  console.log('2. https://localhost:3000/icon-16.png');
  console.log('3. https://localhost:3000/icon-32.png');
  console.log('4. https://localhost:3000/icon-80.png');
  console.log('');
  console.log('If you see certificate warnings, run: mkcert -install');
});