// Vercel API function - Main handler
const fs = require('fs');
const path = require('path');
const { createExamXML, createAnswersXML } = require('../xml-utils');

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { method, url } = req;
    const urlPath = new URL(url, 'http://localhost').pathname;

    try {
        // Temp directory setup
        const TEMP_DIR = '/tmp';
        const EXAMS_DIR = path.join(TEMP_DIR, 'exams');
        const USERS_JSON = path.join(TEMP_DIR, 'users.json');
        const ANSWERS_DIR = path.join(TEMP_DIR, 'answers');
        
        // Ensure directories exist
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        if (!fs.existsSync(EXAMS_DIR)) fs.mkdirSync(EXAMS_DIR, { recursive: true });
        if (!fs.existsSync(ANSWERS_DIR)) fs.mkdirSync(ANSWERS_DIR, { recursive: true });
        if (!fs.existsSync(USERS_JSON)) fs.writeFileSync(USERS_JSON, JSON.stringify({ users: [] }, null, 2), 'utf8');

        // Route handlers
        if (method === 'POST' && urlPath === '/api/exam') {
            return handlePublishExam(req, res, EXAMS_DIR);
        }

        if (method === 'PUT' && urlPath === '/api/exam') {
            return handleUpdateExam(req, res, EXAMS_DIR);
        }

        if (method === 'GET' && urlPath.startsWith('/api/exam/code/') && urlPath.endsWith('/public')) {
            const code = urlPath.split('/')[4];
            return handleGetPublicExam(req, res, EXAMS_DIR, code);
        }

        if (method === 'POST' && urlPath.startsWith('/api/exam/code/') && urlPath.endsWith('/grade')) {
            const code = urlPath.split('/')[4];
            return handleGradeExam(req, res, EXAMS_DIR, ANSWERS_DIR, code);
        }

        if (method === 'DELETE' && urlPath.startsWith('/api/exam/code/')) {
            const code = urlPath.split('/')[4];
            return handleDeleteExam(req, res, EXAMS_DIR, code);
        }

        if (method === 'GET' && urlPath === '/api/exams/active/public') {
            return handleListExams(req, res, EXAMS_DIR);
        }

        if (method === 'GET' && urlPath === '/api/health') {
            return res.json({ status: 'ok', platform: 'vercel' });
        }

        // Users API
        if (method === 'GET' && urlPath === '/api/users') {
            try {
                const data = fs.existsSync(USERS_JSON) ? JSON.parse(fs.readFileSync(USERS_JSON, 'utf8')) : { users: [] };
                return res.json(data);
            } catch (e) {
                return res.status(500).json({ error: 'Error del servidor' });
            }
        }

        if (method === 'POST' && urlPath === '/api/users/register') {
            try {
                const { nombre, apellido, email, password, tipo_usuario, profesor_codigo } = req.body || {};
                if (!nombre || !apellido || !email || !password || !tipo_usuario) {
                    return res.status(400).json({ error: 'Datos incompletos' });
                }
                if (tipo_usuario === 'profesor') {
                    if ((profesor_codigo || '') !== 'telematica2025tesis') {
                        return res.status(400).json({ error: 'Código de docente inválido' });
                    }
                } else if (tipo_usuario === 'alumno') {
                    if (!/@ucol\.mx$/i.test(email)) {
                        return res.status(400).json({ error: 'El correo del alumno debe terminar en @ucol.mx' });
                    }
                }
                const store = fs.existsSync(USERS_JSON) ? JSON.parse(fs.readFileSync(USERS_JSON, 'utf8')) : { users: [] };
                if ((store.users || []).some(u => String(u.email).toLowerCase() === String(email).toLowerCase())) {
                    return res.status(409).json({ error: 'Email ya registrado' });
                }
                const user = { id: 'U_' + Date.now(), nombre, apellido, email, password, tipo_usuario, createdAt: new Date().toISOString(), active: true };
                store.users.push(user);
                fs.writeFileSync(USERS_JSON, JSON.stringify(store, null, 2), 'utf8');
                return res.json({ success: true, user: { id: user.id, nombre, apellido, email, tipo_usuario, createdAt: user.createdAt } });
            } catch (e) {
                return res.status(500).json({ error: 'Error del servidor' });
            }
        }

        if (method === 'DELETE' && urlPath.startsWith('/api/users/')) {
            try {
                const id = urlPath.split('/')[3];
                const store = fs.existsSync(USERS_JSON) ? JSON.parse(fs.readFileSync(USERS_JSON, 'utf8')) : { users: [] };
                const before = (store.users || []).length;
                store.users = (store.users || []).filter(u => String(u.id) !== String(id));
                if (store.users.length === before) return res.status(404).json({ error: 'Usuario no encontrado' });
                fs.writeFileSync(USERS_JSON, JSON.stringify(store, null, 2), 'utf8');
                return res.json({ success: true });
            } catch (e) {
                return res.status(500).json({ error: 'Error del servidor' });
            }
        }

        // Resetear sistema completo
        if (method === 'DELETE' && urlPath === '/api/system/reset') {
            return handleResetSystem(req, res, EXAMS_DIR, ANSWERS_DIR, USERS_JSON);
        }

        // Exams by professor
        if (method === 'GET' && urlPath.startsWith('/api/exams/by-professor/')) {
            const profId = urlPath.split('/')[4];
            return handleListExamsByProfessor(req, res, EXAMS_DIR, profId);
        }

        // Results list and detail
        if (method === 'GET' && urlPath.startsWith('/api/exam/code/') && urlPath.endsWith('/results')) {
            const code = urlPath.split('/')[4];
            return handleListResults(req, res, ANSWERS_DIR, code);
        }
        if (method === 'GET' && urlPath.startsWith('/api/exam/code/') && urlPath.includes('/results/')) {
            const parts = urlPath.split('/');
            const code = parts[4];
            const file = parts[6];
            return handleResultDetail(req, res, ANSWERS_DIR, code, file);
        }

        return res.status(404).json({ error: 'Endpoint not found' });

    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

function handlePublishExam(req, res, EXAMS_DIR) {
    const exam = req.body;
    if (!exam || !exam.title || !Array.isArray(exam.questions)) {
        return res.status(400).json({ error: 'Invalid exam payload' });
    }

    if (!exam.examCode || typeof exam.examCode !== 'string') {
        return res.status(400).json({ error: 'examCode is required to publish' });
    }

    // Clear previous exams
    try {
        if (fs.existsSync(EXAMS_DIR)) {
            for (const f of fs.readdirSync(EXAMS_DIR)) {
                try { fs.unlinkSync(path.join(EXAMS_DIR, f)); } catch (_) {}
            }
        }
    } catch (_) {}

    // Save exam
    const xml = createExamXML(exam);
    const codeBase = path.join(EXAMS_DIR, `${exam.examCode.toUpperCase()}`);
    fs.writeFileSync(`${codeBase}.xml`, xml, 'utf8');
    fs.writeFileSync(`${codeBase}.json`, JSON.stringify(exam, null, 2), 'utf8');

    return res.json({ success: true, message: 'Exam stored', code: exam.examCode.toUpperCase() });
}

function handleUpdateExam(req, res, EXAMS_DIR) {
    const exam = req.body;
    if (!exam || !exam.title || !Array.isArray(exam.questions)) {
        return res.status(400).json({ error: 'Invalid exam payload' });
    }

    if (!exam.examCode || typeof exam.examCode !== 'string') {
        return res.status(400).json({ error: 'examCode is required to update' });
    }

    if (!exam.status) exam.status = 'active';

    // Save/overwrite exam
    const xml = createExamXML(exam);
    const codeBase = path.join(EXAMS_DIR, `${exam.examCode.toUpperCase()}`);
    fs.writeFileSync(`${codeBase}.xml`, xml, 'utf8');
    fs.writeFileSync(`${codeBase}.json`, JSON.stringify(exam, null, 2), 'utf8');

    return res.json({ success: true, message: 'Exam updated', code: exam.examCode.toUpperCase() });
}

function handleGetPublicExam(req, res, EXAMS_DIR, code) {
    if (!code) {
        return res.status(400).json({ error: 'Code parameter required' });
    }

    const examCode = code.toUpperCase();
    const jsonPath = path.join(EXAMS_DIR, `${examCode}.json`);
    
    if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({ error: 'Código no encontrado' });
    }

    const exam = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const publicExam = {
        id: exam.id,
        examCode: exam.examCode || examCode,
        title: exam.title,
        subject: exam.subject,
        difficulty: exam.difficulty,
        numQuestions: exam.numQuestions,
        createdAt: exam.createdAt,
        status: 'active',
        questions: (exam.questions || []).map(q => ({
            id: q.id,
            question: q.question,
            options: (q.options || []).map(o => ({ letter: o.letter, text: o.text })),
        }))
    };

    return res.json(publicExam);
}

