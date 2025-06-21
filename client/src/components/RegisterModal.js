import React, { useState } from 'react';
import { X, User, Mail, Phone, Building, FileText, Star, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../utils/errorUtils';
import Confetti from 'react-confetti';

const RegisterModal = ({ isOpen, onClose, hackathon, onRegister }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: userProfile?.name || '',
      email: userProfile?.email || '',
      organization: userProfile?.organization || '',
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      console.log('🎯 RegisterModal: Submitting registration with data:', data);

      // Clean up the data before sending
      const cleanData = {
        ...data,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(s => s) : []
      };

      console.log('🧹 RegisterModal: Cleaned data:', cleanData);
      await onRegister(hackathon.id, cleanData);
      console.log('✅ RegisterModal: Registration successful');
      // Show confetti on successful registration
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('❌ RegisterModal: Registration error:', error);
      console.error('Error details:', error.response?.data);
      // Don't close modal on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !hackathon) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Register for Hackathon</h2>
            <p className="text-gray-600 mt-1">{hackathon.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hackathon Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Start Date:</span>
              <span className="ml-2 text-gray-600">
                {new Date(hackathon.start_date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">End Date:</span>
              <span className="ml-2 text-gray-600">
                {new Date(hackathon.end_date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Registration Deadline:</span>
              <span className="ml-2 text-gray-600">
                {new Date(hackathon.registration_deadline).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Max Team Size:</span>
              <span className="ml-2 text-gray-600">
                {hackathon.max_team_size || 4} members
              </span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="input pl-10"
                  placeholder="Enter your full name"
                />
              </div>
              <ErrorMessage error={errors.name} />
            </div>

            <div>
              <label className="label">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="input pl-10"
                  placeholder="Enter your email"
                />
              </div>
              <ErrorMessage error={errors.email} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  {...register('phone')}
                  className="input pl-10"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div>
              <label className="label">Organization/University</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  {...register('organization')}
                  className="input pl-10"
                  placeholder="Enter your organization"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Experience Level</label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  {...register('experience_level')}
                  className="input pl-10"
                >
                  <option value="">Select your level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Team Preference</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  {...register('team_preference')}
                  className="input pl-10"
                >
                  <option value="">Select preference</option>
                  <option value="solo">Work Solo</option>
                  <option value="find_team">Find a Team</option>
                  <option value="have_team">Already Have Team</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Skills & Experience</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                {...register('skills')}
                className="input pl-10 h-24 resize-none"
                placeholder="Enter your skills separated by commas (e.g., JavaScript, Python, React, Machine Learning)"
              />
            </div>
          </div>

          <div>
            <label className="label">Why do you want to participate?</label>
            <textarea
              {...register('motivation')}
              className="input h-20 resize-none"
              placeholder="Tell us what motivates you to join this hackathon..."
            />
          </div>

          <div>
            <label className="label">Dietary Restrictions/Special Requirements</label>
            <input
              {...register('dietary_restrictions')}
              className="input"
              placeholder="Any dietary restrictions or special requirements?"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('agree_terms', { required: 'You must agree to the terms' })}
              className="rounded border-gray-300"
            />
            <label className="text-sm text-gray-700">
              I agree to the hackathon terms and conditions *
            </label>
          </div>
          <ErrorMessage error={errors.agree_terms} />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('newsletter')}
              className="rounded border-gray-300"
            />
            <label className="text-sm text-gray-700">
              Subscribe to newsletter for future hackathon updates
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Now'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterModal;
