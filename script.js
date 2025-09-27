// Generador de Exámenes - Universidad de Colima
// Script para la página de inicio de sesión

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const userTypeRadios = document.querySelectorAll('input[name="userType"]');
    const userTypeOptions = document.querySelectorAll('.user-type-option');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const rememberMeDiv = document.querySelector('.remember-checkbox');
    const messageContainer = document.getElementById('messageContainer');
    const message = document.getElementById('message');

    // Configuración inicial
    initializeApp();

    async function initializeApp() {
        // Configurar eventos
        setupEventListeners();
        
        // Aplicar estilos iniciales
        updateUserTypeSelection();
        updateRememberMeCheckbox();
        
        // Cargar datos guardados si existen
        loadSavedCredentials();
        
        // Verificar si hay una sesión activa
        const hasActiveSession = await checkActiveSession();
        if (hasActiveSession) {
            const currentUser = getCurrentUser();
            if (currentUser) {
                showMessage(`Sesión activa: ${currentUser.nombre} ${currentUser.apellido}`, 'info');
            }
        }
    }

    function setupEventListeners() {
        // Eventos para el formulario
        loginForm.addEventListener('submit', handleLogin);
        
        // Eventos para el selector de tipo de usuario
        userTypeRadios.forEach(radio => {
            radio.addEventListener('change', updateUserTypeSelection);
        });
        
        // Evento para mostrar/ocultar contraseña
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        
        // Evento para recordar sesión
        rememberMeCheckbox.addEventListener('change', updateRememberMeCheckbox);
        
        // Eventos para validación en tiempo real
        document.getElementById('email').addEventListener('blur', validateEmail);
        document.getElementById('password').addEventListener('input', validatePassword);
    }

    function updateUserTypeSelection() {
        userTypeOptions.forEach((option, index) => {
            const radio = userTypeRadios[index];
            if (radio.checked) {
                option.classList.add('border-green-400', 'bg-green-500', 'bg-opacity-30');
                option.classList.remove('border-transparent');
            } else {
                option.classList.remove('border-green-400', 'bg-green-500', 'bg-opacity-30');
                option.classList.add('border-transparent');
            }
        });
    }

    function updateRememberMeCheckbox() {
        const checkIcon = rememberMeDiv.querySelector('i');
        if (rememberMeCheckbox.checked) {
            rememberMeDiv.classList.add('bg-green-500', 'border-green-400');
            checkIcon.classList.remove('opacity-0');
        } else {
            rememberMeDiv.classList.remove('bg-green-500', 'border-green-400');
            checkIcon.classList.add('opacity-0');
        }
    }

    function togglePasswordVisibility() {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passwordIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        
        // Forzar actualización visual
        setTimeout(() => {
            passwordInput.focus();
        }, 10);
    }

    function validateEmail() {
        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            showMessage('Por favor, ingresa un correo electrónico válido.', 'error');
            return false;
        }
        return true;
    }

    function validatePassword() {
        const password = document.getElementById('password').value;
        
        if (password && password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
            return false;
        }
        return true;
    }

    async function handleLogin(event) {
        event.preventDefault();
        
        // Obtener datos del formulario
        const formData = new FormData(loginForm);
        const userType = formData.get('userType');
        const email = formData.get('email').trim();
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';

        console.log('Datos del formulario:', { userType, email, password: '***', rememberMe });

        // Validar datos
        if (!validateForm(email, password)) {
            return;
        }

        // Proceso de autenticación con base de datos
        showMessage('Iniciando sesión...', 'info');
        
        try {
            const authResult = await authenticateUser(email, password, userType);
            
            if (authResult) {
                // Guardar credenciales si se seleccionó "Recordar sesión"
                if (rememberMe) {
                    saveCredentials(email, userType);
                }
                
                // Obtener información del usuario actual
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
                const userName = currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : 'Usuario';
                
                showMessage(`¡Bienvenido ${userName}! Redirigiendo al panel de ${userType === 'profesor' ? 'profesor' : 'alumno'}...`, 'success');
                
                // Redirigir según el tipo de usuario
                setTimeout(() => {
                    redirectToDashboard(userType);
                }, 2000);
            }
        } catch (error) {
            console.error('Error en el proceso de autenticación:', error);
            showMessage('Error del sistema. Intenta nuevamente.', 'error');
        }
    }

    function validateForm(email, password) {
        if (!email) {
            showMessage('Por favor, ingresa tu correo electrónico.', 'error');
            return false;
        }
        
        if (!password) {
            showMessage('Por favor, ingresa tu contraseña.', 'error');
            return false;
        }
        
        if (!validateEmail()) {
            return false;
        }
        
        if (!validatePassword()) {
            return false;
        }
        
        return true;
    }

    async function authenticateUser(email, password, userType) {
        console.log('Autenticando usuario:', { email, userType });
        
        // Credenciales de prueba (simplificado)
        const validCredentials = {
            'profesor@ucol.mx': { 
                password: 'profesor123', 
                type: 'profesor',
                user: {
                    id: 1,
                    email: 'profesor@ucol.mx',
                    nombre: 'Juan',
                    apellido: 'Pérez',
                    tipo_usuario: 'profesor'
                }
            },
            'alumno@ucol.mx': { 
                password: 'alumno123', 
                type: 'alumno',
                user: {
                    id: 2,
                    email: 'alumno@ucol.mx',
                    nombre: 'María',
                    apellido: 'González',
                    tipo_usuario: 'alumno'
                }
            },
            'admin@ucol.mx': { 
                password: 'admin123', 
                type: 'profesor',
                user: {
                    id: 3,
                    email: 'admin@ucol.mx',
                    nombre: 'Admin',
                    apellido: 'Sistema',
                    tipo_usuario: 'profesor'
                }
            }
        };
        
        const user = validCredentials[email.toLowerCase()];
        
        if (user && user.password === password && user.type === userType) {
            // Guardar información del usuario en sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(user.user));
            sessionStorage.setItem('sessionToken', 'token_' + Date.now());
            console.log('Usuario autenticado correctamente:', user.user);
            return true;
        } else {
            console.log('Credenciales incorrectas');
            showMessage('Credenciales incorrectas. Verifica tu email y contraseña.', 'error');
            return false;
        }
    }

    function redirectToDashboard(userType) {
        const dashboardUrl = userType === 'profesor' ? 'dashboard-profesor.html' : 'dashboard-alumno.html';
        
        showMessage(`Redirigiendo al panel de ${userType === 'profesor' ? 'profesor' : 'alumno'}...`, 'info');
        
        // Redirección real
        setTimeout(() => {
            window.location.href = dashboardUrl;
        }, 2000);
    }

    function saveCredentials(email, userType) {
        const credentials = {
            email: email,
            userType: userType,
            timestamp: Date.now()
        };
        
        localStorage.setItem('savedCredentials', JSON.stringify(credentials));
    }

    function loadSavedCredentials() {
        const saved = localStorage.getItem('savedCredentials');
        if (saved) {
            try {
                const credentials = JSON.parse(saved);
                const now = Date.now();
                const oneWeek = 7 * 24 * 60 * 60 * 1000; // Una semana en milisegundos
                
                // Verificar si las credenciales no han expirado
                if (now - credentials.timestamp < oneWeek) {
                    document.getElementById('email').value = credentials.email;
                    document.querySelector(`input[name="userType"][value="${credentials.userType}"]`).checked = true;
                    rememberMeCheckbox.checked = true;
                    updateUserTypeSelection();
                    updateRememberMeCheckbox();
                } else {
                    // Limpiar credenciales expiradas
                    localStorage.removeItem('savedCredentials');
                }
            } catch (error) {
                console.error('Error al cargar credenciales guardadas:', error);
            }
        }
    }

    function showMessage(text, type) {
        message.textContent = text;
        messageContainer.className = 'mt-4';
        message.className = `p-4 rounded-lg text-center font-medium`;
        
        // Aplicar estilos según el tipo de mensaje
        switch (type) {
            case 'success':
                message.classList.add('bg-green-600', 'text-white');
                break;
            case 'error':
                message.classList.add('bg-red-500', 'text-white');
                break;
            case 'info':
                message.classList.add('bg-green-500', 'text-white');
                break;
            default:
                message.classList.add('bg-gray-500', 'text-white');
        }
        
        messageContainer.classList.remove('hidden');
        
        // Auto-ocultar mensajes de éxito e info después de 5 segundos
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                messageContainer.classList.add('hidden');
            }, 5000);
        }
    }

    // Función para verificar sesión activa
    async function checkActiveSession() {
        const sessionToken = sessionStorage.getItem('sessionToken');
        const currentUser = sessionStorage.getItem('currentUser');
        
        if (!sessionToken || !currentUser) {
            return false;
        }

        // Verificación simple de sesión
        try {
            const user = JSON.parse(currentUser);
            console.log('Sesión activa encontrada:', user);
            return true;
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            // Limpiar datos inválidos
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('sessionToken');
            return false;
        }
    }

    // Función para cerrar sesión
    async function logout() {
        const sessionToken = sessionStorage.getItem('sessionToken');
        
        if (sessionToken && window.isDatabaseReady()) {
            try {
                const dbManager = window.getDatabaseManager();
                await dbManager.closeSession(sessionToken);
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            }
        }

        // Limpiar datos de sesión
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('sessionToken');
        localStorage.removeItem('savedCredentials');
        
        // Limpiar formulario
        loginForm.reset();
        updateUserTypeSelection();
        updateRememberMeCheckbox();
        
        showMessage('Sesión cerrada correctamente', 'info');
    }

    // Función para obtener información del usuario actual
    function getCurrentUser() {
        const userData = sessionStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    // Función para limpiar mensajes (se puede llamar desde otros scripts)
    window.clearMessage = function() {
        messageContainer.classList.add('hidden');
    };

    // Función para mostrar mensajes personalizados (se puede llamar desde otros scripts)
    window.showCustomMessage = function(text, type = 'info') {
        showMessage(text, type);
    };

    // Función para cerrar sesión (disponible globalmente)
    window.logout = logout;

    // Función para obtener usuario actual (disponible globalmente)
    window.getCurrentUser = getCurrentUser;
});

