import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, Users, Trophy, Plus, Search, Filter, Download, 
  BarChart3, Edit, Trash2, Eye, MapPin, Clock 
} from 'lucide-react';
import { apiHelpers } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CreateHackathonModal from '../components/CreateHackathonModal';
import EditHackathonModal from '../components/EditHackathonModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import AnalyticsModal from '../components/AnalyticsModal';
import { CSVLink } from 'react-csv';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const FacultyDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState([]);
  const [filteredHackathons, setFilteredHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [stats, setStats] = useState({
    totalHackathons: 0,
    totalRegistrations: 0,
    activeHackathons: 0,
    completedHackathons: 0
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiHelpers.getHackathons();
      const hackathonData = response.data.hackathons || [];

      setHackathons(hackathonData);
      calculateStats(hackathonData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't show error toast if it's just empty data
      if (error.response?.status !== 404) {
        toast.error('Failed to load dashboard data');
      }
      // Set empty data instead of failing
      setHackathons([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = (hackathonData) => {
    const totalRegistrations = hackathonData.reduce((sum, h) => sum + (h.participants?.length || 0), 0);
    const activeHackathons = hackathonData.filter(h => h.status === 'ongoing').length;
    const completedHackathons = hackathonData.filter(h => h.status === 'completed').length;

    setStats({
      totalHackathons: hackathonData.length,
      totalRegistrations,
      activeHackathons,
      completedHackathons
    });
  };

  const filterHackathons = useCallback(() => {
    let filtered = hackathons;

    if (searchTerm) {
      filtered = filtered.filter(h =>
        h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(h => h.status === statusFilter);
    }

    setFilteredHackathons(filtered);
  }, [hackathons, searchTerm, statusFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    filterHackathons();
  }, [filterHackathons]);

  // CRUD Operation Handlers
  const handleViewHackathon = (hackathon) => {
    console.log('🔍 Viewing hackathon:', hackathon.id);
    navigate(`/hackathons/${hackathon.id}`);
  };

  const handleEditHackathon = (hackathon) => {
    console.log('✏️ Editing hackathon:', hackathon.id);
    setSelectedHackathon(hackathon);
    setShowEditModal(true);
  };

  const handleUpdateHackathon = async (updatedHackathon) => {
    try {
      // Refresh the hackathons list to show updated data
      await fetchDashboardData();
      toast.success('Hackathon updated successfully!');
      setShowEditModal(false);
      setSelectedHackathon(null);
    } catch (error) {
      console.error('Error after updating hackathon:', error);
      toast.error('Failed to refresh data after update');
    }
  };

  const handleDeleteHackathon = async () => {
    try {
      console.log('🗑️ Deleting hackathon:', selectedHackathon.id);
      await apiHelpers.deleteHackathon(selectedHackathon.id);

      // Update local state immediately
      setHackathons(prev => prev.filter(h => h.id !== selectedHackathon.id));
      setFilteredHackathons(prev => prev.filter(h => h.id !== selectedHackathon.id));

      setShowDeleteModal(false);
      setSelectedHackathon(null);
      toast.success('✅ Hackathon deleted successfully');

      // Refresh data to ensure consistency
      await fetchDashboardData();
    } catch (error) {
      console.error('❌ Error deleting hackathon:', error);
      toast.error('Failed to delete hackathon');
    }
  };

  const handleEditSuccess = async (updatedHackathon) => {
    console.log('✅ Hackathon updated:', updatedHackathon);

    // Update local state immediately
    setHackathons(prev => prev.map(h =>
      h.id === updatedHackathon.id ? updatedHackathon : h
    ));
    setFilteredHackathons(prev => prev.map(h =>
      h.id === updatedHackathon.id ? updatedHackathon : h
    ));

    setShowEditModal(false);
    setSelectedHackathon(null);
    toast.success('✅ Hackathon updated successfully');

    // Refresh data to ensure consistency
    await fetchDashboardData();
  };

  const getRegistrationsCSVData = () => {
    const csvData = [];
    hackathons.forEach(hackathon => {
      hackathon.participants?.forEach(participantId => {
        csvData.push({
          hackathon: hackathon.title,
          participantId,
          registrationDate: hackathon.created_at,
          status: hackathon.status
        });
      });
    });
    return csvData;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading faculty dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {userProfile?.name || 'Faculty'}!
              </h1>
              <p className="text-primary-100">
                Manage your hackathons and track participant engagement
              </p>
            </div>
            <div className="hidden md:block">
              <Trophy className="w-16 h-16 text-primary-200" />
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Hackathons', value: stats.totalHackathons, icon: Calendar, color: 'bg-blue-500' },
            { title: 'Total Registrations', value: stats.totalRegistrations, icon: Users, color: 'bg-green-500' },
            { title: 'Active Events', value: stats.activeHackathons, icon: Trophy, color: 'bg-purple-500' },
            { title: 'Completed Events', value: stats.completedHackathons, icon: BarChart3, color: 'bg-orange-500' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className="flex items-center">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions Bar */}
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

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Hackathon</span>
          </button>

          <CSVLink
            data={getRegistrationsCSVData()}
            filename="hackathon-registrations.csv"
            className="btn btn-outline flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </CSVLink>

          <button
            onClick={() => setShowAnalyticsModal(true)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
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
                className="card hover:shadow-lg transition-shadow duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                    {hackathon.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(hackathon.status)}`}>
                    {hackathon.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
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

                  {hackathon.venue_name && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="truncate">
                        {hackathon.is_virtual ? 'Virtual Event' : hackathon.venue_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>
                      {hackathon.participants?.length || 0} registrations
                      {hackathon.max_participants && ` / ${hackathon.max_participants} max`}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      Reg. deadline: {new Date(hackathon.registration_deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleViewHackathon(hackathon)}
                    className="btn btn-outline flex-1 flex items-center justify-center space-x-1 hover:bg-blue-50"
                    title="View hackathon details"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleEditHackathon(hackathon)}
                    className="btn btn-secondary flex items-center justify-center space-x-1 px-3 hover:bg-gray-100"
                    title="Edit hackathon"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedHackathon(hackathon);
                      setShowDeleteModal(true);
                    }}
                    className="btn bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center space-x-1 px-3"
                    title="Delete hackathon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No hackathons match your filters' : 'No hackathons created yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first hackathon to get started'
              }
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create Hackathon
              </button>
            )}
          </div>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateHackathonModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchDashboardData}
          />
        )}

        {showEditModal && selectedHackathon && (
          <CreateHackathonModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedHackathon(null);
            }}
            onSuccess={handleEditSuccess}
            editMode={true}
            hackathonData={selectedHackathon}
          />
        )}

        {showDeleteModal && (
          <DeleteConfirmModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedHackathon(null);
            }}
            onConfirm={handleDeleteHackathon}
            title="Delete Hackathon"
            message={`Are you sure you want to delete "${selectedHackathon?.title}"? This action cannot be undone.`}
          />
        )}

        {/* Edit Hackathon Modal */}
        {showEditModal && selectedHackathon && (
          <EditHackathonModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedHackathon(null);
            }}
            hackathon={selectedHackathon}
            onUpdate={handleUpdateHackathon}
          />
        )}

        {showAnalyticsModal && (
          <AnalyticsModal
            isOpen={showAnalyticsModal}
            onClose={() => setShowAnalyticsModal(false)}
            hackathons={hackathons}
          />
        )}
      </div>
    </div>
  );
};

export default FacultyDashboard;
