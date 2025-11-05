const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createExamXML, createAnswersXML, parseExamXMLToJson } = require('./xml-utils');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
// Serve static frontend files from project root
app.use(express.static(__dirname));

// Storage directory (Render-friendly). Use DATA_DIR if provided, else /tmp on Render, else local ./temp
const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? '/tmp/gex' : path.join(__dirname, 'temp'));
const TEMP_DIR = DATA_DIR;
const CURRENT_EXAM_XML = path.join(TEMP_DIR, 'current-exam.xml');
const CURRENT_EXAM_JSON = path.join(TEMP_DIR, 'current-exam.json');
const EXAMS_DIR = path.join(TEMP_DIR, 'exams');
const ANSWERS_DIR = path.join(TEMP_DIR, 'answers');
const USERS_JSON = path.join(TEMP_DIR, 'users.json');

function ensureDirs() {
    try { if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true }); } catch (_) {}
    try { if (!fs.existsSync(ANSWERS_DIR)) fs.mkdirSync(ANSWERS_DIR, { recursive: true }); } catch (_) {}
    try { if (!fs.existsSync(EXAMS_DIR)) fs.mkdirSync(EXAMS_DIR, { recursive: true }); } catch (_) {}
    try { if (!fs.existsSync(USERS_JSON)) fs.writeFileSync(USERS_JSON, JSON.stringify({ users: [] }, null, 2), 'utf8'); } catch (_) {}
}

ensureDirs();

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', platform: 'local' });
});

// Friendly root route
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    } catch (_) {}
    res.send('Servidor de exámenes activo. Abre /index.html para la app.');
});

// Update the current exam (overwrite temp and code files)
app.put('/exam', (req, res) => {
    try {
        const exam = req.body;
        if (!exam || !exam.title || !Array.isArray(exam.questions)) {
            return res.status(400).json({ error: 'Invalid exam payload' });
        }

        // examCode is required to know which exam file to overwrite
        if (!exam.examCode || typeof exam.examCode !== 'string') {
            return res.status(400).json({ error: 'examCode is required to update' });
        }

        // Keep status active by default
        if (!exam.status) exam.status = 'active';

        const xml = createExamXML(exam);

        // Overwrite current files
        fs.writeFileSync(CURRENT_EXAM_XML, xml, 'utf8');
        fs.writeFileSync(CURRENT_EXAM_JSON, JSON.stringify(exam, null, 2), 'utf8');

        // Overwrite by code
        const codeBase = path.join(EXAMS_DIR, `${exam.examCode.toUpperCase()}`);
        fs.writeFileSync(`${codeBase}.xml`, xml, 'utf8');
        fs.writeFileSync(`${codeBase}.json`, JSON.stringify(exam, null, 2), 'utf8');

        return res.json({ success: true, message: 'Exam updated', code: exam.examCode.toUpperCase() });
    } catch (err) {
        console.error('Error updating exam:', err);
        return res.status(500).json({ error: 'Failed to update exam' });
    }
});

// Publish or update the current exam
app.post('/exam', (req, res) => {
    try {
        const exam = req.body;
        if (!exam || !exam.title || !Array.isArray(exam.questions)) {
            return res.status(400).json({ error: 'Invalid exam payload' });
        }

        // Mark as active by default if not provided
        if (!exam.status) exam.status = 'active';

        // Require an examCode to persist by code
        if (!exam.examCode || typeof exam.examCode !== 'string') {
            return res.status(400).json({ error: 'examCode is required to publish' });
        }

        // Persist both XML and JSON (single-current policy)
        try {
            // Clear previous current exam files
            if (fs.existsSync(CURRENT_EXAM_XML)) fs.unlinkSync(CURRENT_EXAM_XML);
            if (fs.existsSync(CURRENT_EXAM_JSON)) fs.unlinkSync(CURRENT_EXAM_JSON);
        } catch (_) {}

        const xml = createExamXML(exam);
        fs.writeFileSync(CURRENT_EXAM_XML, xml, 'utf8');
        fs.writeFileSync(CURRENT_EXAM_JSON, JSON.stringify(exam, null, 2), 'utf8');

        // Also persist by code; keep history (do not clear folder)

        const codeBase = path.join(EXAMS_DIR, `${exam.examCode.toUpperCase()}`);
        fs.writeFileSync(`${codeBase}.xml`, xml, 'utf8');
        fs.writeFileSync(`${codeBase}.json`, JSON.stringify(exam, null, 2), 'utf8');

        return res.json({ success: true, message: 'Exam stored', path: 'temp/current-exam.xml', code: exam.examCode.toUpperCase() });
    } catch (err) {
        console.error('Error saving exam:', err);
        return res.status(500).json({ error: 'Failed to save exam' });
    }
});

