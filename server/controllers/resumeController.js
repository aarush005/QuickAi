



// The controller only deals with HTTP: read the request, call the service, send the request
// Express 5 automatically passes any thrown error to our errorHandler, so no try/catch

import { success } from "zod";
import { review } from "../services/resumeService";

export const resumeReview = async (req, res) => {
    const { userId } = await req.auth();


    if(!req.file) {
        throw new AppError("No resume file uploaded.", 400);
    }

    const content = await review ({ file: req.file, userId, plan: req.plan});

    res.json({success: true, content});
}