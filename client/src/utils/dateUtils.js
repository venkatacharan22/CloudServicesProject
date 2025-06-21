// Date utility functions for HackHub

/**
 * Format a date string to a readable format
 * @param {string} dateString - ISO date string
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'Not specified';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format date for display without time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDateOnly = (dateString) => {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format time only
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time string
 */
export const formatTimeOnly = (dateString) => {
  if (!dateString) return 'Not specified';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid time';
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get relative time (e.g., "2 days ago", "in 3 hours")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const diffInSeconds = Math.floor((date - now) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (Math.abs(diffInDays) >= 1) {
    if (diffInDays > 0) {
      return `in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(diffInDays)} day${Math.abs(diffInDays) > 1 ? 's' : ''} ago`;
    }
  } else if (Math.abs(diffInHours) >= 1) {
    if (diffInHours > 0) {
      return `in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(diffInHours)} hour${Math.abs(diffInHours) > 1 ? 's' : ''} ago`;
    }
  } else if (Math.abs(diffInMinutes) >= 1) {
    if (diffInMinutes > 0) {
      return `in ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(diffInMinutes)} minute${Math.abs(diffInMinutes) > 1 ? 's' : ''} ago`;
    }
  } else {
    return 'just now';
  }
};

/**
 * Check if a date is in the past
 * @param {string} dateString - ISO date string
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date < new Date();
};

/**
 * Check if a date is in the future
 * @param {string} dateString - ISO date string
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date > new Date();
};

/**
 * Get the duration between two dates
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {string} Duration string
 */
export const getDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Unknown duration';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid dates';
  }
  
  const diffInMs = end - start;
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInDays >= 1) {
    const remainingHours = diffInHours % 24;
    if (remainingHours === 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
    } else {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
    }
  } else {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
  }
};

/**
 * Format date for datetime-local input
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string for datetime-local input
 */
export const formatForDateTimeLocal = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  // Format: YYYY-MM-DDTHH:MM
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Get hackathon status based on dates
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} registrationDeadline - ISO date string
 * @returns {string} Status: 'upcoming', 'ongoing', 'completed', 'registration_closed'
 */
export const getHackathonStatus = (startDate, endDate, registrationDeadline) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const regDeadline = new Date(registrationDeadline);
  
  if (now > end) {
    return 'completed';
  } else if (now >= start && now <= end) {
    return 'ongoing';
  } else if (now > regDeadline) {
    return 'registration_closed';
  } else {
    return 'upcoming';
  }
};

/**
 * Check if registration is still open
 * @param {string} registrationDeadline - ISO date string
 * @param {string} startDate - ISO date string
 * @returns {boolean} True if registration is open
 */
export const isRegistrationOpen = (registrationDeadline, startDate) => {
  const now = new Date();
  const deadline = new Date(registrationDeadline);
  const start = new Date(startDate);
  
  return now <= deadline && now < start;
};

/**
 * Get time until deadline
 * @param {string} deadline - ISO date string
 * @returns {string} Time until deadline
 */
export const getTimeUntilDeadline = (deadline) => {
  if (!deadline) return 'No deadline set';
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  
  if (isNaN(deadlineDate.getTime())) {
    return 'Invalid deadline';
  }
  
  if (deadlineDate <= now) {
    return 'Deadline passed';
  }
  
  return getRelativeTime(deadline);
};

/**
 * Format date range
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Date range not specified';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date range';
  }
  
  // If same day, show date once with time range
  if (start.toDateString() === end.toDateString()) {
    return `${formatDateOnly(startDate)} from ${formatTimeOnly(startDate)} to ${formatTimeOnly(endDate)}`;
  }
  
  // Different days
  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
};

export default {
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  getRelativeTime,
  isPastDate,
  isFutureDate,
  getDuration,
  formatForDateTimeLocal,
  getHackathonStatus,
  isRegistrationOpen,
  getTimeUntilDeadline,
  formatDateRange
};
