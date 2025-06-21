import React, { useState } from 'react';
import { X, Calendar, MapPin, Users, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { apiHelpers } from '../utils/api';
import GoogleMapsWrapper from './GoogleMapsWrapper';
import { ErrorMessage } from '../utils/errorUtils';
import toast from 'react-hot-toast';

const CreateHackathonModal = ({ isOpen, onClose, onSuccess, editMode = false, hackathonData = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm();

  // Initialize form with existing data in edit mode
  React.useEffect(() => {
    if (editMode && hackathonData) {
      console.log('🔄 Initializing edit form with data:', hackathonData);

      // Convert ISO dates to datetime-local format
      const formatDateForInput = (isoDate) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        return date.toISOString().slice(0, 16);
      };

      // Set form values
      reset({
        title: hackathonData.title || '',
        description: hackathonData.description || '',
        theme: hackathonData.theme || '',
        start_date: formatDateForInput(hackathonData.start_date),
        end_date: formatDateForInput(hackathonData.end_date),
        registration_deadline: formatDateForInput(hackathonData.registration_deadline),
        venue_name: hackathonData.venue_name || '',
        venue_address: hackathonData.venue_address || '',
        is_virtual: hackathonData.is_virtual || false,
        max_participants: hackathonData.max_participants || '',
        max_team_size: hackathonData.max_team_size || 4,
        rules: hackathonData.rules?.join('\n') || '',
        requirements: hackathonData.requirements?.join('\n') || '',
        prizes: hackathonData.prizes?.[0]?.description || '',
        tags: hackathonData.tags?.join(', ') || ''
      });

      // Set location if available
      if (hackathonData.venue_coordinates) {
        setSelectedLocation({
          name: hackathonData.venue_name,
          address: hackathonData.venue_address,
          coordinates: hackathonData.venue_coordinates
        });
      }
    }
  }, [editMode, hackathonData, reset]);

  const steps = [
    { id: 1, title: 'Basic Information', icon: Calendar },
    { id: 2, title: 'Venue & Logistics', icon: MapPin },
    { id: 3, title: 'Rules & Prizes', icon: Trophy },
    { id: 4, title: 'Review & Create', icon: Users }
  ];

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
        venue_coordinates: selectedLocation?.coordinates || null,
        max_participants: data.max_participants ? parseInt(data.max_participants) : null,
        max_team_size: data.max_team_size ? parseInt(data.max_team_size) : 4,
        is_virtual: data.is_virtual || false
      };

      console.log(`${editMode ? 'Updating' : 'Creating'} hackathon data:`, formData);

      let response;
      if (editMode && hackathonData?.id) {
        response = await apiHelpers.updateHackathon(hackathonData.id, formData);
        console.log('Hackathon updated:', response);
        toast.success('✅ Hackathon updated successfully!');
        onSuccess(response.data);
      } else {
        response = await apiHelpers.createHackathon(formData);
        console.log('Hackathon created:', response);
        toast.success('✅ Hackathon created successfully!');
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} hackathon:`, error);
      toast.error(error.response?.data?.detail || `Failed to ${editMode ? 'update' : 'create'} hackathon`);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div>
            <h2 className="text-2xl font-bold">
              {editMode ? 'Edit Hackathon' : 'Create New Hackathon'}
            </h2>
            <p className="text-primary-100 mt-1">Step {currentStep} of {steps.length}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    currentStep >= step.id
                      ? 'bg-primary-600 border-primary-600 text-white shadow-lg'
                      : currentStep === step.id - 1
                      ? 'border-primary-600 text-primary-600 bg-white shadow-md'
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="mt-3 text-center">
                    <p className={`text-sm font-semibold ${
                      currentStep >= step.id ? 'text-primary-600' : 'text-gray-500'
                    }`}>
                      Step {step.id}
                    </p>
                    <p className={`text-xs mt-1 ${
                      currentStep >= step.id ? 'text-primary-500' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-300 ${
                    currentStep > step.id ? 'bg-primary-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
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
                      placeholder="e.g., AI/ML, Web Development, Mobile Apps"
                    />
                  </div>

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

                  <div>
                    <label className="label">Registration Deadline *</label>
                    <input
                      type="datetime-local"
                      {...register('registration_deadline', { required: 'Registration deadline is required' })}
                      className="input"
                    />
                    <ErrorMessage error={errors.registration_deadline} />
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
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
                          placeholder="Enter venue name or select from map"
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
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
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
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Hackathon</h3>
                    <div className="space-y-3 text-sm">
                      <div><strong>Title:</strong> {watch('title')}</div>
                      <div><strong>Theme:</strong> {watch('theme') || 'Not specified'}</div>
                      <div><strong>Start Date:</strong> {watch('start_date')}</div>
                      <div><strong>End Date:</strong> {watch('end_date')}</div>
                      <div><strong>Registration Deadline:</strong> {watch('registration_deadline')}</div>
                      <div><strong>Type:</strong> {watch('is_virtual') ? 'Virtual' : 'In-person'}</div>
                      {!watch('is_virtual') && (
                        <div><strong>Venue:</strong> {watch('venue_name')}</div>
                      )}
                      <div><strong>Max Participants:</strong> {watch('max_participants') || 'Unlimited'}</div>
                      <div><strong>Max Team Size:</strong> {watch('max_team_size') || '4'}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn btn-outline flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-3">
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (editMode ? 'Updating...' : 'Creating...')
                    : (editMode ? 'Update Hackathon' : 'Create Hackathon')
                  }
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateHackathonModal;
