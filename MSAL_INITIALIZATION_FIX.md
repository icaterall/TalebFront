# 🔧 Microsoft Graph Outlook Exam - Setup Guide

## 🚨 **MSAL Initialization Error Fixed**

The error `uninitialized_public_client_application` has been resolved by properly initializing MSAL before use.

## ✅ **What Was Fixed**

### **Problem:**
- MSAL (Microsoft Authentication Library) wasn't initialized before being used
- The `MsalService` needs to call `initialize()` before any other MSAL API calls

### **Solution Applied:**
1. **Added MSAL Initialization:** Service now properly initializes MSAL on startup
2. **Added Safety Checks:** All methods now ensure MSAL is initialized before use
3. **Added Error Handling:** Proper error handling for all MSAL operations

## 🛠️ **Next Steps Required**

### **1. Azure App Registration Setup**

You need to create an Azure App Registration to get the Microsoft Client ID:

#### **Step 1: Create Azure App Registration**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Fill in:
   - **Name:** `Anataleb Outlook Exam`
   - **Supported account types:** `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI:** 
     - Type: `Single-page application (SPA)`
     - URI: `http://localhost:4200` (for development)
     - Add: `https://test.anataleb.com` (for production)

#### **Step 2: Configure API Permissions**
1. Go to **API permissions** in your app registration
2. Click **"Add a permission"**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `Mail.ReadWrite` (to read and write emails)
   - `User.Read` (to read user profile)
   - `openid` (for OpenID Connect)
   - `profile` (for user profile)
   - `offline_access` (for refresh tokens)

#### **Step 3: Grant Admin Consent**
1. Click **"Grant admin consent"** for your organization
2. This allows users to consent to the permissions

#### **Step 4: Get Client ID**
1. Go to **Overview** in your app registration
2. Copy the **Application (client) ID**

### **2. Update Environment Configuration**

Update your environment files with the real Client ID:

**Development (`src/environments/environment.ts`):**
```typescript
microsoftClientId: 'your-actual-client-id-here', // Replace with your Azure Client ID
```

**Production (`src/environments/environment.prod.ts`):**
```typescript
microsoftClientId: 'your-actual-client-id-here', // Replace with your Azure Client ID
```

### **3. Test the Integration**

Once you have the Client ID configured:

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Navigate to student dashboard:**
   - Go to `http://localhost:4200/student/dashboard`
   - Click the **"Test Outlook"** button

3. **Test the flow:**
   - Click **"Sign in with Microsoft"**
   - Complete Microsoft authentication
   - Start an exam session
   - Open Outlook and compose email
   - Return to grade the email

## 🎯 **How It Works Now**

### **MSAL Initialization Flow:**
1. **Service Constructor:** Automatically initializes MSAL
2. **Method Calls:** Each method ensures MSAL is initialized before use
3. **Error Handling:** Graceful fallbacks if initialization fails

### **Authentication Flow:**
1. **User clicks "Sign in with Microsoft"**
2. **MSAL opens popup** for Microsoft authentication
3. **User grants permissions** for Mail.ReadWrite, etc.
4. **Service stores tokens** for Graph API calls
5. **Exam session starts** with unique code
6. **User composes email** in Outlook
7. **System grades email** via Microsoft Graph API

## 🔒 **Security Features**

- ✅ **Proper MSAL Initialization:** No more uninitialized errors
- ✅ **Token Management:** Automatic token refresh
- ✅ **Error Handling:** Graceful fallbacks for all operations
- ✅ **Scope Limitation:** Only requests necessary permissions
- ✅ **Secure Storage:** Tokens stored securely in browser

## 🚀 **Ready for Production**

Once you set up the Azure App Registration and update the Client ID, the system will be fully functional for:

- ✅ **Student Authentication:** Microsoft sign-in
- ✅ **Email Composition:** Outlook integration
- ✅ **Automatic Grading:** Graph API email analysis
- ✅ **Real-time Feedback:** Instant results

The Microsoft Graph Outlook exam system is now properly initialized and ready for deployment! 🎉
