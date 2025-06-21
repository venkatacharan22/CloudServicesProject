// Error utility functions for handling form validation errors

/**
 * Safely render error message from react-hook-form error object
 * @param {object} error - Error object from react-hook-form
 * @param {string} fallback - Fallback message if error is not valid
 * @returns {string} Error message string
 */
export const getErrorMessage = (error, fallback = 'This field is required') => {
  if (!error) return null;

  // If error is already a string, return it
  if (typeof error === 'string') return error;

  // If error is an object with message property
  if (error && typeof error === 'object' && error.message) {
    // If message is a string, return it
    if (typeof error.message === 'string') {
      return error.message;
    }
    // If message is an object, try to extract meaningful text
    if (typeof error.message === 'object') {
      return fallback;
    }
  }

  // Handle react-hook-form validation error objects
  if (error && typeof error === 'object') {
    // Check for common error object properties
    if (error.type && error.message) {
      return typeof error.message === 'string' ? error.message : fallback;
    }

    // If it's a complex object, don't try to render it
    return fallback;
  }

  // Default fallback
  return fallback;
};

/**
 * Component for safely rendering form errors
 * @param {object} props - Component props
 * @param {object} props.error - Error object from react-hook-form
 * @param {string} props.fallback - Fallback message
 * @param {string} props.className - CSS classes
 * @returns {JSX.Element|null} Error component or null
 */
export const ErrorMessage = ({ error, fallback = 'This field is required', className = 'text-red-500 text-sm mt-1' }) => {
  try {
    const message = getErrorMessage(error, fallback);

    if (!message) return null;

    // Ensure message is a string before rendering
    const safeMessage = typeof message === 'string' ? message : fallback;

    return <p className={className}>{safeMessage}</p>;
  } catch (err) {
    // If anything goes wrong, render the fallback
    console.warn('Error rendering ErrorMessage:', err);
    return <p className={className}>{fallback}</p>;
  }
};

/**
 * Validate and sanitize form data to prevent object rendering errors
 * @param {object} data - Form data object
 * @returns {object} Sanitized form data
 */
export const sanitizeFormData = (data) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Convert objects to strings or handle appropriately
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        sanitized[key] = value;
      } else if (value.toString && typeof value.toString === 'function') {
        sanitized[key] = value.toString();
      } else {
        sanitized[key] = JSON.stringify(value);
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Handle API errors and convert them to user-friendly messages
 * @param {Error} error - API error object
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error) => {
  if (!error) return 'An unknown error occurred';
  
  // If error has a response with data
  if (error.response && error.response.data) {
    const { data } = error.response;
    
    // If data has a message
    if (data.message) return data.message;
    
    // If data has detail (FastAPI format)
    if (data.detail) return data.detail;
    
    // If data has errors array
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map(err => err.message || err).join(', ');
    }
  }
  
  // If error has a message property
  if (error.message) return error.message;
  
  // If error is a string
  if (typeof error === 'string') return error;
  
  // Default fallback
  return 'An error occurred. Please try again.';
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @returns {object} Validation result
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  return { isValid: true, message: '' };
};

export default {
  getErrorMessage,
  ErrorMessage,
  sanitizeFormData,
  handleApiError,
  isValidEmail,
  validatePassword,
  validateRequired
};