function handleGradeExam(req, res, EXAMS_DIR, ANSWERS_DIR, code) {
    if (!code) {
        return res.status(400).json({ error: 'Code parameter required' });
    }

    const { student, answers } = req.body || {};
    if (!student || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    const examCode = code.toUpperCase();
    const jsonPath = path.join(EXAMS_DIR, `${examCode}.json`);
    
    if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({ error: 'Código no encontrado' });
    }

    const exam = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const results = (exam.questions || []).map(q => {
        const ans = answers.find(a => Number(a.questionId) === Number(q.id));
        const correctLetter = q.correctAnswer || (q.options || []).find(o => o.isCorrect)?.letter || null;
        const isCorrect = (ans?.selected || '').toUpperCase() === (correctLetter || '').toUpperCase();
        return { questionId: q.id, correct: isCorrect, selected: ans?.selected || null, correctAnswer: correctLetter };
    });

    const total = results.length;
    const correctCount = results.filter(r => r.correct).length;

    // Persist submission
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileBase = path.join(ANSWERS_DIR, `answers-${examCode}-${timestamp}`);
    const submission = { code: examCode, student, answers, results, score: { correct: correctCount, total } };
    fs.writeFileSync(`${fileBase}.json`, JSON.stringify(submission, null, 2), 'utf8');
    fs.writeFileSync(`${fileBase}.xml`, createAnswersXML({ student, answers }), 'utf8');

    return res.json({ success: true, score: { correct: correctCount, total }, results });
}

