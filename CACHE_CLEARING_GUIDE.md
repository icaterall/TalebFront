# Cache Clearing Guide for Production Issues

## 🎯 Purpose

This guide explains how to clear all website data (cookies, localStorage, sessionStorage) when the website gets stuck in production.

## 🚀 How to Use

### Method 1: Keyboard Shortcut (Easiest)

1. **Press `Ctrl + Shift + K`** (or `Cmd + Shift + K` on Mac) anywhere on the page
2. **Confirm** when prompted
3. The page will **automatically reload** and clear all data

### Method 2: Browser Console

Open browser console (F12) and type:

```javascript
window.clearAnatalebCache()
```

Then press Enter and confirm.

### Method 3: Manual Clear

1. Open browser DevTools (F12)
2. Go to **Application** tab (or **Storage** in Firefox)
3. Clear all:
   - **Cookies**: Right-click on your domain → Clear
   - **Local Storage**: Right-click → Clear
   - **Session Storage**: Right-click → Clear
4. Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

## 🔧 What Gets Cleared

When you use the cache clearing feature, the following data is removed:

- ✅ **All Cookies** - Authentication tokens, preferences, etc.
- ✅ **LocalStorage** - User settings, language preference, etc.
- ✅ **SessionStorage** - Temporary session data
- ✅ **Sign-in State** - User will need to log in again

## 🛠️ Technical Details

### Automatic Clearing

The system checks for a flag `anataleb.clearCache` in sessionStorage:

```javascript
// Check if clearing is needed
var shouldClearCache = sessionStorage.getItem('anataleb.clearCache');

if (shouldClearCache === 'true') {
  // Clear all cookies
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // Clear storage
  sessionStorage.clear();
  localStorage.clear();
  
  // Remove the flag
  sessionStorage.removeItem('anataleb.clearCache');
}
```

### Keyboard Shortcut

```javascript
// Press Ctrl+Shift+K anywhere on the page
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'K') {
    e.preventDefault();
    if (confirm('Clear all cookies, localStorage, and sessionStorage and reload?')) {
      window.clearAnatalebCache();
    }
  }
});
```

## ⚠️ When to Use This

Use the cache clearing feature when:

- 🐛 Website appears to be stuck or frozen
- 🔄 After a major update deployment
- 🔑 Authentication issues
- 📱 Switching between devices/browsers
- 🧪 Testing fresh user experience
- 🚨 Data corruption or version mismatch errors

## 🔒 Security Note

- **Never** use this in production for normal users unless debugging
- **Always** inform users they'll need to sign in again
- **Important**: All unsaved data will be lost

## 📝 For Developers

To trigger cache clearing programmatically:

```javascript
// Set the flag and reload
sessionStorage.setItem('anataleb.clearCache', 'true');
window.location.reload(true);
```

Or use the helper function:

```javascript
// Call the global function
window.clearAnatalebCache();
```

## 🎯 Browser Compatibility

Works on all modern browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 📞 Support

If issues persist after clearing cache, contact support with:
1. Browser name and version
2. OS version
3. Console errors (F12 → Console tab)
4. Network errors (F12 → Network tab)

---

**Last Updated**: 2025-10-28

