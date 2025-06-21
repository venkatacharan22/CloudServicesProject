# 🔥 Firebase Admin SDK Key Required

## Quick Setup Steps:

### 1. Download Firebase Admin SDK Key
1. Go to: https://console.firebase.google.com/project/hackhub-d80ed/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Download the JSON file
4. **Rename it to `firebase-admin-sdk.json`**
5. **Place it in the root directory** (same level as package.json)

### 2. Restart the Server
After placing the file, restart the server:
```bash
cd server
python main.py
```

## 📧 Gmail API Setup (Choose One Option):

### Option A: Gmail App Password (Recommended - Simpler)
1. Enable 2FA on `hackon25.team@gmail.com`
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update `.env`:
```env
EMAIL_SERVICE_TYPE=smtp
SMTP_USERNAME=hackon25.team@gmail.com
SMTP_PASSWORD=your_16_character_app_password
```

### Option B: Gmail API with Service Account (Advanced)
1. Enable Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=hackhub-463514
2. Configure domain-wide delegation (see gmail-setup.md for details)

## 🚀 Current Status:
- ✅ Client dependencies installed
- ✅ Server dependencies installed  
- ✅ Environment configured
- ❌ Firebase Admin SDK key needed
- ❌ Gmail API setup needed

Once you add the Firebase key, the platform will be fully functional!
