import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import HackathonList from './pages/HackathonList';
import HackathonDetail from './pages/HackathonDetail';
import CreateHackathon from './pages/CreateHackathon';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import TestEmailCalendar from './components/TestEmailCalendar';

function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-16">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/hackathons" element={<HackathonList />} />
          <Route path="/hackathons/:id" element={<HackathonDetail />} />
          
          {/* Auth routes - redirect if already logged in */}
          <Route 
            path="/login" 
            element={currentUser ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={currentUser ? <Navigate to="/dashboard" /> : <Register />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/create-hackathon"
            element={
              <ProtectedRoute requiredRole="organizer">
                <CreateHackathon />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-email-calendar"
            element={
              <ProtectedRoute>
                <TestEmailCalendar />
              </ProtectedRoute>
            }
          />

          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
