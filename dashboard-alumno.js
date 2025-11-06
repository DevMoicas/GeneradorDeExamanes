// Generador de Exámenes - Universidad de Colima
// Script para el panel del alumno

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const joinExamForm = document.getElementById('joinExamForm');
    const joinBtn = document.getElementById('joinBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    const examCount = document.getElementById('examCount');
    const pendingExamsList = document.getElementById('pendingExamsList');
    const completedExamsList = document.getElementById('completedExamsList');
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
    let pendingExams = [];
    let completedExams = [];
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
            await loadExamData();

            // Llenar nombre y número de cuenta del estudiante
            const nameInput = document.getElementById('studentName');
            const idInput = document.getElementById('studentId');
            
            // Ambos campos se ingresan manualmente cada vez
            if (nameInput) {
                nameInput.value = ''; // Siempre vacío para que lo ingrese manualmente
                nameInput.disabled = false; // Siempre habilitado
                nameInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
                nameInput.placeholder = 'Ingresa tu nombre completo';
            }
            
            if (idInput) {
                idInput.value = ''; // Siempre vacío para que lo ingrese manualmente
                idInput.disabled = false; // Siempre habilitado
                idInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
                idInput.placeholder = 'Ingresa tu número de cuenta';
            }
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
        const examCode = (formData.get('examCode') || '').trim().toUpperCase();
        const studentName = (formData.get('studentName') || '').trim();
        const studentId = (formData.get('studentId') || '').trim();

        // Validar datos
        if (!examCode || examCode.length === 0) {
            showMessage('El código del examen es requerido', 'error');
            return;
        }
        
        if (!studentName || studentName.length === 0) {
            showMessage('Tu nombre es requerido', 'error');
            return;
        }
        
        if (!studentId || studentId.length === 0) {
            showMessage('El número de cuenta es requerido', 'error');
            return;
        }
        
        showMessage('✅ Datos validados correctamente', 'success');

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

        // Verificar si el alumno ya se unió a este examen
        const examSessions = JSON.parse(localStorage.getItem('examSessions') || '[]');
        const existingSession = examSessions.find(session => 
            session.examId === exam.id && 
            session.studentName === studentName &&
            session.studentId === studentId
        );

        if (existingSession) {
            if (existingSession.status === 'completed') {
                showMessage('Ya has completado este examen anteriormente. Revisa tus exámenes terminados.', 'error');
                return;
            } else if (existingSession.status === 'in_progress' || existingSession.status === 'pending') {
                showMessage('Ya te has unido a este examen. Revisa tus exámenes pendientes para continuar.', 'error');
                return;
            }
        }

        // Verificar también por código de examen (por si hay duplicados)
        const existingByCode = examSessions.find(session => 
            session.examCode === exam.examCode && 
            session.studentName === studentName &&
            session.studentId === studentId
        );

        if (existingByCode) {
            if (existingByCode.status === 'completed') {
                showMessage('Ya has completado este examen anteriormente. Revisa tus exámenes terminados.', 'error');
                return;
            } else if (existingByCode.status === 'in_progress' || existingByCode.status === 'pending') {
                showMessage('Ya te has unido a este examen. Revisa tus exámenes pendientes para continuar.', 'error');
                return;
            }
        }

        // Mostrar modal de confirmación
        selectedExam = exam;
        showJoinExamModal(exam, studentName, studentId);
    }

    async function findExamByCode(examCode) {
        const code = (examCode || '').toUpperCase();
        // Backend: versión pública sin respuestas
        try {
            const resp = await fetch(getApiUrl(`/exam/code/${code}/public`));
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
                examConfig: match.examConfig || { resultOnly: true },
                questions: (match.questions || []).map(q => ({ 
                    id: q.id, 
                    question: q.question, 
                    type: q.type || 'multiple_choice',
                    correctAnswer: q.correctAnswer,
                    correctAnswers: q.correctAnswers,
                    expectedAnswer: q.expectedAnswer,
                    explanation: q.explanation,
                    obligatory: q.obligatory,
                    options: (q.options || []).map(o => ({ letter: o.letter, text: o.text })) 
                }))
            };
        } catch (_) { return null; }
    }

    async function findExamById(examId) {
        try {
            // Buscar en el backend por ID
            const resp = await fetch(getApiUrl(`/exam/${examId}/public`));
            if (resp.ok) return await resp.json();
        } catch (e) { console.warn('Backend no disponible', e); }
        // Respaldo local
        try {
            const savedExams = JSON.parse(localStorage.getItem('generatedExams') || '[]');
            const exam = savedExams.find(exam => exam.id === examId);
            if (!exam) return null;
            // Construir versión pública
            return {
                id: exam.id,
                examCode: exam.examCode,
                title: exam.title,
                subject: exam.subject,
                difficulty: exam.difficulty,
                numQuestions: exam.numQuestions,
                createdAt: exam.createdAt,
                examConfig: exam.examConfig || { resultOnly: true },
                questions: (exam.questions || []).map(q => ({ 
                    id: q.id, 
                    question: q.question, 
                    type: q.type || 'multiple_choice',
                    correctAnswer: q.correctAnswer,
                    correctAnswers: q.correctAnswers,
                    expectedAnswer: q.expectedAnswer,
                    explanation: q.explanation,
                    obligatory: q.obligatory,
                    options: (q.options || []).map(o => ({ letter: o.letter, text: o.text })) 
                }))
            };
        } catch (_) { return null; }
    }

    function showJoinExamModal(exam, studentName, studentId) {
        examInfo.innerHTML = `
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">${exam.title}</h4>
                <div class="space-y-3 text-gray-700 text-sm">
                    <div class="flex items-center"><i class="fas fa-book mr-3 text-green-600"></i>Materia: ${exam.subject}</div>
                    <div class="flex items-center"><i class="fas fa-signal mr-3 text-green-600"></i>Dificultad: ${exam.difficulty}</div>
                    <div class="flex items-center"><i class="fas fa-question-circle mr-3 text-green-600"></i>Preguntas: ${exam.numQuestions}</div>
                    <div class="flex items-center"><i class="fas fa-user mr-3 text-green-600"></i>Estudiante: ${studentName}</div>
                    ${studentId ? `<div class="flex items-center"><i class="fas fa-id-card mr-3 text-green-600"></i>No. Control: ${studentId}</div>` : ''}
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
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            // Asegurar nombre e id del estudiante desde el formulario
            const nameInput = document.getElementById('studentName');
            const idInput = document.getElementById('studentId');
            const studentNameVal = (nameInput && typeof nameInput.value === 'string') ? nameInput.value.trim() : '';
            const studentIdVal = (idInput && typeof idInput.value === 'string') ? idInput.value.trim() : '';
            const examSession = {
                examId: selectedExam.id,
                examCode: selectedExam.examCode,
                examTitle: selectedExam.title,
                subject: selectedExam.subject,
                studentName: studentNameVal, // Tomar del formulario
                studentId: studentIdVal, // Tomar del formulario
                userId: currentUser ? currentUser.id : null, // ID del usuario logueado para aislamiento
                joinedAt: new Date().toISOString(),
                status: 'in_progress',
                examConfig: selectedExam.examConfig || { resultOnly: true } // Guardar configuración del examen desde el inicio
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
            const examCodeInput = document.getElementById('examCode');
            if (examCodeInput) examCodeInput.value = '';
            
            // Limpiar ambos campos para que se ingresen manualmente (reutilizar variables ya declaradas)
            if (nameInput) {
                nameInput.value = ''; // Siempre limpiar para que lo ingrese manualmente
                nameInput.disabled = false;
                nameInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
                nameInput.placeholder = 'Ingresa tu nombre completo';
            }
            
            if (idInput) {
                idInput.value = ''; // Siempre limpiar para que lo ingrese manualmente
                idInput.disabled = false;
                idInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
                idInput.placeholder = 'Ingresa tu número de cuenta';
            }

            // Actualizar datos
            await loadExamData();

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
        
        // Configurar título
        takeExamTitle.textContent = `${exam.title} — ${exam.subject}`;
        
        // Renderizar preguntas
        takeExamBody.innerHTML = exam.questions.map((q, index) => {
            const isObligatory = q.obligatory === true; // Solo obligatoria si explícitamente es true
            const questionType = q.type || 'multiple_choice';
            const questionNumber = q.questionNumber || q.id || index + 1;
            
            return `
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                <h4 class="text-gray-800 font-bold mb-4 text-lg">
                    ${questionNumber}. ${q.question}
                    ${isObligatory ? '<span class="text-red-500 ml-2">*</span>' : ''}
                    <span class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded ml-2">
                        ${getQuestionTypeLabel(questionType)}
                    </span>
                </h4>
                ${renderStudentQuestionOptions(q, questionType)}
            </div>
        `;
        }).join('');
        
        // Mostrar modal
        takeExamModal.classList.remove('hidden');

        // Persist current session for submit
        window.currentExamContext = { exam, session };
    }

    // Función para obtener la etiqueta del tipo de pregunta
    function getQuestionTypeLabel(type) {
        switch(type) {
            case 'text_input': return 'Texto Plano';
            case 'multiple_select': return 'Selección Múltiple';
            case 'multiple_choice': 
            default: return 'Opción Múltiple';
        }
    }

    // Función para renderizar opciones de pregunta para el alumno
    function renderStudentQuestionOptions(question, questionType) {
        const questionId = question.id || question.questionNumber;
        
        switch(questionType) {
            case 'text_input':
                return `
                    <div class="space-y-3">
                        <textarea name="q_${questionId}" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                                  rows="3" 
                                  placeholder="Escribe tu respuesta aquí..."></textarea>
                        <p class="text-sm text-gray-500">Responde con texto libre</p>
                    </div>
                `;
            
            case 'multiple_select':
                return `
                    <div class="space-y-3">
                        ${question.options.map(opt => `
                            <label class="flex items-center space-x-3 text-gray-700 p-3 rounded hover:bg-gray-100 cursor-pointer">
                                <input type="checkbox" name="q_${questionId}[]" value="${opt.letter}" class="form-checkbox text-green-600 focus:ring-green-500">
                                <span class="font-medium">${opt.letter})</span>
                                <span>${opt.text}</span>
                            </label>
                        `).join('')}
                        <p class="text-sm text-gray-500">Selecciona todas las opciones correctas</p>
                    </div>
                `;
            
            case 'multiple_choice':
            default:
                return `
                    <div class="space-y-3">
                        ${question.options.map(opt => `
                            <label class="flex items-center space-x-3 text-gray-700 p-3 rounded hover:bg-gray-100 cursor-pointer">
                                <input type="radio" name="q_${questionId}" value="${opt.letter}" class="form-radio text-green-600 focus:ring-green-500">
                                <span class="font-medium">${opt.letter})</span>
                                <span>${opt.text}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
        }
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
            
            // Validar preguntas obligatorias antes de enviar
            const unansweredObligatory = [];
            const totalObligatory = exam.questions.filter(q => q.obligatory === true).length;
            
            console.log(`Total de preguntas obligatorias: ${totalObligatory}`);
            
            exam.questions.forEach(q => {
                const isObligatory = q.obligatory === true; // Solo obligatoria si explícitamente es true
                if (isObligatory) {
                    const questionId = q.id || q.questionNumber;
                    const questionType = q.type || 'multiple_choice';
                    let isAnswered = false;
                    
                    if (questionType === 'text_input') {
                        const textAnswer = document.querySelector(`textarea[name='q_${questionId}']`);
                        isAnswered = textAnswer && textAnswer.value.trim() !== '';
                    } else if (questionType === 'multiple_select') {
                        const checkboxes = document.querySelectorAll(`input[name='q_${questionId}[]']:checked`);
                        isAnswered = checkboxes.length > 0;
                    } else {
                        // multiple_choice
                        const selected = document.querySelector(`input[name='q_${questionId}']:checked`);
                        isAnswered = selected !== null;
                    }
                    
                    if (!isAnswered) {
                        unansweredObligatory.push(questionId);
                        console.log(`Pregunta obligatoria ${questionId} sin responder`);
                    } else {
                        console.log(`Pregunta obligatoria ${questionId} respondida`);
                    }
                }
            });
            
            if (unansweredObligatory.length > 0) {
                const questionNumbers = unansweredObligatory.join(', ');
                showMessage(`❌ Debes responder las preguntas obligatorias: ${questionNumbers}`, 'error');
                return;
            }
            
            console.log('Todas las preguntas obligatorias han sido respondidas. Procediendo con el envío...');
            
            const answers = exam.questions.map(q => {
                const questionId = q.id || q.questionNumber;
                const questionType = q.type || 'multiple_choice';
                let selected = null;
                let needsManualGrading = false;
                
                if (questionType === 'text_input') {
                    const textAnswer = document.querySelector(`textarea[name='q_${questionId}']`);
                    selected = textAnswer ? textAnswer.value.trim() : null;
                    needsManualGrading = true; // Las preguntas de texto necesitan calificación manual
                } else if (questionType === 'multiple_select') {
                    const checkboxes = document.querySelectorAll(`input[name='q_${questionId}[]']:checked`);
                    selected = Array.from(checkboxes).map(cb => cb.value);
                } else {
                    // multiple_choice
                    const radio = document.querySelector(`input[name='q_${questionId}']:checked`);
                    selected = radio ? radio.value : null;
                }
                
                return { questionId, selected, type: questionType, needsManualGrading };
            });

            // Enviar a backend para calificar por código
            const resp = await fetch(getApiUrl(`/exam/code/${(exam.examCode || '').toUpperCase()}/grade`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student: { name: session.studentName, id: session.studentId || '' }, answers })
            });
            if (!resp.ok) throw new Error('No se pudieron enviar las respuestas');
            const result = await resp.json();

            // Verificar si hay preguntas que necesitan calificación manual
            const textQuestions = answers.filter(a => a.needsManualGrading);
            const hasTextQuestions = textQuestions.length > 0;
            
            // Guardar resultado en la sesión
            const sessions = JSON.parse(localStorage.getItem('examSessions') || '[]');
            const idx = sessions.findIndex(s => s.examId === session.examId && s.studentName === session.studentName && s.joinedAt === session.joinedAt);
            if (idx >= 0) {
                sessions[idx].status = hasTextQuestions ? 'pending_review' : 'completed';
                sessions[idx].result = result;
                sessions[idx].answers = answers;
                sessions[idx].textQuestions = textQuestions;
                sessions[idx].needsManualGrading = hasTextQuestions;
                sessions[idx].score = result.score || { correct: 0, total: 0 }; // Guardar el score
                sessions[idx].completedAt = new Date().toISOString(); // Marcar fecha de finalización
                sessions[idx].examConfig = exam.examConfig || { resultOnly: true }; // Guardar configuración del examen
                localStorage.setItem('examSessions', JSON.stringify(sessions));
            }

            // Mostrar resultado según configuración del examen
            const examConfig = exam.examConfig || { resultOnly: true };
            
            if (hasTextQuestions) {
                // Hay preguntas de texto que necesitan calificación manual
                showMessage(`Examen enviado. ${result.score.correct}/${result.score.total} preguntas calificadas automáticamente. ${textQuestions.length} pregunta(s) de texto pendiente(s) de revisión manual.`, 'info');
                closeTakeExamModalHandler();
            } else if (examConfig.noResults) {
                // No permitir ver resultados - mostrar mensaje y botón aceptar
                showNoResultsMessage(exam, result, answers);
            } else if (examConfig.showCorrectAnswers) {
                // Mostrar examen con respuestas correctas marcadas
                showExamResultsWithCorrectAnswers(exam, result, answers, examConfig);
            } else {
                // Solo resultado (resultOnly o por defecto)
                showMessage(`Examen enviado. Aciertos: ${result.score.correct}/${result.score.total}`, 'success');
                closeTakeExamModalHandler();
            }

            await loadExamData();
        } catch (err) {
            console.error('Error enviando respuestas:', err);
            showMessage('Error al enviar las respuestas', 'error');
        }
    }

    // Función para mostrar mensaje cuando no se permiten resultados
    function showNoResultsMessage(exam, result, answers) {
        // Crear modal con mensaje
        const resultsModal = document.createElement('div');
        resultsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        resultsModal.innerHTML = `
            <div class="card-modern p-8 max-w-md mx-4 w-full">
                <div class="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
                    <h3 class="text-2xl font-bold text-gray-800">Examen Enviado</h3>
                </div>
                
                <!-- Mensaje -->
                <div class="mb-6">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                        <i class="fas fa-check-circle text-blue-600 text-4xl mb-4"></i>
                        <p class="text-lg text-gray-800 font-medium mb-2">Tu examen fue enviado</p>
                        <p class="text-sm text-gray-600">Espera a que el docente te entregue tus resultados</p>
                    </div>
                </div>

                <!-- Botón de acción -->
                <div class="flex justify-end">
                    <button id="acceptNoResultsBtn" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 btn-modern">
                        <i class="fas fa-check mr-2"></i>
                        Aceptar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(resultsModal);
        
        // Event listener para el botón Aceptar
        document.getElementById('acceptNoResultsBtn').addEventListener('click', async () => {
            document.body.removeChild(resultsModal);
            closeTakeExamModalHandler();
            // Asegurar que el examen aparezca en exámenes resueltos
            await loadExamData();
        });
    }

    // Función para mostrar examen con respuestas correctas marcadas
    function showExamResultsWithCorrectAnswers(exam, result, answers, examConfig) {
        // Crear modal de resultados con respuestas correctas
        const resultsModal = document.createElement('div');
        resultsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        resultsModal.innerHTML = `
            <div class="card-modern p-8 max-w-4xl mx-4 max-h-[90vh] overflow-y-auto w-full">
                <div class="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
                    <h3 class="text-2xl font-bold text-gray-800">Resultados del Examen - Con Respuestas Correctas</h3>
                    <button id="closeResultsModal" class="text-gray-500 hover:text-red-500 text-2xl transition-colors duration-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Resumen de resultados -->
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-semibold text-green-800">Calificación Final</h4>
                            <p class="text-green-700">${result.score.correct} de ${result.score.total} respuestas correctas</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold text-green-600">${Math.round((result.score.correct / result.score.total) * 100)}%</div>
                        </div>
                    </div>
                </div>

                <!-- Examen con respuestas correctas marcadas -->
                <div class="space-y-4">
                    ${exam.questions.map((q, index) => {
                        const studentAnswer = answers.find(a => a.questionId === q.id)?.selected;
                        const isCorrect = studentAnswer === q.correctAnswer;
                        const questionNumber = q.questionNumber || index + 1;
                        
                        return `
                            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                <h4 class="text-gray-800 font-bold mb-4 text-lg">
                                    ${questionNumber}. ${q.question}
                                    ${q.obligatory === true ? '<span class="text-red-500 ml-2">*</span>' : ''}
                                </h4>
                                <div class="space-y-3">
                                    ${q.options.map(opt => {
                                        let optionClass = 'flex items-center space-x-3 text-gray-700 p-3 rounded';
                                        let icon = '';
                                        
                                        if (studentAnswer === opt.letter) {
                                            // Respuesta del alumno
                                            if (isCorrect) {
                                                optionClass += ' bg-green-100 border border-green-300';
                                                icon = '<i class="fas fa-check-circle text-green-600 ml-2"></i> Tu respuesta (correcta)';
                                            } else {
                                                optionClass += ' bg-red-100 border border-red-300';
                                                icon = '<i class="fas fa-times-circle text-red-600 ml-2"></i> Tu respuesta (incorrecta)';
                                            }
                                        } else if (opt.letter === q.correctAnswer) {
                                            // Respuesta correcta
                                            optionClass += ' bg-blue-100 border border-blue-300';
                                            icon = '<i class="fas fa-star text-blue-600 ml-2"></i> Respuesta correcta';
                                        }
                                        
                                        return `
                                            <div class="${optionClass}">
                                                <span class="font-medium">${opt.letter})</span>
                                                <span>${opt.text}</span>
                                                <span class="ml-auto text-sm font-medium">${icon}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                ${q.explanation ? `
                                    <div class="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                                        <strong>Explicación:</strong> ${q.explanation}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Botones de acción -->
                <div class="flex justify-end mt-8 pt-6 border-t border-gray-200">
                    <button id="closeResultsBtn" class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 btn-modern">
                        <i class="fas fa-check mr-2"></i>
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(resultsModal);
        
        // Event listeners
        document.getElementById('closeResultsModal').addEventListener('click', () => {
            document.body.removeChild(resultsModal);
        });
        
        document.getElementById('closeResultsBtn').addEventListener('click', () => {
            document.body.removeChild(resultsModal);
        });
    }

    // Función para mostrar examen con respuestas del alumno (sin indicar si están correctas)
    function showExamResultsWithStudentAnswers(exam, result, answers, examConfig) {
        // Crear modal de resultados con respuestas del alumno
        const resultsModal = document.createElement('div');
        resultsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        resultsModal.innerHTML = `
            <div class="card-modern p-8 max-w-4xl mx-4 max-h-[90vh] overflow-y-auto w-full">
                <div class="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
                    <h3 class="text-2xl font-bold text-gray-800">Resultados del Examen</h3>
                    <button id="closeResultsModal" class="text-gray-500 hover:text-red-500 text-2xl transition-colors duration-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Resumen de resultados -->
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-semibold text-green-800">Calificación Final</h4>
                            <p class="text-green-700">${result.score.correct} de ${result.score.total} respuestas correctas</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold text-green-600">${Math.round((result.score.correct / result.score.total) * 100)}%</div>
                        </div>
                    </div>
                </div>

                <!-- Examen con respuestas del alumno -->
                <div class="space-y-4">
                    ${exam.questions.map((q, index) => {
                        const studentAnswer = answers.find(a => a.questionId === q.id)?.selected;
                        const questionNumber = q.questionNumber || index + 1;
                        
                        return `
                            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                <h4 class="text-gray-800 font-bold mb-4 text-lg">
                                    ${questionNumber}. ${q.question}
                                    ${q.obligatory === true ? '<span class="text-red-500 ml-2">*</span>' : ''}
                                </h4>
                                <div class="space-y-3">
                                    ${q.options.map(opt => {
                                        let optionClass = 'flex items-center space-x-3 text-gray-700 p-3 rounded';
                                        let icon = '';
                                        
                                        if (studentAnswer === opt.letter) {
                                            // Respuesta del alumno (sin indicar si está correcta)
                                            optionClass += ' bg-blue-100 border border-blue-300';
                                            icon = '<i class="fas fa-check-circle text-blue-600 ml-2"></i> Tu respuesta';
                                        }
                                        
                                        return `
                                            <div class="${optionClass}">
                                                <span class="font-medium">${opt.letter})</span>
                                                <span>${opt.text}</span>
                                                <span class="ml-auto text-sm font-medium">${icon}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Botones de acción -->
                <div class="flex justify-end mt-8 pt-6 border-t border-gray-200">
                    <button id="closeResultsBtn" class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 btn-modern">
                        <i class="fas fa-check mr-2"></i>
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(resultsModal);
        
        // Event listeners
        document.getElementById('closeResultsModal').addEventListener('click', () => {
            document.body.removeChild(resultsModal);
        });
        
        document.getElementById('closeResultsBtn').addEventListener('click', () => {
            document.body.removeChild(resultsModal);
        });
    }

    function showExamResults(exam, result, answers, examConfig) {
        // Crear modal de resultados
        const resultsModal = document.createElement('div');
        resultsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        resultsModal.innerHTML = `
            <div class="card-modern p-8 max-w-4xl mx-4 max-h-[90vh] overflow-y-auto w-full">
                <div class="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
                    <h3 class="text-2xl font-bold text-gray-800">Resultados del Examen</h3>
                    <button id="closeResultsModal" class="text-gray-500 hover:text-red-500 text-2xl transition-colors duration-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Resumen de resultados -->
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-semibold text-green-800">Calificación Final</h4>
                            <p class="text-green-700">${result.score.correct} de ${result.score.total} respuestas correctas</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold text-green-600">${Math.round((result.score.correct / result.score.total) * 100)}%</div>
                        </div>
                    </div>
                </div>

                <!-- Examen con respuestas -->
                <div class="space-y-4">
                    ${exam.questions.map((q, index) => {
                        const studentAnswer = answers.find(a => a.questionId === q.id)?.selected;
                        const isCorrect = studentAnswer === q.correctAnswer;
                        const questionNumber = q.questionNumber || index + 1;
                        
                        return `
                            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                <h4 class="text-gray-800 font-bold mb-4 text-lg">
                                    ${questionNumber}. ${q.question}
                                    ${q.obligatory === true ? '<span class="text-red-500 ml-2">*</span>' : ''}
                                </h4>
                                <div class="space-y-3">
                                    ${q.options.map(opt => {
                                        let optionClass = 'flex items-center space-x-3 text-gray-700 p-3 rounded';
                                        let icon = '';
                                        
                                        if (studentAnswer === opt.letter) {
                                            // Respuesta del alumno
                                            if (isCorrect) {
                                                optionClass += ' bg-green-100 border border-green-300';
                                                icon = '<i class="fas fa-check-circle text-green-600 ml-2"></i>';
                                            } else {
                                                optionClass += ' bg-red-100 border border-red-300';
                                                icon = '<i class="fas fa-times-circle text-red-600 ml-2"></i>';
                                            }
                                        }
                                        // Nota: Esta función muestra las respuestas del alumno marcadas (verde/rojo)
                                        
                                        return `
                                            <div class="${optionClass}">
                                                <span class="font-medium">${opt.letter})</span>
                                                <span>${opt.text}</span>
                                                ${icon}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                <!-- Nota: Las explicaciones solo se muestran cuando showCorrectAnswers está habilitado -->
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Botones de acción -->
                <div class="flex justify-end mt-8 pt-6 border-t border-gray-200">
                    <button id="closeResultsBtn" class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 btn-modern">
                        <i class="fas fa-check mr-2"></i>
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(resultsModal);
        
        // Event listeners
        document.getElementById('closeResultsModal').addEventListener('click', () => {
            document.body.removeChild(resultsModal);
            closeTakeExamModalHandler();
        });
        
        document.getElementById('closeResultsBtn').addEventListener('click', () => {
            document.body.removeChild(resultsModal);
            closeTakeExamModalHandler();
        });
    }

    async function loadExamData() {
        try {
            // Cargar todas las sesiones de exámenes del estudiante
            const examSessions = JSON.parse(localStorage.getItem('examSessions') || '[]');
            
            // Filtrar por el usuario actual usando el ID del usuario logueado
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            const currentUserId = currentUser ? currentUser.id : null;
            
            // Solo mostrar sesiones del usuario actual
            const studentSessions = examSessions.filter(session => {
                // Si la sesión tiene un userId, usarlo para filtrar
                if (session.userId) {
                    return session.userId === currentUserId;
                }
                // Si no tiene userId, usar el nombre como fallback (para compatibilidad)
                const sessionName = typeof session.studentName === 'string' ? session.studentName : String(session.studentName || '');
                const currentFirstName = currentUser?.nombre || '';
                return sessionName.includes(currentFirstName);
            });

            // Separar por estado
            pendingExams = studentSessions.filter(session => session.status === 'in_progress' || session.status === 'pending');
            completedExams = studentSessions.filter(session => session.status === 'completed');
            
            // Agregar exámenes pendientes de revisión a la lista de pendientes
            const pendingReviewExams = studentSessions.filter(session => session.status === 'pending_review');
            pendingExams = [...pendingExams, ...pendingReviewExams];

            // Actualizar todas las listas
            updatePendingExamsList();
            updateCompletedExamsList();
            updateExamCount();

        } catch (error) {
            console.error('Error al cargar datos de exámenes:', error);
            showMessage('Error al cargar los datos de exámenes', 'error');
        }
    }

    function updatePendingExamsList() {
        if (pendingExams.length === 0) {
            pendingExamsList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-hourglass-half text-4xl mb-4 opacity-50"></i>
                    <p>No tienes exámenes pendientes</p>
                    <p class="text-sm">Únete a un examen para verlo aquí</p>
                </div>
            `;
            return;
        }

        pendingExamsList.innerHTML = pendingExams.map(session => `
            <div class="exam-card bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-800 mb-2">${session.examTitle}</h4>
                        <div class="flex flex-wrap gap-4 text-gray-600 text-sm mb-3">
                            <span><i class="fas fa-user mr-1"></i>${session.studentName}</span>
                            ${session.studentId ? `<span><i class="fas fa-id-card mr-1"></i>${session.studentId}</span>` : ''}
                            <span><i class="fas fa-clock mr-1"></i>${new Date(session.joinedAt).toLocaleString()}</span>
                            <span><i class="fas fa-book mr-1"></i>${typeof session.subject === 'string' ? session.subject : (session.subject?.name || session.subject?.title || 'Materia no especificada')}</span>
                        </div>
                    </div>
                    <div class="text-right ml-4">
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${
                            session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                            session.status === 'pending_review' ? 'bg-orange-100 text-orange-800' : 
                            'bg-yellow-100 text-yellow-800'
                        }">
                            ${session.status === 'in_progress' ? 'En Progreso' : 
                              session.status === 'pending_review' ? 'Pendiente de Revisión' : 
                              'Pendiente'}
                        </span>
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        <span>Código: <span class="font-mono font-medium">${session.examCode || session.examId}</span></span>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="startExam('${session.examId}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors duration-200">
                            <i class="fas fa-play mr-1"></i>Iniciar Examen
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function updateCompletedExamsList() {
        if (completedExams.length === 0) {
            completedExamsList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-clipboard-check text-4xl mb-4 opacity-50"></i>
                    <p>No has completado exámenes aún</p>
                    <p class="text-sm">Los exámenes completados aparecerán aquí</p>
                </div>
            `;
            return;
        }

        completedExamsList.innerHTML = completedExams.map(session => {
            const hasScore = session.score && session.score.correct !== undefined;
            const scorePercentage = hasScore ? Math.round((session.score.correct / session.score.total) * 100) : 0;
            
            // Determinar si se puede ver resultados según la configuración del examen
            const examConfig = session.examConfig || { resultOnly: true };
            // Si resultOnly o noResults es true, no puede ver resultados. Solo puede ver si showCorrectAnswers está habilitado
            const canViewResults = examConfig.showCorrectAnswers && !examConfig.noResults;
            
            return `
                <div class="exam-card bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-gray-800 mb-2">${session.examTitle}</h4>
                            <div class="flex flex-wrap gap-4 text-gray-600 text-sm mb-3">
                                <span><i class="fas fa-user mr-1"></i>${session.studentName}</span>
                                ${session.studentId ? `<span><i class="fas fa-id-card mr-1"></i>${session.studentId}</span>` : ''}
                                <span><i class="fas fa-clock mr-1"></i>${new Date(session.completedAt || session.joinedAt).toLocaleString()}</span>
                                <span><i class="fas fa-book mr-1"></i>${typeof session.subject === 'string' ? session.subject : (session.subject?.name || session.subject?.title || 'Materia no especificada')}</span>
                            </div>
                            ${examConfig.noResults ? `
                                <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                                    <p class="text-sm text-red-600 font-medium">
                                        <i class="fas fa-clock mr-2"></i>
                                        Espera a que el docente te dé tus resultados de este examen.
                                    </p>
                                </div>
                            ` : hasScore ? `
                                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                                    <div class="flex items-center justify-between mb-2">
                                        <h5 class="font-semibold text-gray-800">Resultado del Examen</h5>
                                        <span class="text-2xl font-bold ${scorePercentage >= 70 ? 'text-green-600' : scorePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                                            ${scorePercentage}%
                                        </span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span class="text-gray-500">Respuestas correctas:</span>
                                            <span class="font-medium text-green-600 ml-1">${session.score.correct}</span>
                                        </div>
                                        <div>
                                            <span class="text-gray-500">Total de preguntas:</span>
                                            <span class="font-medium text-gray-700 ml-1">${session.score.total}</span>
                                        </div>
                                        <div>
                                            <span class="text-gray-500">Incorrectas:</span>
                                            <span class="font-medium text-red-600 ml-1">${session.score.total - session.score.correct}</span>
                                        </div>
                                        <div>
                                            <span class="text-gray-500">Calificación:</span>
                                            <span class="font-medium ${scorePercentage >= 70 ? 'text-green-600' : scorePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'} ml-1">
                                                ${scorePercentage >= 70 ? 'Aprobado' : scorePercentage >= 50 ? 'Regular' : 'Reprobado'}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <div class="w-full bg-gray-200 rounded-full h-2">
                                            <div class="h-2 rounded-full ${scorePercentage >= 70 ? 'bg-green-500' : scorePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}" 
                                                 style="width: ${scorePercentage}%"></div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            ${!canViewResults && !examConfig.noResults ? `
                                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                    <p class="text-sm text-blue-700">
                                        <i class="fas fa-info-circle mr-2"></i>
                                        El profesor ha configurado este examen para mostrar solo el resultado final.
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="text-right ml-4">
                            <span class="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Completado
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div class="text-sm text-gray-500">
                            <span>Código: <span class="font-mono font-medium">${session.examCode || session.examId}</span></span>
                        </div>
                        <div class="flex space-x-2">
                            ${canViewResults ? `
                                <button onclick="viewExamResults('${session.examId}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors duration-200">
                                    <i class="fas fa-eye mr-1"></i>Ver Resultados
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateExamCount() {
        examCount.textContent = completedExams.length;
    }

    // Función para iniciar un examen pendiente
    window.startExam = async function(examId) {
        const session = pendingExams.find(s => s.examId === examId);
        if (session) {
            try {
                // Buscar el examen completo por ID
                const exam = await findExamById(examId);
                if (exam) {
                    // Actualizar el estado de la sesión a 'in_progress' y asegurar que tenga la materia
                    const examSessions = JSON.parse(localStorage.getItem('examSessions') || '[]');
                    const sessionIndex = examSessions.findIndex(s => s.examId === examId && s.studentName === session.studentName);
                    if (sessionIndex >= 0) {
                        examSessions[sessionIndex].status = 'in_progress';
                        examSessions[sessionIndex].subject = exam.subject; // Asegurar que tenga la materia
                        localStorage.setItem('examSessions', JSON.stringify(examSessions));
                    }
                    
                    // Mostrar el examen
                    renderTakeExam(exam, session);
                    showMessage('Examen iniciado', 'success');
                } else {
                    showMessage('No se pudo cargar el examen', 'error');
                }
            } catch (error) {
                console.error('Error al iniciar examen:', error);
                showMessage('Error al iniciar el examen', 'error');
            }
        }
    }

    // Función para ver resultados de un examen
    window.viewExamResults = async function(examId) {
        try {
            // Buscar la sesión del examen completado
            const session = completedExams.find(s => s.examId === examId);
            if (!session) {
                showMessage('No se encontró la sesión del examen', 'error');
                return;
            }

            // Buscar el examen completo
            const exam = await findExamById(examId);
            if (!exam) {
                showMessage('No se pudo cargar el examen', 'error');
                return;
            }

            // Obtener la configuración del examen (priorizar la de la sesión, luego la del examen)
            const examConfig = session.examConfig || exam.examConfig || { resultOnly: true };
            
            // Verificar si el alumno puede ver resultados
            if (examConfig.noResults) {
                // No se permiten resultados - mostrar mensaje
                showMessage('No puedes ver los resultados de este examen. Espera a que el docente te entregue tus resultados.', 'info');
                return;
            }
            
            if (examConfig.resultOnly && !examConfig.showCorrectAnswers) {
                // Solo mostrar resultado (calificación) sin acceso al examen
                showMessage(`Aciertos: ${session.result?.score?.correct || session.score?.correct || 0}/${session.result?.score?.total || session.score?.total || 0}`, 'info');
                return;
            }
            
            // Verificar que existan los datos necesarios
            if (!session.result || !session.answers) {
                showMessage('No se encontraron los resultados del examen', 'error');
                return;
            }
            
            if (examConfig.showCorrectAnswers) {
                // Mostrar examen con respuestas correctas marcadas
                showExamResultsWithCorrectAnswers(exam, session.result, session.answers, examConfig);
            } else {
                // Por defecto, solo resultado
                showMessage(`Aciertos: ${session.result.score.correct}/${session.result.score.total}`, 'info');
            }
        } catch (error) {
            console.error('Error al mostrar resultados:', error);
            showMessage('Error al cargar los resultados', 'error');
        }
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
