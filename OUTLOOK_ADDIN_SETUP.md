# Outlook Add-in Setup Guide

This guide explains how to deploy and test the Outlook Add-in for signature training.

## 📁 Files Created

### 1. Manifest File
- **Location**: `src/manifest.xml`
- **Purpose**: Tells Outlook where to find your add-in
- **Contains**: App ID, URLs, permissions, and UI configuration

### 2. Function File
- **Location**: `src/function-file.html`
- **Purpose**: Tiny script that opens the task pane
- **Contains**: Office.js integration and button handler

### 3. Task Pane Component
- **Location**: `src/app/training-demo/pages/outlook-addin/`
- **Purpose**: The actual training interface
- **Features**: Email body fetching, signature grading, feedback display

## 🚀 Deployment Steps

### Step 1: Update Manifest URLs

Edit `src/manifest.xml` and replace `your-domain.com` with your actual domain:

```xml
<IconUrl DefaultValue="https://your-actual-domain.com/assets/icon-64.png"/>
<SupportUrl DefaultValue="https://your-actual-domain.com/support"/>
<AppDomain>your-actual-domain.com</AppDomain>
<SourceLocation DefaultValue="https://your-actual-domain.com/training/outlook"/>
<bt:Url id="fnFile" DefaultValue="https://your-actual-domain.com/function-file.html"/>
```

### Step 2: Deploy Files

1. **Build your Angular app**:
   ```bash
   ng build --configuration=production
   ```

2. **Upload to your web server**:
   - Upload the `dist/` folder contents to your domain
   - Ensure `function-file.html` is accessible at `/function-file.html`
   - Ensure the training route `/training/outlook` works

3. **Test URLs**:
   - `https://your-domain.com/function-file.html` ✅
   - `https://your-domain.com/training/outlook` ✅

### Step 3: Create Icons (Optional)

Create these icon files and upload to `/assets/`:
- `icon-32.png` (32x32 pixels)
- `icon-64.png` (64x64 pixels)

## 🔧 Testing in Outlook Web

### Method 1: Upload Manifest File

1. **Open Outlook Web**: Go to `outlook.office.com`
2. **Access Settings**: Click gear icon → Settings
3. **Manage Add-ins**: Go to "Mail" → "Manage add-ins"
4. **Upload Custom Add-in**: Click "Upload custom add-in"
5. **Select Manifest**: Choose your `manifest.xml` file
6. **Install**: Click "Install" when prompted

### Method 2: Sideload via URL

1. **Upload manifest.xml** to your web server
2. **Use manifest URL** instead of file upload
3. **Enter URL**: `https://your-domain.com/manifest.xml`

## 📧 Using the Add-in

### For Students:

1. **Open Outlook Web** and create a new email
2. **Look for "Training" tab** in the ribbon
3. **Click "Open Training"** button
4. **Build your signature** in the email body
5. **Click "Fetch Email Body"** in the task pane
6. **Click "Grade Now"** to get instant feedback
7. **Review your score** and improvement suggestions

### Features:

- ✅ **Real-time grading** of email signatures
- ✅ **Instant feedback** with specific requirements
- ✅ **Score calculation** with percentage
- ✅ **Copy signature** functionality
- ✅ **Professional layout** requirements
- ✅ **Link validation** (tel:, mailto:, https:)

## 🛠️ Development Notes

### Office.js Integration

The add-in uses Office.js to:
- **Read email body**: `Office.context.mailbox.item.body.getAsync()`
- **Detect compose mode**: Check if user is composing a message
- **Show task pane**: Display the training interface

### Grading Logic

Uses the existing `SignatureGraderService` to:
- **Parse HTML**: Extract signature elements
- **Check requirements**: Logo, name, links, layout
- **Calculate score**: Based on completed requirements
- **Provide feedback**: Specific improvement suggestions

### Security Considerations

- **HTTPS Required**: All URLs must use HTTPS
- **CORS Headers**: Ensure your server allows Office.js requests
- **Domain Validation**: Only your domain can access the add-in

## 🐛 Troubleshooting

### Common Issues:

1. **"Add-in not loading"**
   - Check that all URLs in manifest are accessible
   - Ensure HTTPS is used for all URLs
   - Verify Office.js is loading correctly

2. **"Cannot fetch email body"**
   - Make sure user is in compose mode
   - Check that Office.js is properly initialized
   - Verify permissions in manifest

3. **"Grading not working"**
   - Check browser console for errors
   - Verify SignatureGraderService is working
   - Test with sample HTML content

### Debug Steps:

1. **Check browser console** for JavaScript errors
2. **Verify network requests** to your domain
3. **Test manifest validation** using Office add-in validator
4. **Check Office.js version** compatibility

## 📚 Additional Resources

- [Office Add-ins Documentation](https://docs.microsoft.com/en-us/office/dev/add-ins/)
- [Outlook Add-in Development](https://docs.microsoft.com/en-us/office/dev/add-ins/outlook/)
- [Office.js API Reference](https://docs.microsoft.com/en-us/javascript/api/office)
- [Manifest Schema Reference](https://docs.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests)

## 🎯 Next Steps

1. **Deploy to production** with your actual domain
2. **Test with real users** in Outlook Web
3. **Collect feedback** from students
4. **Add more training modules** for other Office apps
5. **Integrate with backend** for storing results

---

**Note**: This add-in works in both Outlook Web and Outlook Desktop, but testing is easiest in Outlook Web.
