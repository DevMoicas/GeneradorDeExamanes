// Generador de Exámenes - Universidad de Colima
// Script para la página de registro

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const registerForm = document.getElementById('registerForm');
    const userTypeRadios = document.querySelectorAll('input[name="userType"]');
    const userTypeOptions = document.querySelectorAll('.user-type-option');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    const professorCodeField = document.getElementById('professorCodeField');
    const professorCodeInput = document.getElementById('professorCode');
    const messageContainer = document.getElementById('messageContainer');
    const message = document.getElementById('message');

    // Configuración inicial
    initializeApp();

    function initializeApp() {
        // Configurar eventos
        setupEventListeners();
        
        // Aplicar estilos iniciales
        updateUserTypeSelection();
        toggleProfessorCode();
    }

    function setupEventListeners() {
        // Eventos para el formulario
        registerForm.addEventListener('submit', handleRegister);
        
        // Eventos para el selector de tipo de usuario
        userTypeRadios.forEach(radio => {
            radio.addEventListener('change', updateUserTypeSelection);
        });
        
        // Evento para mostrar/ocultar contraseña
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        
        // Mostrar/ocultar código de profesor
        userTypeRadios.forEach(r => r.addEventListener('change', toggleProfessorCode));
        
        // Eventos para validación en tiempo real
        document.getElementById('email').addEventListener('blur', validateEmail);
        document.getElementById('password').addEventListener('input', validatePassword);
        document.getElementById('confirmPassword').addEventListener('input', validateConfirmPassword);
        document.getElementById('nombre').addEventListener('input', validateName);
        document.getElementById('apellido').addEventListener('input', validateLastName);
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

    function toggleProfessorCode() {
        const selected = [...userTypeRadios].find(r => r.checked)?.value;
        professorCodeField.classList.toggle('hidden', selected !== 'profesor');
    }

    function togglePasswordVisibility() {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passwordIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    }

    function validateName() {
        const nombreInput = document.getElementById('nombre');
        const nombre = nombreInput.value.trim();
        
        if (nombre && nombre.length < 2) {
            showMessage('El nombre debe tener al menos 2 caracteres.', 'error');
            return false;
        }
        return true;
    }

    function validateLastName() {
        const apellidoInput = document.getElementById('apellido');
        const apellido = apellidoInput.value.trim();
        
        if (apellido && apellido.length < 2) {
            showMessage('El apellido debe tener al menos 2 caracteres.', 'error');
            return false;
        }
        return true;
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

    function validateConfirmPassword() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (confirmPassword && password !== confirmPassword) {
            showMessage('Las contraseñas no coinciden.', 'error');
            return false;
        }
        return true;
    }

    async function handleRegister(event) {
        event.preventDefault();
        
        // Obtener datos del formulario
        const formData = new FormData(registerForm);
        const userType = formData.get('userType');
        const nombre = formData.get('nombre').trim();
        const apellido = formData.get('apellido').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const acceptTerms = true; // removed requirement

        // Validación adicional según tipo
        if (userType === 'profesor') {
            const code = (professorCodeInput?.value || '').trim();
            if (code !== 'telematica2025tesis') {
                showMessage('Código de docente inválido.', 'error');
                return;
            }
        }
        if (userType === 'alumno') {
            if (!/@ucol\.mx$/i.test(email)) {
                showMessage('El correo del alumno debe terminar en @ucol.mx', 'error');
                return;
            }
        }

        // Validar datos
        if (!validateForm(nombre, apellido, email, password, confirmPassword, acceptTerms)) {
            return;
        }

        // Proceso de registro (backend JSON)
        showMessage('Registrando usuario...', 'info');
        try {
            const payload = {
                nombre,
                apellido,
                email,
                password,
                tipo_usuario: userType,
                profesor_codigo: userType === 'profesor' ? 'telematica2025tesis' : undefined
            };
            const resp = await fetch((window.getApiUrl ? window.getApiUrl('/users/register') : '/users/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Registro fallido');
            }
            showMessage('¡Usuario registrado exitosamente! Redirigiendo al inicio de sesión...', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } catch (error) {
            console.error('Error en el registro:', error);
            showMessage(error.message || 'Error del sistema. Intenta nuevamente.', 'error');
        }
    }

    function validateForm(nombre, apellido, email, password, confirmPassword, acceptTerms) {
        if (!nombre) {
            showMessage('Por favor, ingresa tu nombre.', 'error');
            return false;
        }
        
        if (!apellido) {
            showMessage('Por favor, ingresa tu apellido.', 'error');
            return false;
        }
        
        if (!email) {
            showMessage('Por favor, ingresa tu correo electrónico.', 'error');
            return false;
        }
        
        if (!password) {
            showMessage('Por favor, ingresa una contraseña.', 'error');
            return false;
        }
        
        if (!confirmPassword) {
            showMessage('Por favor, confirma tu contraseña.', 'error');
            return false;
        }
        
        if (!acceptTerms) {
            showMessage('Debes aceptar los términos y condiciones.', 'error');
            return false;
        }
        
        if (!validateName()) {
            return false;
        }
        
        if (!validateLastName()) {
            return false;
        }
        
        if (!validateEmail()) {
            return false;
        }
        
        if (!validatePassword()) {
            return false;
        }
        
        if (!validateConfirmPassword()) {
            return false;
        }
        
        return true;
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

    // Función para limpiar mensajes
    window.clearMessage = function() {
        messageContainer.classList.add('hidden');
    };

    // Función para mostrar mensajes personalizados
    window.showCustomMessage = function(text, type = 'info') {
        showMessage(text, type);
    };
});
