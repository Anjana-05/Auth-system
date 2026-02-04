// Automatically detect environment based on the browser URL
// NOTE: We treat 'localhost' as production if it's running via `firebase serve` or similar 
// unless we are explicitly developing.
// For now, let's hardcode the Render URL if you are testing the built production version locally (preview/dist)
// OR if you are on the deployed site.

const isLocalDev = window.location.hostname === 'localhost' && window.location.port === '5173';

const API_URL = isLocalDev
  ? 'http://localhost:5000' 
  : 'https://auth-system-x72l.onrender.com';

export default API_URL;