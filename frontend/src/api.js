// Centralized API configuration using Vite environment detection
// Development: Uses Vite proxy (http://localhost:5173/api -> http://localhost:5000/api)
// Production: Uses deployed backend URL

const API_BASE = import.meta.env.DEV ? '' : 'https://your-production-backend.com';
const API_URL = `${API_BASE}/api`;

export { API_BASE, API_URL };
