const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating self-signed certificate for HTTPS...');

try {
  // Generate private key
  execSync('openssl genrsa -out server.key 2048', { stdio: 'inherit' });
  
  // Generate certificate
  execSync('openssl req -new -x509 -key server.key -out server.crt -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"', { stdio: 'inherit' });
  
  console.log('Certificate generated successfully!');
  console.log('You can now run: npm start');
} catch (error) {
  console.error('Error generating certificate:', error.message);
  console.log('Please install OpenSSL or use a different method to generate certificates.');
}
