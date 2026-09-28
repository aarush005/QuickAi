import multer from "multer";


const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) =>{
    if (file.mimetype != "application/pdf") {
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only PDF files are allowed"));

    }
    cb(null,true);
};



export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 *1024
    }, // 5MB
})