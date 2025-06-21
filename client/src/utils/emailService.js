// Email Service for HackHub
// Service Account: hackhub@hackhub-463514.iam.gserviceaccount.com
// Project Email: hackon25.team@gmail.com

class EmailService {
  constructor() {
    this.serviceAccountEmail = 'hackhub@hackhub-463514.iam.gserviceaccount.com';
    this.projectEmail = 'hackon25.team@gmail.com';
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  }

  // Send registration confirmation email
  async sendRegistrationConfirmation(userEmail, userName, hackathonData) {
    try {
      const emailData = {
        to: userEmail,
        subject: `Registration Confirmed: ${hackathonData.title}`,
        html: this.generateRegistrationEmailHTML(userName, hackathonData),
        type: 'registration_confirmation'
      };

      const response = await fetch(`${this.baseURL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending registration confirmation:', error);
      throw error;
    }
  }

  // Send hackathon reminder email
  async sendHackathonReminder(userEmail, userName, hackathonData) {
    try {
      const emailData = {
        to: userEmail,
        subject: `Reminder: ${hackathonData.title} starts soon!`,
        html: this.generateReminderEmailHTML(userName, hackathonData),
        type: 'hackathon_reminder'
      };

      const response = await fetch(`${this.baseURL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending hackathon reminder:', error);
      throw error;
    }
  }

  // Send welcome email for new users
  async sendWelcomeEmail(userEmail, userName, userRole) {
    try {
      const emailData = {
        to: userEmail,
        subject: 'Welcome to HackHub!',
        html: this.generateWelcomeEmailHTML(userName, userRole),
        type: 'welcome'
      };

      const response = await fetch(`${this.baseURL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  // Generate registration confirmation email HTML
  generateRegistrationEmailHTML(userName, hackathonData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <p>You're all set for ${hackathonData.title}</p>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Great news! Your registration for <strong>${hackathonData.title}</strong> has been confirmed.</p>
            
            <div class="details">
              <h3>Event Details:</h3>
              <p><strong>📅 Start Date:</strong> ${new Date(hackathonData.start_date).toLocaleDateString()}</p>
              <p><strong>📅 End Date:</strong> ${new Date(hackathonData.end_date).toLocaleDateString()}</p>
              <p><strong>📍 Location:</strong> ${hackathonData.is_virtual ? 'Virtual Event' : hackathonData.venue_name || 'TBA'}</p>
              <p><strong>⏰ Registration Deadline:</strong> ${new Date(hackathonData.registration_deadline).toLocaleDateString()}</p>
            </div>

            <p>We're excited to have you participate! Make sure to:</p>
            <ul>
              <li>Mark your calendar for the event dates</li>
              <li>Join our community channels for updates</li>
              <li>Start thinking about your project ideas</li>
              <li>Form your team (if applicable)</li>
            </ul>

            <a href="${window.location.origin}/hackathons/${hackathonData.id}" class="button">View Event Details</a>

            <p>If you have any questions, feel free to reach out to us.</p>
            <p>Happy hacking!</p>
            <p>The HackHub Team</p>
          </div>
          <div class="footer">
            <p>© 2024 HackHub. All rights reserved.</p>
            <p>This email was sent from ${this.projectEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate reminder email HTML
  generateReminderEmailHTML(userName, hackathonData) {
    const startDate = new Date(hackathonData.start_date);
    const now = new Date();
    const daysUntil = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hackathon Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .countdown { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Hackathon Reminder</h1>
            <p>${hackathonData.title} is starting soon!</p>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            
            <div class="countdown">
              <h2>${daysUntil} day${daysUntil !== 1 ? 's' : ''} to go!</h2>
              <p><strong>${hackathonData.title}</strong> starts on ${startDate.toLocaleDateString()}</p>
            </div>

            <p>Don't forget to:</p>
            <ul>
              <li>Prepare your development environment</li>
              <li>Review the hackathon rules and guidelines</li>
              <li>Finalize your team (if applicable)</li>
              <li>Get a good night's sleep before the event</li>
            </ul>

            <a href="${window.location.origin}/hackathons/${hackathonData.id}" class="button">View Event Details</a>

            <p>We can't wait to see what you'll build!</p>
            <p>The HackHub Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate welcome email HTML
  generateWelcomeEmailHTML(userName, userRole) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to HackHub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to HackHub!</h1>
            <p>Your gateway to amazing hackathon experiences</p>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Welcome to HackHub! We're thrilled to have you join our community of innovators and creators.</p>
            
            <div class="features">
              <h3>What you can do as a ${userRole}:</h3>
              ${userRole === 'organizer' ? `
                <ul>
                  <li>Create and manage hackathon events</li>
                  <li>Track registrations and participants</li>
                  <li>Send updates and announcements</li>
                  <li>Access analytics and insights</li>
                </ul>
              ` : `
                <ul>
                  <li>Discover exciting hackathon events</li>
                  <li>Register for hackathons that interest you</li>
                  <li>Connect with other participants</li>
                  <li>Track your hackathon journey</li>
                </ul>
              `}
            </div>

            <a href="${window.location.origin}/dashboard" class="button">Explore Dashboard</a>

            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
            <p>Happy hacking!</p>
            <p>The HackHub Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send bulk emails to participants
  async sendBulkEmail(recipients, subject, htmlContent, type = 'announcement') {
    try {
      const emailData = {
        recipients,
        subject,
        html: htmlContent,
        type
      };

      const response = await fetch(`${this.baseURL}/api/email/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Failed to send bulk email');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending bulk email:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
