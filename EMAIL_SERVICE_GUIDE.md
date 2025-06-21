# 📧 HackHub Email Service - Complete Setup Guide

## 🎯 Overview

HackHub includes a comprehensive email service with **automatic fallback** between multiple providers:

1. **SMTP (Gmail)** - Primary (Recommended)
2. **Gmail API** - Secondary 
3. **SendGrid** - Tertiary

## ✅ Quick Setup (Recommended)

### Option 1: Gmail SMTP (Easiest)

1. **Enable 2FA** on your Gmail account
2. **Generate App Password**: 
   - Go to https://myaccount.google.com/apppasswords
   - Generate a 16-character app password
3. **Run setup script**:
   ```bash
   python setup_email.py
   ```
4. **Test the service**:
   ```bash
   curl http://localhost:8000/api/email/test
   ```

### Option 2: Manual Configuration

Update your `.env` file:

```env
# Email Service Configuration
EMAIL_SERVICE_TYPE=smtp
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
GMAIL_FROM_ADDRESS=your-email@gmail.com
GMAIL_FROM_NAME=HackHub Team
```

## 🚀 Features

### ✅ Automatic Email Triggers

1. **Welcome Email** - Sent when users register
2. **Registration Confirmation** - Sent when users register for hackathons
3. **Hackathon Reminders** - Sent before events start
4. **Updates & Notifications** - Sent by organizers

### ✅ Beautiful Email Templates

- **Responsive HTML design**
- **Professional styling**
- **Branded with HackHub colors**
- **Mobile-friendly**

### ✅ Multiple Provider Support

- **Automatic fallback** if primary service fails
- **Real-time service switching**
- **Comprehensive error handling**

## 📋 API Endpoints

### Test Configuration
```bash
GET /api/email/test
```

### Send Test Email
```bash
POST /api/email/test-send
```

### Send Single Email (Auth Required)
```bash
POST /api/email/send
{
  "to": "user@example.com",
  "subject": "Test Subject",
  "content": "<h1>Hello World</h1>",
  "content_type": "text/html"
}
```

### Send Bulk Email (Auth Required)
```bash
POST /api/email/send-bulk
{
  "recipients": ["user1@example.com", "user2@example.com"],
  "subject": "Bulk Email",
  "content": "<h1>Hello Everyone</h1>",
  "content_type": "text/html"
}
```

### Send Hackathon Notification (Auth Required)
```bash
POST /api/email/hackathon-notification
{
  "hackathon_id": "hackathon_123",
  "notification_type": "reminder",
  "custom_message": "Don't forget to bring your laptop!"
}
```

## 🔧 Advanced Setup

### SendGrid Setup

1. Sign up at https://sendgrid.com/
2. Get API key from dashboard
3. Update `.env`:
   ```env
   EMAIL_SERVICE_TYPE=sendgrid
   SENDGRID_API_KEY=your_sendgrid_api_key
   ```

### Gmail API Setup

1. Enable Gmail API in Google Cloud Console
2. Create service account with domain-wide delegation
3. Download JSON credentials
4. Update `.env`:
   ```env
   EMAIL_SERVICE_TYPE=gmail_api
   GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
   GMAIL_SERVICE_ACCOUNT_EMAIL=service@your-domain.iam.gserviceaccount.com
   ```

## 🧪 Testing

### 1. Test Configuration
```bash
curl http://localhost:8000/api/email/test
```

Expected response:
```json
{
  "message": "Email service configuration",
  "status": "configured",
  "config": {
    "smtp_configured": true,
    "active_service": "smtp",
    "fallback_available": true
  }
}
```

### 2. Send Test Email
```bash
curl -X POST http://localhost:8000/api/email/test-send
```

### 3. Check Server Logs
Look for these log messages:
- `✅ Email service initialized with SMTP`
- `📧 Attempting to send email to user@example.com using smtp`
- `✅ Email sent successfully via SMTP to user@example.com`

## 🎨 Email Templates

### Registration Confirmation
- **Beautiful gradient header**
- **Event details section**
- **Call-to-action buttons**
- **Mobile responsive**

### Welcome Email
- **Branded design**
- **Getting started guide**
- **Dashboard link**
- **Professional styling**

### Hackathon Reminders
- **Urgent styling**
- **Checklist format**
- **Event countdown**
- **Action buttons**

## 🔍 Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Check `.env` file exists
   - Verify SMTP credentials
   - Run `python setup_email.py`

2. **"Authentication failed"**
   - Use App Password, not regular password
   - Enable 2FA on Gmail
   - Check username/password in `.env`

3. **"Connection timeout"**
   - Check firewall settings
   - Verify SMTP server/port
   - Try different network

### Debug Mode

Add to your `.env`:
```env
LOG_LEVEL=DEBUG
```

This will show detailed email sending logs.

## 🚀 Production Deployment

### Environment Variables

Make sure these are set in production:

```env
EMAIL_SERVICE_TYPE=smtp
SMTP_USERNAME=your-production-email@gmail.com
SMTP_PASSWORD=your-app-password
GMAIL_FROM_ADDRESS=noreply@yourdomain.com
GMAIL_FROM_NAME=Your App Name
```

### Security Best Practices

1. **Use App Passwords** (never regular passwords)
2. **Rotate credentials** regularly
3. **Monitor email quotas**
4. **Set up SPF/DKIM** records
5. **Use dedicated email domain**

## 📊 Monitoring

The email service provides detailed logging:

- **📧 Email attempts**
- **✅ Successful sends**
- **❌ Failed attempts**
- **🔄 Fallback usage**
- **📈 Service statistics**

## 🎯 Integration Examples

### Frontend Integration

```javascript
// Send registration confirmation
const response = await fetch('/api/email/hackathon-notification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    hackathon_id: 'hack123',
    notification_type: 'registration_confirmation'
  })
});
```

### Backend Integration

```python
# Send welcome email
await email_service.send_welcome_email(
    user_email="user@example.com",
    user_name="John Doe"
)

# Send registration confirmation
await email_service.send_registration_confirmation_email(
    user_email="user@example.com",
    user_name="John Doe",
    hackathon_data=hackathon_info
)
```

## 🎉 Ready to Go!

Your email service is now fully configured and ready for production use! 

🚀 **Start your server and test it out:**

```bash
cd server
python -m uvicorn main:app --reload
```

Then visit: http://localhost:8000/api/email/test
