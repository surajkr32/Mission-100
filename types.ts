
export type Subject = 'Mathematics' | 'Science' | 'Social Science' | 'English' | 'Hindi';

export interface Question {
  id: string;
  text: string;
  marks: number;
  section: string;
  chapter?: string;
}

export interface QuestionSet {
  id: number;
  title: string;
  subject: Subject;
  questions: Question[];
  durationMinutes: number;
}

export interface StudentAnswer {
  questionId: string;
  answerText?: string;
  answerImage?: string; // base64 data
}

export interface EvaluationResult {
  questionId: string;
  score: number;
  feedback: string;
  correctAnswerSummary: string;
}

export interface TotalEvaluation {
  subject: Subject;
  setNumber: number;
  totalScore: number;
  maxScore: number;
  detailedResults: EvaluationResult[];
  overallFeedback: string;
  conciseSummary: string;
}

export interface Submission {
  id: string;
  studentName: string;
  subject: Subject;
  setNumber: number;
  score: number;
  maxScore: number;
  date: string;
  answers: StudentAnswer[];
}
