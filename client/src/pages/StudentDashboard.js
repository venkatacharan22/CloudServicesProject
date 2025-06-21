import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar, Users, Trophy, Search, Filter, MapPin, Clock,
  Heart, BookmarkPlus, ExternalLink, Star, Award, User, X, CalendarPlus
} from 'lucide-react';
import { apiHelpers } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import RegisterModal from '../components/RegisterModal';
import GoogleMap from '../components/GoogleMap';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { calendarService } from '../utils/calendarService';

const StudentDashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [hackathons, setHackathons] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [filteredHackathons, setFilteredHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [selectedLocationHackathon, setSelectedLocationHackathon] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    loadFavorites();
    
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    filterAndSortHackathons();
  }, [hackathons, searchTerm, statusFilter, sortBy]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [hackathonsResponse, registrationsResponse, favoritesResponse] = await Promise.all([
        apiHelpers.getHackathons().catch(() => ({ data: { hackathons: [] } })),
        apiHelpers.getUserRegistrations().catch(() => ({ data: { registrations: [] } })),
        apiHelpers.getFavorites().catch(() => ({ data: { favorites: [] } }))
      ]);

      setHackathons(hackathonsResponse.data.hackathons || []);
      setMyRegistrations(registrationsResponse?.data?.registrations || []);

      // Set favorites from backend
      const backendFavorites = favoritesResponse?.data?.favorites || [];
      const favoriteIds = backendFavorites.map(fav => fav.id);
      setFavorites(favoriteIds);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty data instead of showing error for empty state
      setHackathons([]);
      setMyRegistrations([]);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem(`favorites_${userProfile?.uid}`);
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites);
    localStorage.setItem(`favorites_${userProfile?.uid}`, JSON.stringify(newFavorites));
  };

  const toggleFavorite = async (hackathonId) => {
    try {
      const isFavorited = favorites.includes(hackathonId);

      if (isFavorited) {
        await apiHelpers.removeFavorite(hackathonId);
        setFavorites(prev => prev.filter(id => id !== hackathonId));
        toast.success('Removed from favorites');
      } else {
        await apiHelpers.addFavorite(hackathonId);
        setFavorites(prev => [...prev, hackathonId]);
        toast.success('Added to favorites');
      }

      // Also update localStorage as backup
      const newFavorites = isFavorited
        ? favorites.filter(id => id !== hackathonId)
        : [...favorites, hackathonId];
      localStorage.setItem(`favorites_${userProfile?.uid}`, JSON.stringify(newFavorites));

    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const filterAndSortHackathons = () => {
    let filtered = hackathons;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(h =>
        h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.theme?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(h => h.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.start_date) - new Date(b.start_date);
        case 'popularity':
          return (b.participants?.length || 0) - (a.participants?.length || 0);
        case 'deadline':
          return new Date(a.registration_deadline) - new Date(b.registration_deadline);
        default:
          return 0;
      }
    });

    setFilteredHackathons(filtered);
  };

  const handleRegister = async (hackathonId, formData) => {
    try {
      console.log('🎯 Dashboard: Starting registration for hackathon:', hackathonId);
      console.log('👤 Dashboard: Current user:', currentUser?.uid);
      console.log('📋 Dashboard: Form data:', formData);

      // Find the hackathon to get its title
      const hackathon = hackathons.find(h => h.id === hackathonId);
      const registrationData = {
        ...formData,
        hackathon_title: hackathon?.title || 'Unknown Hackathon'
      };

      const response = await apiHelpers.registerForHackathon(hackathonId, registrationData);
      console.log('✅ Dashboard: Registration successful:', response);

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      toast.success('🎉 Successfully registered for hackathon!');

      // Refresh all dashboard data to show updated counts and registration status
      await fetchDashboardData();
      setShowRegisterModal(false);

      console.log('✅ Dashboard: Data refreshed after registration');
    } catch (error) {
      console.error('❌ Dashboard: Registration error:', error);

      // Show specific error message from API
      const errorMessage = error.message || 'Failed to register for hackathon';
      toast.error(errorMessage);

      // Don't close modal on error so user can retry
      console.log('🔄 Dashboard: Keeping modal open for retry');
    }
  };

  const handleUnregister = async (hackathonId) => {
    try {
      console.log('🔄 Dashboard: Starting unregistration for hackathon:', hackathonId);
      await apiHelpers.unregisterFromHackathon(hackathonId);
      toast.success('✅ Successfully unregistered from hackathon');

      // Refresh all dashboard data to show updated counts and registration status
      await fetchDashboardData();
      console.log('✅ Dashboard: Data refreshed after unregistration');
    } catch (error) {
      console.error('❌ Dashboard: Unregistration error:', error);
      toast.error('Failed to unregister from hackathon');
    }
  };

  const generateCalendarLink = (hackathon) => {
    const startDate = new Date(hackathon.start_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(hackathon.end_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(hackathon.title);
    const details = encodeURIComponent(hackathon.description);
    const location = encodeURIComponent(hackathon.venue_name || 'Virtual Event');
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
  };

  const isRegistered = (hackathonId) => {
    return myRegistrations.some(reg => reg.hackathon_id === hackathonId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const mockAchievements = [
    { title: 'First Registration', description: 'Registered for your first hackathon', earned: true },
    { title: 'Team Player', description: 'Joined 3 different teams', earned: true },
    { title: 'Winner', description: 'Won a hackathon', earned: false },
    { title: 'Consistent Participant', description: 'Participated in 5 hackathons', earned: false }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading student dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userProfile?.name || 'Student'}!
          </h1>
          <p className="text-gray-600">
            Discover amazing hackathons and showcase your skills
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'discover', label: 'Discover Hackathons', icon: Search },
              { id: 'registrations', label: 'My Registrations', icon: Calendar },
              { id: 'profile', label: 'Profile & Achievements', icon: User }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'discover' && (
            <motion.div
              key="discover"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Filters and Search */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search hackathons..."
                    className="input pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                      className="input min-w-[120px]"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <select
                    className="input min-w-[140px]"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="popularity">Sort by Popularity</option>
                    <option value="deadline">Sort by Deadline</option>
                  </select>
                </div>
              </div>

              {/* Hackathons Grid */}
              {filteredHackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredHackathons.map((hackathon, index) => (
                    <motion.div
                      key={hackathon.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="card hover:shadow-lg transition-shadow duration-200 relative"
                    >
                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(hackathon.id)}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Heart 
                          className={`w-5 h-5 ${
                            favorites.includes(hackathon.id) 
                              ? 'text-red-500 fill-current' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>

                      {/* Header */}
                      <div className="mb-3 pr-12">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                            {hackathon.title}
                          </h3>
                        </div>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(hackathon.status)}`}>
                          {hackathon.status}
                        </span>
                      </div>

                      {/* Theme */}
                      {hackathon.theme && (
                        <div className="mb-3">
                          <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                            {hackathon.theme}
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {hackathon.description}
                      </p>

                      {/* Details */}
                      <div className="space-y-2 text-sm text-gray-500 mb-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            {new Date(hackathon.start_date).toLocaleDateString()} - {' '}
                            {new Date(hackathon.end_date).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>
                            Deadline: {new Date(hackathon.registration_deadline).toLocaleDateString()}
                          </span>
                        </div>

                        {hackathon.venue_name && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span className="truncate">
                                {hackathon.is_virtual ? 'Virtual Event' : hackathon.venue_name}
                              </span>
                            </div>
                            {!hackathon.is_virtual && hackathon.venue_coordinates && (
                              <button
                                onClick={() => setSelectedLocationHackathon(hackathon)}
                                className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                              >
                                View Map
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          <span>
                            {hackathon.participants?.length || 0} participants
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-4 border-t border-gray-200">
                        {isRegistered(hackathon.id) ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                              ✓ Registered
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUnregister(hackathon.id)}
                                className="btn btn-outline flex-1 text-sm"
                              >
                                Unregister
                              </button>
                              <button
                                onClick={() => calendarService.addToPersonalCalendar(hackathon)}
                                className="btn btn-secondary flex items-center justify-center px-3"
                                title="Add to calendar"
                              >
                                <CalendarPlus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (!currentUser) {
                                toast.error('Please login to register for hackathons');
                                return;
                              }
                              setSelectedHackathon(hackathon);
                              setShowRegisterModal(true);
                            }}
                            className="btn btn-primary w-full"
                            disabled={hackathon.status === 'completed' || new Date() > new Date(hackathon.registration_deadline)}
                          >
                            {hackathon.status === 'completed' ? 'Completed' :
                             new Date() > new Date(hackathon.registration_deadline) ? 'Registration Closed' :
                             !currentUser ? 'Login to Register' : 'Register'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hackathons found
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Check back later for new hackathons'
                    }
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'registrations' && (
            <motion.div
              key="registrations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">My Registrations</h2>
                {myRegistrations.length > 0 ? (
                  <div className="space-y-4">
                    {myRegistrations.map((registration) => (
                      <div key={registration.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-2">
                              {registration.hackathon_title || registration.hackathon?.title}
                            </h3>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {registration.hackathon?.description}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-500 mb-4">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>
                                  Registered: {new Date(registration.registered_at || registration.registration_date).toLocaleDateString()}
                                </span>
                              </div>

                              {registration.hackathon?.start_date && (
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-2" />
                                  <span>
                                    Event: {new Date(registration.hackathon.start_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}

                              {registration.hackathon?.venue_name && (
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span>
                                    {registration.hackathon.is_virtual ? 'Virtual Event' : registration.hackathon.venue_name}
                                  </span>
                                </div>
                              )}

                              {registration.hackathon?.participants && (
                                <div className="flex items-center">
                                  <Users className="w-4 h-4 mr-2" />
                                  <span>
                                    {registration.hackathon.participants.length} participants
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-3">
                              <Link
                                to={`/hackathons/${registration.hackathon_id}`}
                                className="btn btn-primary btn-sm"
                              >
                                View Details
                              </Link>

                              <button
                                onClick={() => handleUnregister(registration.hackathon_id)}
                                className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                              >
                                Unregister
                              </button>
                            </div>
                          </div>

                          <div className="ml-4">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(registration.hackathon?.status || registration.status)}`}>
                              {registration.hackathon?.status || registration.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations yet</h3>
                    <p className="text-gray-600 mb-4">Start exploring hackathons and register for events that interest you!</p>
                    <Link to="/hackathons" className="btn btn-primary">
                      Browse Hackathons
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Profile Summary */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{myRegistrations.length}</div>
                    <div className="text-sm text-gray-600">Hackathons Joined</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">2</div>
                    <div className="text-sm text-gray-600">Teams Formed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">1</div>
                    <div className="text-sm text-gray-600">Awards Won</div>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Achievements</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockAchievements.map((achievement, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border ${
                        achievement.earned 
                          ? 'border-yellow-200 bg-yellow-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          achievement.earned ? 'bg-yellow-200' : 'bg-gray-200'
                        }`}>
                          {achievement.earned ? (
                            <Trophy className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <Award className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className={`font-medium ${
                            achievement.earned ? 'text-yellow-800' : 'text-gray-600'
                          }`}>
                            {achievement.title}
                          </h3>
                          <p className={`text-sm ${
                            achievement.earned ? 'text-yellow-600' : 'text-gray-500'
                          }`}>
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Register Modal */}
        {showRegisterModal && (
          <RegisterModal
            isOpen={showRegisterModal}
            onClose={() => setShowRegisterModal(false)}
            hackathon={selectedHackathon}
            onRegister={handleRegister}
          />
        )}

        {/* Location Modal */}
        {selectedLocationHackathon && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedLocationHackathon.title} - Location
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {selectedLocationHackathon.venue_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLocationHackathon(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Venue Details</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{selectedLocationHackathon.venue_address}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {new Date(selectedLocationHackathon.start_date).toLocaleDateString()} - {' '}
                        {new Date(selectedLocationHackathon.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <GoogleMap
                    height="400px"
                    center={selectedLocationHackathon.venue_coordinates}
                    markers={[{
                      position: selectedLocationHackathon.venue_coordinates,
                      title: selectedLocationHackathon.venue_name,
                      info: selectedLocationHackathon.venue_address
                    }]}
                    className="w-full"
                  />
                </div>

                <div className="mt-4 flex justify-end space-x-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocationHackathon.venue_coordinates?.lat},${selectedLocationHackathon.venue_coordinates?.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Get Directions</span>
                  </a>
                  <button
                    onClick={() => setSelectedLocationHackathon(null)}
                    className="btn btn-outline"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
