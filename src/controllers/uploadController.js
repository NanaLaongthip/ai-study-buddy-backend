const path = require('path');
const prisma = require('../prisma');
const { extractTextFromPDF } = require('../services/pdfService');
const { processDocumentWithAI } = require('../services/aiService');

/**
 * Handle PDF file upload, AI extraction, and database persistence
 * Associated with req.user.id
 */
async function handlePdfUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์ PDF กรุณาเลือกไฟล์เอกสาร .pdf เพื่ออัปโหลด',
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อนทำการอัปโหลดเอกสาร',
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const documentTitle = req.body.title || path.basename(originalName, path.extname(originalName));

    console.log(`📄 [Upload] Processing file for user ${userId}: ${req.file.filename} ("${originalName}")`);

    // 1. Extract text from PDF
    const { text, numPages } = await extractTextFromPDF(filePath);
    console.log(`🔍 [PDF Extract] Extracted ${text.length} characters from ${numPages} page(s)`);

    // 2. Call AI Service to get structured study data in Thai
    console.log('🤖 [AI Service] Sending extracted text to LLM (Thai generation)...');
    const aiData = await processDocumentWithAI(text);
    const takeawaysCount = Array.isArray(aiData.key_takeaways)
      ? aiData.key_takeaways.length
      : (aiData.key_takeaways?.detailed_topics?.length || aiData.key_takeaways?.quick_bullets?.length || 0);
    console.log(`✨ [AI Service] Generated ${takeawaysCount} takeaways, ${aiData.flashcards.length} flashcards, ${aiData.quiz_questions.length} quiz questions`);

    // 3. Save to PostgreSQL via Prisma
    const savedDocument = await prisma.document.create({
      data: {
        title: documentTitle,
        filename: req.file.filename,
        userId,
        summary: {
          create: {
            keyTakeaways: aiData.key_takeaways,
            examFocus: aiData.exam_focus,
            quizQuestions: aiData.quiz_questions,
          },
        },
        flashcards: {
          create: aiData.flashcards.map((f) => ({
            frontText: f.front,
            backText: f.back,
          })),
        },
      },
      include: {
        summary: true,
        flashcards: true,
      },
    });

    console.log(`💾 [Prisma] Persisted Document (${savedDocument.id}) for User (${userId})`);

    // 4. Return structured data to client
    return res.status(201).json({
      success: true,
      message: 'อัปโหลดเอกสาร สกัดเนื้อหา และสร้างสื่อการเรียนรู้ภาษาไทยสำเร็จ',
      data: {
        document: {
          id: savedDocument.id,
          title: savedDocument.title,
          filename: savedDocument.filename,
          uploadDate: savedDocument.uploadDate,
          numPages,
        },
        summary: {
          id: savedDocument.summary.id,
          key_takeaways: savedDocument.summary.keyTakeaways,
          exam_focus: savedDocument.summary.examFocus,
        },
        flashcards: savedDocument.flashcards.map((fc) => ({
          id: fc.id,
          front: fc.frontText,
          back: fc.backText,
        })),
        quiz_questions: aiData.quiz_questions,
      },
    });
  } catch (error) {
    console.error('Error handling PDF upload:', error);
    next(error);
  }
}

/**
 * Retrieve document by ID with Summary and Flashcards (scoped to logged-in user)
 */
async function getDocumentById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId, // User isolation
      },
      include: {
        summary: true,
        flashcards: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบเอกสารนี้ หรือคุณไม่มีสิทธิ์เข้าถึงเอกสารนี้',
      });
    }

    return res.json({
      success: true,
      data: {
        document: {
          id: document.id,
          title: document.title,
          filename: document.filename,
          uploadDate: document.uploadDate,
        },
        summary: document.summary
          ? {
              id: document.summary.id,
              key_takeaways: document.summary.keyTakeaways,
              exam_focus: document.summary.examFocus,
            }
          : null,
        flashcards: (document.flashcards || []).map((fc) => ({
          id: fc.id,
          front: fc.frontText,
          back: fc.backText,
        })),
        quiz_questions: document.summary?.quizQuestions || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List documents for current authenticated user
 */
async function listDocuments(req, res, next) {
  try {
    const userId = req.user.id;
    console.log(`📋 [ListDocuments] Fetching docs for user ${userId} (${req.user.email})`);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const documents = await prisma.document.findMany({
      where: { userId }, // Scoped to current user
      orderBy: { uploadDate: 'desc' },
      include: {
        summary: {
          select: { id: true },
        },
        _count: {
          select: { flashcards: true },
        },
      },
    });

    console.log(`📋 [ListDocuments] Found ${documents.length} doc(s) for user ${req.user.email}`);

    return res.json({
      success: true,
      data: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        uploadDate: doc.uploadDate,
        hasSummary: !!doc.summary,
        flashcardsCount: doc._count.flashcards,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a document and its associated data
 */
async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const doc = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบเอกสารที่ต้องการลบ',
      });
    }

    await prisma.document.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'ลบเอกสารเรียบร้อยแล้ว',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit Quiz Results, analyze weak topics, and generate recommended study areas in Thai
 */
async function submitQuizResult(req, res, next) {
  try {
    const { id: documentId } = req.params;
    const { answers = {} } = req.body;
    const userId = req.user.id;

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: { summary: true },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบเอกสารนี้ในบัญชีของคุณ',
      });
    }

    const quizQuestions = (document.summary && Array.isArray(document.summary.quizQuestions))
      ? document.summary.quizQuestions
      : [];

    const totalQuestions = quizQuestions.length;
    let score = 0;
    const missedQuestions = [];

    quizQuestions.forEach((q, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = userAnswer && userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();

      if (isCorrect) {
        score += 1;
      } else {
        missedQuestions.push({
          questionIndex: idx + 1,
          question: q.question,
          userAnswer: userAnswer || 'ไม่ได้ตอบคำถาม',
          correctAnswer: q.answer,
          explanation: q.explanation || 'ควรทบทวนแนวคิดสำคัญของหัวข้อนี้เพิ่มเติมเพื่อความแม่นยำ',
        });
      }
    });

    // Derive weak topics based on wrong answers in Thai
    const weakTopics = missedQuestions.map((mq) => ({
      topic: mq.question.length > 80 ? mq.question.slice(0, 80) + '...' : mq.question,
      recommendation: mq.explanation,
    }));

    // Recommendations list in Thai
    const recommendedStudyTopics = missedQuestions.length > 0
      ? missedQuestions.map((mq) => `ทบทวน: ${mq.question} (คำตอบที่ถูกต้อง: ${mq.correctAnswer})`)
      : ['ยอดเยี่ยมมาก! คุณตอบคำถามได้ถูกต้องครบทุกข้อ มีความเข้าใจเนื้อหาบทเรียนเป็นอย่างดี'];

    // Save into PostgreSQL via Prisma QuizResult model
    const savedResult = await prisma.quizResult.create({
      data: {
        score,
        totalQuestions,
        weakTopics: weakTopics,
        documentId,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'ประเมินผลคะแนนและวิเคราะห์จุดที่ควรทบทวนเรียบร้อยแล้ว',
      data: {
        id: savedResult.id,
        score,
        totalQuestions,
        percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
        weakTopics,
        recommendedStudyTopics,
        missedQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handlePdfUpload,
  getDocumentById,
  listDocuments,
  deleteDocument,
  submitQuizResult,
};
