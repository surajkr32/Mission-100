
import { GoogleGenAI, Type } from "@google/genai";
import { Question, StudentAnswer, TotalEvaluation, Subject } from "../types";

export async function evaluateAnswers(
  subject: Subject,
  setNumber: number,
  questions: Question[],
  answers: StudentAnswer[]
): Promise<TotalEvaluation> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';

  // Constructing multimodal parts
  const parts: any[] = [
    {
      text: `You are an expert CBSE Class 10 examiner. Evaluate the following student answers for the ${subject} exam (Set ${setNumber}).
      
      For each question, the student has provided either a text response, an image of their handwritten answer, or both.
      Analyze the content thoroughly. If an image is provided, perform OCR and semantic analysis on the handwriting.
      
      For each question, provide:
      1. A score based on the marks allocated.
      2. Specific feedback on what was good and what was missing based on CBSE marking schemes.
      3. A summary of the ideal answer.
      
      In addition to detailed results, provide a "Concise Summary" that:
      - Lists the top 3 strengths in the student's performance.
      - Lists the top 3 areas needing immediate improvement.
      - Provides a one-sentence "Action Plan" for the next mock test.`
    }
  ];

  questions.forEach((q) => {
    const studentAns = answers.find(a => a.questionId === q.id);
    parts.push({
      text: `\n--- QUESTION DATA ---\nID: ${q.id}\nSection: ${q.section}\nQuestion: ${q.text}\nMax Marks: ${q.marks}\n`
    });

    if (studentAns?.answerText) {
      parts.push({ text: `Student's Typed Answer: ${studentAns.answerText}\n` });
    }

    if (studentAns?.answerImage) {
      // Expecting standard base64 data URL: data:image/png;base64,xxxx
      const base64Data = studentAns.answerImage.split(',')[1];
      const mimeType = studentAns.answerImage.split(';')[0].split(':')[1] || 'image/jpeg';
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
      parts.push({ text: `[Handwritten answer image provided for the question above]\n` });
    }

    if (!studentAns?.answerText && !studentAns?.answerImage) {
      parts.push({ text: `Student's Answer: No answer provided.\n` });
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
            conciseSummary: { 
              type: Type.STRING,
              description: "A bulleted, concise summary of strengths, weaknesses, and a one-sentence action plan."
            }
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
  } catch (error) {
    console.error("Evaluation failed:", error);
    throw new Error("Failed to evaluate your answers. Please ensure images are clear and try again.");
  }
}
