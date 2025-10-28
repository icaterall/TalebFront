# Outlook Add-in Installation Troubleshooting

## 🚨 **Installation Failed - Troubleshooting Steps**

The add-in files are properly deployed at [https://test.anataleb.com/outlook-addin/manifest.xml](https://test.anataleb.com/outlook-addin/manifest.xml), but installation is still failing. Here are the steps to resolve this:

### **Step 1: Clear Outlook Cache**

1. **Close Outlook completely** (all windows)
2. **Clear Office cache:**
   - Windows: Delete `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`
   - Mac: Delete `~/Library/Containers/com.microsoft.Outlook/Data/Library/Caches/`
3. **Restart Outlook**

### **Step 2: Remove Previous Installations**

1. **Open Outlook** → New Message → Apps → Get Add-ins → My add-ins → Custom add-ins
2. **Look for any existing "AnaTaleb" or "Outlook Exam" add-ins**
3. **Click the "..." menu** → **Remove** for each one
4. **Close the compose window**
5. **Open a fresh compose window**

### **Step 3: Try Different Installation Methods**

**Method A: Add from URL (Recommended)**
1. Apps → Get Add-ins → My add-ins → Custom add-ins
2. Click **"Add from URL"**
3. Enter: `https://test.anataleb.com/outlook-addin/manifest.xml`
4. Click **"Add"**

**Method B: Add from File**
1. Download: [https://test.anataleb.com/outlook-addin/manifest.xml](https://test.anataleb.com/outlook-addin/manifest.xml)
2. Save as `manifest.xml`
3. Apps → Get Add-ins → My add-ins → Custom add-ins
4. Click **"Add from file"** → Select the downloaded file

### **Step 4: Check Browser Compatibility**

Test these URLs in your browser (should open without errors):
- ✅ [https://test.anataleb.com/outlook-addin/index.html](https://test.anataleb.com/outlook-addin/index.html)
- ✅ [https://test.anataleb.com/outlook-addin/manifest.xml](https://test.anataleb.com/outlook-addin/manifest.xml)
- ✅ [https://test.anataleb.com/outlook-addin/icon-16.png](https://test.anataleb.com/outlook-addin/icon-16.png)
- ✅ [https://test.anataleb.com/outlook-addin/icon-32.png](https://test.anataleb.com/outlook-addin/icon-32.png)
- ✅ [https://test.anataleb.com/outlook-addin/icon-80.png](https://test.anataleb.com/outlook-addin/icon-80.png)

### **Step 5: Try Different Outlook Versions**

- **Outlook Web** (outlook.office.com) - Often more reliable
- **Outlook Desktop** - Try both Windows and Mac versions
- **Outlook Mobile** - Sometimes works when desktop fails

### **Step 6: Check Office Version**

Ensure you're using a supported Office version:
- Office 365 (recommended)
- Office 2019 or later
- Office 2016 with latest updates

### **Step 7: Alternative Manifest**

If still failing, try this simplified manifest:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:type="MailApp">
  <Id>8f3ef4g2-3333-6g77-1e3g-ccccddddeeee</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>AnaTaleb</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="AnaTaleb Exam"/>
  <Description DefaultValue="Practice grader for Outlook compose."/>
  <IconUrl DefaultValue="https://test.anataleb.com/outlook-addin/icon-32.png"/>
  <HighResolutionIconUrl DefaultValue="https://test.anataleb.com/outlook-addin/icon-80.png"/>
  <SupportUrl DefaultValue="https://test.anataleb.com/"/>
  <Hosts><Host Name="Mailbox"/></Hosts>
  <Requirements>
    <Sets DefaultMinVersion="1.5"><Set Name="Mailbox"/></Sets>
  </Requirements>
  <FormSettings>
    <Form xsi:type="ItemCompose">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://test.anataleb.com/outlook-addin/index.html"/>
      </DesktopSettings>
    </Form>
  </FormSettings>
  <Permissions>ReadWriteItem</Permissions>
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Edit"/>
    <Rule xsi:type="ItemIs" ItemType="Appointment" FormType="Edit"/>
  </Rule>
</OfficeApp>
```

### **Step 8: Contact Support**

If all else fails:
1. **Check Office Admin Center** for any policy restrictions
2. **Contact your IT administrator** if using corporate Outlook
3. **Try a different Microsoft account** to test

## 🔍 **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| "Add-in installation failed" | Clear cache, remove old installations |
| "Manifest not found" | Check URL accessibility in browser |
| "Certificate error" | Use live domain (already done) |
| "Permission denied" | Check Office admin policies |
| "Add-in not appearing" | Restart Outlook, check ribbon |

## ✅ **Success Indicators**

When working correctly:
- Add-in appears in Apps menu
- "AnaTaleb Exam" button shows in ribbon
- Clicking button opens task pane
- Task pane loads without errors
- Grading functionality works

The live deployment at [https://test.anataleb.com/outlook-addin/](https://test.anataleb.com/outlook-addin/) should resolve all certificate and accessibility issues!
