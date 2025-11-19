// Generador de Exámenes - Universidad de Colima
// Módulo de integración con Gemini AI

class GeminiAPI {
    constructor() {
        this.apiKey = 'AIzaSyB6bIvKGhvK403Hd6g0MDd6L0O05wsD2ok';
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
        this.isInitialized = false;
    }

    // Inicializar la API
    async init() {
        try {
            // Verificar que la API key esté disponible
            if (!this.apiKey) {
                throw new Error('API Key de Gemini no configurada');
            }

            console.log('🔧 Verificando conexión con Gemini API...');

            // Hacer una prueba real de conexión con la API
            const testPrompt = "Responde solo 'OK' si puedes procesar este mensaje.";
            const requestBody = {
                contents: [{
                    parts: [{
                        text: testPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 10,
                }
            };

            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error de API: ${errorData.error?.message || 'Error de conexión'}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Respuesta inválida de la API');
            }

            this.isInitialized = true;
            console.log('✅ Gemini API conectada y funcionando correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al conectar con Gemini API:', error);
            this.isInitialized = false;
            return false;
        }
    }

    // Generar examen usando Gemini AI
    async generateExam(examData) {
        console.log('🤖 Iniciando generación de examen con Gemini AI...', examData);

        try {
            // Validar datos de entrada
            this.validateExamData(examData);

            const prompt = this.buildExamPrompt(examData);
            console.log('📝 Prompt enviado a Gemini:', prompt);

            // Configuración con tokens altos para priorizar completitud
            const primaryMaxTokens = 4096; // objetivo alto
            const requestBody = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: primaryMaxTokens,
                }
            };

            console.log('🚀 Enviando solicitud a Gemini API...');
            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📡 Respuesta recibida:', response.status);

            // Si la primera solicitud falla, intentar una de respaldo con menos temperatura y menos tokens
            let data;
            if (!response.ok) {
                let errorData = null;
                try { errorData = await response.json(); } catch (_) { }
                console.warn('⚠️ Primer intento falló. Reintentando con menos tokens...', errorData);

                const fallbackBody = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.5,
                        topK: 32,
                        topP: 0.9,
                        maxOutputTokens: 3072,
                    }
                };

                const response2 = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fallbackBody)
                });

                if (!response2.ok) {
                    let errorData2 = null;
                    try { errorData2 = await response2.json(); } catch (_) { }
                    console.error('❌ Error de API en reintento:', errorData2);
                    throw new Error(`Error de API (reintento): ${errorData2?.error?.message || 'Error desconocido'}`);
                }
                data = await response2.json();
            } else {
                data = await response.json();
            }
            console.log('✅ Datos recibidos de Gemini:', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Respuesta inválida de la API');
            }

            const generatedText = data.candidates[0].content.parts[0].text;
            console.log('📄 Texto generado por Gemini:', generatedText);

            return this.parseExamResponse(generatedText, examData);

        } catch (error) {
            console.error('❌ Error al generar examen con Gemini:', error);

            // Fallback: crear un examen de ejemplo si la API falla
            console.log('🔄 Creando examen de ejemplo como fallback');
            return this.createFallbackExam(examData);
        }
    }

    // Construir el prompt para Gemini
    buildExamPrompt(examData) {
        const { title, subject, numQuestions, difficulty } = examData;
        // Permitir prompts largos (no truncar), solo normalizar espacios extremos
        let aiPrompt = (examData.aiPrompt || '').toString();
        aiPrompt = aiPrompt.replace(/\s+/g, ' ').trim();

        return `Eres un experto en educación y creación de exámenes. Tu tarea es generar un examen completo con el número EXACTO de preguntas solicitado.

PARÁMETROS OBLIGATORIOS:
- TÍTULO DEL EXAMEN: ${title}
- MATERIA: ${subject}
- NÚMERO DE PREGUNTAS REQUERIDAS: ${numQuestions} (CRÍTICO: DEBE SER EXACTAMENTE ${numQuestions})
- NIVEL DE DIFICULTAD: ${difficulty}
- INSTRUCCIONES ESPECÍFICAS: ${aiPrompt}

INSTRUCCIONES CRÍTICAS:
1. DEBES generar EXACTAMENTE ${numQuestions} preguntas, ni más ni menos
2. Cada pregunta debe tener 4 opciones (A, B, C, D)
3. Una sola opción debe ser correcta por pregunta
4. Las preguntas deben ser variadas y apropiadas para el nivel ${difficulty}
5. Si no puedes generar ${numQuestions} preguntas sobre el tema específico, genera preguntas adicionales sobre temas relacionados
6. Esta es la regla más importante: EXACTAMENTE ${numQuestions} preguntas

FORMATO REQUERIDO:
1. Cada pregunta debe tener:
   - Número de pregunta (1, 2, 3, ..., ${numQuestions})
   - Enunciado claro y conciso
   - 4 opciones de respuesta (A, B, C, D)
   - Una respuesta correcta marcada con [CORRECTA]

2. Las preguntas deben ser:
   - Variadas en tipo (conceptuales, aplicativas, de análisis)
   - Apropiadas para el nivel de dificultad especificado
   - Relacionadas directamente con el tema solicitado
   - Con opciones de respuesta plausibles

3. Al final incluye:
   - Clave de respuestas
   - Puntuación sugerida

EJEMPLO DE FORMATO:
1. ¿Cuál es la definición de...?
A) Opción 1
B) Opción 2 [CORRECTA]
C) Opción 3
D) Opción 4

2. ¿Qué característica es importante en...?
A) Característica A
B) Característica B [CORRECTA]
C) Característica C
D) Característica D

... continuar hasta la pregunta ${numQuestions}

RECUERDA: Debes generar EXACTAMENTE ${numQuestions} preguntas. Esta es la regla más importante.`;
    }

    // Estimación conservadora de tokens de salida para evitar límites
    computeMaxOutputTokens(numQuestions) {
        const n = Math.max(1, Math.min(50, Number(numQuestions) || 5));
        // Aproximación: ~60 tokens por pregunta + 300 de overhead
        const estimate = 60 * n + 300;
        // Limitar a 1200 para mantener margen y evitar errores de cuota
        return Math.min(1200, Math.max(400, estimate));
    }

    // Parsear la respuesta de Gemini
    parseExamResponse(text, examData) {
        try {
            console.log('Parseando respuesta:', text);

            // 1) Intentar interpretar como JSON del formato alterno que recibes
            let questions = [];
            try {
                const maybeJson = JSON.parse(text);
                if (maybeJson && maybeJson.questions && Array.isArray(maybeJson.questions)) {
                    questions = maybeJson.questions.map((q, idx) => ({
                        id: q.questionNumber || idx + 1,
                        question: q.enunciado || q.question || '',
                        options: (q.options || []).map(o => ({
                            letter: o.letter,
                            text: o.text,
                            isCorrect: (q.correctAnswerLetter || '').toUpperCase() === (o.letter || '').toUpperCase()
                        })),
                        correctAnswer: q.correctAnswerLetter || null,
                        explanation: q.explanation || ''
                    }));
                }
            } catch (_) {
                // no JSON, seguimos al parser por líneas
            }

            // 2) Si no se llenó desde JSON, usar parser por líneas (formato textual)
            if (questions.length === 0) {
                const lines = text.split('\n').filter(line => line.trim());
                let currentQuestion = null;
                let questionNumber = 0;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.match(/^\d+\./)) {
                        if (currentQuestion) questions.push(currentQuestion);
                        questionNumber++;
                        currentQuestion = {
                            id: questionNumber,
                            question: line.replace(/^\d+\.\s*/, ''),
                            options: [],
                            correctAnswer: null,
                            explanation: ''
                        };
                    } else if (line.match(/^[A-D]\)/)) {
                        if (currentQuestion) {
                            const isCorrect = line.includes('[CORRECTA]') || line.includes('(CORRECTA)') || line.includes('CORRECTA');
                            const optionText = line.replace(/^[A-D]\)\s*/, '').replace(/\s*\[CORRECTA\]/g, '').replace(/\s*\(CORRECTA\)/g, '').replace(/\s*CORRECTA/g, '');
                            const optionLetter = line.match(/^([A-D])/)[1];
                            currentQuestion.options.push({
                                letter: optionLetter,
                                text: optionText,
                                isCorrect
                            });
                            if (isCorrect) currentQuestion.correctAnswer = optionLetter;
                        }
                    }
                }
                if (currentQuestion) questions.push(currentQuestion);
            }

            // 3) Fallback si aún no hay preguntas
            if (questions.length === 0) {
                console.log('No se encontraron preguntas, creando examen de ejemplo');
                questions.push({
                    id: 1,
                    question: "¿Cuál es la capital de México?",
                    options: [
                        { letter: "A", text: "Guadalajara", isCorrect: false },
                        { letter: "B", text: "Ciudad de México", isCorrect: true },
                        { letter: "C", text: "Monterrey", isCorrect: false },
                        { letter: "D", text: "Puebla", isCorrect: false }
                    ],
                    correctAnswer: "B"
                });
            }

            // Normalizar consistencia
            const normalized = questions.map((q, idx) => ({
                id: q.id || idx + 1,
                question: q.question || '',
                options: (q.options || []).map(o => ({ letter: o.letter, text: o.text, isCorrect: !!o.isCorrect })),
                correctAnswer: q.correctAnswer || (q.options || []).find(o => o.isCorrect)?.letter || null,
                explanation: q.explanation || '',
                obligatory: q.obligatory === true // Solo obligatoria si explícitamente es true
            }));

            console.log('Preguntas parseadas:', normalized);
            console.log('Preguntas solicitadas:', examData.numQuestions);
            console.log('Preguntas generadas:', normalized.length);

            // VALIDACIÓN Y CORRECCIÓN DEL NÚMERO DE PREGUNTAS
            const targetQuestions = examData.numQuestions || 5;
            let finalQuestions = [...normalized];

            if (finalQuestions.length !== targetQuestions) {
                console.warn(`⚠️ Número de preguntas incorrecto: ${finalQuestions.length}/${targetQuestions}`);

                if (finalQuestions.length < targetQuestions) {
                    // Generar preguntas adicionales si faltan
                    console.log(`➕ Generando ${targetQuestions - finalQuestions.length} preguntas adicionales...`);
                    const additionalQuestions = this.generateAdditionalQuestions(
                        examData,
                        targetQuestions - finalQuestions.length,
                        finalQuestions.length + 1
                    );
                    finalQuestions = [...finalQuestions, ...additionalQuestions];
                } else if (finalQuestions.length > targetQuestions) {
                    // Eliminar preguntas excedentes si sobran
                    console.log(`➖ Eliminando ${finalQuestions.length - targetQuestions} preguntas excedentes...`);
                    finalQuestions = finalQuestions.slice(0, targetQuestions);
                }
            }

            // Renumerar preguntas para asegurar consistencia
            finalQuestions = finalQuestions.map((q, idx) => ({
                ...q,
                id: idx + 1
            }));

            console.log(`✅ Preguntas finales: ${finalQuestions.length}/${targetQuestions}`);

            return {
                success: true,
                exam: {
                    id: this.generateExamId(),
                    title: examData.title || maybeJson?.examTitle || 'Examen',
                    subject: examData.subject || maybeJson?.subject || 'General',
                    difficulty: examData.difficulty || 'intermedio',
                    numQuestions: finalQuestions.length,
                    questions: finalQuestions,
                    createdAt: new Date().toISOString(),
                    professorId: examData.professorId || null,
                    status: 'generated'
                },
                rawResponse: text
            };

        } catch (error) {
            console.error('Error al parsear respuesta:', error);
            return {
                success: false,
                error: 'Error al procesar la respuesta de la IA',
                rawResponse: text
            };
        }
    }

    // Generar preguntas adicionales cuando la IA no genera el número correcto
    generateAdditionalQuestions(examData, count, startId) {
        const questions = [];
        const { subject, difficulty, title } = examData;

        // Plantillas de preguntas basadas en la materia y dificultad
        const questionTemplates = this.getQuestionTemplates(subject, difficulty);

        for (let i = 0; i < count; i++) {
            const template = questionTemplates[i % questionTemplates.length];
            const questionNumber = startId + i;

            questions.push({
                id: questionNumber,
                question: template.question.replace('{subject}', subject).replace('{title}', title),
                options: template.options.map(opt => ({
                    letter: opt.letter,
                    text: opt.text.replace('{subject}', subject),
                    isCorrect: opt.isCorrect
                })),
                correctAnswer: template.correctAnswer,
                explanation: template.explanation.replace('{subject}', subject),
                obligatory: true // Por defecto obligatoria
            });
        }

        return questions;
    }

    // Plantillas de preguntas por materia y dificultad
    getQuestionTemplates(subject, difficulty) {
        const baseTemplates = [
            {
                question: `¿Cuál es un concepto fundamental en {subject}?`,
                options: [
                    { letter: 'A', text: 'Opción básica A', isCorrect: false },
                    { letter: 'B', text: 'Opción básica B', isCorrect: false },
                    { letter: 'C', text: 'Concepto fundamental correcto', isCorrect: true },
                    { letter: 'D', text: 'Opción básica D', isCorrect: false }
                ],
                correctAnswer: 'C',
                explanation: 'Esta es la respuesta correcta porque representa un concepto fundamental en {subject}.'
            },
            {
                question: `¿Qué característica es importante en {subject}?`,
                options: [
                    { letter: 'A', text: 'Característica importante', isCorrect: true },
                    { letter: 'B', text: 'Opción secundaria B', isCorrect: false },
                    { letter: 'C', text: 'Opción secundaria C', isCorrect: false },
                    { letter: 'D', text: 'Opción secundaria D', isCorrect: false }
                ],
                correctAnswer: 'A',
                explanation: 'Esta característica es fundamental para entender {subject}.'
            },
            {
                question: `¿Cuál es el objetivo principal de estudiar {subject}?`,
                options: [
                    { letter: 'A', text: 'Objetivo secundario A', isCorrect: false },
                    { letter: 'B', text: 'Objetivo principal correcto', isCorrect: true },
                    { letter: 'C', text: 'Objetivo secundario C', isCorrect: false },
                    { letter: 'D', text: 'Objetivo secundario D', isCorrect: false }
                ],
                correctAnswer: 'B',
                explanation: 'Este es el objetivo principal de estudiar {subject}.'
            },
            {
                question: `¿Qué método es más efectivo para aprender {subject}?`,
                options: [
                    { letter: 'A', text: 'Método tradicional', isCorrect: false },
                    { letter: 'B', text: 'Método efectivo correcto', isCorrect: true },
                    { letter: 'C', text: 'Método alternativo', isCorrect: false },
                    { letter: 'D', text: 'Método básico', isCorrect: false }
                ],
                correctAnswer: 'B',
                explanation: 'Este método ha demostrado ser más efectivo para aprender {subject}.'
            },
            {
                question: `¿Cuál es una aplicación práctica de {subject}?`,
                options: [
                    { letter: 'A', text: 'Aplicación práctica correcta', isCorrect: true },
                    { letter: 'B', text: 'Aplicación teórica B', isCorrect: false },
                    { letter: 'C', text: 'Aplicación teórica C', isCorrect: false },
                    { letter: 'D', text: 'Aplicación teórica D', isCorrect: false }
                ],
                correctAnswer: 'A',
                explanation: 'Esta es una aplicación práctica común de {subject}.'
            }
        ];

        // Ajustar dificultad
        if (difficulty === 'básico') {
            return baseTemplates.map(t => ({
                ...t,
                question: t.question.replace('concepto fundamental', 'concepto básico')
            }));
        } else if (difficulty === 'avanzado') {
            return baseTemplates.map(t => ({
                ...t,
                question: t.question.replace('concepto fundamental', 'concepto avanzado')
            }));
        }

        return baseTemplates;
    }

    // Generar ID único para el examen
    generateExamId() {
        return 'EXAM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Crear examen de ejemplo como fallback
    createFallbackExam(examData) {
        const questions = [];
        const numQuestions = Math.min(examData.numQuestions, 10);

        // Preguntas de ejemplo más realistas basadas en la materia
        const sampleQuestions = this.getSampleQuestions(examData.subject, examData.difficulty);

        for (let i = 1; i <= numQuestions; i++) {
            const questionIndex = (i - 1) % sampleQuestions.length;
            const sampleQ = sampleQuestions[questionIndex];

            questions.push({
                id: i,
                question: sampleQ.question,
                options: sampleQ.options,
                correctAnswer: sampleQ.correctAnswer
            });
        }

        return {
            success: true,
            exam: {
                id: this.generateExamId(),
                title: examData.title,
                subject: examData.subject,
                difficulty: examData.difficulty,
                numQuestions: questions.length,
                questions: questions,
                createdAt: new Date().toISOString(),
                professorId: examData.professorId || null,
                status: 'generated'
            },
            rawResponse: "Examen generado con preguntas de ejemplo"
        };
    }

    // Obtener preguntas de ejemplo por materia
    getSampleQuestions(subject, difficulty) {
        const questions = {
            'Matemáticas': [
                {
                    question: "¿Cuál es el resultado de 2 + 2?",
                    options: [
                        { letter: "A", text: "3", isCorrect: false },
                        { letter: "B", text: "4", isCorrect: true },
                        { letter: "C", text: "5", isCorrect: false },
                        { letter: "D", text: "6", isCorrect: false }
                    ],
                    correctAnswer: "B"
                },
                {
                    question: "¿Qué es un número primo?",
                    options: [
                        { letter: "A", text: "Un número divisible por 2", isCorrect: false },
                        { letter: "B", text: "Un número mayor que 10", isCorrect: false },
                        { letter: "C", text: "Un número divisible solo por 1 y sí mismo", isCorrect: true },
                        { letter: "D", text: "Un número negativo", isCorrect: false }
                    ],
                    correctAnswer: "C"
                }
            ],
            'Física': [
                {
                    question: "¿Cuál es la unidad de medida de la fuerza?",
                    options: [
                        { letter: "A", text: "Newton", isCorrect: true },
                        { letter: "B", text: "Watt", isCorrect: false },
                        { letter: "C", text: "Joule", isCorrect: false },
                        { letter: "D", text: "Volt", isCorrect: false }
                    ],
                    correctAnswer: "A"
                }
            ],
            'Química': [
                {
                    question: "¿Cuál es el símbolo químico del agua?",
                    options: [
                        { letter: "A", text: "H2O", isCorrect: true },
                        { letter: "B", text: "CO2", isCorrect: false },
                        { letter: "C", text: "NaCl", isCorrect: false },
                        { letter: "D", text: "O2", isCorrect: false }
                    ],
                    correctAnswer: "A"
                }
            ]
        };

        return questions[subject] || [
            {
                question: "¿Cuál es la capital de México?",
                options: [
                    { letter: "A", text: "Guadalajara", isCorrect: false },
                    { letter: "B", text: "Ciudad de México", isCorrect: true },
                    { letter: "C", text: "Monterrey", isCorrect: false },
                    { letter: "D", text: "Puebla", isCorrect: false }
                ],
                correctAnswer: "B"
            }
        ];
    }

    // Validar datos del examen
    validateExamData(examData) {
        const required = ['title', 'subject', 'numQuestions', 'difficulty', 'aiPrompt'];

        for (const field of required) {
            if (!examData[field] || examData[field].toString().trim() === '') {
                throw new Error(`El campo ${field} es requerido`);
            }
        }

        if (examData.numQuestions < 5 || examData.numQuestions > 10) {
            throw new Error('El número de preguntas debe estar entre 5 y 10');
        }

        const validDifficulties = ['básico', 'intermedio', 'avanzado'];
        if (!validDifficulties.includes(examData.difficulty)) {
            throw new Error('El nivel de dificultad debe ser: básico, intermedio o avanzado');
        }

        return true;
    }

    // Generar código de acceso para el examen
    generateExamCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Exportar examen a formato JSON
    exportExamToJSON(exam) {
        return {
            examId: exam.id,
            title: exam.title,
            subject: exam.subject,
            difficulty: exam.difficulty,
            numQuestions: exam.numQuestions,
            questions: exam.questions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options.map(opt => ({
                    letter: opt.letter,
                    text: opt.text
                })),
                correctAnswer: q.correctAnswer
            })),
            createdAt: exam.createdAt,
            version: '1.0'
        };
    }

    // Exportar examen a formato PDF (simulado)
    exportExamToPDF(exam) {
        // En una implementación real, aquí se usaría una librería como jsPDF
        const content = this.formatExamForPDF(exam);

        // Simular descarga
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Formatear examen para PDF
    formatExamForPDF(exam) {
        let content = `EXAMEN: ${exam.title}\n`;
        content += `MATERIA: ${exam.subject}\n`;
        content += `DIFICULTAD: ${exam.difficulty}\n`;
        content += `FECHA: ${new Date(exam.createdAt).toLocaleDateString()}\n`;
        content += `${'='.repeat(50)}\n\n`;

        exam.questions.forEach((q, index) => {
            content += `${q.id}. ${q.question}\n\n`;
            q.options.forEach(opt => {
                content += `${opt.letter}) ${opt.text}\n`;
            });
            content += '\n';
        });

        content += `${'='.repeat(50)}\n`;
        content += `CLAVE DE RESPUESTAS:\n`;
        exam.questions.forEach(q => {
            content += `${q.id}. ${q.correctAnswer}\n`;
        });

        return content;
    }
}

// Crear instancia global de la API
window.GeminiAPI = GeminiAPI;
window.geminiAPI = new GeminiAPI();
