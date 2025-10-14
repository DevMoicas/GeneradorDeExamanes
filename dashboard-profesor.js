// Generador de Exámenes - Universidad de Colima
// Script para el panel del profesor

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const examForm = document.getElementById('examForm');
    const generateBtn = document.getElementById('generateBtn');
    const loadingModal = document.getElementById('loadingModal');
    const examModal = document.getElementById('examModal');
    const closeExamModal = document.getElementById('closeExamModal');
    const saveExamBtn = document.getElementById('saveExamBtn');
    const examCodeDisplay = document.getElementById('examCodeDisplay');
    const exportExamBtn = document.getElementById('exportExamBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    const examCount = document.getElementById('examCount');
    const examsList = document.getElementById('examsList');
    const examContent = document.getElementById('examContent');
    const messageContainer = document.getElementById('messageContainer');
    const message = document.getElementById('message');

    // Variables globales
    let currentUser = null;
    let currentExam = null;
    let generatedExams = [];

    // Configuración inicial
    initializeApp();

    async function initializeApp() {
        // Verificar sesión
        const hasActiveSession = await checkActiveSession();
        if (!hasActiveSession) {
            redirectToLogin();
            return;
        }

        // Obtener usuario actual
        currentUser = getCurrentUser();
        if (!currentUser || currentUser.tipo_usuario !== 'profesor') {
            redirectToLogin();
            return;
        }

        // Mostrar información del usuario
        userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;

        // Configurar eventos
        setupEventListeners();

        // Cargar exámenes existentes
        await loadExams();

        // Inicializar Gemini API (sin bloquear la interfaz)
        initializeGeminiAPI();
    }

    function setupEventListeners() {
        // Formulario de generación de examen
        examForm.addEventListener('submit', handleExamGeneration);
        
        // Botones del modal
        closeExamModal.addEventListener('click', closeExamModalHandler);
        saveExamBtn.addEventListener('click', saveExam);
        exportExamBtn.addEventListener('click', exportExam);
        
        // Botón de cerrar sesión
        logoutBtn.addEventListener('click', handleLogout);
    }

    async function initializeGeminiAPI() {
        try {
            updateAPIStatus('connecting', 'Conectando...');
            
            // Verificar si geminiAPI existe
            if (!window.geminiAPI) {
                console.log('🔧 Cargando Gemini API...');
                // Crear instancia si no existe
                window.geminiAPI = new GeminiAPI();
            }
            
            const success = await window.geminiAPI.init();
            if (success) {
                updateAPIStatus('connected', 'Conectado');
                showMessage('🤖 IA Gemini conectada correctamente', 'success');
            } else {
                updateAPIStatus('error', 'Error de conexión');
                showMessage('⚠️ Error al conectar con Gemini AI. Se usará modo de ejemplo.', 'info');
            }
        } catch (error) {
            console.error('Error al inicializar Gemini:', error);
            updateAPIStatus('error', 'Error de conexión');
            showMessage('⚠️ Error al conectar con Gemini AI. Se usará modo de ejemplo.', 'info');
        }
    }

    function updateAPIStatus(status, text) {
        const apiStatus = document.getElementById('apiStatus');
        const statusDot = apiStatus.querySelector('div');
        const statusText = apiStatus.querySelector('span');
        
        statusText.textContent = text;
        
        // Remover clases anteriores
        statusDot.classList.remove('bg-yellow-400', 'bg-green-400', 'bg-red-400', 'animate-pulse');
        
        switch (status) {
            case 'connecting':
                statusDot.classList.add('bg-yellow-400', 'animate-pulse');
                break;
            case 'connected':
                statusDot.classList.add('bg-green-400');
                break;
            case 'error':
                statusDot.classList.add('bg-red-400', 'animate-pulse');
                break;
        }
    }

    async function handleExamGeneration(event) {
        event.preventDefault();
        
        const formData = new FormData(examForm);
        const examData = {
            title: formData.get('examTitle').trim(),
            subject: formData.get('subject').trim(),
            numQuestions: parseInt(formData.get('numQuestions')),
            difficulty: formData.get('difficulty'),
            aiPrompt: formData.get('aiPrompt').trim(),
            professorId: currentUser.id
        };

        // Validar datos
        if (!validateExamData(examData)) {
            return;
        }

        // Mostrar modal de carga
        showLoadingModal();

        try {
            // Crear instancia de Gemini API si no existe
            if (!window.geminiAPI) {
                console.log('🔧 Creando instancia de Gemini API...');
                window.geminiAPI = new GeminiAPI();
            }

            console.log('🚀 Iniciando generación de examen...');
            
            // Intentar generar con Gemini AI
            try {
                const result = await window.geminiAPI.generateExam(examData);
                
                if (result.success) {
                    currentExam = result.exam;
                    showExamModal(result.exam);
                    
                    // Mostrar mensaje de éxito con información del examen
                    const examInfo = `${result.exam.title} - ${result.exam.numQuestions} preguntas generadas`;
                    showMessage(`✅ ¡Examen generado exitosamente! ${examInfo}`, 'success');
                    
                    console.log('✅ Examen generado correctamente:', result.exam);
                } else {
                    console.error('❌ Error en la generación:', result.error);
                    showMessage(`❌ Error al generar el examen: ${result.error}`, 'error');
                }
            } catch (apiError) {
                console.error('❌ Error con Gemini API:', apiError);
                
                // Generar examen de ejemplo como fallback
                console.log('🔄 Generando examen de ejemplo como fallback...');
                const fallbackResult = window.geminiAPI.createFallbackExam(examData);
                
                currentExam = fallbackResult.exam;
                showExamModal(fallbackResult.exam);
                
                const examInfo = `${fallbackResult.exam.title} - ${fallbackResult.exam.numQuestions} preguntas generadas`;
                showMessage(`⚠️ Examen generado en modo de ejemplo: ${examInfo}`, 'info');
            }
            
        } catch (error) {
            console.error('❌ Error crítico al generar examen:', error);
            showMessage(`❌ Error crítico: ${error.message}`, 'error');
        } finally {
            hideLoadingModal();
        }
    }

    function validateExamData(examData) {
        if (!examData.title) {
            showMessage('El título del examen es requerido', 'error');
            return false;
        }
        
        if (!examData.subject) {
            showMessage('La materia es requerida', 'error');
            return false;
        }
        
        if (!examData.aiPrompt) {
            showMessage('El prompt para la IA es requerido', 'error');
            return false;
        }
        
        if (examData.numQuestions < 1 || examData.numQuestions > 50) {
            showMessage('El número de preguntas debe estar entre 1 y 50', 'error');
            return false;
        }
        
        return true;
    }

    function showLoadingModal() {
        loadingModal.classList.remove('hidden');
        generateBtn.disabled = true;
        
        // Actualizar botón
        const generateBtnText = document.getElementById('generateBtnText');
        const generateBtnSpinner = document.getElementById('generateBtnSpinner');
        
        generateBtnText.textContent = 'Generando con IA...';
        generateBtnSpinner.classList.remove('hidden');
        
        // Cambiar colores del botón
        generateBtn.classList.remove('from-purple-600', 'to-blue-600', 'hover:from-purple-700', 'hover:to-blue-700');
        generateBtn.classList.add('from-gray-500', 'to-gray-600', 'cursor-not-allowed');
        
        // Iniciar progreso
        startProgressAnimation();
    }

    function hideLoadingModal() {
        loadingModal.classList.add('hidden');
        generateBtn.disabled = false;
        
        // Restaurar botón
        const generateBtnText = document.getElementById('generateBtnText');
        const generateBtnSpinner = document.getElementById('generateBtnSpinner');
        
        generateBtnText.textContent = 'Generar Examen con IA';
        generateBtnSpinner.classList.add('hidden');
        
        // Restaurar colores del botón
        generateBtn.classList.remove('from-gray-500', 'to-gray-600', 'cursor-not-allowed');
        generateBtn.classList.add('from-purple-600', 'to-blue-600', 'hover:from-purple-700', 'hover:to-blue-700');
        
        // Resetear progreso
        resetProgress();
    }

    function startProgressAnimation() {
        const progressBar = document.getElementById('loadingProgress');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressCircle = document.getElementById('progressCircle');
        const loadingText = document.getElementById('loadingText');
        const statusText = document.getElementById('statusText');
        const progressIcon = document.getElementById('progressIcon');
        
        let progress = 0;
        const totalDuration = 8000; // 8 segundos total
        const interval = 50; // Actualizar cada 50ms
        const increment = (100 / (totalDuration / interval));
        
        const progressInterval = setInterval(() => {
            progress += increment;
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(progressInterval);
            }
            
            // Actualizar barra de progreso
            progressBar.style.width = `${progress}%`;
            progressPercentage.textContent = Math.round(progress);
            
            // Actualizar círculo de progreso
            const circumference = 283; // 2 * π * 45
            const offset = circumference - (progress / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
            
            // Actualizar mensajes según progreso
            updateProgressMessages(progress, loadingText, statusText, progressIcon);
            
        }, interval);
        
        // Guardar referencia para poder limpiar
        window.progressInterval = progressInterval;
    }

    function updateProgressMessages(progress, loadingText, statusText, progressIcon) {
        if (progress >= 20 && progress < 50) {
            loadingText.textContent = 'Petición entendida';
            statusText.textContent = 'Analizando tu solicitud...';
            progressIcon.className = 'fas fa-check-circle text-green-400';
        } else if (progress >= 50 && progress < 75) {
            loadingText.textContent = 'Generando preguntas';
            statusText.textContent = 'Creando preguntas personalizadas...';
            progressIcon.className = 'fas fa-question-circle text-yellow-400';
        } else if (progress >= 75 && progress < 90) {
            loadingText.textContent = 'Mejorando algunos detalles';
            statusText.textContent = 'Optimizando contenido y formato...';
            progressIcon.className = 'fas fa-cog text-blue-400 fa-spin';
        } else if (progress >= 90 && progress < 100) {
            loadingText.textContent = 'Está casi todo listo';
            statusText.textContent = 'Finalizando detalles...';
            progressIcon.className = 'fas fa-magic text-purple-400';
        } else if (progress >= 100) {
            loadingText.textContent = '¡Examen generado!';
            statusText.textContent = 'Preparando para mostrar...';
            progressIcon.className = 'fas fa-check-circle text-green-400';
        }
    }

    function resetProgress() {
        const progressBar = document.getElementById('loadingProgress');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressCircle = document.getElementById('progressCircle');
        const loadingText = document.getElementById('loadingText');
        const statusText = document.getElementById('statusText');
        const progressIcon = document.getElementById('progressIcon');
        
        // Limpiar intervalo si existe
        if (window.progressInterval) {
            clearInterval(window.progressInterval);
            window.progressInterval = null;
        }
        
        // Resetear valores
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0';
        progressCircle.style.strokeDashoffset = '283';
        loadingText.textContent = 'Iniciando generación...';
        statusText.textContent = 'Conectando con Gemini AI...';
        progressIcon.className = 'fas fa-brain text-blue-400';
    }

    function showExamModal(exam) {
        // Asegurar/mostrar código
        if (!exam.examCode) {
            exam.examCode = window.geminiAPI.generateExamCode();
        }
        if (examCodeDisplay) {
            examCodeDisplay.textContent = exam.examCode;
        }
        examContent.innerHTML = formatExamForDisplay(exam);
        examModal.classList.remove('hidden');
    }

    function closeExamModalHandler() {
        examModal.classList.add('hidden');
        currentExam = null;
    }

    function formatExamForDisplay(exam) {
        let html = `
            <div class="mb-6">
                <h4 class="text-xl font-bold text-white mb-2">${exam.title}</h4>
                <div class="flex space-x-4 text-green-200 text-sm">
                    <span><i class="fas fa-book mr-1"></i>${exam.subject}</span>
                    <span><i class="fas fa-signal mr-1"></i>${exam.difficulty}</span>
                    <span><i class="fas fa-question-circle mr-1"></i>${exam.numQuestions} preguntas</span>
                </div>
            </div>
        `;

        exam.questions.forEach((question, index) => {
            html += `
                <div class="bg-white bg-opacity-10 rounded-lg p-4 mb-4">
                    <h5 class="text-white font-semibold mb-3">${question.id}. ${question.question}</h5>
                    <div class="space-y-2">
            `;
            
            question.options.forEach(option => {
                const isCorrect = option.isCorrect;
                const correctClass = isCorrect ? 'text-green-300 font-semibold' : 'text-white';
                const correctIcon = isCorrect ? '<i class="fas fa-check-circle mr-2"></i>' : '<i class="fas fa-circle mr-2"></i>';
                
                html += `
                    <div class="flex items-center ${correctClass}">
                        ${correctIcon}
                        <span>${option.letter}) ${option.text}</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        return html;
    }

    async function saveExam() {
        if (!currentExam) {
            showMessage('No hay examen para guardar', 'error');
            return;
        }

        try {
            // Publicar examen en backend temporal (Node)
            const examToPublish = {
                ...currentExam,
                examCode: window.geminiAPI.generateExamCode(),
                status: 'active',
                savedAt: new Date().toISOString()
            };

            const resp = await fetch('http://localhost:3001/exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(examToPublish)
            });

            if (!resp.ok) {
                throw new Error('No se pudo publicar el examen en el backend');
            }

            // También persistimos localmente para la lista del profesor
            generatedExams.push(examToPublish);
            localStorage.setItem('generatedExams', JSON.stringify(generatedExams));

            showMessage('Examen publicado y guardado exitosamente', 'success');
            await loadExams();
            closeExamModalHandler();

        } catch (error) {
            console.error('Error al guardar examen:', error);
            showMessage('Error al guardar el examen', 'error');
        }
    }

    function exportExam() {
        if (!currentExam) {
            showMessage('No hay examen para exportar', 'error');
            return;
        }

        try {
            window.geminiAPI.exportExamToPDF(currentExam);
            showMessage('Examen exportado exitosamente', 'success');
        } catch (error) {
            console.error('Error al exportar examen:', error);
            showMessage('Error al exportar el examen', 'error');
        }
    }

    async function loadExams() {
        try {
            // Cargar exámenes desde localStorage
            const savedExams = localStorage.getItem('generatedExams');
            if (savedExams) {
                generatedExams = JSON.parse(savedExams);
            }

            // Filtrar exámenes del profesor actual
            const professorExams = generatedExams.filter(exam => 
                exam.professorId === currentUser.id
            );

            updateExamsList(professorExams);
            updateExamCount(professorExams.length);

        } catch (error) {
            console.error('Error al cargar exámenes:', error);
            showMessage('Error al cargar los exámenes', 'error');
        }
    }

    function updateExamsList(exams) {
        if (exams.length === 0) {
            examsList.innerHTML = `
                <div class="text-center text-green-200 py-8">
                    <i class="fas fa-file-alt text-4xl mb-4 opacity-50"></i>
                    <p>No hay exámenes generados aún</p>
                    <p class="text-sm">Genera tu primer examen usando el formulario de arriba</p>
                </div>
            `;
            return;
        }

        examsList.innerHTML = exams.map(exam => `
            <div class="exam-card bg-white bg-opacity-10 rounded-lg p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="text-lg font-semibold text-white mb-2">${exam.title}</h4>
                        <div class="flex space-x-4 text-green-200 text-sm">
                            <span><i class="fas fa-book mr-1"></i>${exam.subject}</span>
                            <span><i class="fas fa-signal mr-1"></i>${exam.difficulty}</span>
                            <span><i class="fas fa-question-circle mr-1"></i>${exam.numQuestions} preguntas</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-green-300 text-sm mb-1">Código: ${exam.examCode || 'N/A'}</div>
                        <div class="text-green-200 text-xs">${new Date(exam.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-2">
                    <button onclick="viewExam('${exam.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                        <i class="fas fa-eye mr-1"></i>Ver
                    </button>
                    <button onclick="editExam('${exam.id}')" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                        <i class="fas fa-edit mr-1"></i>Editar
                    </button>
                    <button onclick="deleteExam('${exam.id}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                        <i class="fas fa-trash mr-1"></i>Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }

    function updateExamCount(count) {
        examCount.textContent = count;
    }

    async function handleLogout() {
        try {
            if (!window.logout) {
                window.logout = async function() {
                    try {
                        sessionStorage.clear();
                        localStorage.removeItem('sessionToken');
                    } catch (_) {}
                    return true;
                };
            }
            await window.logout();
            redirectToLogin();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            redirectToLogin();
        }
    }

    function redirectToLogin() {
        window.location.href = 'index.html';
    }

    function showMessage(text, type) {
        message.textContent = text;
        messageContainer.className = 'fixed top-4 right-4 z-50';
        message.className = `p-4 rounded-lg text-center font-medium max-w-md`;
        
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
        
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 5000);
    }

    // Funciones globales para los botones
    window.viewExam = function(examId) {
        const exam = generatedExams.find(e => e.id === examId);
        if (exam) {
            currentExam = exam;
            showExamModal(exam);
        }
    };

    window.editExam = function(examId) {
        const exam = generatedExams.find(e => e.id === examId);
        if (exam) {
            // Llenar el formulario con los datos del examen
            document.getElementById('examTitle').value = exam.title;
            document.getElementById('subject').value = exam.subject;
            document.getElementById('numQuestions').value = exam.numQuestions;
            document.getElementById('difficulty').value = exam.difficulty;
            document.getElementById('aiPrompt').value = `Regenera este examen: ${exam.title}`;
            
            // Scroll al formulario
            document.getElementById('examForm').scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteExam = function(examId) {
        if (confirm('¿Estás seguro de que quieres eliminar este examen?')) {
            generatedExams = generatedExams.filter(e => e.id !== examId);
            localStorage.setItem('generatedExams', JSON.stringify(generatedExams));
            loadExams();
            showMessage('Examen eliminado exitosamente', 'success');
        }
    };
});
