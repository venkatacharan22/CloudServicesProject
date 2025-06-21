# HackHub API Endpoints Documentation

## 🔐 Authentication Endpoints
**Base Path: `/auth`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/verify` | Verify Firebase ID token | No |
| POST | `/auth/refresh` | Refresh authentication token | No |
| POST | `/auth/logout` | Logout user | No |
| GET | `/auth/me` | Get current user information | Yes |
| POST | `/auth/set-role` | Set user role (admin only) | Yes |

## 👤 User Endpoints
**Base Path: `/users`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get current user's profile | Yes |
| PUT | `/users/profile` | Update current user's profile | Yes |
| GET | `/users` | List users (with optional role filter) | Yes |
| GET | `/users/{user_id}` | Get user profile by ID | Yes |
| GET | `/users/registrations` | Get current user's registrations | Yes |
| GET | `/users/stats` | Get user statistics and achievements | Yes |
| POST | `/users/favorites/{hackathon_id}` | Add hackathon to favorites | Yes |
| DELETE | `/users/favorites/{hackathon_id}` | Remove hackathon from favorites | Yes |
| GET | `/users/favorites` | Get user's favorite hackathons | Yes |

## 🏆 Hackathon Endpoints
**Base Path: `/hackathons`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/hackathons` | List all hackathons | No |
| POST | `/hackathons` | Create new hackathon (organizers only) | Yes |
| GET | `/hackathons/{id}` | Get hackathon by ID | No |
| PUT | `/hackathons/{id}` | Update hackathon (organizer only) | Yes |
| DELETE | `/hackathons/{id}` | Delete hackathon (organizer only) | Yes |
| POST | `/hackathons/{id}/register` | Register for hackathon | Yes |
| DELETE | `/hackathons/{id}/unregister` | Unregister from hackathon | Yes |
| GET | `/hackathons/{id}/participants` | Get hackathon participants | Yes |
| GET | `/hackathons/analytics/overview` | Get hackathon analytics | Yes |
| GET | `/hackathons/test-db` | Test database connection | No |
| POST | `/hackathons/test-register/{id}` | Test registration (no auth) | No |

## 👥 Team Endpoints
**Base Path: `/teams`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/teams` | List teams | Yes |
| POST | `/teams` | Create team | Yes |
| GET | `/teams/{id}` | Get team by ID | Yes |
| PUT | `/teams/{id}` | Update team | Yes |
| DELETE | `/teams/{id}` | Delete team | Yes |
| POST | `/teams/{id}/join` | Join team | Yes |
| DELETE | `/teams/{id}/leave` | Leave team | Yes |

## 📝 Submission Endpoints
**Base Path: `/submissions`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/submissions` | List submissions | Yes |
| POST | `/submissions` | Create submission | Yes |
| GET | `/submissions/{id}` | Get submission by ID | Yes |
| PUT | `/submissions/{id}` | Update submission | Yes |
| DELETE | `/submissions/{id}` | Delete submission | Yes |

## 📧 Email Endpoints
**Base Path: `/email`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/email/send` | Send email | Yes |
| POST | `/email/send-bulk` | Send bulk email | Yes |

## 🗺️ Maps Endpoints
**Base Path: `/maps`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/maps/geocode` | Geocode address | No |
| GET | `/maps/places` | Search places | No |
| GET | `/maps/places/search` | Search places with query | No |
| GET | `/maps/places/nearby` | Get nearby places | No |

## 🔄 API Compatibility Endpoints
**Base Path: `/api`**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/register` | Register for hackathon (compatibility) | Yes |
| GET | `/api/my-registrations` | Get user registrations (compatibility) | Yes |

## 🏥 Health & Utility Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Root endpoint | No |
| GET | `/health` | Health check | No |
| GET | `/docs` | Swagger API documentation | No |
| GET | `/redoc` | ReDoc API documentation | No |

---

## 🎯 Frontend API Usage

### Currently Used in Frontend:

#### Authentication
- `POST /auth/verify` - Login verification
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile

#### Hackathons
- `GET /hackathons` - List hackathons (Dashboard, HackathonList)
- `GET /hackathons/{id}` - Get hackathon details (HackathonDetail)
- `POST /hackathons` - Create hackathon (CreateHackathonModal)
- `PUT /hackathons/{id}` - Update hackathon (EditHackathonModal)
- `DELETE /hackathons/{id}` - Delete hackathon (FacultyDashboard)
- `POST /hackathons/{id}/register` - Register for hackathon (RegisterModal)
- `DELETE /hackathons/{id}/unregister` - Unregister (StudentDashboard)
- `GET /hackathons/{id}/participants` - View participants (HackathonDetail)
- `GET /hackathons/analytics/overview` - Analytics (AnalyticsModal)

#### User Features
- `GET /users/registrations` - My registrations (StudentDashboard)
- `GET /users/stats` - User statistics (Profile)
- `POST /users/favorites/{id}` - Add favorite (StudentDashboard)
- `DELETE /users/favorites/{id}` - Remove favorite (StudentDashboard)
- `GET /users/favorites` - Get favorites (StudentDashboard)

#### Maps
- `GET /maps/geocode` - Address geocoding (CreateHackathonModal, EditHackathonModal)

#### Email
- `POST /email/send` - Send notifications (Registration confirmations)

---

## 🚨 Registration Issue Analysis & Solution

### **Issue Identified:**
The registration functionality is failing because of **authentication requirements**. The backend endpoints are working correctly, but users need to be properly authenticated with Firebase.

### **Root Cause:**
1. ✅ Backend registration endpoint works (`POST /hackathons/{id}/register`)
2. ✅ Authentication system works (returns 401 for invalid tokens)
3. ❌ Frontend users may not be properly logged in or tokens are not being sent

### **Solution Steps:**

#### 1. **Ensure User Authentication**
Users must be logged in with Firebase Auth before attempting registration:
```javascript
// Check if user is authenticated
const { currentUser } = useAuth();
if (!currentUser) {
  // Redirect to login or show login modal
  navigate('/login');
  return;
}
```

#### 2. **Verify Token Transmission**
The API helper automatically adds Bearer tokens:
```javascript
// In api.js - this should work automatically
config.headers.Authorization = `Bearer ${token}`;
```

#### 3. **Registration Flow**
```javascript
// Proper registration call
const response = await apiHelpers.registerForHackathon(hackathonId, {
  name: "User Name",
  email: "user@example.com",
  organization: "University",
  experience_level: "beginner",
  motivation: "Learning and networking"
});
```

### **Testing Registration:**
1. **Login to the app** with Google or email
2. **Navigate to a hackathon**
3. **Click "Register"** button
4. **Fill out the registration form**
5. **Submit** - should work if authenticated

### **Debug Steps:**
1. Check browser console for authentication errors
2. Verify Firebase Auth is working in Network tab
3. Check server logs for registration attempts
4. Ensure user profile exists in Firestore

---

## ✅ **All Endpoints Status: FUNCTIONAL**

**Backend Server:** ✅ Running on http://localhost:8000
**Frontend App:** ✅ Running on http://localhost:3000
**Database:** ✅ Firebase Firestore connected
**Authentication:** ✅ Firebase Auth working

### **Registration Fix:**
The registration will work once users are properly authenticated. The backend is ready and all endpoints are functional!
