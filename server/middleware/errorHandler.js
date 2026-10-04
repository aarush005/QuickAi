import multer from "multer"
import { AppError} from "../utils/AppError.js"
import  {MAX_FILE_SIZE_MB} from "../config/multer.js"


//Express recognise an error-handling middleware by its FOUR parameter.
// It must be registered AFTER all routes (see server.js)

export const errorHandler = (err, req, res,next) =>{
    // 1. Error thrown by multer itself (e.g. file too large) 
    if(err instanceof multer.MulterError) {
        const message = 
        err.code === "LIMIT_FILE_SIZE"
        ? `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`
        :err.message;
        return res.status(400).json({ success: false, message });
    }


// 2. Errors we throw on purppse - safe to show the message to the user

if(err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message});

}



// 3. Anything else is a real bug. Log is for us, show a generic message to the user.

console.error("Unhandled error:", err);
res.status(500).json({
    success:false,
    message: "Somethingg went wrong. Please try again."
})

}