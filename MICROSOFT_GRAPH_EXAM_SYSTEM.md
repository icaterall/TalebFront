# Microsoft Graph Outlook Exam System

## 🎯 **Overview**

This system uses Microsoft Graph API to read user's Outlook drafts and grade them automatically. No Outlook add-ins required!

## 🚀 **How It Works**

1. **Student signs in** with Microsoft account (MSAL)
2. **Creates exam session** → Gets unique exam code (e.g., `EXAM#ABC123`)
3. **Opens Outlook** via deep link with pre-filled subject
4. **Composes email** with required criteria and saves as draft
5. **Returns to portal** and clicks "Grade My Email"
6. **System reads draft** via Microsoft Graph API and grades automatically

## 🔧 **Setup Requirements**

### **1. Azure App Registration**

Create an Azure App Registration with these settings:

**Authentication:**
- Platform: Single-page application (SPA)
- Redirect URIs: 
  - `http://localhost:4200` (development)
  - `https://test.anataleb.com` (production)

**API Permissions:**
- `openid` (Sign users in)
- `profile` (View users' basic profile)
- `offline_access` (Maintain access to data)
- `Mail.ReadWrite` (Read and write user mail)
- `Mail.ReadBasic` (Read user mail)
- `User.Read` (Sign in and read user profile)

**Admin Consent:** Required for `Mail.ReadWrite` (ask your admin)

### **2. Environment Configuration**

Update your environment files:

**Development (`src/environments/environment.ts`):**
```typescript
microsoftClientId: 'your-azure-app-client-id'
```

**Production (`src/environments/environment.prod.ts`):**
```typescript
microsoftClientId: 'your-azure-app-client-id'
```

### **3. Backend Configuration**

The backend is already configured with:
- Exam session management
- Microsoft Graph API integration
- Grading logic
- Route: `/api/v1/exam`

## 📋 **Implementation Status**

### ✅ **Completed:**
- [x] MSAL authentication setup
- [x] Exam service and auth service
- [x] Angular exam component with full UI
- [x] Backend Graph API integration
- [x] Grading logic and criteria checking
- [x] Route configuration
- [x] Clean removal of Outlook add-in files

### 🔄 **Next Steps:**
1. **Create Azure App Registration**
2. **Update environment with Client ID**
3. **Deploy and test**

## 🎯 **Usage Flow**

### **For Students:**
1. Go to `/outlook-exam`
2. Sign in with Microsoft
3. Click "Start Exam" → Get exam code
4. Click "Open Outlook" → Compose email
5. Fill requirements and save as draft
6. Return and click "Grade My Email"
7. Get instant results

### **For Administrators:**
1. Set up Azure App Registration
2. Configure permissions and admin consent
3. Update environment variables
4. Deploy application

## 🔍 **Grading Criteria**

The system checks:
- **Subject:** "Practice: Quarterly Update"
- **To:** ceo@example.edu
- **CC:** hr@example.edu  
- **BCC:** audit@example.edu
- **Body:** Contains "#Q4-Targets"

## 🛠 **Technical Details**

### **Frontend (Angular):**
- MSAL for Microsoft authentication
- Standalone components
- Responsive design
- Real-time grading feedback

### **Backend (Node.js):**
- Microsoft Graph API integration
- Exam session management
- Draft reading and parsing
- Automatic grading logic

### **Key Endpoints:**
- `POST /api/v1/exam/session` - Create exam session
- `POST /api/v1/exam/grade` - Grade exam via Graph API
- `GET /api/v1/exam/session/:code` - Get session details

## 🎉 **Benefits**

- ✅ **No Outlook add-ins** - Eliminates all installation issues
- ✅ **Works everywhere** - Outlook Web, Desktop, Mobile
- ✅ **Automatic grading** - Reads drafts directly via Graph API
- ✅ **Professional** - Uses Microsoft's official APIs
- ✅ **Reliable** - No certificate or manifest issues
- ✅ **Scalable** - Handles multiple users simultaneously

## 🚨 **Important Notes**

1. **Admin Consent Required:** `Mail.ReadWrite` permission needs admin approval
2. **User Consent:** Students must consent to mail access on first use
3. **Draft Access:** System reads user's drafts (requires Mail.ReadWrite)
4. **Exam Codes:** Unique codes prevent conflicts between users

This approach is much more reliable than Outlook add-ins and provides a better user experience!
