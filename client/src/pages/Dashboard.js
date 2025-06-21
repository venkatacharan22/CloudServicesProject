import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import FacultyDashboard from './FacultyDashboard';
import StudentDashboard from './StudentDashboard';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { userProfile, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  // Route to appropriate dashboard based on user role
  if (userProfile?.role === 'organizer') {
    return <FacultyDashboard />;
  } else {
    return <StudentDashboard />;
  }


};

export default Dashboard;
