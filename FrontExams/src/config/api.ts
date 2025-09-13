// Configuración centralizada de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const API_URL = `${API_BASE_URL}/api/v1`;

// URLs específicas
export const DOWNLOAD_URL = `${API_URL}/historic/download`;