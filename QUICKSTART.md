# 🚀 HackHub Quick Start

Your Firebase project and API keys are already configured! Follow these simple steps:

## Step 1: Download Firebase Admin SDK Key

1. Go to: https://console.firebase.google.com/project/hackhub-d80ed/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Download the JSON file
4. Rename it to `firebase-admin-sdk.json`
5. Place it in the root directory (same level as package.json)

## Step 2: Install Dependencies

**Windows:**
```bash
install.bat
```

**Mac/Linux:**
```bash
chmod +x install.sh
./install.sh
```

**Or manually:**
```bash
npm run install-all
```

## Step 3: Set up Firestore Database

1. Go to: https://console.firebase.google.com/project/hackhub-d80ed/firestore
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select a location (us-central1 recommended)

## Step 4: Deploy Firestore Rules

```bash
firebase login
firebase deploy --only firestore:rules
```

## Step 5: Start the Application

```bash
npm run dev
```

This will start:
- React frontend at: http://localhost:3000
- FastAPI backend at: http://localhost:8000

## Step 6: Test Your Setup

1. Open http://localhost:3000
2. Click **"Sign Up"**
3. Create an account as an **"Organizer"**
4. Try creating a hackathon
5. Test Google OAuth login

## 🎯 Your Project Details

- **Firebase Project**: hackhub-d80ed
- **GCP Project**: hackhub-463514
- **Frontend URL**: http://localhost:3000
- **Backend URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔧 Configured APIs

✅ Firebase Authentication (Email + Google)
✅ Firestore Database (Storage disabled as requested)
✅ Google Maps API
✅ Gemini AI API (for future features)
✅ JWT Secret Key (Generated securely)

## 🎯 Dashboard Features

### Faculty/Organizer Dashboard:
- Welcome card with user stats
- Total hackathons & registrations analytics
- Create hackathon modal (multi-step form)
- Delete confirmation modal
- Edit functionality
- Filters & search
- Export CSV of registrations
- Analytics with charts (recharts)
- Google Maps integration for venues

### Student Dashboard:
- Grid layout of hackathons
- Filter/sort by date/status
- Register button with prefilled form
- Confetti animation on success
- My Registrations tab
- Unregister option
- Add to calendar link
- Bookmark/Favorite system
- Profile tab with achievements

## 🆘 Need Help?

Check `setup.md` for detailed troubleshooting guide.

**Common Issues:**
- Make sure `firebase-admin-sdk.json` is in the root directory
- Ensure Firestore database is created
- Check that all Firebase services are enabled

## 🚀 Deploy to Production

**Frontend (Firebase Hosting):**
```bash
npm run build
firebase deploy --only hosting
```

**Backend (Google Cloud Run):**
```bash
cd server
gcloud run deploy hackhub-api --source . --platform managed
```

Happy Hacking! 🎉
