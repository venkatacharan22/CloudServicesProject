// Google Calendar Service for HackHub
// Service Account: hackhub-919@hackhub-463514.iam.gserviceaccount.com

class CalendarService {
  constructor() {
    this.serviceAccountEmail = 'hackhub-919@hackhub-463514.iam.gserviceaccount.com';
    this.calendarId = 'primary'; // Can be changed to a specific calendar ID
  }

  // Create a calendar event for a hackathon
  async createHackathonEvent(hackathonData) {
    try {
      const event = {
        summary: hackathonData.title,
        description: this.formatEventDescription(hackathonData),
        start: {
          dateTime: hackathonData.start_date,
          timeZone: 'UTC',
        },
        end: {
          dateTime: hackathonData.end_date,
          timeZone: 'UTC',
        },
        location: hackathonData.is_virtual 
          ? 'Virtual Event' 
          : hackathonData.venue_address || hackathonData.venue_name,
        attendees: [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
        extendedProperties: {
          private: {
            hackathonId: hackathonData.id,
            isHackathon: 'true',
            maxParticipants: hackathonData.max_participants?.toString() || 'unlimited',
            maxTeamSize: hackathonData.max_team_size?.toString() || '4',
          },
        },
      };

      // Note: This would require server-side implementation with proper authentication
      // For now, we'll return the event object that can be used by the backend
      return {
        success: true,
        event: event,
        message: 'Event data prepared for calendar creation',
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Format event description with hackathon details
  formatEventDescription(hackathon) {
    let description = hackathon.description + '\n\n';
    
    if (hackathon.theme) {
      description += `Theme: ${hackathon.theme}\n`;
    }
    
    description += `Registration Deadline: ${new Date(hackathon.registration_deadline).toLocaleString()}\n`;
    
    if (hackathon.max_participants) {
      description += `Max Participants: ${hackathon.max_participants}\n`;
    }
    
    description += `Max Team Size: ${hackathon.max_team_size || 4}\n\n`;
    
    if (hackathon.rules && hackathon.rules.length > 0) {
      description += 'Rules:\n';
      hackathon.rules.forEach((rule, index) => {
        description += `${index + 1}. ${rule}\n`;
      });
      description += '\n';
    }
    
    if (hackathon.requirements && hackathon.requirements.length > 0) {
      description += 'Requirements:\n';
      hackathon.requirements.forEach((req, index) => {
        description += `${index + 1}. ${req}\n`;
      });
      description += '\n';
    }
    
    if (hackathon.prizes && hackathon.prizes.length > 0) {
      description += 'Prizes:\n';
      hackathon.prizes.forEach((prize, index) => {
        description += `${index + 1}. ${prize.description || prize.amount || 'Prize available'}\n`;
      });
    }
    
    return description;
  }

  // Create a reminder event for registration deadline
  async createRegistrationReminder(hackathonData) {
    try {
      const reminderDate = new Date(hackathonData.registration_deadline);
      reminderDate.setHours(reminderDate.getHours() - 24); // 24 hours before deadline
      
      const event = {
        summary: `Registration Deadline Reminder: ${hackathonData.title}`,
        description: `Don't forget to register for ${hackathonData.title}!\n\nRegistration closes: ${new Date(hackathonData.registration_deadline).toLocaleString()}`,
        start: {
          dateTime: reminderDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(reminderDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: 'UTC',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 0 },
            { method: 'popup', minutes: 0 },
          ],
        },
      };

      return {
        success: true,
        event: event,
        message: 'Registration reminder prepared',
      };
    } catch (error) {
      console.error('Error creating registration reminder:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate calendar invite link for users
  generateCalendarInviteLink(hackathonData) {
    const startDate = new Date(hackathonData.start_date);
    const endDate = new Date(hackathonData.end_date);
    
    // Format dates for Google Calendar URL (YYYYMMDDTHHMMSSZ)
    const formatDateForUrl = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: hackathonData.title,
      dates: `${formatDateForUrl(startDate)}/${formatDateForUrl(endDate)}`,
      details: this.formatEventDescription(hackathonData),
      location: hackathonData.is_virtual 
        ? 'Virtual Event' 
        : hackathonData.venue_address || hackathonData.venue_name || '',
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // Add hackathon to user's personal calendar
  async addToPersonalCalendar(hackathonData) {
    try {
      // Generate the Google Calendar link
      const calendarLink = this.generateCalendarInviteLink(hackathonData);
      
      // Open in new window/tab
      window.open(calendarLink, '_blank');
      
      return {
        success: true,
        message: 'Calendar invite opened',
        link: calendarLink,
      };
    } catch (error) {
      console.error('Error adding to personal calendar:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create ICS file for download
  generateICSFile(hackathonData) {
    const startDate = new Date(hackathonData.start_date);
    const endDate = new Date(hackathonData.end_date);
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatDateForICS = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HackHub//HackHub Calendar//EN',
      'BEGIN:VEVENT',
      `UID:hackathon-${hackathonData.id}@hackhub.com`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `SUMMARY:${hackathonData.title}`,
      `DESCRIPTION:${this.formatEventDescription(hackathonData).replace(/\n/g, '\\n')}`,
      `LOCATION:${hackathonData.is_virtual ? 'Virtual Event' : hackathonData.venue_address || hackathonData.venue_name || ''}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:EMAIL',
      'DESCRIPTION:Hackathon starts tomorrow!',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    return icsContent;
  }

  // Download ICS file
  downloadICSFile(hackathonData) {
    try {
      const icsContent = this.generateICSFile(hackathonData);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${hackathonData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return {
        success: true,
        message: 'Calendar file downloaded',
      };
    } catch (error) {
      console.error('Error downloading ICS file:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
export default calendarService;
