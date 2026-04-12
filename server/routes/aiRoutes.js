import express from "express";
import { auth } from "../middleware/auth.js";
import { deleteCreation, generateArticle, generateBlogTitle, generateImage, removeImageBackground, removeImageObject, resumeReview } from "../controllers/aiController.js";
import { upload } from "../config/multer.js";
import { getUserCreations } from "../controllers/userController.js";




const aiRouter = express.Router();

aiRouter.post('/generate-article', auth, generateArticle)

aiRouter.post('/generate-blog-title', auth, generateBlogTitle)

aiRouter.post('/generate-image', auth, generateImage)

aiRouter.post('/remove-image-background', upload.single('image'), auth, removeImageBackground)

aiRouter.post('/remove-image-object', upload.single('image'), auth, removeImageObject)

aiRouter.post('/resume-review', auth, upload.single('resume'), resumeReview);

aiRouter.get('/get-user-creations', auth, getUserCreations)

aiRouter.post('/delete-creation', auth, deleteCreation);




export default aiRouter;