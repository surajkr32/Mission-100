import { GoogleGenAI, Type } from "@google/genai";
import { Question, StudentAnswer, TotalEvaluation, Subject } from "../types";

export async function evaluateAnswers(
  subject: Subject,
  setNumber: number,
  questions: Question[],
  answers: StudentAnswer[]
): Promise<TotalEvaluation> {
  // Use process.env.API_KEY directly as required by guidelines
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API_KEY is not set in the environment. Please add it to your Netlify environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-pro-preview';

  const parts: any[] = [
    {
      text: `You are an official CBSE Class 10 Board Examiner for ${subject}. 
      Evaluate the following student answers for Practice Set #${setNumber}.
      
      CRITICAL INSTRUCTIONS:
      1. If the student has uploaded an image, use high-precision OCR to read the handwriting.
      2. Grade strictly according to CBSE marking schemes (step-marking for calculations).
      3. Provide a 'Correct Answer Summary' (Expert Ideal Answer) for every question to help the student learn.
      4. Ensure the JSON response strictly follows the schema.`
    }
  ];

  questions.forEach((q) => {
    const studentAns = answers.find(a => a.questionId === q.id);
    parts.push({
      text: `\n[QUESTION ID: ${q.id}]\nSection: ${q.section}\nQuestion: ${q.text}\nMax Marks: ${q.marks}\n`
    });

    if (studentAns?.answerText) {
      parts.push({ text: `Student's Text Answer: "${studentAns.answerText}"\n` });
    }

    if (studentAns?.answerImage) {
      const base64Data = studentAns.answerImage.split(',')[1];
      const mimeType = studentAns.answerImage.split(';')[0].split(':')[1] || 'image/jpeg';
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
      parts.push({ text: `[Image content attached above for question ${q.id}]\n` });
    }

    if (!studentAns?.answerText && !studentAns?.answerImage) {
      parts.push({ text: `Result: Question was not attempted.\n` });
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
    throw new Error("AI Evaluation failed: " + error.message);
  }
}