function handleListExams(req, res, EXAMS_DIR) {
    if (!fs.existsSync(EXAMS_DIR)) {
        return res.json([]);
    }

    const files = fs.readdirSync(EXAMS_DIR).filter(f => f.toLowerCase().endsWith('.json'));
    const items = [];
    const seenCodes = new Set();

    for (const f of files) {
        try {
            const code = path.basename(f, path.extname(f)).toUpperCase();
            if (seenCodes.has(code)) continue;
            const exam = JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, f), 'utf8'));
            if (exam && (exam.status || 'active') === 'active') {
                items.push({
                    examCode: code,
                    id: exam.id,
                    title: exam.title,
                    subject: exam.subject,
                    difficulty: exam.difficulty,
                    numQuestions: exam.numQuestions,
                    createdAt: exam.createdAt
                });
                seenCodes.add(code);
            }
        } catch (_) { /* skip bad file */ }
    }

    return res.json(items);
}

function handleDeleteExam(req, res, EXAMS_DIR, code) {
    if (!code) {
        return res.status(400).json({ error: 'Code parameter required' });
    }

    const examCode = code.toUpperCase();
    const jsonPath = path.join(EXAMS_DIR, `${examCode}.json`);
    const xmlPath = path.join(EXAMS_DIR, `${examCode}.xml`);
    let deleted = false;
    try { if (fs.existsSync(jsonPath)) { fs.unlinkSync(jsonPath); deleted = true; } } catch (_) {}
    try { if (fs.existsSync(xmlPath)) { fs.unlinkSync(xmlPath); deleted = true; } } catch (_) {}
    if (!deleted) return res.status(404).json({ error: 'Código no encontrado' });
    return res.json({ success: true, message: 'Examen eliminado', code: examCode });
}

