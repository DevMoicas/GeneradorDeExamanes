const { create } = require('xmlbuilder2');
const { XMLParser } = require('fast-xml-parser');

function createExamXML(exam) {
    const root = {
        exam: {
            id: exam.id || '',
            title: exam.title,
            subject: exam.subject,
            difficulty: exam.difficulty,
            numQuestions: exam.numQuestions,
            createdAt: exam.createdAt || new Date().toISOString(),
            status: exam.status || 'active',
            questions: {
                question: exam.questions.map(q => ({
                    id: q.id,
                    text: q.question,
                    correctAnswer: q.correctAnswer,
                    options: {
                        option: q.options.map(opt => ({
                            letter: opt.letter,
                            text: opt.text,
                            isCorrect: opt.isCorrect ? 'true' : 'false'
                        }))
                    }
                }))
            }
        }
    };

    const doc = create({ version: '1.0', encoding: 'UTF-8' }, root);
    return doc.end({ prettyPrint: true });
}

function parseExamXMLToJson(xml) {
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
    const js = parser.parse(xml);
    const ex = js.exam;
    const normalizedQuestions = Array.isArray(ex.questions?.question) ? ex.questions.question : [ex.questions?.question].filter(Boolean);
    return {
        id: ex.id || undefined,
        title: ex.title,
        subject: ex.subject,
        difficulty: ex.difficulty,
        numQuestions: Number(ex.numQuestions) || (normalizedQuestions ? normalizedQuestions.length : 0),
        createdAt: ex.createdAt,
        status: ex.status,
        questions: (normalizedQuestions || []).map((q, idx) => {
            const opts = Array.isArray(q.options?.option) ? q.options.option : [q.options?.option].filter(Boolean);
            return {
                id: Number(q.id) || idx + 1,
                question: q.text,
                correctAnswer: q.correctAnswer,
                options: (opts || []).map(o => ({
                    letter: o.letter,
                    text: o.text,
                    isCorrect: String(o.isCorrect).toLowerCase() === 'true'
                }))
            };
        })
    };
}

function createAnswersXML(payload) {
    const root = {
        answers: {
            submittedAt: new Date().toISOString(),
            student: {
                name: payload.student?.name || '',
                id: payload.student?.id || ''
            },
            responses: {
                response: (payload.answers || []).map(a => ({
                    questionId: a.questionId,
                    selected: a.selected
                }))
            }
        }
    };
    const doc = create({ version: '1.0', encoding: 'UTF-8' }, root);
    return doc.end({ prettyPrint: true });
}

module.exports = { createExamXML, createAnswersXML, parseExamXMLToJson };



