import React, { useState } from 'react';
import { Mail, Calendar, Send, TestTube } from 'lucide-react';
import { apiHelpers } from '../utils/api';
import { emailService } from '../utils/emailService';
import { calendarService } from '../utils/calendarService';
import toast from 'react-hot-toast';

const TestEmailCalendar = () => {
  const [loading, setLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState(null);

  // Test email service configuration
  const testEmailConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/email/test');
      const data = await response.json();
      setEmailConfig(data);
      
      if (data.status === 'configured') {
        toast.success('Email service is configured!');
      } else {
        toast.error('Email service is not configured');
      }
    } catch (error) {
      console.error('Error testing email config:', error);
      toast.error('Failed to test email configuration');
    } finally {
      setLoading(false);
    }
  };

  // Test sending a sample email
  const testSendEmail = async () => {
    setLoading(true);
    try {
      const testEmail = {
        to: 'test@example.com',
        subject: 'HackHub Test Email',
        content: `
          <html>
            <body>
              <h2>🚀 HackHub Email Test</h2>
              <p>This is a test email from HackHub platform.</p>
              <p>If you receive this, the email service is working correctly!</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </body>
          </html>
        `,
        content_type: 'text/html'
      };

      const response = await apiHelpers.sendEmail(testEmail);
      toast.success('Test email sent successfully!');
      console.log('Email sent:', response);
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  // Test calendar functionality
  const testCalendar = () => {
    const sampleHackathon = {
      id: 'test-hackathon',
      title: 'Test Hackathon Event',
      description: 'This is a test hackathon event for calendar integration testing.',
      start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      venue_name: 'Virtual Event',
      venue_address: 'Online',
      is_virtual: true,
      organizer_name: 'Test Organizer'
    };

    try {
      const result = calendarService.addToPersonalCalendar(sampleHackathon);
      if (result.success) {
        toast.success('Calendar invite opened!');
      } else {
        toast.error('Failed to open calendar invite');
      }
    } catch (error) {
      console.error('Error testing calendar:', error);
      toast.error('Failed to test calendar functionality');
    }
  };

  // Test ICS file download
  const testICSDownload = () => {
    const sampleHackathon = {
      id: 'test-hackathon',
      title: 'Test Hackathon Event',
      description: 'This is a test hackathon event for ICS file testing.',
      start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      venue_name: 'Virtual Event',
      venue_address: 'Online',
      is_virtual: true,
      organizer_name: 'Test Organizer'
    };

    try {
      const icsContent = calendarService.generateICSFile(sampleHackathon);
      
      // Create and download ICS file
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-hackathon.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('ICS file downloaded!');
    } catch (error) {
      console.error('Error generating ICS file:', error);
      toast.error('Failed to generate ICS file');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Email & Calendar Testing
        </h1>
        <p className="text-gray-600">
          Test the email and calendar integration functionality
        </p>
      </div>

      {/* Email Testing Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Email Service Testing</h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={testEmailConfig}
            disabled={loading}
            className="btn btn-outline flex items-center space-x-2"
          >
            <TestTube className="w-4 h-4" />
            <span>Test Email Configuration</span>
          </button>

          {emailConfig && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Configuration Status:</h3>
              <div className="text-sm space-y-1">
                <p><strong>Status:</strong> {emailConfig.status}</p>
                <p><strong>Service Type:</strong> {emailConfig.config?.service_type}</p>
                <p><strong>From Email:</strong> {emailConfig.config?.from_email}</p>
                <p><strong>SMTP Configured:</strong> {emailConfig.config?.smtp_configured ? '✅' : '❌'}</p>
                <p><strong>Gmail API:</strong> {emailConfig.config?.gmail_api_configured ? '✅' : '❌'}</p>
                <p><strong>SendGrid:</strong> {emailConfig.config?.sendgrid_configured ? '✅' : '❌'}</p>
              </div>
            </div>
          )}

          <button
            onClick={testSendEmail}
            disabled={loading || !emailConfig || emailConfig.status !== 'configured'}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send Test Email</span>
          </button>
        </div>
      </div>

      {/* Calendar Testing Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Calendar Integration Testing</h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={testCalendar}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Test Google Calendar Integration</span>
          </button>

          <button
            onClick={testICSDownload}
            className="btn btn-outline flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Test ICS File Download</span>
          </button>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Calendar Testing Notes:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Google Calendar integration opens a new tab with pre-filled event details</li>
              <li>• ICS file download creates a calendar file that can be imported into any calendar app</li>
              <li>• Both methods create a test hackathon event scheduled for tomorrow</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Integration Status:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${emailConfig?.status === 'configured' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>Email Service: {emailConfig?.status || 'Not tested'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Calendar Service: Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEmailCalendar;
