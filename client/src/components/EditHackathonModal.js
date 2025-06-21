import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, FileText, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { apiHelpers } from '../utils/api';
import GoogleMapsWrapper from './GoogleMapsWrapper';
import toast from 'react-hot-toast';

const EditHackathonModal = ({ isOpen, onClose, hackathon, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm();

  useEffect(() => {
    if (hackathon && isOpen) {
      // Pre-populate form with existing hackathon data
      reset({
        title: hackathon.title || '',
        description: hackathon.description || '',
        theme: hackathon.theme || '',
        start_date: hackathon.start_date ? new Date(hackathon.start_date).toISOString().slice(0, 16) : '',
        end_date: hackathon.end_date ? new Date(hackathon.end_date).toISOString().slice(0, 16) : '',
        registration_deadline: hackathon.registration_deadline ? new Date(hackathon.registration_deadline).toISOString().slice(0, 16) : '',
        max_participants: hackathon.max_participants || '',
        max_team_size: hackathon.max_team_size || 4,
        venue_name: hackathon.venue_name || '',
        venue_address: hackathon.venue_address || '',
        is_virtual: hackathon.is_virtual || false,
        rules: hackathon.rules?.join('\n') || '',
        requirements: hackathon.requirements?.join('\n') || '',
        tags: hackathon.tags?.join(', ') || ''
      });

      // Set existing location if available
      if (hackathon.venue_coordinates) {
        setSelectedLocation({
          lat: hackathon.venue_coordinates.lat,
          lng: hackathon.venue_coordinates.lng,
          address: hackathon.venue_address || ''
        });
      }
    }
  }, [hackathon, isOpen, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Prepare update data
      const updateData = {
        ...data,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        registration_deadline: new Date(data.registration_deadline).toISOString(),
        max_participants: data.max_participants ? parseInt(data.max_participants) : null,
        max_team_size: parseInt(data.max_team_size),
        rules: data.rules ? data.rules.split('\n').filter(rule => rule.trim()) : [],
        requirements: data.requirements ? data.requirements.split('\n').filter(req => req.trim()) : [],
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        venue_coordinates: selectedLocation ? {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        } : null
      };

      console.log('Updating hackathon with data:', updateData);
      const response = await apiHelpers.updateHackathon(hackathon.id, updateData);
      
      toast.success('Hackathon updated successfully!');
      onUpdate(response.data.hackathon);
      onClose();
    } catch (error) {
      console.error('Error updating hackathon:', error);
      toast.error('Failed to update hackathon');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setValue('venue_address', location.address);
  };

  if (!isOpen || !hackathon) return null;

  const isVirtual = watch('is_virtual');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Hackathon</h2>
            <p className="text-gray-600 mt-1">Update hackathon details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Title *</label>
                  <input
                    {...register('title', { required: 'Title is required' })}
                    className="input"
                    placeholder="Enter hackathon title"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="label">Description *</label>
                  <textarea
                    {...register('description', { required: 'Description is required' })}
                    className="input h-24 resize-none"
                    placeholder="Describe your hackathon..."
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                </div>

                <div>
                  <label className="label">Theme</label>
                  <input
                    {...register('theme')}
                    className="input"
                    placeholder="e.g., AI for Good, Sustainability"
                  />
                </div>

                <div>
                  <label className="label">Tags</label>
                  <input
                    {...register('tags')}
                    className="input"
                    placeholder="AI, Web Development, Mobile (comma-separated)"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                Date & Time
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Start Date & Time *</label>
                  <input
                    {...register('start_date', { required: 'Start date is required' })}
                    type="datetime-local"
                    className="input"
                  />
                  {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>}
                </div>

                <div>
                  <label className="label">End Date & Time *</label>
                  <input
                    {...register('end_date', { required: 'End date is required' })}
                    type="datetime-local"
                    className="input"
                  />
                  {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>}
                </div>

                <div>
                  <label className="label">Registration Deadline *</label>
                  <input
                    {...register('registration_deadline', { required: 'Registration deadline is required' })}
                    type="datetime-local"
                    className="input"
                  />
                  {errors.registration_deadline && <p className="text-red-500 text-sm mt-1">{errors.registration_deadline.message}</p>}
                </div>
              </div>
            </div>

            {/* Participants & Teams */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary-600" />
                Participants & Teams
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Max Participants</label>
                  <input
                    {...register('max_participants')}
                    type="number"
                    min="1"
                    className="input"
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div>
                  <label className="label">Max Team Size *</label>
                  <input
                    {...register('max_team_size', { required: 'Max team size is required' })}
                    type="number"
                    min="1"
                    max="10"
                    className="input"
                    placeholder="4"
                  />
                  {errors.max_team_size && <p className="text-red-500 text-sm mt-1">{errors.max_team_size.message}</p>}
                </div>
              </div>
            </div>

            {/* Venue Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                Venue Information
              </h3>

              <div className="flex items-center space-x-3">
                <input
                  {...register('is_virtual')}
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  This is a virtual event
                </label>
              </div>

              {!isVirtual && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Venue Name</label>
                    <input
                      {...register('venue_name')}
                      className="input"
                      placeholder="e.g., Tech Hub Conference Center"
                    />
                  </div>

                  <div>
                    <label className="label">Venue Address</label>
                    <input
                      {...register('venue_address')}
                      className="input"
                      placeholder="Enter venue address"
                    />
                  </div>

                  <div>
                    <label className="label">Select Location on Map</label>
                    <div className="h-64 rounded-lg overflow-hidden border border-gray-300">
                      <GoogleMapsWrapper
                        onLocationSelect={handleLocationSelect}
                        initialLocation={selectedLocation}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rules & Requirements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Rules & Requirements
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Rules (one per line)</label>
                  <textarea
                    {...register('rules')}
                    className="input h-32 resize-none"
                    placeholder="Enter rules, one per line..."
                  />
                </div>

                <div>
                  <label className="label">Requirements (one per line)</label>
                  <textarea
                    {...register('requirements')}
                    className="input h-32 resize-none"
                    placeholder="Enter requirements, one per line..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
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
              className="btn btn-primary flex items-center space-x-2"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Updating...' : 'Update Hackathon'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditHackathonModal;
