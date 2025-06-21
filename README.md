# HackHub - Hackathon Organization Platform

A comprehensive platform for organizing and participating in hackathons, built with React, Tailwind CSS, and FastAPI, featuring Firebase integration and Google Cloud services.

## 🚀 Features

### For Participants
- **User Authentication**: Secure login/signup with Firebase Auth and Google OAuth
- **Hackathon Discovery**: Browse and search hackathons with advanced filters
- **Team Formation**: Create and join teams with skill-based matching
- **Project Submission**: Submit projects with GitHub integration
- **Real-time Updates**: Get notifications about hackathon updates

### For Organizers
- **Event Management**: Create and manage hackathons with detailed configurations
- **Participant Management**: Track registrations and manage participants
- **Venue Integration**: Google Maps integration for venue selection and directions
- **Communication**: Send bulk emails and notifications to participants
- **Analytics**: Track event performance and participant engagement

### Technical Features
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Database**: Firebase Firestore for real-time data sync
- **Cloud Storage**: Firebase Storage for file uploads
- **Email Service**: Automated email notifications with SendGrid/SMTP
- **Maps Integration**: Google Maps for venue locations and directions
- **GCP Deployment**: Ready for Google Cloud Platform deployment

## 🛠 Tech Stack

### Frontend
- **React 18**: Modern React with hooks and context
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **React Hook Form**: Form handling and validation
- **Lucide React**: Beautiful icons

### Backend
- **FastAPI**: Modern Python web framework
- **Firebase Admin SDK**: Server-side Firebase integration
- **Google Cloud Services**: Maps, Storage, and deployment
- **SendGrid**: Email service integration
- **Uvicorn**: ASGI server

### Database & Services
- **Firebase Firestore**: NoSQL document database
- **Firebase Auth**: Authentication service
- **Firebase Storage**: File storage service
- **Google Maps API**: Location and mapping services
- **SendGrid/SMTP**: Email delivery services

## 📁 Project Structure

```
hackhub/
├── client/                 # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # FastAPI Backend
│   ├── routes/             # API routes
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── main.py             # FastAPI app
│   └── requirements.txt
├── firebase.json           # Firebase configuration
├── .env.example           # Environment variables template
├── package.json           # Root package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Firebase project
- Google Cloud Platform account
- Google Maps API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hackhub
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Add Firebase, Google Maps, and other API keys
```

### 3. Install Dependencies
```bash
# Install all dependencies (client, server, and root)
npm run install-all
```

### 4. Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication, Firestore, and Storage
3. Download service account key and update `.env`
4. Configure Firebase hosting (optional)

### 5. Google Cloud Setup
1. Enable Google Maps JavaScript API
2. Enable Places API and Geocoding API
3. Create API key and add to `.env`

### 6. Start Development Servers
```bash
# Start both client and server
npm run dev

# Or start individually
npm run client  # React dev server (port 3000)
npm run server  # FastAPI server (port 8000)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Google Maps API
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# FastAPI Backend URL
REACT_APP_API_URL=http://localhost:8000

# Server Environment Variables
FIREBASE_ADMIN_SDK_PATH=path/to/firebase-admin-sdk.json
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EMAIL_SERVICE_API_KEY=your_email_service_api_key
EMAIL_FROM_ADDRESS=noreply@hackhub.com

# GCP Configuration
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/gcp-service-account.json
```

### Firebase Rules

Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Hackathons are readable by all, writable by organizers
    match /hackathons/{hackathonId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (resource == null || request.auth.uid == resource.data.organizer_id);
    }
    
    // Teams are readable by all, writable by members
    match /teams/{teamId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🚀 Deployment

### Render (Recommended - Free Tier Available)

#### Quick Deploy Steps:
1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Create Render Account**: Sign up at [render.com](https://render.com)
3. **Deploy Backend**:
   - New Web Service → Connect GitHub repo
   - **Name**: `hackhub-backend`
   - **Environment**: `Python`
   - **Build Command**: `cd server && pip install -r ../requirements.txt`
   - **Start Command**: `cd server && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Deploy Frontend**:
   - New Static Site → Connect GitHub repo
   - **Name**: `hackhub-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`

#### Environment Variables for Render:
Add these in Render dashboard for each service:

**Backend Service:**
```
FIREBASE_ADMIN_SDK_PATH=./utils/firebase-admin-sdk.json
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CORS_ORIGINS=https://your-frontend-url.onrender.com
```

**Frontend Service:**
```
REACT_APP_API_URL=https://your-backend-url.onrender.com
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Firebase Hosting (Alternative)
```bash
# Build the client
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Google Cloud Run (Alternative)
```bash
# Build and deploy FastAPI backend
gcloud run deploy hackhub-api \
  --source ./server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `POST /auth/verify` - Verify Firebase token
- `GET /hackathons` - List hackathons
- `POST /hackathons` - Create hackathon (organizers only)
- `POST /hackathons/{id}/register` - Register for hackathon
- `GET /teams` - List teams
- `POST /teams` - Create team
- `POST /email/send` - Send email (organizers only)
- `GET /maps/geocode` - Geocode address

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API docs at `/docs`

## 🎯 Roadmap

- [ ] Advanced team matching algorithms
- [ ] Real-time chat and collaboration
- [ ] Video conferencing integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] AI-powered project recommendations

---

Built with ❤️ for the hackathon community