// Función global para seleccionar tipo de usuario
function selectUserType(type) {
    // Desmarcar todos los radio buttons
    document.getElementById('profesor').checked = false;
    document.getElementById('alumno').checked = false;
    
    // Marcar el seleccionado
    document.getElementById(type).checked = true;
    
    // Actualizar estilos visuales
    const profesorOption = document.getElementById('profesor-option');
    const alumnoOption = document.getElementById('alumno-option');
    
    if (type === 'profesor') {
        profesorOption.classList.add('border-green-400', 'bg-green-500', 'bg-opacity-30');
        profesorOption.classList.remove('border-transparent');
        alumnoOption.classList.remove('border-green-400', 'bg-green-500', 'bg-opacity-30');
        alumnoOption.classList.add('border-transparent');
    } else {
        alumnoOption.classList.add('border-green-400', 'bg-green-500', 'bg-opacity-30');
        alumnoOption.classList.remove('border-transparent');
        profesorOption.classList.remove('border-green-400', 'bg-green-500', 'bg-opacity-30');
        profesorOption.classList.add('border-transparent');
    }
}

// Funciones globales para uso externo
window.GeneradorExamenes = {
    version: '1.0.0',
    showMessage: function(text, type) {
        if (window.showCustomMessage) {
            window.showCustomMessage(text, type);
        }
    },
    clearMessage: function() {
        if (window.clearMessage) {
            window.clearMessage();
        }
    }
};