function handleListExamsByProfessor(req, res, EXAMS_DIR, profId) {
    try {
        if (!profId) return res.json([]);
        if (!fs.existsSync(EXAMS_DIR)) return res.json([]);
        const files = fs.readdirSync(EXAMS_DIR).filter(f => f.toLowerCase().endsWith('.json'));
        const items = [];
        for (const f of files) {
            try {
                const exam = JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, f), 'utf8'));
                if (String(exam.professorId || '') === String(profId)) {
                    items.push({
                        examCode: (exam.examCode || path.basename(f, path.extname(f))).toUpperCase(),
                        id: exam.id,
                        title: exam.title,
                        subject: exam.subject,
                        difficulty: exam.difficulty,
                        numQuestions: exam.numQuestions,
                        createdAt: exam.createdAt,
                        status: exam.status || 'active'
                    });
                }
            } catch (_) {}
        }
        return res.json(items);
    } catch (err) {
        return res.status(500).json({ error: 'Error del servidor' });
    }
}

function handleListResults(req, res, ANSWERS_DIR, code) {
    try {
        const examCode = (code || '').toUpperCase();
        if (!fs.existsSync(ANSWERS_DIR)) return res.json([]);
        const prefix = `answers-${examCode}-`;
        const items = [];
        for (const f of fs.readdirSync(ANSWERS_DIR)) {
            if (!f.endsWith('.json')) continue;
            if (!f.startsWith(prefix)) continue;
            try {
                const data = JSON.parse(fs.readFileSync(path.join(ANSWERS_DIR, f), 'utf8'));
                items.push({
                    file: f,
                    timestamp: f.replace(/^answers-[^-]+-/, '').replace(/\.json$/, '').replace(/-/g, ':'),
                    student: data.student || {},
                    score: data.score || null,
                    answersCount: Array.isArray(data.answers) ? data.answers.length : 0
                });
            } catch (_) {}
        }
        return res.json(items);
    } catch (err) {
        return res.status(500).json({ error: 'Error del servidor' });
    }
}

function handleResultDetail(req, res, ANSWERS_DIR, code, file) {
    try {
        const examCode = (code || '').toUpperCase();
        const filename = file.endsWith('.json') ? file : `${file}.json`;
        const full = path.join(ANSWERS_DIR, filename);
        if (!full.includes(`answers-${examCode}-`)) return res.status(400).json({ error: 'Archivo inválido' });
        if (!fs.existsSync(full)) return res.status(404).json({ error: 'No encontrado' });
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Error del servidor' });
    }
}

function handleResetSystem(req, res, EXAMS_DIR, ANSWERS_DIR, USERS_JSON) {
    try {
        // 1. Eliminar todos los archivos de exámenes
        if (fs.existsSync(EXAMS_DIR)) {
            const examFiles = fs.readdirSync(EXAMS_DIR);
            examFiles.forEach(file => {
                try {
                    fs.unlinkSync(path.join(EXAMS_DIR, file));
                } catch (err) {
                    console.error(`Error eliminando archivo de examen ${file}:`, err);
                }
            });
        }

        // 2. Eliminar todos los archivos de respuestas
        if (fs.existsSync(ANSWERS_DIR)) {
            const answerFiles = fs.readdirSync(ANSWERS_DIR);
            answerFiles.forEach(file => {
                try {
                    fs.unlinkSync(path.join(ANSWERS_DIR, file));
                } catch (err) {
                    console.error(`Error eliminando archivo de respuesta ${file}:`, err);
                }
            });
        }

        // 3. Resetear archivo de usuarios
        try {
            fs.writeFileSync(USERS_JSON, JSON.stringify({ users: [] }, null, 2), 'utf8');
        } catch (err) {
            console.error('Error reseteando usuarios:', err);
        }

        return res.json({ 
            success: true, 
            message: 'Sistema reseteado correctamente',
            deleted: {
                exams: 'todos',
                answers: 'todas',
                users: 'todos'
            }
        });
    } catch (err) {
        console.error('Error al resetear sistema:', err);
        return res.status(500).json({ error: 'Error del servidor al resetear sistema' });
    }
}


