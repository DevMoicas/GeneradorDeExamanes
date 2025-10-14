const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createExamXML, createAnswersXML, parseExamXMLToJson } = require('./xml-utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
// Serve static frontend files from project root
app.use(express.static(__dirname));

// Temp directory setup
const TEMP_DIR = path.join(__dirname, 'temp');
const CURRENT_EXAM_XML = path.join(TEMP_DIR, 'current-exam.xml');
const CURRENT_EXAM_JSON = path.join(TEMP_DIR, 'current-exam.json');
const EXAMS_DIR = path.join(TEMP_DIR, 'exams');
const ANSWERS_DIR = path.join(TEMP_DIR, 'answers');

function ensureDirs() {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);
    if (!fs.existsSync(ANSWERS_DIR)) fs.mkdirSync(ANSWERS_DIR);
    if (!fs.existsSync(EXAMS_DIR)) fs.mkdirSync(EXAMS_DIR);
}

ensureDirs();

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
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

// Publish or update the current exam (expects JSON exam structure similar to frontend)
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

        // Also persist by code; enforce only one active exam by clearing folder
        try {
            if (fs.existsSync(EXAMS_DIR)) {
                for (const f of fs.readdirSync(EXAMS_DIR)) {
                    try { fs.unlinkSync(path.join(EXAMS_DIR, f)); } catch (_) {}
                }
            }
        } catch (_) {}

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
    console.log(`🌐 En Railway: https://tu-app.railway.app`);
});