// Get current exam as XML
app.get('/exam/current', (req, res) => {
    try {
        if (!fs.existsSync(CURRENT_EXAM_XML)) {
            return res.status(404).send('No hay examen publicado');
        }
        res.set('Content-Type', 'application/xml');
        const xml = fs.readFileSync(CURRENT_EXAM_XML, 'utf8');
        return res.send(xml);
    } catch (err) {
        console.error('Error reading exam XML:', err);
        return res.status(500).send('Error del servidor');
    }
});

// Get current exam as JSON (parsed from XML if JSON not present)
app.get('/exam/current/json', (req, res) => {
    try {
        if (fs.existsSync(CURRENT_EXAM_JSON)) {
            const json = JSON.parse(fs.readFileSync(CURRENT_EXAM_JSON, 'utf8'));
            return res.json(json);
        }
        if (fs.existsSync(CURRENT_EXAM_XML)) {
            const xml = fs.readFileSync(CURRENT_EXAM_XML, 'utf8');
            const json = parseExamXMLToJson(xml);
            return res.json(json);
        }
        return res.status(404).json({ error: 'No hay examen publicado' });
    } catch (err) {
        console.error('Error reading exam JSON:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Get exam by code (full JSON)
app.get('/exam/code/:code/json', (req, res) => {
    try {
        const code = (req.params.code || '').toUpperCase();
        const jsonPath = path.join(EXAMS_DIR, `${code}.json`);
        if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: 'Código no encontrado' });
        const exam = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        return res.json(exam);
    } catch (err) {
        console.error('Error reading exam by code:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Get exam by code for students (hide correctness flags)
app.get('/exam/code/:code/public', (req, res) => {
    try {
        const code = (req.params.code || '').toUpperCase();
        const jsonPath = path.join(EXAMS_DIR, `${code}.json`);
        if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: 'Código no encontrado' });
        const exam = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const publicExam = {
            id: exam.id,
            examCode: exam.examCode || code,
            title: exam.title,
            subject: exam.subject,
            difficulty: exam.difficulty,
            numQuestions: exam.numQuestions,
            createdAt: exam.createdAt,
            examConfig: exam.examConfig || { resultOnly: true, showExamAfter: false, showCorrectAnswers: false },
            status: 'active',
            questions: (exam.questions || []).map(q => ({
                id: q.id,
                question: q.question,
                options: (q.options || []).map(o => ({ letter: o.letter, text: o.text })),
            }))
        };
        return res.json(publicExam);
    } catch (err) {
        console.error('Error reading public exam by code:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// List active exams (public info) by scanning temp/exams
app.get('/exams/active/public', (req, res) => {
    try {
        if (!fs.existsSync(EXAMS_DIR)) return res.json([]);
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
    } catch (err) {
        console.error('Error listing active exams:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Delete exam by code
app.delete('/exam/code/:code', (req, res) => {
    try {
        const code = (req.params.code || '').toUpperCase();
        if (!code) return res.status(400).json({ error: 'Código requerido' });

        const jsonPath = path.join(EXAMS_DIR, `${code}.json`);
        const xmlPath = path.join(EXAMS_DIR, `${code}.xml`);
        let deleted = false;
        try { if (fs.existsSync(jsonPath)) { fs.unlinkSync(jsonPath); deleted = true; } } catch (_) {}
        try { if (fs.existsSync(xmlPath)) { fs.unlinkSync(xmlPath); deleted = true; } } catch (_) {}

        if (!deleted) return res.status(404).json({ error: 'Código no encontrado' });
        return res.json({ success: true, message: 'Examen eliminado', code });
    } catch (err) {
        console.error('Error deleting exam:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// List exams by professor id (full info summary)
app.get('/exams/by-professor/:profId', (req, res) => {
    try {
        const profId = String(req.params.profId || '');
        if (!fs.existsSync(EXAMS_DIR)) return res.json([]);
        const files = fs.readdirSync(EXAMS_DIR).filter(f => f.toLowerCase().endsWith('.json'));
        const items = [];
        for (const f of files) {
            try {
                const exam = JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, f), 'utf8'));
                if (String(exam.professorId || '') === profId) {
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
        console.error('Error listing by professor:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// List results (submissions) for exam code
app.get('/exam/code/:code/results', (req, res) => {
    try {
        const code = (req.params.code || '').toUpperCase();
        if (!fs.existsSync(ANSWERS_DIR)) return res.json([]);
        const prefix = `answers-${code}-`;
        const items = [];
        for (const f of fs.readdirSync(ANSWERS_DIR)) {
            if (!f.endsWith('.json')) continue;
            if (!f.startsWith(prefix)) continue;
            try {
                const data = JSON.parse(fs.readFileSync(path.join(ANSWERS_DIR, f), 'utf8'));
                items.push({
                    file: f,
                    timestamp: f.replace(/^answers-[^-]+-/, '').replace(/\.json$/,'').replace(/-/g, ':'),
                    student: data.student || {},
                    score: data.score || null,
                    answersCount: Array.isArray(data.answers) ? data.answers.length : 0
                });
            } catch (_) {}
        }
        return res.json(items.sort((a,b)=> (a.file<b.file?-1:1)));
    } catch (err) {
        console.error('Error listing results:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Get a specific submission detail for exam code
app.get('/exam/code/:code/results/:file', (req, res) => {
    try {
        const code = (req.params.code || '').toUpperCase();
        const fileParam = String(req.params.file || '');
        const filename = fileParam.endsWith('.json') ? fileParam : `${fileParam}.json`;
        const full = path.join(ANSWERS_DIR, filename);
        if (!full.includes(`answers-${code}-`)) return res.status(400).json({ error: 'Archivo inválido' });
        if (!fs.existsSync(full)) return res.status(404).json({ error: 'No encontrado' });
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        return res.json(data);
    } catch (err) {
        console.error('Error getting result detail:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Users API (JSON file storage)
app.get('/users', (req, res) => {
    try {
        if (!fs.existsSync(USERS_JSON)) {
            return res.json({ users: [] });
        }
        const data = JSON.parse(fs.readFileSync(USERS_JSON, 'utf8'));
        return res.json(data);
    } catch (err) {
        console.error('Error reading users:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/users/register', (req, res) => {
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
        const exists = (store.users || []).some(u => String(u.email).toLowerCase() === String(email).toLowerCase());
        if (exists) return res.status(409).json({ error: 'Email ya registrado' });

        const user = {
            id: 'U_' + Date.now(),
            nombre,
            apellido,
            email,
            password, // NOTE: for demo; in prod use hashing
            tipo_usuario,
            createdAt: new Date().toISOString(),
            active: true
        };
        store.users.push(user);
        fs.writeFileSync(USERS_JSON, JSON.stringify(store, null, 2), 'utf8');
        return res.json({ success: true, user: { id: user.id, nombre, apellido, email, tipo_usuario, createdAt: user.createdAt } });
    } catch (err) {
        console.error('Error registering user:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

app.delete('/users/:id', (req, res) => {
    try {
        const id = String(req.params.id || '');
        const store = fs.existsSync(USERS_JSON) ? JSON.parse(fs.readFileSync(USERS_JSON, 'utf8')) : { users: [] };
        const before = (store.users || []).length;
        store.users = (store.users || []).filter(u => String(u.id) !== id);
        if (store.users.length === before) return res.status(404).json({ error: 'Usuario no encontrado' });
        fs.writeFileSync(USERS_JSON, JSON.stringify(store, null, 2), 'utf8');
        return res.json({ success: true });
    } catch (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Grade student answers by exam code
app.post('/exam/code/:code/grade', (req, res) => {
    try {
        const code = (req.params.code || '').toUpperCase();
        const { student, answers } = req.body || {};
        if (!student || !Array.isArray(answers)) return res.status(400).json({ error: 'Invalid payload' });

        const jsonPath = path.join(EXAMS_DIR, `${code}.json`);
        if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: 'Código no encontrado' });
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
        const fileBase = path.join(ANSWERS_DIR, `answers-${code}-${timestamp}`);
        const submission = { code, student, answers, results, score: { correct: correctCount, total } };
        fs.writeFileSync(`${fileBase}.json`, JSON.stringify(submission, null, 2), 'utf8');
        fs.writeFileSync(`${fileBase}.xml`, createAnswersXML({ student, answers }), 'utf8');

        return res.json({ success: true, score: { correct: correctCount, total }, results });
    } catch (err) {
        console.error('Error grading answers:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Submit student answers
app.post('/exam/answers', (req, res) => {
    try {
        const { student, answers } = req.body || {};
        if (!student || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers payload' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileBase = path.join(ANSWERS_DIR, `answers-${timestamp}`);
        const xml = createAnswersXML({ student, answers });

        fs.writeFileSync(`${fileBase}.xml`, xml, 'utf8');
        fs.writeFileSync(`${fileBase}.json`, JSON.stringify({ student, answers }, null, 2), 'utf8');

        return res.json({ success: true, message: 'Answers stored', file: `temp/answers/answers-${timestamp}.xml` });
    } catch (err) {
        console.error('Error saving answers:', err);
        return res.status(500).json({ error: 'Failed to save answers' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de exámenes ejecutándose en puerto ${PORT}`);
    console.log(`📱 Accede a: http://localhost:${PORT}`);
    console.log(`🌐 En Vercel: https://tu-app.vercel.app`);
});

