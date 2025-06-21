# 📧 Gmail API Setup Guide

## 🔧 Service Account Configuration

Your service account is already created: `hackhub@hackhub-463514.iam.gserviceaccount.com`

## 📋 Required Steps

### 1. Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=hackhub-463514)
2. Click **"Enable"** for Gmail API

### 2. Configure Domain-wide Delegation
1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=hackhub-463514)
2. Find your service account: `hackhub@hackhub-463514.iam.gserviceaccount.com`
3. Click on it, then go to **"Details"** tab
4. Click **"Advanced settings"**
5. Note down the **"Client ID"** (you'll need this)
6. Check **"Enable Google Workspace Domain-wide Delegation"**
7. Add a product name: "HackHub Email Service"

### 3. Configure Google Workspace Admin Console
Since you're using `hackon25.team@gmail.com`, you need to:

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to **Security > API Controls > Domain-wide Delegation**
3. Click **"Add new"**
4. Enter your **Client ID** from step 2
5. Add these OAuth scopes:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```
6. Click **"Authorize"**

### 4. Download Service Account Key
1. Go back to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=hackhub-463514)
2. Click on your service account
3. Go to **"Keys"** tab
4. Click **"Add Key" > "Create new key"**
5. Choose **JSON** format
6. Download the file
7. Rename it to `firebase-admin-sdk.json`
8. Place it in your project root directory

## 🚀 Alternative: Gmail App Password (Simpler)

If domain-wide delegation is complex, you can use Gmail App Passwords:

### 1. Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication for `hackon25.team@gmail.com`

### 2. Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **"Mail"** and **"Other (Custom name)"**
3. Enter: "HackHub Email Service"
4. Copy the generated 16-character password

### 3. Update Environment Variables
Update your `.env` file:
```env
# Use SMTP with App Password (simpler option)
EMAIL_SERVICE_TYPE=smtp
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=hackon25.team@gmail.com
SMTP_PASSWORD=your_16_character_app_password
GMAIL_FROM_ADDRESS=hackon25.team@gmail.com
GMAIL_FROM_NAME=HackHub Team
```

## 🔍 Testing Email Service

Once configured, test the email service:

```bash
# Start the server
cd server
python -m uvicorn main:app --reload

# Test endpoint
curl -X POST "http://localhost:8000/email/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "content": "<h1>Hello from HackHub!</h1>"
  }'
```

## 🎯 Recommended Approach

For quick setup, I recommend using the **Gmail App Password** method as it's simpler and doesn't require Google Workspace admin access.

The Gmail API with service account is more robust for production but requires more setup.

## 🔧 Current Configuration

Your project is configured to use:
- **Service Account**: `hackhub@hackhub-463514.iam.gserviceaccount.com`
- **From Email**: `hackon25.team@gmail.com`
- **From Name**: `HackHub Team`
- **Service Type**: `gmail_api` (can be changed to `smtp`)

## 🆘 Troubleshooting

**Error: "insufficient authentication scopes"**
- Make sure domain-wide delegation is properly configured
- Verify the OAuth scopes are correct

**Error: "invalid_grant"**
- Check that the service account key is valid
- Ensure the delegated user email is correct

**Error: "access_denied"**
- Verify Gmail API is enabled
- Check service account permissions

Choose the method that works best for your setup!
