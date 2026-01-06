
import React, { useState, useEffect, useRef } from 'react';
import SplashScreen from './components/SplashScreen';
import { Subject, QuestionSet, StudentAnswer, TotalEvaluation, Submission } from './types';
import { SUBJECT_INFO, generateMockSets } from './constants';
import { evaluateAnswers } from './services/geminiService';
import { 
  ChevronRight, ArrowLeft, Send, Loader2, CheckCircle, Award, Clock, 
  AlertCircle, Zap, ListChecks, Save, Users, Trash2, Search, 
  DollarSign, User, Lock, Key, Camera, Image as ImageIcon, X, Download, Printer, Database
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
        console.warn("Draft too large for storage, only text might be saved.");
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
    if (confirm("Are you sure you want to remove this record?")) {
      const updated = submissions.filter(s => s.id !== id);
      setSubmissions(updated);
      localStorage.setItem('mission100_submissions', JSON.stringify(updated));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(submissions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `mission100_export_${new Date().toISOString()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
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
      setLoginError('Invalid credentials. Please try again.');
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
            {view === 'exam' && (
              <div className="flex items-center gap-4 mr-4">
                <div className="hidden sm:flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  <Save className="w-3 h-3" />
                  {lastSaved ? `Auto-saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Drafting...'}
                </div>
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
                Admin Panel
              </button>
            )}

            {view !== 'dashboard' && view !== 'splash' && (
              <button 
                onClick={() => {
                  if (view === 'result' || view === 'admin' || view === 'adminLogin') setView('dashboard');
                  else if (view === 'exam') {
                    if (confirm("Progress is auto-saved. Exit to selection?")) setView('setSelection');
                  }
                  else if (view === 'setSelection') setView('dashboard');
                }}
                className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold transition-colors text-sm uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                {['admin', 'adminLogin'].includes(view) ? 'Dashboard' : 'Exit'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* VIEW: ADMIN LOGIN */}
        {view === 'adminLogin' && (
          <div className="max-w-md mx-auto mt-12 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Lock className="w-32 h-32 text-slate-900" />
              </div>
              
              <div className="text-center mb-8">
                <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Secure Login</h2>
                <p className="text-slate-500 text-sm font-medium mt-2">Enter credentials to access admin features.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="mission100"
                      value={adminCredentials.username}
                      onChange={(e) => setAdminCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-600 outline-none font-bold transition-all bg-slate-50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={adminCredentials.password}
                      onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-600 outline-none font-bold transition-all bg-slate-50"
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {loginError}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-lg uppercase tracking-tight"
                >
                  UNLOCK ACCESS
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN PANEL */}
        {view === 'admin' && isAdminAuthenticated && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                  Student <span className="text-blue-600">Submissions</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-slate-500 font-medium text-sm uppercase tracking-widest">Live Production Database</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={exportData}
                  className="bg-white border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-600 p-6 rounded-3xl shadow-lg transition-all flex items-center gap-4 group"
                >
                  <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-black">Export Data</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">JSON format</div>
                  </div>
                </button>

                <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-xl shadow-emerald-500/20 flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black">₹{submissions.length * 49}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Est. Data Value</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                <Search className="w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by student name or subject..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-slate-700 font-medium placeholder:text-slate-300"
                />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <th className="px-8 py-4">Student</th>
                      <th className="px-8 py-4">Subject & Set</th>
                      <th className="px-8 py-4">Score</th>
                      <th className="px-8 py-4">Date</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {submissions
                      .filter(s => 
                        s.studentName.toLowerCase().includes(adminSearch.toLowerCase()) || 
                        s.subject.toLowerCase().includes(adminSearch.toLowerCase())
                      )
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="font-bold text-slate-900">{sub.studentName}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-black">ID: {sub.id.slice(0, 8)}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                               <span className={`w-2 h-2 rounded-full ${SUBJECT_INFO[sub.subject].color}`} />
                               <span className="font-bold text-slate-700">{sub.subject}</span>
                            </div>
                            <div className="text-xs font-medium text-slate-400">Set Paper #{sub.setNumber}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="font-black text-blue-600">{sub.score} <span className="text-slate-300">/ {sub.maxScore}</span></div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{Math.round((sub.score/sub.maxScore)*100)}% Accuracy</div>
                          </td>
                          <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                            {new Date(sub.date).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => deleteSubmission(sub.id)}
                              className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-slate-300">
                            <Database className="w-16 h-16 opacity-20" />
                            <p className="font-bold text-lg">No submissions yet.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight uppercase italic">The Road to <span className="text-blue-600">Full Marks</span></h1>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-10">Prepare with board-level precision. 15 focused sets per subject with instant AI evaluation.</p>
              
              {!studentName ? (
                <div className="max-w-md mx-auto bg-white p-8 rounded-[2rem] border-2 border-blue-100 shadow-xl shadow-blue-500/5">
                  <div className="flex items-center gap-3 mb-6 text-blue-600">
                    <User className="w-6 h-6" />
                    <h2 className="font-black text-xl tracking-tight uppercase">Identity Required</h2>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter your full name..."
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none text-lg font-bold transition-all mb-4"
                  />
                  <button 
                    onClick={saveName}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-all"
                  >
                    CONTINUE TO LIBRARY
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Learner:</span>
                    <span className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm">{studentName}</span>
                    <button onClick={() => setStudentName('')} className="text-blue-600 text-[10px] font-black hover:underline ml-1">CHANGE</button>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 ${!studentName ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
              {(Object.keys(SUBJECT_INFO) as Subject[]).map((subj) => (
                <div 
                  key={subj}
                  onClick={() => {
                    setSelectedSubject(subj);
                    setView('setSelection');
                  }}
                  className="group relative overflow-hidden bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer"
                >
                  <div className={`${SUBJECT_INFO[subj].color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:rotate-6 transition-transform shadow-lg shadow-blue-500/20`}>
                    {React.cloneElement(SUBJECT_INFO[subj].icon as React.ReactElement, { className: "w-8 h-8" })}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{subj}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{SUBJECT_INFO[subj].description}</p>
                  <div className="flex items-center justify-between">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">15 Sample Papers</span>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: SET SELECTION */}
        {view === 'setSelection' && selectedSubject && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4">
                  <span className={`p-3 rounded-2xl ${SUBJECT_INFO[selectedSubject].color} text-white shadow-xl`}>
                    {SUBJECT_INFO[selectedSubject].icon}
                  </span>
                  {selectedSubject} Library
                </h2>
                <p className="text-slate-500 mt-4 text-lg">Pick a paper and begin your timed practice session.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {generateMockSets(selectedSubject).map((set) => {
                const draft = localStorage.getItem(`draft_${selectedSubject}_${set.id}`);
                return (
                  <div
                    key={set.id}
                    className="group relative flex flex-col p-6 bg-white rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all text-left"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Set {set.id}</span>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {set.durationMinutes} min
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-6">{set.title}</h4>
                    
                    {draft ? (
                      <div className="mt-auto space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-wider mb-2">
                          <Save className="w-3 h-3" /> Draft Found
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => startExam(set, true)}
                            className="flex-1 bg-blue-600 text-white text-xs font-black py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                          >
                            RESUME
                          </button>
                          <button 
                            onClick={() => startExam(set, false)}
                            className="flex-1 bg-slate-100 text-slate-600 text-xs font-black py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
                          >
                            RESTART
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto">
                        <button 
                          onClick={() => startExam(set)}
                          className="w-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white text-xs font-black py-3 rounded-xl transition-all"
                        >
                          START EXAM
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: EXAM */}
        {view === 'exam' && selectedSet && (
          <div className="max-w-4xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-10 p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                 <div className="hidden md:flex bg-blue-50 w-20 h-20 rounded-3xl items-center justify-center text-blue-600">
                    <Award className="w-10 h-10" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedSet.title}</h2>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">{selectedSet.subject}</span>
                      <span className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> {formatTime(timeLeft)} remaining
                      </span>
                    </div>
                 </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isEvaluating}
                className="group flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-10 py-4 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                {isEvaluating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                {isEvaluating ? 'Evaluating...' : 'Finish Exam'}
              </button>
            </div>

            <div className="space-y-12">
              {selectedSet.questions.map((q, idx) => {
                const answer = answers.find(a => a.questionId === q.id);
                return (
                  <div key={q.id} className="group/q bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg">
                        {idx + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">{q.section}</span>
                          <div className="flex items-center gap-1.5 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-black border border-slate-100">
                             <Award className="w-3 h-3" /> {q.marks} MARKS
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 leading-tight">
                          {q.text}
                        </p>
                      </div>
                    </div>
                    
                    <div className="relative mb-6">
                      <textarea
                        placeholder="Type your answer here..."
                        value={answer?.answerText || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="w-full min-h-[200px] p-8 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-8 focus:ring-blue-100 rounded-[1.5rem] outline-none transition-all resize-y text-slate-800 text-xl font-medium leading-relaxed placeholder:text-slate-300 placeholder:italic shadow-inner"
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-6 py-3 rounded-2xl cursor-pointer transition-all border border-blue-200 shadow-sm">
                          <Camera className="w-5 h-5" />
                          <span className="font-black text-xs uppercase tracking-widest">Upload Handwritten Photo</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(q.id, e)}
                          />
                        </label>
                        <span className="text-[10px] font-bold text-slate-400 uppercase italic">Better for diagrams & long steps</span>
                      </div>

                      {answer?.answerImage && (
                        <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-300">
                           <div className="bg-white p-2 rounded-3xl border-4 border-blue-100 shadow-2xl overflow-hidden group">
                              <img src={answer.answerImage} alt="Answer upload" className="w-full h-auto rounded-2xl object-cover" />
                              <button 
                                onClick={() => removeImage(q.id)}
                                className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                              >
                                <X className="w-5 h-5" />
                              </button>
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-900/80 to-transparent p-4">
                                <span className="text-white text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                                  <ImageIcon className="w-3 h-3" /> Image Answer Attached
                                </span>
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 bg-blue-900 p-12 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent" />
               <h3 className="text-3xl font-black text-white mb-4 relative z-10">All Questions Answered?</h3>
               <p className="text-blue-200 mb-8 relative z-10 text-lg">Your Mission 100% depends on the quality of these answers. Submit for instant evaluation.</p>
               <button
                onClick={handleSubmit}
                disabled={isEvaluating}
                className="w-full max-sm:w-full max-w-sm mx-auto flex items-center justify-center gap-3 bg-white hover:bg-blue-50 text-blue-900 px-10 py-5 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 relative z-10"
              >
                {isEvaluating ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                {isEvaluating ? 'Processing Paper...' : 'SUBMIT NOW'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW: RESULT */}
        {view === 'result' && evaluation && (
          <div className="max-w-4xl mx-auto pb-32 animate-in fade-in zoom-in-95 duration-700">
             <div className="relative mb-16">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-400 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-8 border-slate-50 z-10 print:hidden">
                   <Award className="w-10 h-10 text-white" />
                </div>
                <div className="bg-white rounded-[3rem] pt-16 pb-12 px-8 shadow-2xl border border-slate-100 text-center print:shadow-none print:border-none print:pt-4">
                  <h2 className="text-5xl font-black text-slate-900 mb-2 italic tracking-tighter uppercase print:text-3xl">SCORE CARD</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-6">{studentName} | {evaluation.subject} - Paper {evaluation.setNumber}</p>
                  
                  <div className="flex flex-col md:flex-row items-center justify-center gap-12 print:gap-4">
                    <div className="flex flex-col items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">POINTS GAINED</span>
                       <div className="text-7xl font-black text-blue-600 tabular-nums print:text-5xl">
                         {evaluation.totalScore} <span className="text-3xl text-slate-300">/ {evaluation.maxScore}</span>
                       </div>
                    </div>
                    <div className="h-16 w-px bg-slate-100 hidden md:block print:hidden" />
                    <div className="flex flex-col items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">PERFORMANCE</span>
                       <div className="bg-blue-600 text-white px-8 py-4 rounded-[2rem] text-4xl font-black shadow-xl shadow-blue-500/30 print:shadow-none print:text-3xl print:bg-blue-700">
                          {Math.round((evaluation.totalScore / evaluation.maxScore) * 100)}%
                       </div>
                    </div>
                  </div>
                </div>
             </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-12 print:block print:space-y-6">
              <div className="bg-indigo-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group print:bg-slate-100 print:text-slate-900 print:shadow-none print:rounded-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform print:hidden">
                  <CheckCircle className="w-32 h-32 text-white" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white print:hidden">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider print:text-slate-900">EXAMINER'S VOICE</h3>
                </div>
                <p className="text-blue-100 text-lg font-medium leading-relaxed italic border-l-2 border-blue-500 pl-6 print:text-slate-700">
                  "{evaluation.overallFeedback}"
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden group print:shadow-none print:rounded-2xl print:border-slate-300">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform print:hidden">
                  <Zap className="w-32 h-32 text-blue-600" />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white print:hidden">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">QUICK SUMMARY & ACTION</h3>
                </div>
                <div className="prose prose-slate prose-sm text-slate-600 font-medium whitespace-pre-line leading-relaxed">
                  {evaluation.conciseSummary}
                </div>
              </div>
            </div>

            <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight uppercase italic underline decoration-blue-500 underline-offset-8 print:text-2xl print:mt-12">Step-by-Step Breakdown</h3>
            
            <div className="space-y-10 print:space-y-6">
              {evaluation.detailedResults.map((res, idx) => {
                const question = selectedSet?.questions.find(q => q.id === res.questionId);
                const answer = answers.find(a => a.questionId === res.questionId);
                
                return (
                  <div key={res.questionId} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow print:shadow-none print:border-slate-300 print:p-6 print:rounded-2xl break-inside-avoid">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 print:mb-4">
                      <div className="flex gap-6 print:gap-3">
                        <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 print:w-8 print:h-8 print:text-sm">{idx + 1}</div>
                        <div>
                          <p className="font-bold text-slate-900 text-2xl leading-tight print:text-lg">{question?.text}</p>
                          <div className="mt-2 text-xs font-black text-blue-600 uppercase tracking-widest">{question?.section}</div>
                        </div>
                      </div>
                      <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-2xl font-black text-xl shadow-inner border border-blue-100 shrink-0 print:px-3 print:py-1 print:text-sm">
                        {res.score} <span className="text-xs text-blue-300">/ {question?.marks}</span>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 print:block print:space-y-4">
                      <div className="space-y-6">
                        <div className="group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">YOUR RESPONSE</span>
                          <div className="text-slate-600 text-lg leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 italic shadow-inner group-hover:bg-white transition-colors overflow-hidden print:text-sm print:p-4">
                            {answer?.answerText || "No typed answer."}
                            {answer?.answerImage && (
                              <div className="mt-4 border-2 border-blue-100 rounded-xl overflow-hidden max-w-[200px] print:hidden">
                                <img src={answer.answerImage} alt="Submitted photo" className="w-full h-auto opacity-70" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 print:p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">FEEDBACK</span>
                          </div>
                          <p className="text-emerald-900 text-lg leading-relaxed font-medium print:text-sm">{res.feedback}</p>
                        </div>
                      </div>
                      <div className="h-full">
                        <div className="bg-blue-600 p-8 rounded-[2rem] border border-blue-500 h-full shadow-lg shadow-blue-500/20 print:bg-white print:text-blue-900 print:shadow-none print:border-blue-900 print:p-4 print:rounded-2xl">
                          <span className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em] mb-4 block print:text-blue-900">EXPERT IDEAL ANSWER</span>
                          <p className="text-white text-lg leading-relaxed font-medium print:text-sm print:text-blue-900">{res.correctAnswerSummary}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-6 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-3 bg-white border-2 border-slate-900 text-slate-900 px-12 py-5 rounded-[2rem] font-black text-xl tracking-tighter hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
              >
                <Printer className="w-6 h-6" />
                PRINT / SAVE REPORT
              </button>
              <button 
                onClick={resetToDashboard}
                className="bg-slate-900 hover:bg-black text-white px-16 py-6 rounded-[2rem] font-black text-xl tracking-tighter shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Mission Banner */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none print:hidden">
        <div className="bg-white/95 backdrop-blur shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-full px-8 py-4 border border-blue-100 flex items-center gap-4 animate-in slide-in-from-right-10 duration-500">
          <div className="relative">
             <div className="bg-blue-600 w-4 h-4 rounded-full animate-ping absolute inset-0" />
             <div className="bg-blue-600 w-4 h-4 rounded-full relative" />
          </div>
          <span className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">MISSION <span className="text-blue-600">100%</span> READY</span>
        </div>
      </div>
    </div>
  );
};

export default App;
