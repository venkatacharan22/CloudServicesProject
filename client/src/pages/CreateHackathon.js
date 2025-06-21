import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Trophy, ArrowLeft, Save } from 'lucide-react';
import { apiHelpers } from '../utils/api';
import { ErrorMessage } from '../utils/errorUtils';
import GoogleMapsWrapper from '../components/GoogleMapsWrapper';
import toast from 'react-hot-toast';

const CreateHackathon = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setValue('venue_name', location.name);
    setValue('venue_address', location.address);
    setValue('latitude', location.coordinates.lat);
    setValue('longitude', location.coordinates.lng);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Convert datetime-local to ISO format
      const convertToISO = (dateTimeLocal) => {
        if (!dateTimeLocal) return null;
        return new Date(dateTimeLocal).toISOString();
      };

      // Process form data
      const formData = {
        ...data,
        start_date: convertToISO(data.start_date),
        end_date: convertToISO(data.end_date),
        registration_deadline: convertToISO(data.registration_deadline),
        rules: data.rules ? data.rules.split('\n').filter(rule => rule.trim()) : [],
        requirements: data.requirements ? data.requirements.split('\n').filter(req => req.trim()) : [],
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        prizes: data.prizes ? [{ description: data.prizes }] : [],
        max_participants: data.max_participants ? parseInt(data.max_participants) : null,
        max_team_size: data.max_team_size ? parseInt(data.max_team_size) : 4,
        is_virtual: data.is_virtual || false,
        venue_coordinates: data.latitude && data.longitude ? {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude)
        } : null
      };

      await apiHelpers.createHackathon(formData);
      toast.success('Hackathon created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating hackathon:', error);
      toast.error('Failed to create hackathon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Hackathon</h1>
          <p className="text-gray-600 mt-2">
            Fill out the form below to create and publish your hackathon event.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div>
              <div className="flex items-center mb-6">
                <Calendar className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="label">Hackathon Title *</label>
                  <input
                    {...register('title', { required: 'Title is required' })}
                    className="input"
                    placeholder="Enter hackathon title"
                  />
                  <ErrorMessage error={errors.title} />
                </div>

                <div>
                  <label className="label">Description *</label>
                  <textarea
                    {...register('description', { required: 'Description is required' })}
                    className="input h-32 resize-none"
                    placeholder="Describe your hackathon..."
                  />
                  <ErrorMessage error={errors.description} />
                </div>

                <div>
                  <label className="label">Theme (Optional)</label>
                  <input
                    {...register('theme')}
                    className="input"
                    placeholder="e.g., AI, Web Development, Mobile Apps"
                  />
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="datetime-local"
                    {...register('start_date', { required: 'Start date is required' })}
                    className="input"
                  />
                  <ErrorMessage error={errors.start_date} />
                </div>

                <div>
                  <label className="label">End Date *</label>
                  <input
                    type="datetime-local"
                    {...register('end_date', { required: 'End date is required' })}
                    className="input"
                  />
                  <ErrorMessage error={errors.end_date} />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">Registration Deadline *</label>
                <input
                  type="datetime-local"
                  {...register('registration_deadline', { required: 'Registration deadline is required' })}
                  className="input"
                />
                <ErrorMessage error={errors.registration_deadline} />
              </div>
            </div>

            {/* Venue & Logistics */}
            <div>
              <div className="flex items-center mb-6">
                <MapPin className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Venue & Logistics</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('is_virtual')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Virtual Event</span>
                  </label>
                </div>

                {!watch('is_virtual') && (
                  <>
                    <div>
                      <label className="label">Venue Name</label>
                      <input
                        {...register('venue_name')}
                        className="input"
                        placeholder="Enter venue name"
                      />
                    </div>

                    <div>
                      <label className="label">Venue Address</label>
                      <textarea
                        {...register('venue_address')}
                        className="input h-24 resize-none"
                        placeholder="Enter complete venue address or select from map"
                      />
                    </div>

                    <div>
                      <label className="label">Select Location on Map</label>
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <GoogleMapsWrapper
                          center={{ lat: 40.7128, lng: -74.0060 }}
                          zoom={13}
                          height="300px"
                          searchEnabled={true}
                          enablePinDrop={true}
                          showPinDropInstructions={true}
                          onLocationSelect={handleLocationSelect}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        🔍 Search for a location or 📍 click anywhere on the map to drop a pin and select venue
                      </p>
                      {selectedLocation && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>Selected:</strong> {selectedLocation.name}
                          </p>
                          <p className="text-xs text-green-600">{selectedLocation.address}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLocation(null);
                              setValue('venue_name', '');
                              setValue('venue_address', '');
                              setValue('latitude', '');
                              setValue('longitude', '');
                            }}
                            className="text-xs text-red-600 hover:text-red-800 mt-1"
                          >
                            Clear selection
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Maximum Participants</label>
                    <input
                      type="number"
                      {...register('max_participants')}
                      className="input"
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div>
                    <label className="label">Maximum Team Size</label>
                    <input
                      type="number"
                      {...register('max_team_size')}
                      className="input"
                      placeholder="Default: 4"
                      defaultValue={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rules & Prizes */}
            <div>
              <div className="flex items-center mb-6">
                <Trophy className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Rules & Prizes</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Rules & Guidelines</label>
                  <textarea
                    {...register('rules')}
                    className="input h-32 resize-none"
                    placeholder="Enter hackathon rules and guidelines (one per line)"
                  />
                </div>

                <div>
                  <label className="label">Requirements</label>
                  <textarea
                    {...register('requirements')}
                    className="input h-24 resize-none"
                    placeholder="Enter participation requirements (one per line)"
                  />
                </div>

                <div>
                  <label className="label">Prizes (Optional)</label>
                  <textarea
                    {...register('prizes')}
                    className="input h-24 resize-none"
                    placeholder="Enter prize information"
                  />
                </div>

                <div>
                  <label className="label">Tags</label>
                  <input
                    {...register('tags')}
                    className="input"
                    placeholder="Enter tags separated by commas (e.g., AI, Web, Mobile)"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Creating...' : 'Create Hackathon'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateHackathon;
