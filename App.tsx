
import React, { useState, useEffect, useRef } from 'react';
import SplashScreen from './components/SplashScreen';
import { Subject, QuestionSet, StudentAnswer, TotalEvaluation, Submission } from './types';
import { SUBJECT_INFO, generateMockSets } from './constants';
import { evaluateAnswers } from './services/geminiService';
import { 
  ChevronRight, ArrowLeft, Send, Loader2, CheckCircle, Award, Clock, 
  AlertCircle, Zap, ListChecks, Save, Users, Trash2, Search, 
  DollarSign, User, Lock, Key, Camera, Image as ImageIcon, X, Download, Database, ShieldAlert
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'splash' | 'dashboard' | 'setSelection' | 'exam' | 'result' | 'admin' | 'adminLogin'>('splash');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);
  const [studentName, setStudentName] = useState<string>(localStorage.getItem('student_name') || '');
  const [tempName, setTempName] = useState<string>('');
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [evaluation, setEvaluation] = useState<TotalEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  
  // Environment Check
  const [hasApiKey, setHasApiKey] = useState(true);
  useEffect(() => {
    const key = typeof process !== 'undefined' && process.env ? process.env.API_KEY : (window as any)._env_?.API_KEY;
    setHasApiKey(!!key && key !== "undefined");
  }, []);

  // Admin Auth State
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Timer State
  const timerRef = useRef<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Load Submissions on Init
  useEffect(() => {
    const saved = localStorage.getItem('mission100_submissions');
    if (saved) setSubmissions(JSON.parse(saved));
  }, []);

  // Auto-Save Effect
  useEffect(() => {
    if (view === 'exam' && selectedSet && answers.length > 0) {
      const draftKey = `draft_${selectedSet.subject}_${selectedSet.id}`;
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          answers,
          timeLeft,
          timestamp: new Date().toISOString()
        }));
        setLastSaved(new Date());
      } catch (e) {
        console.warn("Draft too large for local storage.");
      }
    }
  }, [answers, timeLeft, view, selectedSet]);

  // Timer Effect
  useEffect(() => {
    if (view === 'exam' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startExam = (set: QuestionSet, useDraft: boolean = false) => {
    if (!studentName.trim()) {
      alert("Please enter your name on the dashboard first!");
      setView('dashboard');
      return;
    }

    if (useDraft) {
      const draftKey = `draft_${set.subject}_${set.id}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setAnswers(parsedDraft.answers);
        setTimeLeft(parsedDraft.timeLeft);
        setSelectedSet(set);
        setView('exam');
        return;
      }
    }

    setSelectedSet(set);
    setAnswers([]);
    setTimeLeft(set.durationMinutes * 60);
    setView('exam');
  };

  const handleAnswerChange = (questionId: string, text: string) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, answerText: text } : a);
      }
      return [...prev, { questionId, answerText: text }];
    });
  };

  const handleImageUpload = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAnswers(prev => {
        const existing = prev.find(a => a.questionId === questionId);
        if (existing) {
          return prev.map(a => a.questionId === questionId ? { ...a, answerImage: base64 } : a);
        }
        return [...prev, { questionId, answerImage: base64 }];
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (questionId: string) => {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, answerImage: undefined } : a));
  };

  const handleSubmit = async () => {
    if (!selectedSet || !selectedSubject) return;
    if (isEvaluating) return;
    
    setIsEvaluating(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const result = await evaluateAnswers(
        selectedSubject,
        selectedSet.id,
        selectedSet.questions,
        answers
      );
      
      const id = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const newSubmission: Submission = {
        id,
        studentName: studentName || 'Anonymous Student',
        subject: selectedSubject,
        setNumber: selectedSet.id,
        score: result.totalScore,
        maxScore: result.maxScore,
        date: new Date().toISOString(),
        answers: answers
      };

      const updatedSubmissions = [newSubmission, ...submissions];
      setSubmissions(updatedSubmissions);
      localStorage.setItem('mission100_submissions', JSON.stringify(updatedSubmissions));
      localStorage.removeItem(`draft_${selectedSubject}_${selectedSet.id}`);
      
      setEvaluation(result);
      setView('result');
    } catch (err) {
      alert("Evaluation error: " + (err as Error).message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const deleteSubmission = (id: string) => {
    if (confirm("Are you sure?")) {
      const updated = submissions.filter(s => s.id !== id);
      setSubmissions(updated);
      localStorage.setItem('mission100_submissions', JSON.stringify(updated));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(submissions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `mission100_export_${Date.now()}.json`);
    linkElement.click();
  };

  const saveName = () => {
    if (tempName.trim()) {
      setStudentName(tempName);
      localStorage.setItem('student_name', tempName);
      setTempName('');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCredentials.username === 'mission100' && adminCredentials.password === '@#security') {
      setIsAdminAuthenticated(true);
      setView('admin');
      setLoginError('');
      setAdminCredentials({ username: '', password: '' });
    } else {
      setLoginError('Invalid credentials.');
    }
  };

  const resetToDashboard = () => {
    setView('dashboard');
    setSelectedSubject(null);
    setSelectedSet(null);
    setAnswers([]);
    setEvaluation(null);
    setIsAdminAuthenticated(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (view === 'splash') {
    return <SplashScreen onComplete={() => setView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={resetToDashboard}
          >
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-blue-200">
              <Award className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900 italic">MISSION <span className="text-blue-600">100%</span></span>
          </div>
          
          <div className="flex items-center gap-3">
            {!hasApiKey && (
              <div className="hidden lg:flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-red-100 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                No API Key
              </div>
            )}

            {view === 'exam' && (
              <div className="flex items-center gap-4 mr-4">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg border-2 ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <Clock className="w-5 h-5" />
                  {formatTime(timeLeft)}
                </div>
              </div>
            )}

            {view === 'dashboard' && (
              <button 
                onClick={() => setView('adminLogin')}
                className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg"
              >
                <Users className="w-4 h-4" />
                Admin
              </button>
            )}

            {view !== 'dashboard' && view !== 'splash' && (
              <button 
                onClick={() => {
                  if (view === 'result' || view === 'admin' || view === 'adminLogin') setView('dashboard');
                  else if (view === 'exam') {
                    if (confirm("Exit to selection? Draft is saved.")) setView('setSelection');
                  }
                  else if (view === 'setSelection') setView('dashboard');
                }}
                className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold transition-colors text-sm uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                Exit
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* ADMIN LOGIN */}
        {view === 'adminLogin' && (
          <div className="max-w-md mx-auto mt-12 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl">
              <div className="text-center mb-8">
                <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Secure Login</h2>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Username</label>
                  <input 
                    type="text" 
                    value={adminCredentials.username}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-600 outline-none font-bold bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Password</label>
                  <input 
                    type="password" 
                    value={adminCredentials.password}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-600 outline-none font-bold bg-slate-50"
                    required
                  />
                </div>
                {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
                <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-black transition-all">UNLOCK ACCESS</button>
              </form>
            </div>
          </div>
        )}

        {/* ADMIN PANEL */}
        {view === 'admin' && isAdminAuthenticated && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                  Student <span className="text-blue-600">Submissions</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">
                  API Status: <span className={hasApiKey ? "text-emerald-500" : "text-red-500"}>{hasApiKey ? "Connected" : "Key Missing"}</span>
                </p>
              </div>
              <button onClick={exportData} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">EXPORT DATA (JSON)</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                <Search className="w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter by name..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-slate-700 font-medium"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-4">Student</th>
                      <th className="px-8 py-4">Subject</th>
                      <th className="px-8 py-4">Score</th>
                      <th className="px-8 py-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {submissions.filter(s => s.studentName.toLowerCase().includes(adminSearch.toLowerCase())).map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6 font-bold text-slate-900">{sub.studentName}</td>
                        <td className="px-8 py-6 font-medium text-slate-700">{sub.subject} (Set {sub.setNumber})</td>
                        <td className="px-8 py-6 font-black text-blue-600">{sub.score}/{sub.maxScore}</td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => deleteSubmission(sub.id)} className="text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                        </td>
                      </tr>
                    ))}
                    {submissions.length === 0 && <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold">No submissions found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight uppercase italic">The Road to <span className="text-blue-600">Full Marks</span></h1>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-10">15 Board-level practice sets per subject. Instant AI Feedback.</p>
              
              {!studentName ? (
                <div className="max-w-md mx-auto bg-white p-8 rounded-[2rem] border-2 border-blue-100 shadow-xl">
                  <input 
                    type="text" 
                    placeholder="Enter your full name..."
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none text-lg font-bold mb-4"
                  />
                  <button onClick={saveName} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-blue-700">ENTER LIBRARY</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Signed in as</p>
                  <div className="flex items-center gap-3">
                    <span className="bg-white border px-4 py-2 rounded-full text-sm font-bold shadow-sm">{studentName}</span>
                    <button onClick={() => setStudentName('')} className="text-blue-600 text-xs font-black hover:underline">LOGOUT</button>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${!studentName ? 'opacity-30 pointer-events-none' : ''}`}>
              {(Object.keys(SUBJECT_INFO) as Subject[]).map((subj) => (
                <div 
                  key={subj}
                  onClick={() => { setSelectedSubject(subj); setView('setSelection'); }}
                  className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-2xl transition-all cursor-pointer"
                >
                  <div className={`${SUBJECT_INFO[subj].color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                    {SUBJECT_INFO[subj].icon}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{subj}</h3>
                  <p className="text-slate-500 text-sm mb-6">{SUBJECT_INFO[subj].description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">15 Paper Sets</span>
                    <ChevronRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SET SELECTION */}
        {view === 'setSelection' && selectedSubject && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-black mb-10 flex items-center gap-3">
              <span className={`p-2 rounded-xl ${SUBJECT_INFO[selectedSubject].color} text-white`}>{SUBJECT_INFO[selectedSubject].icon}</span>
              {selectedSubject} Sets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {generateMockSets(selectedSubject).map((set) => {
                const draft = localStorage.getItem(`draft_${selectedSubject}_${set.id}`);
                return (
                  <div key={set.id} className="p-6 bg-white rounded-3xl border border-slate-200 hover:shadow-xl transition-all">
                    <div className="flex justify-between mb-4"><span className="text-xs font-black text-blue-600 uppercase">SET {set.id}</span></div>
                    <h4 className="text-lg font-bold mb-6">{set.title}</h4>
                    {draft ? (
                      <div className="flex gap-2">
                        <button onClick={() => startExam(set, true)} className="flex-1 bg-blue-600 text-white text-xs font-black py-3 rounded-xl">RESUME</button>
                        <button onClick={() => startExam(set)} className="flex-1 bg-slate-100 text-slate-600 text-xs font-black py-3 rounded-xl">RESTART</button>
                      </div>
                    ) : (
                      <button onClick={() => startExam(set)} className="w-full bg-blue-50 text-blue-600 text-xs font-black py-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all">START</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EXAM VIEW */}
        {view === 'exam' && selectedSet && (
          <div className="max-w-4xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-10 p-8 bg-white rounded-[2.5rem] border shadow-xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">{selectedSet.title}</h2>
                <p className="text-sm font-bold text-blue-600">{formatTime(timeLeft)} left</p>
              </div>
              <button onClick={handleSubmit} disabled={isEvaluating} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-2">
                {isEvaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isEvaluating ? 'Checking...' : 'Finish'}
              </button>
            </div>

            <div className="space-y-10">
              {selectedSet.questions.map((q, idx) => {
                const answer = answers.find(a => a.questionId === q.id);
                return (
                  <div key={q.id} className="bg-white rounded-[2rem] p-8 border hover:border-blue-200 transition-colors">
                    <div className="flex gap-4 mb-6">
                      <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black">{idx + 1}</div>
                      <p className="text-xl font-bold pt-1">{q.text}</p>
                    </div>
                    <textarea 
                      value={answer?.answerText || ''} 
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Your answer here..."
                      className="w-full min-h-[150px] p-6 bg-slate-50 border rounded-2xl outline-none focus:border-blue-500 text-lg font-medium"
                    />
                    <div className="mt-4 flex items-center gap-4">
                      <label className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl cursor-pointer font-black text-xs">
                        <Camera className="w-4 h-4" /> PHOTO UPLOAD
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(q.id, e)} />
                      </label>
                      {answer?.answerImage && <span className="text-emerald-500 text-[10px] font-black uppercase">Image Attached</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RESULT VIEW */}
        {view === 'result' && evaluation && (
          <div className="max-w-4xl mx-auto pb-32 animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl text-center mb-10 print:shadow-none">
              <h2 className="text-4xl font-black mb-6">MISSION ACCOMPLISHED</h2>
              <div className="text-7xl font-black text-blue-600 mb-2">{evaluation.totalScore}/{evaluation.maxScore}</div>
              <p className="text-slate-400 font-bold uppercase tracking-widest">{Math.round((evaluation.totalScore/evaluation.maxScore)*100)}% Proficiency</p>
            </div>

            <div className="bg-indigo-900 text-white p-8 rounded-[2rem] mb-12">
              <h3 className="text-xs font-black uppercase mb-4 opacity-70">EXAMINER'S VOICE</h3>
              <p className="text-xl font-medium italic italic">"{evaluation.overallFeedback}"</p>
            </div>

            <div className="space-y-8">
              {evaluation.detailedResults.map((res, idx) => {
                const q = selectedSet?.questions.find(qu => qu.id === res.questionId);
                return (
                  <div key={idx} className="bg-white p-8 rounded-[2rem] border shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="text-lg font-bold w-3/4">{idx+1}. {q?.text}</h4>
                      <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-black">{res.score}/{q?.marks}</div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                        <span className="text-[10px] font-black text-emerald-600 uppercase block mb-2">FEEDBACK</span>
                        <p className="text-emerald-900 text-sm font-medium">{res.feedback}</p>
                      </div>
                      <div className="bg-blue-600 text-white p-6 rounded-2xl">
                        <span className="text-[10px] font-black opacity-70 uppercase block mb-2">IDEAL ANSWER</span>
                        <p className="text-white text-sm font-medium">{res.correctAnswerSummary}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-12 flex gap-4 justify-center print:hidden">
              <button onClick={() => window.print()} className="bg-white border-2 border-slate-900 px-8 py-4 rounded-2xl font-black">PRINT REPORT</button>
              <button onClick={resetToDashboard} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black">BACK TO LIBRARY</button>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 pointer-events-none print:hidden">
        <div className="bg-white shadow-xl rounded-full px-6 py-3 border border-blue-100 flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-xs font-black tracking-tight uppercase italic">MISSION <span className="text-blue-600">100%</span> READY</span>
        </div>
      </div>
    </div>
  );
};

export default App;
