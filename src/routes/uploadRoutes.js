const express = require('express');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const {
  handlePdfUpload,
  getDocumentById,
  listDocuments,
  deleteDocument,
  submitQuizResult,
} = require('../controllers/uploadController');

const router = express.Router();

// Middleware to accept either field name 'file' or 'pdf'
const pdfUploadMiddleware = (req, res, next) => {
  const singleUploader = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
  ]);

  singleUploader(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      });
    }

    // Normalize req.file from fields
    if (req.files) {
      if (req.files.file && req.files.file.length > 0) {
        req.file = req.files.file[0];
      } else if (req.files.pdf && req.files.pdf.length > 0) {
        req.file = req.files.pdf[0];
      }
    }

    next();
  });
};

/**
 * @route   POST /api/upload
 * @desc    Upload PDF slide, extract text, call LLM, and persist study bundle for user
 * @access  Protected
 */
router.post('/upload', authenticateToken, pdfUploadMiddleware, handlePdfUpload);

/**
 * @route   GET /api/documents
 * @desc    Get all processed documents for authenticated user
 * @access  Protected
 */
router.get('/documents', authenticateToken, listDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document details, summary, and flashcards by ID
 * @access  Protected
 */
router.get('/documents/:id', authenticateToken, getDocumentById);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document by ID
 * @access  Protected
 */
router.delete('/documents/:id', authenticateToken, deleteDocument);

/**
 * @route   POST /api/documents/:id/quiz
 * @desc    Submit user quiz answers, calculate score, record result, and generate recommended topics
 * @access  Protected
 */
router.post('/documents/:id/quiz', authenticateToken, submitQuizResult);

module.exports = router;
