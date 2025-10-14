// Vercel API function for listing active exams
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
        // Temp directory setup
        const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'temp');
        const EXAMS_DIR = path.join(TEMP_DIR, 'exams');
        
        // Ensure directories exist
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        if (!fs.existsSync(EXAMS_DIR)) fs.mkdirSync(EXAMS_DIR, { recursive: true });

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
    } catch (err) {
        console.error('Error listing active exams:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
}
