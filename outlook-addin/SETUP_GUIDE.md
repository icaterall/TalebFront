# Outlook Add-in Setup Guide

This guide helps you set up the Outlook add-in with proper HTTPS certificates and manifest configuration to avoid the 3 common blockers.

## Quick Setup

1. **Install mkcert and generate certificates:**
   ```bash
   # Install mkcert (if not already installed)
   brew install mkcert
   
   # Install the root CA (requires sudo password)
   mkcert -install
   
   # Generate certificates for localhost
   mkcert localhost
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Test URLs in browser (should open without certificate warnings):**
   - https://localhost:3000/index.html
   - https://localhost:3000/icon-16.png
   - https://localhost:3000/icon-32.png
   - https://localhost:3000/icon-80.png

4. **Install the add-in in Outlook:**
   - Open Outlook → New Message → Apps → Get Add-ins → My add-ins → Custom add-ins
   - Click "Add from file" and select `manifest.xml`
   - Or use "Add from URL" with: `https://localhost:3000/manifest.xml`

## Available NPM Scripts

- `npm start` - Start the HTTPS server
- `npm run setup` - Complete setup (install CA, generate certs, convert icons)
- `npm run install-ca` - Install mkcert root CA
- `npm run generate-certs` - Generate localhost certificates
- `npm run convert-icons` - Convert SVG icons to PNG
- `npm run test-urls` - Test all required URLs

## Troubleshooting

### 1. Certificate Warnings
If you see certificate warnings in the browser:
```bash
mkcert -install
```
Then restart your browser and test the URLs again.

### 2. Manifest Installation Fails
- Remove any previous installation of the same add-in ID
- Ensure all URLs (index.html, icons) load without warnings
- Check that manifest.xml uses HTTPS URLs (not HTTP)

### 3. Server Won't Start
- Ensure certificates exist: `ls -la *.pem`
- Check port 3000 is not in use: `lsof -i :3000`
- Kill existing process: `kill <PID>`

## Files Created/Modified

- `manifest.xml` - Updated with proper schema and HTTPS URLs
- `server.js` - Updated to use mkcert certificates
- `package.json` - Added helpful scripts
- `convert-icons.js` - Script to create PNG icons from SVG
- `localhost.pem` & `localhost-key.pem` - mkcert certificates
- `icon-16.png`, `icon-32.png`, `icon-80.png` - Required icon files

## Testing Checklist

✅ All URLs load without certificate warnings  
✅ Manifest.xml uses HTTPS URLs  
✅ Icons are proper PNG files (16px, 32px, 80px)  
✅ Server starts without errors  
✅ Add-in installs in Outlook without errors  
✅ Task pane opens when clicking the button  

## Alternative: Public Hosting

If localhost certificates are problematic, you can host the files publicly:

1. Upload `index.html`, `manifest.xml`, and icon files to any HTTPS host
2. Use "Add from URL" in Outlook with your public manifest URL
3. Example hosts: GitHub Pages, Netlify, Vercel, AWS S3+CloudFront
