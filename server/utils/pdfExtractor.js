import fs from "fs/promises";
import pdf from "./pdfParse.cjs"; //the small bridge file you already have
import { AppError } from "./AppError";

const MIN_CHARS = 50;      // less than this = probably a scanned/image-only PDF
const MAX_CHARS = 15000;   // cap what we send to the AI (control cost)

export const extractPdfText = async (filePath) =>{
    const buffer = await fs.readFile(filePath);

    // Every real PDF File starts with the characters "%PDF-".
    // The Browser's "this is a PDF" label can be faked, the file's own bytes cannot.
    if (buffer.subarray(0,5).toString() !== "%PDF-") {
        throw new AppError("This file is not a valid PDF.", 400);
    }

    let data;
    try {
        data = await pdf(buffer);
    } catch {
        throw new AppError(
            "We couldn't read this PDF. It may be corrupted or password-protected.",
            422
        );
    }

    const cleaned =  data.text
    .replace(/\n+/g, "\n")
    .replace(/\s+/g, " ")
    .trim();


    if( cleaned.length < MIN_CHARS) {
        throw new AppError(
            "We couldn't find readable text in this PDF. Scanned or image-only PDFs aren't support yet.",
            422
        );
    }

    return cleaned.slice(0, MAX_CHARS);
}; 

