const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique, safe filename: timestamp-sanitizedName.pdf
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginalName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_\-\u0E00-\u0E7F]/g, '_'); // support Thai and alphanumeric
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}${ext}`);
  },
});

// File Filter: Strictly allow PDF files
const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF lecture slide files (.pdf) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

module.exports = upload;
