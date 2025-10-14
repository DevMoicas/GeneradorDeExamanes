// Vercel API function for exam publishing
const fs = require('fs');
const path = require('path');
const { createExamXML } = require('../xml-utils');

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
        // Temp directory setup (usar /tmp en Vercel)
        const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'temp');
        const EXAMS_DIR = path.join(TEMP_DIR, 'exams');
        
        // Ensure directories exist
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        if (!fs.existsSync(EXAMS_DIR)) fs.mkdirSync(EXAMS_DIR, { recursive: true });

        const exam = req.body;
        if (!exam || !exam.title || !Array.isArray(exam.questions)) {
            return res.status(400).json({ error: 'Invalid exam payload' });
        }

        if (!exam.status) exam.status = 'active';
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
    } catch (err) {
        console.error('Error saving exam:', err);
        return res.status(500).json({ error: 'Failed to save exam' });
    }
}
