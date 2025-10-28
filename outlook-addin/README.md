# Outlook Add-in Setup Guide

This folder contains the Outlook add-in files for testing email composition grading.

## Files Created

- `index.html` - Main task pane interface with grading logic
- `manifest.xml` - Outlook add-in manifest file
- `functions.html` - Function file for ribbon button
- `icon-32.svg` / `icon-80.svg` - Add-in icons
- `server-http.js` - Local HTTP server for development
- `package.json` - Node.js dependencies

## Quick Setup

### 1. Install Dependencies
```bash
cd outlook-addin
npm install
```

### 2. Start Local Server
```bash
node server-http.js
```

The server will start on `http://localhost:3000`

### 3. Install Add-in in Outlook Web

1. **Open Outlook Web**: Go to `outlook.office.com`
2. **Access Settings**: Click gear icon → Settings
3. **Manage Add-ins**: Go to "Mail" → "Manage add-ins"
4. **Upload Custom Add-in**: Click "Upload custom add-in"
5. **Select Manifest**: Choose `manifest.xml` file
6. **Install**: Click "Install" when prompted

### 4. Test the Add-in

1. **Create New Email**: Click "New message"
2. **Find Exam Tab**: Look for "Exam" tab in the ribbon
3. **Open Task Pane**: Click "Open Exam Pane" button
4. **Pin Task Pane**: Click the pushpin icon to keep it open
5. **Test Grading**: 
   - Set subject to "Practice: Quarterly Update"
   - Add recipients: ceo@example.edu (To), hr@example.edu (Cc), audit@example.edu (Bcc)
   - Add "#Q4-Targets" to email body
   - Click "Grade now" in task pane

## Grading Criteria

The add-in checks for:

1. **Subject**: Exactly "Practice: Quarterly Update"
2. **To**: Contains "ceo@example.edu"
3. **Cc**: Contains "hr@example.edu" 
4. **Bcc**: Contains "audit@example.edu"
5. **Body**: Contains keyword "#Q4-Targets"

## Integration with Angular App

The Angular student dashboard has a "Test Outlook" button that:
1. Opens Outlook Web compose with pre-filled content using proper URL encoding
2. Students can then use the add-in to grade their work

## Troubleshooting

### Add-in Not Loading
- Ensure server is running on `http://localhost:3000`
- Check that all URLs in manifest.xml are accessible
- Verify Office.js is loading correctly

### Grading Not Working
- Make sure you're in compose mode (not reading mode)
- Check browser console for JavaScript errors
- Verify email fields are properly filled

### URL Encoding Issues (+ signs)
- Fixed: Now using `encodeURIComponent()` instead of `URLSearchParams`
- Subject and body will show proper spaces instead of + signs
- All parameters (subject, to, cc, bcc, body) are properly encoded

### Add-in Button Not Visible
- **Open a new compose window** after sideloading (Outlook caches manifest state)
- Check the overflow "..." menu on the ribbon (button might nest there on small widths)
- Ensure you're in compose mode, not reading mode
- Verify the add-in was properly installed in Settings → Manage add-ins

### HTTPS Requirements
- For production, use HTTPS instead of HTTP
- Consider using ngrok for HTTPS tunneling: `ngrok http 3000`
- Update manifest.xml URLs to use HTTPS

## Quick Troubleshooting Checklist

1. **Still seeing + signs?** ✅ Fixed with `encodeURIComponent()`
2. **Pane won't load?** Open an all-new compose window after sideloading
3. **"Exam" group missing?** Check the overflow "..." menu on the ribbon
4. **Bcc field hidden?** Click "Bcc" link in the compose header to reveal it
5. **Server not responding?** Ensure `node server-http.js` is running

## Customization

To modify grading criteria, edit the constants in `index.html`:

```javascript
// Targets for this demo (change as you like)
const wantSubject = 'Quarterly Update';
const wantTo = 'ceo@example.edu';
const wantCc = 'hr@example.edu';
const wantBcc = 'audit@example.edu';
const wantKeyword = '#Q4-Targets';
```

## Next Steps

1. **Deploy to Production**: Use proper HTTPS certificates
2. **Add More Tests**: Create additional grading scenarios
3. **Integrate with Backend**: Store results in database
4. **Add Analytics**: Track student progress and performance
