// Configuración automática de URLs
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// In Vercel, all backend endpoints live under /api
const API_BASE_URL = isLocal ? 'http://localhost:3000' : '/api';

// Función para construir URLs de API
function getApiUrl(endpoint) {
    return `${API_BASE_URL}${endpoint}`;
}

// Exportar para uso global
window.getApiUrl = getApiUrl;
window.API_BASE_URL = API_BASE_URL;

