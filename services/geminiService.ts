
import { GoogleGenAI, Type } from "@google/genai";
import { Question, StudentAnswer, TotalEvaluation, Subject } from "../types";

export async function evaluateAnswers(
  subject: Subject,
  setNumber: number,
  questions: Question[],
  answers: StudentAnswer[]
): Promise<TotalEvaluation> {
  // Defensive check for various ways environment variables are injected
  const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : (window as any)._env_?.API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("Missing or Invalid API Key. Please add 'API_KEY' to your Netlify/Vercel Environment Variables. Note: You provided a Resend key, but this app requires a Google Gemini key (starting with AIza).");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-pro-preview';

  const parts: any[] = [
    {
      text: `You are an official CBSE Class 10 Board Examiner for ${subject}. 
      Evaluate the following student answers for Practice Set #${setNumber}.
      
      CRITICAL INSTRUCTIONS:
      1. Use high-precision OCR for images.
      2. Grade strictly by CBSE marking schemes.
      3. Provide 'Expert Ideal Answer' for every question.
      4. Format 'Concise Summary' with markdown headers for Strengths, Improvements, and Action Plan.`
    }
  ];

  questions.forEach((q) => {
    const studentAns = answers.find(a => a.questionId === q.id);
    parts.push({
      text: `\n[ID: ${q.id}] Section: ${q.section} | Question: ${q.text} | Marks: ${q.marks}\n`
    });

    if (studentAns?.answerText) {
      parts.push({ text: `Student's Text: "${studentAns.answerText}"\n` });
    }

    if (studentAns?.answerImage) {
      const base64Data = studentAns.answerImage.split(',')[1];
      const mimeType = studentAns.answerImage.split(';')[0].split(':')[1] || 'image/jpeg';
      parts.push({
        inlineData: { data: base64Data, mimeType }
      });
    }

    if (!studentAns?.answerText && !studentAns?.answerImage) {
      parts.push({ text: `Result: Not Attempted.\n` });
    }
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detailedResults: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionId: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  feedback: { type: Type.STRING },
                  correctAnswerSummary: { type: Type.STRING }
                },
                required: ["questionId", "score", "feedback", "correctAnswerSummary"]
              }
            },
            overallFeedback: { type: Type.STRING },
            totalScore: { type: Type.NUMBER },
            conciseSummary: { type: Type.STRING }
          },
          required: ["detailedResults", "overallFeedback", "totalScore", "conciseSummary"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const maxScore = questions.reduce((sum, q) => sum + q.marks, 0);

    return {
      subject,
      setNumber,
      totalScore: result.totalScore,
      maxScore,
      detailedResults: result.detailedResults,
      overallFeedback: result.overallFeedback,
      conciseSummary: result.conciseSummary
    };
  } catch (error: any) {
    console.error("Evaluation error:", error);
    throw new Error(error.message || "Failed to connect to AI Service.");
  }
}
