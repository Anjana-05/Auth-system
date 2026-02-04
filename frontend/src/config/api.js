const isLocalDev = window.location.hostname === 'localhost' && window.location.port === '5173';

const API_URL = isLocalDev
  ? 'http://localhost:5000' 
  : 'https://auth-system-x72l.onrender.com';

export default API_URL;