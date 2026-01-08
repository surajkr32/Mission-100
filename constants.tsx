
import { Subject, QuestionSet, Question } from './types';
import { BookOpen, Calculator, Beaker, Globe, Languages } from 'lucide-react';
import React from 'react';

export const SUBJECT_INFO: Record<Subject, { icon: React.ReactNode, color: string, description: string }> = {
  'Mathematics': {
    icon: <Calculator className="w-6 h-6" />,
    color: 'bg-blue-600',
    description: 'Master Algebra, Geometry, and Trigonometry.'
  },
  'Science': {
    icon: <Beaker className="w-6 h-6" />,
    color: 'bg-emerald-600',
    description: 'Physics, Chemistry, and Biology fundamentals.'
  },
  'Social Science': {
    icon: <Globe className="w-6 h-6" />,
    color: 'bg-orange-600',
    description: 'History, Geography, Civics, and Economics.'
  },
  'English': {
    icon: <Languages className="w-6 h-6" />,
    color: 'bg-purple-600',
    description: 'Language, Literature, and Grammar.'
  },
  'Hindi': {
    icon: <BookOpen className="w-6 h-6" />,
    color: 'bg-red-600',
    description: 'Literature and Language Proficiency.'
  }
};

const getQuestionsForSubject = (subject: Subject, setId: number): Question[] => {
  // Logic to vary questions based on setId to ensure all 15 sets are unique
  const setSuffix = ` (Set ${setId})`;
  
  const mathQuestions: Question[] = [
    { id: `m1-s${setId}`, section: 'Section A', text: `If the HCF of 65 and 117 is expressible in the form 65m - 117, find the value of m${setSuffix}.`, marks: 2 },
    { id: `m2-s${setId}`, section: 'Section B', text: `Using Euclid's division lemma, show that the square of any positive integer is either of the form 3m or 3m + 1 for some integer m.`, marks: 3 },
    { id: `m3-s${setId}`, section: 'Section C', text: `The sum of the digits of a two-digit number is 9. Also, nine times this number is twice the number obtained by reversing the order of the digits. Find the number.`, marks: 5 }
  ];

  const scienceQuestions: Question[] = [
    { id: `s1-s${setId}`, section: 'Section A', text: `Why should a magnesium ribbon be cleaned before burning in air?${setSuffix}`, marks: 2 },
    { id: `s2-s${setId}`, section: 'Section B', text: `Explain the process of transport and exchange of oxygen and carbon dioxide in the human body.`, marks: 3 },
    { id: `s3-s${setId}`, section: 'Section C', text: `Draw a labeled diagram of a human eye. Explain the function of the Retina and the Ciliary muscles.`, marks: 5 }
  ];

  const sstQuestions: Question[] = [
    { id: `ss1-s${setId}`, section: 'Section A', text: `What was the main reason for the calling off of the Non-Cooperation Movement by Gandhiji?`, marks: 2 },
    { id: `ss2-s${setId}`, section: 'Section B', text: `Explain any three features of the 'Alluvial Soil' found in India.`, marks: 3 },
    { id: `ss3-s${setId}`, section: 'Section C', text: `Describe the role of political parties in a democratic country like India. Why are they necessary?`, marks: 5 }
  ];

  const englishQuestions: Question[] = [
    { id: `e1-s${setId}`, section: 'Reading', text: `Analyze the theme of 'Freedom' in the context of Nelson Mandela's 'Long Walk to Freedom'.`, marks: 2 },
    { id: `e2-s${setId}`, section: 'Writing', text: `You are the librarian of your school. Write a formal letter to a publisher placing an order for some storybooks and reference books.`, marks: 3 },
    { id: `e3-s${setId}`, section: 'Literature', text: `Compare and contrast the characters of Peggy and Maddie in 'The Hundred Dresses'. How did their attitude change towards Wanda Petronski?`, marks: 5 }
  ];

  const hindiQuestions: Question[] = [
    { id: `h1-s${setId}`, section: 'व्याकरण', text: `निम्नलिखित मुहावरे का अर्थ लिखकर वाक्य प्रयोग कीजिए: 'आसमान सिर पर उठाना'।`, marks: 2 },
    { id: `h2-s${setId}`, section: 'गद्य', text: `'बड़े भाई साहब' कहानी के आधार पर बताइए कि पढ़ाई के प्रति बड़े भाई का क्या दृष्टिकोण था?`, marks: 3 },
    { id: `h3-s${setId}`, section: 'लेखन', text: `'परोपकार' विषय पर लगभग 100-120 शब्दों में एक अनुच्छेद लिखिए।`, marks: 5 }
  ];

  switch(subject) {
    case 'Mathematics': return mathQuestions;
    case 'Science': return scienceQuestions;
    case 'Social Science': return sstQuestions;
    case 'English': return englishQuestions;
    case 'Hindi': return hindiQuestions;
    default: return [];
  }
};

export const generateMockSets = (subject: Subject): QuestionSet[] => {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    title: `${subject} - Board Practice Set ${i + 1}`,
    subject,
    questions: getQuestionsForSubject(subject, i + 1),
    durationMinutes: subject === 'Mathematics' || subject === 'Science' ? 180 : 120
  }));
};
