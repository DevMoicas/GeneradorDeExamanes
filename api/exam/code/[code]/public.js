// Vercel API function for getting exam by code
const fs = require('fs');
const path = require('path');

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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Code parameter required' });
        }

        // Temp directory setup
        const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'temp');
        const EXAMS_DIR = path.join(TEMP_DIR, 'exams');
        
        // Ensure directories exist
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        if (!fs.existsSync(EXAMS_DIR)) fs.mkdirSync(EXAMS_DIR, { recursive: true });

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
    } catch (err) {
        console.error('Error reading public exam by code:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
}
