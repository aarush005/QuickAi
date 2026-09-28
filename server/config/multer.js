import multer from "multer";
import { AppError } from "../utils/AppError.js";

export const MAX_FILE_SIZE_MB = 5;

const storage = multer.diskStorage({});

// Used by the image routes (unchanged for now - we will harden it in a later lesson)
export const upload = multer({ storage });

// Used by the resume route: PDF only, 5MB max.
const pdfOnly = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new AppError("Only PDF files are allowed.", 400));
  }
  cb(null, true);
};

export const uploadPdf = multer({
  storage,
  fileFilter: pdfOnly,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});