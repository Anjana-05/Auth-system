// Automatically detect environment based on the browser URL
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// If we are on localhost, use local backend. Otherwise, assume production (Render).
const API_URL = isLocal 
  ? 'http://localhost:5000' 
  : 'https://auth-system-x72l.onrender.com';

export default API_URL;