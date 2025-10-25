# Outlook Add-in Setup Guide

This guide explains how to set up the Outlook add-in to work properly with Office.js APIs.

## Prerequisites

1. **HTTPS Required**: Office add-ins require HTTPS. You have two options:
   - Use a development certificate (recommended for local development)
   - Use a tunneling service like ngrok

## Option 1: Development Certificate (Recommended)

### Step 1: Generate SSL Certificate
```bash
# Install mkcert for local SSL certificates
# On macOS:
brew install mkcert
mkcert -install

# Create certificates for localhost
mkcert localhost 127.0.0.1 ::1
```

### Step 2: Update Angular Development Server
```bash
# Install SSL certificate package
npm install --save-dev @angular-devkit/build-angular

# Update angular.json to use HTTPS
# Add to "serve" configuration:
"ssl": true,
"sslKey": "localhost-key.pem",
"sslCert": "localhost.pem"
```

### Step 3: Start Development Server
```bash
ng serve --ssl
```

## Option 2: Using ngrok (Alternative)

### Step 1: Install ngrok
```bash
# Download from https://ngrok.com/download
# Or install via package manager
npm install -g ngrok
```

### Step 2: Start ngrok tunnel
```bash
# Start ngrok tunnel to your Angular app
ngrok http 4200
```

### Step 3: Update Manifest
Update the manifest.xml with your ngrok URL:
```xml
<AppDomain>https://your-ngrok-url.ngrok.io</AppDomain>
<SourceLocation DefaultValue="https://your-ngrok-url.ngrok.io/outlook-addin"/>
```

## Installing the Add-in in Outlook

### Step 1: Sideload the Add-in
1. Open Outlook (desktop or web)
2. Go to File > Manage Add-ins
3. Click "Add a custom add-in" > "Add from file"
4. Select the `manifest.xml` file from `src/app/features/outlook-addin/`

### Step 2: Test the Add-in
1. Create a new email message
2. Look for the "Start Training" button in the ribbon
3. Click the button to open the task pane
4. The add-in should now have access to Office.js APIs

## Troubleshooting

### Common Issues

1. **"Office.js not loaded" error**
   - Ensure you're accessing the page via HTTPS
   - Check that Office.js script is loaded before calling APIs

2. **"Cannot read properties of undefined"**
   - Make sure you're in compose mode (not read mode)
   - Wait for Office.onReady() before calling APIs

3. **Add-in not appearing in Outlook**
   - Check that the manifest.xml is valid
   - Ensure the SourceLocation URL is accessible
   - Verify the add-in is properly installed

### Debug Tips

1. **Check Office.js Status**
   - Open browser dev tools
   - Look for Office.js loading errors
   - Verify Office.context is available

2. **Test API Access**
   - Use the debug section in the add-in
   - Check if email data is being read correctly
   - Verify task completion logic

## File Structure

```
src/app/features/outlook-addin/
├── manifest.xml              # Office add-in manifest
├── commands.html             # Office.js commands file
├── outlook-addin.component.ts # Main component with Office.js integration
├── outlook-addin.component.html # UI template
├── outlook-addin.component.scss # Styles
└── outlook-addin.module.ts   # Angular module
```

## Key Features

- **Real Office.js Integration**: Reads actual email data from Outlook
- **Task-based Grading**: Checks TO, CC, BCC, Subject, and Body formatting
- **Real-time Validation**: Updates task completion status
- **University Branding**: Matches the Word add-in design
- **Responsive Design**: Works in Outlook's task pane

## API Usage

The add-in uses these Office.js APIs:
- `Office.context.mailbox.item.to.getAsync()` - Get TO recipients
- `Office.context.mailbox.item.cc.getAsync()` - Get CC recipients  
- `Office.context.mailbox.item.bcc.getAsync()` - Get BCC recipients
- `Office.context.mailbox.item.subject.getAsync()` - Get subject
- `Office.context.mailbox.item.body.getAsync('html')` - Get body content

## Next Steps

1. Set up HTTPS (choose Option 1 or 2 above)
2. Install the add-in in Outlook
3. Test the grading functionality
4. Customize the tasks and validation logic as needed
