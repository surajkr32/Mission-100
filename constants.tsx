
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
  const mathQuestions: Question[] = [
    { id: `m1-s${setId}`, section: 'Section A', text: 'If the HCF of 65 and 117 is expressible in the form 65m - 117, find m.', marks: 2 },
    { id: `m2-s${setId}`, section: 'Section B', text: 'Prove that √5 is an irrational number.', marks: 3 },
    { id: `m3-s${setId}`, section: 'Section C', text: 'Find the roots of the quadratic equation 2x² - 7x + 3 = 0 using the quadratic formula.', marks: 5 }
  ];

  const scienceQuestions: Question[] = [
    { id: `s1-s${setId}`, section: 'Section A', text: 'Define the term "Photolysis" with an example from chemical reactions.', marks: 2 },
    { id: `s2-s${setId}`, section: 'Section B', text: 'What is the role of acid in our stomach? How is the lining of the stomach protected from it?', marks: 3 },
    { id: `s3-s${setId}`, section: 'Section C', text: 'Describe the process of double circulation in human beings. Why is it necessary?', marks: 5 }
  ];

  const sstQuestions: Question[] = [
    { id: `ss1-s${setId}`, section: 'Section A', text: 'Explain the concept of "Resource Planning" in the Indian context.', marks: 2 },
    { id: `ss2-s${setId}`, section: 'Section B', text: 'Describe any three features of the Civil Code of 1804 (Napoleonic Code).', marks: 3 },
    { id: `ss3-s${setId}`, section: 'Section C', text: 'How do Multi-National Corporations (MNCs) interlink production across countries? Explain with examples.', marks: 5 }
  ];

  const englishQuestions: Question[] = [
    { id: `e1-s${setId}`, section: 'Reading', text: 'Read the poem "Fire and Ice" by Robert Frost. What do "Fire" and "Ice" symbolize in the context of human emotions?', marks: 2 },
    { id: `e2-s${setId}`, section: 'Writing', text: 'Write a letter to the Editor of a national daily complaining about the irregular supply of electricity in your locality.', marks: 3 },
    { id: `e3-s${setId}`, section: 'Literature', text: '"The postmaster was a fat, amiable fellow." Describe the postmaster\'s character in "A Letter to God" and his role in helping Lencho.', marks: 5 }
  ];

  const hindiQuestions: Question[] = [
    { id: `h1-s${setId}`, section: 'व्याकरण (Grammar)', text: 'निम्नलिखित वाक्यों को निर्देशानुसार बदलिए: "सूर्य निकला और अंधेरा भाग गया।" (सरल वाक्य में)', marks: 2 },
    { id: `h2-s${setId}`, section: 'गद्य (Prose)', text: 'लेखक ने "बड़े भाई साहब" कहानी में छोटे भाई की क्या विशेषताएँ बताई हैं?', marks: 3 },
    { id: `h3-s${setId}`, section: 'लेखन (Writing)', text: 'अपने मित्र को बोर्ड परीक्षा में प्रथम आने पर एक बधाई पत्र लिखिए।', marks: 5 }
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
    title: `${subject} - Practice Paper ${i + 1}`,
    subject,
    questions: getQuestionsForSubject(subject, i + 1),
    durationMinutes: subject === 'Mathematics' || subject === 'Science' ? 180 : 120
  }));
};
