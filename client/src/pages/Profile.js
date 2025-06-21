import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  User, Building, Github, Linkedin, Globe,
  Save, Edit, Trophy, Calendar, Star, Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { apiHelpers } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage } from '../utils/errorUtils';
import toast from 'react-hot-toast';

const Profile = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({});
  const [achievements, setAchievements] = useState([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const calculateProfileCompletion = (profile) => {
    const fields = ['name', 'bio', 'organization', 'skills', 'github_url', 'linkedin_url'];
    const completed = fields.filter(field => profile?.[field] && profile[field].length > 0).length;
    return Math.round((completed / fields.length) * 100);
  };

  const generateAchievements = (registrations) => {
    const achievements = [
      {
        id: 'first_hackathon',
        title: 'First Steps',
        description: 'Registered for your first hackathon',
        icon: Trophy,
        earned: registrations.length > 0,
        color: 'text-blue-600'
      },
      {
        id: 'hackathon_veteran',
        title: 'Hackathon Veteran',
        description: 'Participated in 5+ hackathons',
        icon: Star,
        earned: registrations.length >= 5,
        color: 'text-purple-600'
      },
      {
        id: 'profile_complete',
        title: 'Profile Master',
        description: 'Completed 100% of your profile',
        icon: Award,
        earned: stats.profile_completion === 100,
        color: 'text-green-600'
      }
    ];
    setAchievements(achievements);
  };

  const fetchUserStats = useCallback(async () => {
    try {
      const statsResponse = await apiHelpers.getUserStats();

      if (statsResponse.data) {
        setStats(statsResponse.data.stats);
        setAchievements(statsResponse.data.achievements);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Fallback to basic stats calculation
      try {
        const registrationsResponse = await apiHelpers.getUserRegistrations();
        setStats({
          total_hackathons: registrationsResponse.data?.registrations?.length || 0,
          profile_completion: calculateProfileCompletion(userProfile)
        });
        generateAchievements(registrationsResponse.data?.registrations || []);
      } catch (fallbackError) {
        console.error('Error with fallback stats:', fallbackError);
      }
    }
  }, [userProfile, generateAchievements]);

  useEffect(() => {
    if (userProfile) {
      reset({
        name: userProfile.name || '',
        bio: userProfile.bio || '',
        organization: userProfile.organization || '',
        skills: userProfile.skills?.join(', ') || '',
        github_url: userProfile.github_url || '',
        linkedin_url: userProfile.linkedin_url || '',
        portfolio_url: userProfile.portfolio_url || ''
      });
      fetchUserStats();
    }
  }, [userProfile, reset, fetchUserStats]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const updateData = {
        ...data,
        skills: data.skills ? data.skills.split(',').map(skill => skill.trim()).filter(skill => skill) : []
      };

      await updateUserProfile(updateData);
      toast.success('Profile updated successfully!');
      setEditing(false);
      fetchUserStats();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{userProfile.name}</h1>
                <p className="text-gray-600">{userProfile.email}</p>
                <p className="text-sm text-gray-500 capitalize">{userProfile.role}</p>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="btn btn-outline flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{stats.hackathons_participated || 0}</div>
              <div className="text-sm text-blue-600">Hackathons Joined</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <User className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{stats.profile_completion || 0}%</div>
              <div className="text-sm text-green-600">Profile Complete</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">{achievements.filter(a => a.earned).length}</div>
              <div className="text-sm text-purple-600">Achievements</div>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('name', { required: 'Name is required' })}
                    className="input pl-10"
                    disabled={!editing}
                    placeholder="Enter your full name"
                  />
                </div>
                <ErrorMessage error={errors.name} />
              </div>

              <div>
                <label className="label">Organization/University</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('organization')}
                    className="input pl-10"
                    disabled={!editing}
                    placeholder="Enter your organization"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="label">Bio</label>
              <textarea
                {...register('bio')}
                className="input h-24 resize-none"
                disabled={!editing}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="mt-6">
              <label className="label">Skills</label>
              <input
                {...register('skills')}
                className="input"
                disabled={!editing}
                placeholder="Enter your skills separated by commas (e.g., JavaScript, Python, React)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label className="label">GitHub URL</label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('github_url')}
                    className="input pl-10"
                    disabled={!editing}
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>

              <div>
                <label className="label">LinkedIn URL</label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('linkedin_url')}
                    className="input pl-10"
                    disabled={!editing}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div>
                <label className="label">Portfolio URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('portfolio_url')}
                    className="input pl-10"
                    disabled={!editing}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>
            </div>

            {editing && (
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn btn-outline"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </form>
        </motion.div>

        {/* Achievements Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  achievement.earned
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    achievement.earned ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <achievement.icon className={`w-5 h-5 ${
                      achievement.earned ? achievement.color : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`font-medium ${
                      achievement.earned ? 'text-green-800' : 'text-gray-600'
                    }`}>
                      {achievement.title}
                    </h3>
                    <p className={`text-sm ${
                      achievement.earned ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
