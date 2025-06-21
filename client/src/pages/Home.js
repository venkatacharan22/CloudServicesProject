import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, Trophy, MapPin, Mail, Shield } from 'lucide-react';

const Home = () => {
  const { currentUser } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: 'Easy Event Management',
      description: 'Create and manage hackathons with our intuitive dashboard. Set dates, themes, and requirements effortlessly.',
    },
    {
      icon: Users,
      title: 'Team Formation',
      description: 'Connect with like-minded developers and form teams. Our platform makes collaboration seamless.',
    },
    {
      icon: Trophy,
      title: 'Competition Tracking',
      description: 'Track submissions, judge projects, and announce winners with our comprehensive judging system.',
    },
    {
      icon: MapPin,
      title: 'Venue Integration',
      description: 'Integrated Google Maps support for venue locations and directions to hackathon events.',
    },
    {
      icon: Mail,
      title: 'Smart Notifications',
      description: 'Automated email notifications keep participants and organizers updated throughout the event.',
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Built with Firebase Auth and deployed on Google Cloud Platform for maximum security and reliability.',
    },
  ];

  const stats = [
    { number: '500+', label: 'Hackathons Hosted' },
    { number: '10K+', label: 'Developers Connected' },
    { number: '50+', label: 'Cities Worldwide' },
    { number: '99.9%', label: 'Uptime' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to{' '}
              <span className="text-gradient">HackHub</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The ultimate platform for organizing and participating in hackathons. 
              Connect with developers, showcase your skills, and build amazing projects together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {currentUser ? (
                <Link to="/dashboard" className="btn btn-primary text-lg px-8 py-3">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
                    Get Started
                  </Link>
                  <Link to="/hackathons" className="btn btn-outline text-lg px-8 py-3">
                    Browse Hackathons
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for successful hackathons
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From event creation to team formation and project submission, 
              HackHub provides all the tools you need.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to start your hackathon journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of developers and organizers who trust HackHub 
            for their hackathon needs.
          </p>
          {!currentUser && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
                Sign Up Now
              </Link>
              <Link to="/login" className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg px-8 py-3">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
