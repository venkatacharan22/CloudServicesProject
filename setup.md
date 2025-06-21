# HackHub Setup Guide

## 🚀 Quick Setup Instructions

Your Firebase project and API keys have been configured! Follow these steps to get HackHub running:

### 1. Download Firebase Admin SDK Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/hackhub-d80ed/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-admin-sdk.json`
5. Place it in the root directory of your project

### 2. Install Dependencies

```bash
# Install all dependencies (client, server, and root)
npm run install-all
```

### 3. Set up Firestore Database

1. Go to [Firestore Console](https://console.firebase.google.com/project/hackhub-d80ed/firestore)
2. Create database in production mode
3. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 4. Enable Firebase Services

Make sure these are enabled in your Firebase project:
- ✅ Authentication (Email/Password + Google)
- ✅ Firestore Database
- ✅ Storage
- ✅ Hosting (optional)

### 5. Start Development Servers

```bash
# Start both client and server
npm run dev

# Or start individually:
npm run client  # React dev server (http://localhost:3000)
npm run server  # FastAPI server (http://localhost:8000)
```

### 6. Test the Application

1. Open http://localhost:3000
2. Try registering a new account
3. Test Google OAuth login
4. Create a hackathon (as organizer)
5. Browse hackathons

## 🔧 Configuration Details

### Your Firebase Project:
- **Project ID**: hackhub-d80ed
- **Auth Domain**: hackhub-d80ed.firebaseapp.com
- **Storage Bucket**: hackhub-d80ed.firebasestorage.app

### Your GCP Project:
- **Project ID**: hackhub-463514
- **Project Number**: 464944436952

### API Keys Configured:
- ✅ Firebase API Key
- ✅ Google Maps API Key
- ✅ Gemini AI API Key (for future features)

## 📱 Testing Features

### As a Participant:
1. Register/Login
2. Browse hackathons
3. Join teams
4. Submit projects

### As an Organizer:
1. Register with "organizer" role
2. Create hackathons
3. Manage participants
4. Send notifications

## 🚀 Deployment

### Firebase Hosting (Frontend):
```bash
npm run build
firebase deploy --only hosting
```

### Google Cloud Run (Backend):
```bash
cd server
gcloud run deploy hackhub-api --source . --platform managed --region us-central1
```

## 🆘 Troubleshooting

### Common Issues:

1. **Firebase Admin SDK Error**:
   - Make sure `firebase-admin-sdk.json` is in the root directory
   - Check file permissions

2. **CORS Errors**:
   - Verify CORS_ORIGINS in .env includes your frontend URL

3. **Google Maps Not Loading**:
   - Check if Maps JavaScript API is enabled in GCP Console
   - Verify API key restrictions

4. **Authentication Issues**:
   - Ensure Firebase Auth is enabled
   - Check authorized domains in Firebase Console

### Need Help?
- Check the console for error messages
- Verify all environment variables are set
- Ensure Firebase services are enabled
- Check API quotas in GCP Console

## 🎯 Next Steps

1. Customize the UI/UX to match your brand
2. Add more hackathon features (judging, voting, etc.)
3. Implement real-time chat
4. Add mobile app support
5. Integrate with GitHub for project submissions

Happy Hacking! 🎉
