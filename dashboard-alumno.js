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
    const takeExamModal = document.getElementById('takeExamModal');
    const closeTakeExamModal = document.getElementById('closeTakeExamModal');
    const cancelTakeExamBtn = document.getElementById('cancelTakeExamBtn');
    const takeExamTitle = document.getElementById('takeExamTitle');
    const takeExamBody = document.getElementById('takeExamBody');
    const takeExamForm = document.getElementById('takeExamForm');
    const messageContainer = document.getElementById('messageContainer');
    const message = document.getElementById('message');

    // Variables globales
    let currentUser = null;
    let availableExams = [];
    let examHistory = [];
    let selectedExam = null;

    // Conectar eventos de inmediato para evitar recargas por submit sin handler
    setupEventListeners();
    // Configuración inicial
    initializeApp();

    async function initializeApp() {
        try {
            // Intentar verificar sesión si existen helpers
            let hasActiveSession = true;
            if (typeof checkActiveSession === 'function') {
                hasActiveSession = await checkActiveSession();
            }
            if (!hasActiveSession) {
                // Continuar en modo invitado alumno
                console.warn('Sesión no activa, modo alumno invitado');
            }

            // Obtener usuario actual si existe
            if (typeof getCurrentUser === 'function') {
                currentUser = getCurrentUser();
            } else {
                currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            }
            if (!currentUser) {
                currentUser = { id: 999, nombre: 'Alumno', apellido: 'Invitado', tipo_usuario: 'alumno' };
            }

            // Mostrar información del usuario
            userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;

            // Cargar datos
            await loadAvailableExams();
            await loadExamHistory();

            // Llenar nombre del estudiante
            const nameInput = document.getElementById('studentName');
            if (nameInput) nameInput.value = `${currentUser.nombre} ${currentUser.apellido}`;
        } catch (err) {
            console.warn('Inicialización reducida por error:', err);
        }
    }

    function setupEventListeners() {
        // Formulario de unirse a examen
        joinExamForm.addEventListener('submit', handleJoinExam);
        
        // Botones del modal
        closeJoinModal.addEventListener('click', closeJoinModalHandler);
        cancelJoinBtn.addEventListener('click', closeJoinModalHandler);
        confirmJoinBtn.addEventListener('click', confirmJoinExam);
        closeTakeExamModal.addEventListener('click', closeTakeExamModalHandler);
        cancelTakeExamBtn.addEventListener('click', closeTakeExamModalHandler);
        takeExamForm.addEventListener('submit', submitExamAnswers);
        
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

        // Buscar examen por código en backend (público)
        const exam = await findExamByCode(examCode);
        
        if (!exam) {
            showMessage('No se encontró un examen con ese código', 'error');
            return;
        }

        // Verificar disponibilidad: si no viene status, asume activo
        if (exam.status && exam.status !== 'active') {
            showMessage('Este examen no está disponible actualmente', 'error');
            return;
        }

        // Mostrar modal de confirmación
        selectedExam = exam;
        showJoinExamModal(exam, studentName, studentId);
    }

    async function findExamByCode(examCode) {
        const code = (examCode || '').toUpperCase();
        // Backend: versión pública sin respuestas
        try {
            const resp = await fetch(`http://localhost:3001/exam/code/${code}/public`);
            if (resp.ok) return await resp.json();
        } catch (e) { console.warn('Backend no disponible', e); }
        // Respaldo local
        try {
            const savedExams = JSON.parse(localStorage.getItem('generatedExams') || '[]');
            const candidates = savedExams.filter(exam => (exam.examCode || '').toUpperCase() === code);
            const match = candidates.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            if (!match) return null;
            // Construir versión pública
            return {
                id: match.id,
                examCode: match.examCode,
                title: match.title,
                subject: match.subject,
                difficulty: match.difficulty,
                numQuestions: match.numQuestions,
                createdAt: match.createdAt,
                questions: (match.questions || []).map(q => ({ id: q.id, question: q.question, options: (q.options || []).map(o => ({ letter: o.letter, text: o.text })) }))
            };
        } catch (_) { return null; }
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
            // Unirse al examen y registrar intento
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

            // Iniciar examen: tomar snapshot antes de cerrar el modal
            const codeInput = document.getElementById('examCode');
            const codeValue = codeInput ? codeInput.value.trim().toUpperCase() : '';
            const examSnapshot = { ...selectedExam };
            if (!examSnapshot.examCode) examSnapshot.examCode = codeValue;

            // Mostrar el examen para responder
            renderTakeExam(examSnapshot, examSession);

            // Feedback y limpieza del modal de unión
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

    function renderTakeExam(exam, session) {
        if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
            showMessage('No se pudo cargar el examen para responder', 'error');
            return;
        }
        takeExamTitle.textContent = `${exam.title} — ${exam.subject}`;
        takeExamBody.innerHTML = exam.questions.map(q => `
            <div class="bg-white bg-opacity-10 rounded-lg p-4">
                <h4 class="text-white font-semibold mb-3">${q.id}. ${q.question}</h4>
                <div class="space-y-2">
                    ${q.options.map(opt => `
                        <label class="flex items-center space-x-2 text-white">
                            <input type="radio" name="q_${q.id}" value="${opt.letter}" class="form-radio text-green-500">
                            <span>${opt.letter}) ${opt.text}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
        takeExamModal.classList.remove('hidden');

        // Persist current session for submit
        window.currentExamContext = { exam, session };
    }

    function closeTakeExamModalHandler() {
        takeExamModal.classList.add('hidden');
        window.currentExamContext = null;
    }

    async function submitExamAnswers(event) {
        event.preventDefault();
        try {
            const ctx = window.currentExamContext;
            if (!ctx) {
                showMessage('No hay examen activo para enviar', 'error');
                return;
            }

            const { exam, session } = ctx;
            const answers = exam.questions.map(q => {
                const selected = (document.querySelector(`input[name='q_${q.id}']:checked`) || {}).value || null;
                return { questionId: q.id, selected };
            });

            // Enviar a backend para calificar por código
            const resp = await fetch(`http://localhost:3001/exam/code/${(exam.examCode || '').toUpperCase()}/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student: { name: session.studentName, id: session.studentId || '' }, answers })
            });
            if (!resp.ok) throw new Error('No se pudieron enviar las respuestas');
            const result = await resp.json();

            showMessage(`Examen enviado. Aciertos: ${result.score.correct}/${result.score.total}`, 'success');
            closeTakeExamModalHandler();

            // Marcar la sesión como completada
            const sessions = JSON.parse(localStorage.getItem('examSessions') || '[]');
            const idx = sessions.findIndex(s => s.examId === session.examId && s.studentName === session.studentName && s.joinedAt === session.joinedAt);
            if (idx >= 0) {
                sessions[idx].status = 'completed';
                localStorage.setItem('examSessions', JSON.stringify(sessions));
            }
            await loadExamHistory();
        } catch (err) {
            console.error('Error enviando respuestas:', err);
            showMessage('Error al enviar las respuestas', 'error');
        }
    }

    async function loadAvailableExams() {
        try {
            // Preferir backend y deduplicar por código
            let list = [];
            try {
                const resp = await fetch('http://localhost:3001/exams/active/public');
                if (resp.ok) list = await resp.json();
            } catch (_) {}
            // Si backend devolvió al menos uno, limpia cache local para evitar residuos
            if (list.length > 0) {
                localStorage.setItem('generatedExams', JSON.stringify([]));
            }
            const savedExams = JSON.parse(localStorage.getItem('generatedExams') || '[]');
            const localActive = savedExams.filter(e => (e.status || 'active') === 'active').map(e => ({
                examCode: (e.examCode || '').toUpperCase(),
                id: e.id,
                title: e.title,
                subject: e.subject,
                difficulty: e.difficulty,
                numQuestions: e.numQuestions,
                createdAt: e.createdAt
            }));
            const merged = [...list, ...localActive];
            const dedup = new Map();
            for (const it of merged) {
                const code = (it.examCode || '').toUpperCase();
                if (!dedup.has(code)) dedup.set(code, it);
            }
            availableExams = Array.from(dedup.values());

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
