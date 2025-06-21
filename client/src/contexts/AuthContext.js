import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  const signup = async (email, password, userData) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(user, {
        displayName: userData.name,
      });

      // Create user profile in Firestore
      const userDoc = {
        uid: user.uid,
        email: user.email,
        name: userData.name,
        role: userData.role || 'participant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hackathons_participated: [],
        hackathons_organized: [],
        favorite_hackathons: [],
        ...userData,
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);
      setUserProfile(userDoc);
      
      toast.success('Account created successfully!');
      return user;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // Sign in with email and password
  const signin = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully!');
      return user;
    } catch (error) {
      console.error('Signin error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      // Check if user profile exists, if not create one
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Enhanced role assignment logic
        const isOrganizer = user.email?.includes('@faculty.') ||
                           user.email?.includes('@prof.') ||
                           user.email?.includes('@instructor.') ||
                           user.email?.includes('@teacher.') ||
                           user.email?.includes('@edu') ||
                           user.email?.includes('@university.') ||
                           user.email?.includes('@college.') ||
                           user.email?.includes('.edu') ||
                           user.email?.endsWith('.edu');

        const newUserProfile = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          role: isOrganizer ? 'organizer' : 'participant',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          hackathons_participated: [],
          hackathons_organized: [],
          favorite_hackathons: [],
        };
        await setDoc(doc(db, 'users', user.uid), newUserProfile);
        setUserProfile(newUserProfile);
      } else {
        // Update photo URL if it's changed
        const existingProfile = userDoc.data();
        if (existingProfile.photoURL !== user.photoURL) {
          await updateDoc(doc(db, 'users', user.uid), {
            photoURL: user.photoURL,
            updatedAt: new Date().toISOString(),
          });
        }
        setUserProfile(existingProfile);
      }
      
      toast.success('Signed in with Google successfully!');
      return user;
    } catch (error) {
      console.error('Google signin error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (!currentUser) throw new Error('No user logged in');

      // Use API instead of direct Firebase
      const { apiHelpers } = await import('../utils/api');
      const response = await apiHelpers.updateUserProfile(updates);

      if (response.data) {
        setUserProfile(response.data);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Fetch user profile error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    signin,
    signInWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
