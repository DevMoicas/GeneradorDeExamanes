// Configuración automática de URLs
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// On Render we serve API from the same origin root
const API_BASE_URL = isLocal ? 'http://localhost:8080' : '';

// Función para construir URLs de API
function getApiUrl(endpoint) {
    return `${API_BASE_URL}${endpoint}`;
}

// Exportar para uso global
window.getApiUrl = getApiUrl;
window.API_BASE_URL = API_BASE_URL;

