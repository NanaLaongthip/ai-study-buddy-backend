const fs = require('fs').promises;
const pdfModule = require('pdf-parse');

/**
 * Extracts plain text content and metadata from a PDF file
 * Supports both pdf-parse v1 (function call) and v2 (class-based)
 * @param {string} filePath - Absolute or relative path to PDF file
 * @returns {Promise<{ text: string, numPages: number }>}
 */
async function extractTextFromPDF(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    let extractedText = '';
    let numPages = 1;

    // Detect pdf-parse v2 API (Class with getText)
    if (pdfModule.PDFParse && typeof pdfModule.PDFParse === 'function') {
      const parser = new pdfModule.PDFParse({ data: fileBuffer });
      const result = await parser.getText();
      extractedText = result.text || '';
      numPages = result.total || (result.pages ? result.pages.length : 1);
    } else if (typeof pdfModule === 'function') {
      // pdf-parse v1 API
      const result = await pdfModule(fileBuffer);
      extractedText = result.text || '';
      numPages = result.numpages || 1;
    } else {
      throw new Error('Unsupported pdf-parse library version or signature.');
    }

    const cleanedText = (extractedText || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!cleanedText || cleanedText.length === 0) {
      throw new Error('Unable to extract text from PDF. The document might be image-only (scanned) or empty.');
    }

    return {
      text: cleanedText,
      numPages,
    };
  } catch (error) {
    console.error('Error in extractTextFromPDF:', error.message);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

module.exports = {
  extractTextFromPDF,
};
