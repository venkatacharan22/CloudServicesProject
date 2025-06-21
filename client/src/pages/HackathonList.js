import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Search, Filter, CalendarPlus } from 'lucide-react';
import { apiHelpers } from '../utils/api';
import { calendarService } from '../utils/calendarService';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const HackathonList = () => {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredHackathons, setFilteredHackathons] = useState([]);

  useEffect(() => {
    fetchHackathons();
  }, []);

  useEffect(() => {
    filterHackathons();
  }, [hackathons, searchTerm, statusFilter]);

  const fetchHackathons = async () => {
    try {
      setLoading(true);
      const response = await apiHelpers.getHackathons();
      setHackathons(response.data.hackathons || []);
    } catch (error) {
      console.error('Error fetching hackathons:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterHackathons = () => {
    let filtered = hackathons;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(hackathon =>
        hackathon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hackathon.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hackathon.theme?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(hackathon => hackathon.status === statusFilter);
    }

    setFilteredHackathons(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAddToCalendar = async (hackathon) => {
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

  if (loading) {
    return <LoadingSpinner text="Loading hackathons..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Discover Hackathons
          </h1>
          <p className="text-gray-600">
            Find exciting hackathons to participate in and showcase your skills
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search hackathons..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
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
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredHackathons.length} of {hackathons.length} hackathons
          </p>
        </div>

        {/* Hackathons Grid */}
        {filteredHackathons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHackathons.map((hackathon) => (
              <div key={hackathon.id} className="card hover:shadow-lg transition-shadow duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                    {hackathon.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(hackathon.status)}`}>
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
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>
                      {formatDate(hackathon.start_date)} - {formatDate(hackathon.end_date)}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>
                      Registration until {formatDate(hackathon.registration_deadline)}
                    </span>
                  </div>

                  {hackathon.venue_name && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {hackathon.is_virtual ? 'Virtual Event' : hackathon.venue_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>
                      {hackathon.participants?.length || 0} participants
                      {hackathon.max_participants && ` / ${hackathon.max_participants} max`}
                    </span>
                  </div>
                </div>

                {/* Organizer */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-xs text-gray-500">
                    Organized by <span className="font-medium">{hackathon.organizer_name}</span>
                  </p>
                </div>

                {/* Tags */}
                {hackathon.tags && hackathon.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {hackathon.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {hackathon.tags.length > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          +{hackathon.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Link
                    to={`/hackathons/${hackathon.id}`}
                    className="btn btn-primary flex-1 text-center"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleAddToCalendar(hackathon)}
                    className="btn btn-outline px-3 flex items-center justify-center"
                    title="Add to calendar"
                  >
                    <CalendarPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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
      </div>
    </div>
  );
};

export default HackathonList;
