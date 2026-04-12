import { FileText, Sparkles } from "lucide-react";
import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { useRef } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const ReviewResume = () => {
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [resumeData, setResumeData] = useState(null);

  const { getToken } = useAuth();

  const resultRef = useRef();

  const generateDocx = async () => {
    if (!resumeData) return;

    const children = [];

    // Name
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.name || "",
            bold: true,
            size: 32,
          }),
        ],
      }),
    );

    // Contact
    children.push(
      new Paragraph(`${resumeData.email || ""} | ${resumeData.phone || ""}`),
    );

    children.push(new Paragraph(" "));

    // Dynamic sections
    resumeData.sections?.forEach((section) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
            }),
          ],
        }),
      );

      section.content.forEach((item) => {
        children.push(new Paragraph({
  text: item,
  bullet: { level: 0 },
}));
      });

      children.push(new Paragraph(" "));
    });

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "AI_Resume.docx");
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("resume", input);

      const { data } = await axios.post("/api/ai/resume-review", formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setAnalysis(data.content.analysis);
        setResumeData(data.content.resume);
      } else {
        toast.error(data.message || "Failed to review resume");
      }
    } catch (error) {
      // ✅ FIX: ‘data’ doesn’t exist here, use ‘error.response?.data’ safely
      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
      console.error("Resume review error:", error);
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
      {/* left col  */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200"
        action=""
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 text-[#00DA83]" />
          <h1 className="text-xl font-semibold">Resume Review</h1>
        </div>
        <p className="mt-6 text-sm font-medium">Upload Resume</p>

        <input
          onChange={(e) => setInput(e.target.files[0])}
          accept="application/pdf"
          type="file"
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-600"
          required
        />

        <p className="text-xs text-gray-500 font-light mt-1">
          Supports PDF resume only
        </p>

        <button className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#00DA83] to-[#009BB3] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer">
          {loading ? (
            <span className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></span>
          ) : (
            <FileText className="w-5" />
          )}
          Review Resume
        </button>
      </form>

      {/* Right col */}

      <div className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200 flex flex-col h-[600px]">
        {/* HEADER */}
        <div className="flex items-center justify-center mb-2">
          <h1 className="text-lg font-semibold text-center">
            {!analysis ? "Resume Analysis" : "Your Results"}
          </h1>
        </div>

        {/* CONTENT */}
        {!analysis ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm text-center">
            Upload your resume and click "Review Resume" to get ATS insights
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* ATS SCORE */}
            <div className="text-center">
              <p className="text-sm text-gray-500">ATS Score</p>
              <p className="text-2xl font-bold text-green-600">
                {analysis.score}/100
              </p>
            </div>

            {/* IMPROVEMENT POINTS */}
            <div>
              <h3 className="font-semibold mb-2">Improvements</h3>
              <ul className="list-disc ml-5 space-y-1 text-sm">
                {analysis.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* DOWNLOAD BUTTON */}
        {resumeData && (
          <button
            onClick={generateDocx}
            className="mt-3 bg-black text-white py-2 rounded-md text-sm"
          >
            Download Improved Resume
          </button>
        )}
      </div>
    </div>
  );
};
