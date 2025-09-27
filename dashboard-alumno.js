// Generador de Exámenes - Universidad de Colima
// Script para el panel del alumno

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const joinExamForm = document.getElementById('joinExamForm');
    const joinBtn = document.getElementById('joinBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    const examCount = document.getElementById('examCount');
    const availableExamsList = document.getElementById('availableExamsList');
    const examHistoryList = document.getElementById('examHistoryList');
    const joinExamModal = document.getElementById('joinExamModal');
    const closeJoinModal = document.getElementById('closeJoinModal');
    const cancelJoinBtn = document.getElementById('cancelJoinBtn');
    const confirmJoinBtn = document.getElementById('confirmJoinBtn');
    const examInfo = document.getElementById('examInfo');
    const messageContainer = document.getElementById('messageContainer');
    const message = document.getElementById('message');

    // Variables globales
    let currentUser = null;
    let availableExams = [];
    let examHistory = [];
    let selectedExam = null;

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
        if (!currentUser || currentUser.tipo_usuario !== 'alumno') {
            redirectToLogin();
            return;
        }

        // Mostrar información del usuario
        userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;

        // Configurar eventos
        setupEventListeners();

        // Cargar datos
        await loadAvailableExams();
        await loadExamHistory();

        // Llenar nombre del estudiante
        document.getElementById('studentName').value = `${currentUser.nombre} ${currentUser.apellido}`;
    }

    function setupEventListeners() {
        // Formulario de unirse a examen
        joinExamForm.addEventListener('submit', handleJoinExam);
        
        // Botones del modal
        closeJoinModal.addEventListener('click', closeJoinModalHandler);
        cancelJoinBtn.addEventListener('click', closeJoinModalHandler);
        confirmJoinBtn.addEventListener('click', confirmJoinExam);
        
        // Botón de cerrar sesión
        logoutBtn.addEventListener('click', handleLogout);
    }

    async function handleJoinExam(event) {
        event.preventDefault();
        
        const formData = new FormData(joinExamForm);
        const examCode = formData.get('examCode').trim().toUpperCase();
        const studentName = formData.get('studentName').trim();
        const studentId = formData.get('studentId').trim();

        // Validar datos
        if (!examCode) {
            showMessage('El código del examen es requerido', 'error');
            return;
        }
        
        if (!studentName) {
            showMessage('Tu nombre es requerido', 'error');
            return;
        }

        // Buscar examen por código
        const exam = await findExamByCode(examCode);
        
        if (!exam) {
            showMessage('No se encontró un examen con ese código', 'error');
            return;
        }

        // Verificar si el examen está disponible
        if (exam.status !== 'active') {
            showMessage('Este examen no está disponible actualmente', 'error');
            return;
        }

        // Mostrar modal de confirmación
        selectedExam = exam;
        showJoinExamModal(exam, studentName, studentId);
    }

    async function findExamByCode(examCode) {
        try {
            // Buscar en exámenes guardados
            const savedExams = localStorage.getItem('generatedExams');
            if (savedExams) {
                const exams = JSON.parse(savedExams);
                return exams.find(exam => exam.examCode === examCode);
            }
            return null;
        } catch (error) {
            console.error('Error al buscar examen:', error);
            return null;
        }
    }

    function showJoinExamModal(exam, studentName, studentId) {
        examInfo.innerHTML = `
            <div class="bg-white bg-opacity-10 rounded-lg p-4">
                <h4 class="text-lg font-semibold text-white mb-2">${exam.title}</h4>
                <div class="space-y-2 text-green-200 text-sm">
                    <div><i class="fas fa-book mr-2"></i>Materia: ${exam.subject}</div>
                    <div><i class="fas fa-signal mr-2"></i>Dificultad: ${exam.difficulty}</div>
                    <div><i class="fas fa-question-circle mr-2"></i>Preguntas: ${exam.numQuestions}</div>
                    <div><i class="fas fa-user mr-2"></i>Estudiante: ${studentName}</div>
                    ${studentId ? `<div><i class="fas fa-id-card mr-2"></i>No. Control: ${studentId}</div>` : ''}
                </div>
            </div>
        `;
        
        joinExamModal.classList.remove('hidden');
    }

    function closeJoinModalHandler() {
        joinExamModal.classList.add('hidden');
        selectedExam = null;
    }

    async function confirmJoinExam() {
        if (!selectedExam) {
            showMessage('No hay examen seleccionado', 'error');
            return;
        }

        try {
            // Simular unirse al examen
            const examSession = {
                examId: selectedExam.id,
                examTitle: selectedExam.title,
                studentName: document.getElementById('studentName').value,
                studentId: document.getElementById('studentId').value,
                joinedAt: new Date().toISOString(),
                status: 'in_progress'
            };

            // Guardar sesión de examen
            const examSessions = JSON.parse(localStorage.getItem('examSessions') || '[]');
            examSessions.push(examSession);
            localStorage.setItem('examSessions', JSON.stringify(examSessions));

            showMessage('Te has unido al examen exitosamente', 'success');
            closeJoinModalHandler();
            
            // Limpiar formulario
            joinExamForm.reset();
            document.getElementById('studentName').value = `${currentUser.nombre} ${currentUser.apellido}`;

            // Actualizar historial
            await loadExamHistory();

        } catch (error) {
            console.error('Error al unirse al examen:', error);
            showMessage('Error al unirse al examen', 'error');
        }
    }

    async function loadAvailableExams() {
        try {
            // Cargar exámenes disponibles desde localStorage
            const savedExams = localStorage.getItem('generatedExams');
            if (savedExams) {
                const exams = JSON.parse(savedExams);
                availableExams = exams.filter(exam => exam.status === 'active');
            }

            updateAvailableExamsList();
            updateExamCount();

        } catch (error) {
            console.error('Error al cargar exámenes disponibles:', error);
            showMessage('Error al cargar los exámenes disponibles', 'error');
        }
    }

    function updateAvailableExamsList() {
        if (availableExams.length === 0) {
            availableExamsList.innerHTML = `
                <div class="text-center text-green-200 py-8">
                    <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
                    <p>No hay exámenes disponibles</p>
                    <p class="text-sm">Los exámenes aparecerán aquí cuando estén activos</p>
                </div>
            `;
            return;
        }

        availableExamsList.innerHTML = availableExams.map(exam => `
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
                        <div class="text-green-300 text-sm mb-1">Código: ${exam.examCode}</div>
                        <div class="text-green-200 text-xs">${new Date(exam.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div class="flex justify-end">
                    <button onclick="joinExamWithCode('${exam.examCode}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                        <i class="fas fa-sign-in-alt mr-1"></i>Unirse
                    </button>
                </div>
            </div>
        `).join('');
    }

    async function loadExamHistory() {
        try {
            // Cargar historial de exámenes del estudiante
            const examSessions = JSON.parse(localStorage.getItem('examSessions') || '[]');
            examHistory = examSessions.filter(session => 
                session.studentName === `${currentUser.nombre} ${currentUser.apellido}`
            );

            updateExamHistoryList();

        } catch (error) {
            console.error('Error al cargar historial:', error);
            showMessage('Error al cargar el historial de exámenes', 'error');
        }
    }

    function updateExamHistoryList() {
        if (examHistory.length === 0) {
            examHistoryList.innerHTML = `
                <div class="text-center text-green-200 py-8">
                    <i class="fas fa-clipboard-list text-4xl mb-4 opacity-50"></i>
                    <p>No has realizado exámenes aún</p>
                    <p class="text-sm">Tu historial aparecerá aquí después de completar exámenes</p>
                </div>
            `;
            return;
        }

        examHistoryList.innerHTML = examHistory.map(session => `
            <div class="exam-card bg-white bg-opacity-10 rounded-lg p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="text-lg font-semibold text-white mb-2">${session.examTitle}</h4>
                        <div class="flex space-x-4 text-green-200 text-sm">
                            <span><i class="fas fa-user mr-1"></i>${session.studentName}</span>
                            ${session.studentId ? `<span><i class="fas fa-id-card mr-1"></i>${session.studentId}</span>` : ''}
                            <span><i class="fas fa-clock mr-1"></i>${new Date(session.joinedAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${
                            session.status === 'completed' ? 'bg-green-600 text-white' : 
                            session.status === 'in_progress' ? 'bg-yellow-600 text-white' : 
                            'bg-gray-600 text-white'
                        }">
                            ${session.status === 'completed' ? 'Completado' : 
                              session.status === 'in_progress' ? 'En Progreso' : 
                              'Pendiente'}
                        </span>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-2">
                    <button onclick="viewExamSession('${session.examId}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                        <i class="fas fa-eye mr-1"></i>Ver
                    </button>
                    ${session.status === 'in_progress' ? `
                        <button onclick="continueExam('${session.examId}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                            <i class="fas fa-play mr-1"></i>Continuar
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    function updateExamCount() {
        examCount.textContent = examHistory.length;
    }

    async function handleLogout() {
        try {
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
    window.joinExamWithCode = function(examCode) {
        document.getElementById('examCode').value = examCode;
        document.getElementById('joinExamForm').scrollIntoView({ behavior: 'smooth' });
    };

    window.viewExamSession = function(examId) {
        showMessage('Función de visualización en desarrollo', 'info');
    };

    window.continueExam = function(examId) {
        showMessage('Función de continuar examen en desarrollo', 'info');
    };
});
