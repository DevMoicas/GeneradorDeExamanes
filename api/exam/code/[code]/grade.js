// Vercel API function for grading exam answers
const fs = require('fs');
const path = require('path');
const { createAnswersXML } = require('../../../xml-utils');

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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Code parameter required' });
        }

        const { student, answers } = req.body || {};
        if (!student || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        // Temp directory setup
        const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'temp');
        const EXAMS_DIR = path.join(TEMP_DIR, 'exams');
        const ANSWERS_DIR = path.join(TEMP_DIR, 'answers');
        
        // Ensure directories exist
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        if (!fs.existsSync(EXAMS_DIR)) fs.mkdirSync(EXAMS_DIR, { recursive: true });
        if (!fs.existsSync(ANSWERS_DIR)) fs.mkdirSync(ANSWERS_DIR, { recursive: true });

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
    } catch (err) {
        console.error('Error grading answers:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
}
