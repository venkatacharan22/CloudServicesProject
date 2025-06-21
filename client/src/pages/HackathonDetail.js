import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  Clock,
  ArrowLeft,
  ExternalLink,
  Star,
  StarOff,
  UserPlus,
  Share2,
  CalendarPlus,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiHelpers } from '../utils/api';
import RegisterModal from '../components/RegisterModal';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { calendarService } from '../utils/calendarService';

const HackathonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);

  const fetchHackathonDetails = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiHelpers.getHackathon(id);

      if (response.data) {
        // The backend returns hackathon data directly
        setHackathon(response.data);
      } else {
        setError('Hackathon not found');
        return;
      }

      // Fetch participants if user is registered or is organizer
      if (currentUser) {
        try {
          const participantsResponse = await apiHelpers.getHackathonParticipants(id);
          setParticipants(participantsResponse.data.participants || []);
        } catch (participantsError) {
          // User might not have permission to view participants
          console.log('Cannot fetch participants:', participantsError.response?.status);
        }
      }
    } catch (error) {
      console.error('Error fetching hackathon details:', error);
      if (error.response?.status === 404) {
        setError('Hackathon not found');
      } else {
        setError('Failed to load hackathon details');
      }
      toast.error('Failed to load hackathon details');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, navigate]);

  const checkRegistrationStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking registration status for hackathon:', id);

      // Primary check: user is in hackathon participants list
      if (hackathon && hackathon.participants && currentUser?.uid) {
        const isUserRegistered = hackathon.participants.includes(currentUser.uid);
        console.log('📋 User in participants list:', isUserRegistered);
        setIsRegistered(isUserRegistered);
        return;
      }

      // Fallback: Try to check user registrations (but don't fail if it errors)
      try {
        const response = await apiHelpers.getUserRegistrations();
        const registrations = response.data?.registrations || [];
        const isUserRegistered = registrations.some(reg =>
          reg.hackathon_id === id || reg.hackathon?.id === id
        );
        console.log('📋 Registration status from API:', isUserRegistered);
        setIsRegistered(isUserRegistered);
      } catch (apiError) {
        console.warn('⚠️ Could not fetch user registrations, using participants list only');
        // Use participants list as primary source of truth
        if (hackathon && hackathon.participants && currentUser?.uid) {
          setIsRegistered(hackathon.participants.includes(currentUser.uid));
        } else {
          setIsRegistered(false);
        }
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
      setIsRegistered(false);
    }
  }, [hackathon, currentUser, id]);

  const checkFavoriteStatus = useCallback(async () => {
    try {
      const response = await apiHelpers.getFavorites();
      const favorites = response.data?.favorites || [];
      setIsFavorited(favorites.some(fav => fav.id === id));
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchHackathonDetails();
  }, [fetchHackathonDetails]);

  useEffect(() => {
    if (currentUser && hackathon) {
      checkRegistrationStatus();
      checkFavoriteStatus();
    }
  }, [currentUser, hackathon, checkRegistrationStatus, checkFavoriteStatus]);

  const handleRegister = async (hackathonId, registrationData) => {
    try {
      console.log('🎯 Starting registration for hackathon:', hackathonId);
      console.log('📋 Registration data:', registrationData);

      // Add hackathon title to registration data
      const enrichedData = {
        ...registrationData,
        hackathon_title: hackathon?.title || 'Unknown Hackathon'
      };

      const response = await apiHelpers.registerForHackathon(hackathonId, enrichedData);
      console.log('✅ Registration response:', response);

      // Update local state immediately
      setIsRegistered(true);

      // Update hackathon data if provided in response
      if (response.data?.hackathon) {
        console.log('🔄 Updating hackathon data with new participant info');
        setHackathon(response.data.hackathon);
      } else {
        // Fallback: Refresh hackathon data
        console.log('🔄 Refreshing hackathon data from server');
        await fetchHackathonDetails();
      }

      toast.success('🎉 Successfully registered for hackathon!');
      console.log('✅ Registration completed and UI updated');
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('📋 Error details:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to register. Please try again.');
      throw error;
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      toast.error('Please login to add favorites');
      return;
    }

    try {
      if (isFavorited) {
        await apiHelpers.removeFavorite(id);
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await apiHelpers.addFavorite(id);
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: hackathon.title,
          text: hackathon.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleAddToCalendar = async () => {
    try {
      const result = await calendarService.addToPersonalCalendar(hackathon);
      if (result.success) {
        toast.success('Calendar invite opened!');
      } else {
        toast.error('Failed to open calendar invite');
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast.error('Failed to add to calendar');
    }
  };

  const handleDownloadICS = () => {
    try {
      const result = calendarService.downloadICSFile(hackathon);
      if (result.success) {
        toast.success('Calendar file downloaded!');
      } else {
        toast.error('Failed to download calendar file');
      }
    } catch (error) {
      console.error('Error downloading ICS:', error);
      toast.error('Failed to download calendar file');
    }
  };

  const getStatusBadge = (hackathon) => {
    const now = new Date();
    const startDate = new Date(hackathon.start_date);
    const endDate = new Date(hackathon.end_date);
    const registrationDeadline = new Date(hackathon.registration_deadline);

    if (now > endDate) {
      return <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Completed</span>;
    } else if (now >= startDate && now <= endDate) {
      return <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ongoing</span>;
    } else if (now > registrationDeadline) {
      return <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Registration Closed</span>;
    } else {
      return <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Open for Registration</span>;
    }
  };

  const canRegister = () => {
    if (!currentUser || isRegistered) return false;
    const now = new Date();
    const registrationDeadline = new Date(hackathon.registration_deadline);
    const startDate = new Date(hackathon.start_date);
    return now <= registrationDeadline && now < startDate;
  };

  if (loading) {
    return <LoadingSpinner text="Loading hackathon details..." />;
  }

  if (error || !hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Hackathon Not Found"}
          </h2>
          <p className="text-gray-600 mb-4">
            {error ? "There was an error loading the hackathon details." : "The hackathon you're looking for doesn't exist."}
          </p>
          <Link to="/hackathons" className="btn btn-primary">
            Browse Hackathons
          </Link>
        </div>
      </div>
    );
  }

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
            onClick={() => navigate('/hackathons')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Hackathons
          </button>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-8"
        >
          {/* Header Section */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">{hackathon.title}</h1>
                  {getStatusBadge(hackathon)}
                </div>

                {hackathon.theme && (
                  <p className="text-lg text-primary-600 font-medium mb-3">{hackathon.theme}</p>
                )}

                <p className="text-gray-600 leading-relaxed">{hackathon.description}</p>
              </div>

              <div className="flex items-center space-x-2 ml-6">
                <button
                  onClick={handleAddToCalendar}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Add to calendar"
                >
                  <CalendarPlus className="w-5 h-5 text-gray-400" />
                </button>

                <button
                  onClick={handleDownloadICS}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Download calendar file"
                >
                  <Download className="w-5 h-5 text-gray-400" />
                </button>

                <button
                  onClick={handleToggleFavorite}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFavorited ? (
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  ) : (
                    <StarOff className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Share hackathon"
                >
                  <Share2 className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4 mt-6">
              {currentUser ? (
                <>
                  {isRegistered ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <UserPlus className="w-5 h-5" />
                      <span className="font-medium">You're registered!</span>
                    </div>
                  ) : canRegister() ? (
                    <button
                      onClick={() => setShowRegisterModal(true)}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register Now</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="btn btn-outline opacity-50 cursor-not-allowed"
                    >
                      Registration Closed
                    </button>
                  )}
                </>
              ) : (
                <Link to="/login" className="btn btn-primary">
                  Login to Register
                </Link>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Event Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                Event Details
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Start:</span> {formatDate(hackathon.start_date)}
                  </div>
                </div>

                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium">End:</span> {formatDate(hackathon.end_date)}
                  </div>
                </div>

                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Registration Deadline:</span> {formatDate(hackathon.registration_deadline)}
                  </div>
                </div>

                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Registered:</span> {hackathon.participants?.length || 0}
                    {hackathon.max_participants && (
                      <span className="text-gray-500"> / {hackathon.max_participants}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Max Participants:</span> {hackathon.max_participants || 'Unlimited'}
                  </div>
                </div>

                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Max Team Size:</span> {hackathon.max_team_size || 4}
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                Venue Information
              </h3>

              {hackathon.is_virtual ? (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800 font-medium">Virtual Event</p>
                  <p className="text-blue-600 text-sm mt-1">
                    Event details and meeting links will be shared with registered participants.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {hackathon.venue_name && (
                    <div>
                      <span className="font-medium">Venue:</span> {hackathon.venue_name}
                    </div>
                  )}

                  {hackathon.venue_address && (
                    <div>
                      <span className="font-medium">Address:</span>
                      <div className="mt-1 text-gray-600">{hackathon.venue_address}</div>
                    </div>
                  )}

                  {hackathon.venue_coordinates && (
                    <div className="mt-4">
                      <a
                        href={`https://maps.google.com/?q=${hackathon.venue_coordinates.lat},${hackathon.venue_coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary-600 hover:text-primary-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Rules and Requirements */}
        {(hackathon.rules?.length > 0 || hackathon.requirements?.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {hackathon.rules?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rules & Guidelines</h3>
                  <ul className="space-y-2">
                    {hackathon.rules.map((rule, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hackathon.requirements?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
                  <ul className="space-y-2">
                    {hackathon.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 bg-accent-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Prizes */}
        {hackathon.prizes?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-primary-600" />
              Prizes & Recognition
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hackathon.prizes.map((prize, index) => (
                <div key={index} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-center">
                    <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    {prize.place && <div className="font-semibold text-gray-900">{prize.place} Place</div>}
                    {prize.amount && <div className="text-lg font-bold text-yellow-600">{prize.amount}</div>}
                    {prize.description && <div className="text-sm text-gray-600 mt-1">{prize.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Participants */}
        {participants.length > 0 && (isRegistered || hackathon.organizer_id === currentUser?.uid) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary-600" />
                Participants ({participants.length})
              </h3>
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="btn btn-outline text-sm"
              >
                {showParticipants ? 'Hide' : 'Show'} Participants
              </button>
            </div>

            {showParticipants && (
              <div className="space-y-3">
                {participants.slice(0, 10).map((participant, index) => (
                  <div key={participant.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {participant.name?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{participant.name}</div>
                        {participant.organization && (
                          <div className="text-sm text-gray-500">{participant.organization}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {participant.skills?.slice(0, 2).map((skill, skillIndex) => (
                        <span
                          key={skillIndex}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {participant.skills?.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{participant.skills.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {participants.length > 10 && (
                  <div className="text-center text-gray-500 text-sm">
                    And {participants.length - 10} more participants...
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Tags */}
        {hackathon.tags?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {hackathon.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          hackathon={hackathon}
          onRegister={handleRegister}
        />
      )}
    </div>
  );
};

export default HackathonDetail;
