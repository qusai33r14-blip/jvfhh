
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, CheckCircle, XCircle, LayoutDashboard, Plus, Trash2, 
  Search, Award, LogOut, Bell, Menu, X, History, 
  ChevronLeft, Lock, BarChart3, PieChart, Sparkles, 
  CalendarDays, ChevronRight, UserPlus, Info, Zap, Activity, Crown,
  BookOpen, Heart, ArrowRight, UserCheck, ShieldCheck, Home, 
  Calendar, Timer, Star, TrendingUp, Medal, Target, AlertCircle, Clock, 
  UserCircle, Settings, Save, Unlock, List, CheckSquare, RotateCcw, UserMinus,
  LayoutGrid, Book, KeyRound, Building2
} from 'lucide-react';
import { 
  Student, AttendanceRecord, SlotType, SLOT_LABELS, SESSION_SLOTS, PRAYER_SLOTS,
  GROUPS, AttendanceStatus, STATUS_LABELS 
} from './types.ts';
import { getAttendanceInsights } from './services/geminiService.ts';

const MONTHS = [
  { id: 1, name: 'يناير' },
  { id: 2, name: 'فبراير' },
  { id: 3, name: 'مارس' },
  { id: 4, name: 'أبريل' },
  { id: 5, name: 'مايو' },
  { id: 6, name: 'يونيو' },
  { id: 7, name: 'يوليو' },
];

const App: React.FC = () => {
  // Authentication & Supervisor Data
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('siraj_auth') === 'true');
  const [supervisor, setSupervisor] = useState(() => {
    const saved = localStorage.getItem('siraj_supervisor');
    return saved ? JSON.parse(saved) : { name: "", title: "مشرف تربوي", mosque: "" };
  });
  const [passwordInput, setPasswordInput] = useState('');
  
  // Data State
  const [students, setStudents] = useState<Student[]>(() => JSON.parse(localStorage.getItem('siraj_v2_students') || '[]'));
  const [records, setRecords] = useState<AttendanceRecord[]>(() => JSON.parse(localStorage.getItem('siraj_v2_records') || '[]'));

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<'home' | 'class-attendance' | 'prayer-attendance' | 'stats' | 'profile'>('home');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [statSearch, setStatSearch] = useState('');
  
  const currentRealMonth = new Date().getMonth() + 1;
  const [selectedViewMonth, setSelectedViewMonth] = useState(currentRealMonth <= 7 ? currentRealMonth : 1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('SAT_DAWN');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Gemini Insights
  const [insights, setInsights] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Lock Mechanism
  const [isDayUnlocked, setIsDayUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');

  // Persistence
  useEffect(() => {
    localStorage.setItem('siraj_v2_students', JSON.stringify(students));
    localStorage.setItem('siraj_v2_records', JSON.stringify(records));
    localStorage.setItem('siraj_auth', isAuthenticated ? 'true' : 'false');
    localStorage.setItem('siraj_supervisor', JSON.stringify(supervisor));
  }, [students, records, isAuthenticated, supervisor]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Read-only check for past months
  const isReadOnly = useMemo(() => selectedViewMonth < currentRealMonth, [selectedViewMonth, currentRealMonth]);

  // Day restriction logic for class-attendance
  const isSlotValidForDay = useMemo(() => {
    const date = new Date(selectedDate);
    const day = date.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    
    if (SESSION_SLOTS.includes(selectedSlot)) {
      if (selectedSlot === 'SAT_DAWN' || selectedSlot === 'SAT_ASR') {
        return day === 6; // Saturday
      }
      if (selectedSlot === 'WED_MAGHRIB') {
        return day === 3; // Wednesday
      }
      return false;
    }
    return true; // Prayers are always valid
  }, [selectedDate, selectedSlot]);

  // Overall check if editing is permitted
  const canEdit = useMemo(() => {
    if (isReadOnly) return false;
    // For classes, if day is wrong and not manually unlocked, deny editing
    if (activeTab === 'class-attendance' && !isSlotValidForDay && !isDayUnlocked) return false;
    return true;
  }, [isReadOnly, activeTab, isSlotValidForDay, isDayUnlocked]);

  // --- Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '09528863') {
      setIsAuthenticated(true);
      setPasswordInput('');
      setFeedback({ message: `مرحباً بك في نظام سراج الذكي`, type: 'success' });
    } else {
      setFeedback({ message: 'الرمز السري غير صحيح', type: 'error' });
    }
  };

  const handleDayUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPassword === '0785150356') {
      setIsDayUnlocked(true);
      setUnlockPassword('');
      setFeedback({ message: 'تم فتح قفل التحضير لهذا اليوم استثنائياً', type: 'success' });
    } else {
      setFeedback({ message: 'رمز الفك غير صحيح', type: 'error' });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisor.name || !supervisor.mosque) {
      setFeedback({ message: 'يجب كتابة اسمك واسم المسجد المسؤول عنه', type: 'error' });
      return;
    }
    localStorage.setItem('siraj_supervisor', JSON.stringify(supervisor));
    setFeedback({ message: 'تم حفظ بيانات الإدارة بنجاح', type: 'success' });
    setTimeout(() => setActiveTab('home'), 500);
  };

  const setStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    if (!canEdit) {
      setFeedback({ message: 'النظام مقفل. يرجى إدخال رمز الفك للتعديل في غير الأيام المخصصة.', type: 'error' });
      return;
    }
    setRecords(prev => {
      const idx = prev.findIndex(r => r.studentId === studentId && r.date === selectedDate && r.slot === selectedSlot);
      const updated = [...prev];
      const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

      if (idx > -1) {
        if (updated[idx].status === status) {
          updated.splice(idx, 1);
        } else {
          updated[idx].status = status;
        }
      } else {
        updated.push({ studentId, date: selectedDate, slot: selectedSlot, status, checkInTime: nowTime });
      }
      return updated;
    });
  }, [selectedDate, selectedSlot, canEdit]);

  const markAllAsPresent = () => {
    if (!canEdit) return;
    const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    setRecords(prev => {
      const filtered = prev.filter(r => !(r.date === selectedDate && r.slot === selectedSlot));
      const newBatch = students.map(s => ({
        studentId: s.id,
        date: selectedDate,
        slot: selectedSlot,
        status: 'present' as AttendanceStatus,
        checkInTime: nowTime
      }));
      return [...filtered, ...newBatch];
    });
    setFeedback({ message: 'تم تحضير جميع الطلاب', type: 'success' });
  };

  const markAllAsAbsent = () => {
    if (!canEdit) return;
    const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    setRecords(prev => {
      const filtered = prev.filter(r => !(r.date === selectedDate && r.slot === selectedSlot));
      const newBatch = students.map(s => ({
        studentId: s.id,
        date: selectedDate,
        slot: selectedSlot,
        status: 'absent' as AttendanceStatus,
        checkInTime: nowTime
      }));
      return [...filtered, ...newBatch];
    });
    setFeedback({ message: 'تم تسجيل غياب الجميع', type: 'success' });
  };

  const addStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const name = (f.get('name') as string).trim();
    const group = (f.get('group') as string);
    if (!name) return;

    if (students.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setFeedback({ message: 'هذا الطالب مسجل مسبقاً', type: 'error' });
      return;
    }

    setStudents(prev => [...prev, { id: Date.now().toString(), name, group, joinedDate: new Date().toISOString() }]);
    (e.currentTarget as HTMLFormElement).reset();
    setFeedback({ message: 'تمت إضافة الطالب بنجاح', type: 'success' });
  };

  const currentSlotRecords = useMemo(() => {
    return records.filter(r => r.date === selectedDate && r.slot === selectedSlot);
  }, [records, selectedDate, selectedSlot]);

  const monthlyRecs = useMemo(() => {
    return records.filter(r => (new Date(r.date).getMonth() + 1) === selectedViewMonth);
  }, [records, selectedViewMonth]);

  const studentStats = useMemo(() => {
    return students.map(s => {
      const sRecs = monthlyRecs.filter(r => r.studentId === s.id);
      const getStat = (slots: SlotType[]) => {
        const filtered = sRecs.filter(r => slots.includes(r.slot));
        const present = filtered.filter(r => r.status === 'present').length;
        return { count: filtered.length, present, rate: filtered.length > 0 ? Math.round((present / filtered.length) * 100) : 0 };
      };
      return {
        ...s,
        totalRate: getStat([...SESSION_SLOTS, ...PRAYER_SLOTS]).rate,
        prayerStats: getStat(PRAYER_SLOTS),
        lessonStats: getStat(SESSION_SLOTS),
        monthlyFullRecords: sRecs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    }).sort((a, b) => b.totalRate - a.totalRate);
  }, [students, monthlyRecs]);

  const selectedStudentData = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentStats.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, studentStats]);

  // --- Render ---
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 font-cairo overflow-hidden relative text-right">
      <div className="absolute inset-0 bg-indigo-600/5 blur-[120px] rounded-full scale-150 -z-10" />
      <div className="w-full max-w-md glass p-10 rounded-[3rem] text-center z-10 animate-slide">
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl rotate-6">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">مركز الأثـر التربوي</h1>
        <p className="text-slate-400 font-bold mb-4">نظام "سـراج" للمتابعة الذكية</p>
        
        {supervisor.name && (
          <div className="bg-indigo-500/10 p-4 rounded-2xl mb-8 border border-indigo-500/20">
             <p className="text-indigo-400 font-black">أهلاً بك {supervisor.name}</p>
             {supervisor.mosque && <p className="text-[10px] text-slate-400 mt-1">مسجد: {supervisor.mosque}</p>}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            type="password" autoFocus placeholder="الرمز السري" 
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-white font-black text-2xl tracking-[0.5em] focus:border-indigo-500 outline-none transition-all"
            value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
          />
          <button className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95">دخول للنظام</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col text-[#f4f4f5] font-cairo text-right">
      {/* Header */}
      <header className="bg-[#09090b]/60 backdrop-blur-3xl border-b border-white/5 px-8 py-5 flex items-center justify-between z-50 sticky top-0">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">S</div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-tight">مركز الأثـر</h1>
            {supervisor.mosque && <p className="text-[10px] text-indigo-400 font-bold">{supervisor.mosque}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/10 relative">
          {isReadOnly && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-600 text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg"><Lock size={8}/> وضع العرض</div>}
          <button onClick={() => setSelectedViewMonth(m => m > 1 ? m - 1 : 1)} className="p-1.5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all"><ChevronRight size={18} /></button>
          <span className="text-xs font-black px-3 min-w-[70px] text-center">{MONTHS.find(m => m.id === selectedViewMonth)?.name}</span>
          <button onClick={() => setSelectedViewMonth(m => m < 7 ? m + 1 : 7)} className="p-1.5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all"><ChevronLeft size={18} /></button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('profile')} className={`p-2.5 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}><UserCircle size={22}/></button>
          <button onClick={() => { setIsAuthenticated(false); localStorage.removeItem('siraj_auth'); }} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all"><LogOut size={22}/></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
        <div className="max-w-6xl mx-auto pb-24">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-12 animate-slide">
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black text-white leading-tight">مركز الأثـر التربوي</h2>
                <p className="text-slate-400 font-medium text-lg">أهلاً بك يا {supervisor.name || 'أيها المشرف'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button onClick={() => { setActiveTab('class-attendance'); setSelectedSlot('SAT_DAWN'); setIsDayUnlocked(false); }} className="group relative h-64 bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3rem] text-right overflow-hidden shadow-2xl transition-all hover:scale-[1.02] border border-white/5">
                  <BookOpen size={120} className="absolute -left-5 -bottom-5 text-white/10 group-hover:scale-110 transition-transform" />
                  <h3 className="text-3xl font-black text-white mb-2">تحضير الدروس</h3>
                  <p className="text-indigo-100 font-bold opacity-80">صباح السبت، عصر السبت، مساء الأربعاء</p>
                  <div className="mt-10 inline-flex items-center gap-3 bg-white/20 px-6 py-3 rounded-2xl text-xs font-black backdrop-blur-md">انقر للبدء <ArrowRight size={14}/></div>
                </button>

                <button onClick={() => { setActiveTab('prayer-attendance'); setSelectedSlot('PRAYER_FAJR'); }} className="group relative h-64 bg-gradient-to-br from-violet-600 to-purple-800 p-8 rounded-[3rem] text-right overflow-hidden shadow-2xl transition-all hover:scale-[1.02] border border-white/5">
                  <Heart size={120} className="absolute -left-5 -bottom-5 text-white/10 group-hover:scale-110 transition-transform" />
                  <h3 className="text-3xl font-black text-white mb-2">تحضير الصلوات</h3>
                  <p className="text-violet-100 font-bold opacity-80">الفجر، المغرب، العشاء</p>
                  <div className="mt-10 inline-flex items-center gap-3 bg-white/20 px-6 py-3 rounded-2xl text-xs font-black backdrop-blur-md">انقر للبدء <ArrowRight size={14}/></div>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <button onClick={() => setActiveTab('stats')} className="lg:col-span-2 group bg-white/5 border border-white/10 p-10 rounded-[3rem] text-right relative overflow-hidden shadow-xl transition-all hover:bg-white/10">
                  <Activity size={120} className="absolute -left-5 -bottom-5 text-white/5 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3"><TrendingUp className="text-emerald-400" /> <h3 className="text-3xl font-black text-white">الإحصائيات والتقارير</h3></div>
                    <p className="text-slate-400 font-bold opacity-80">سجل الانضباط والغياب التفصيلي لكل طالب لشهر {MONTHS.find(m => m.id === selectedViewMonth)?.name}.</p>
                  </div>
                </button>

                <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center flex flex-col justify-center items-center">
                   <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">إجمالي الطلاب</p>
                   <p className="text-6xl font-black text-indigo-400">{students.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE / ADMIN TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-slide">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-white">إعدادات المسؤول</h2>
                <button onClick={() => setActiveTab('home')} className="p-3 bg-white/5 rounded-2xl"><X size={20}/></button>
              </div>
              <div className="bg-white/5 p-12 rounded-[4rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <form onSubmit={handleSaveProfile} className="relative z-10 max-w-lg space-y-8">
                   <div className="space-y-2">
                      <label className="text-sm font-black text-slate-500 mr-2 flex items-center gap-2"><UserCheck size={16}/> اسم المشرف</label>
                      <input 
                        type="text" required placeholder="أدخل اسمك الكامل" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 font-bold text-white outline-none focus:border-indigo-500"
                        value={supervisor.name} onChange={e => setSupervisor({...supervisor, name: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-black text-slate-500 mr-2 flex items-center gap-2"><Building2 size={16}/> اسم المسجد / المركز</label>
                      <input 
                        type="text" required placeholder="أدخل اسم المسجد المسؤول عنه" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 font-bold text-white outline-none focus:border-indigo-500"
                        value={supervisor.mosque} onChange={e => setSupervisor({...supervisor, mosque: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-black text-slate-500 mr-2">المسمى الوظيفي</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 font-bold text-white outline-none focus:border-indigo-500"
                        value={supervisor.title} onChange={e => setSupervisor({...supervisor, title: e.target.value})}
                      >
                         <option value="مشرف تربوي" className="bg-[#18181b]">مشرف تربوي</option>
                         <option value="مدير المركز" className="bg-[#18181b]">مدير المركز</option>
                      </select>
                   </div>
                   <button type="submit" className="flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl">
                     <Save size={20}/> حفظ وإتمام التسجيل
                   </button>
                </form>
              </div>
            </div>
          )}

          {/* ATTENDANCE TABS */}
          {(activeTab === 'class-attendance' || activeTab === 'prayer-attendance') && (
            <div className="space-y-10 animate-slide">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h2 className="text-3xl font-black text-white">{activeTab === 'class-attendance' ? 'تحضير الدروس' : 'تحضير الصلوات'}</h2>
                   <p className="text-slate-500 font-bold mt-1">{SLOT_LABELS[selectedSlot]} | {selectedDate}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={markAllAsPresent} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] shadow-lg">تحضير الكل</button>
                      <button onClick={markAllAsAbsent} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-[10px] shadow-lg">تغييب الكل</button>
                    </div>
                  ) : null}
                  <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 text-slate-400 font-bold hover:text-white transition-all bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-[10px]"><Home size={14}/> الرئيسية</button>
                </div>
              </div>

              {/* Lock Banner for restricted days */}
              {activeTab === 'class-attendance' && !isSlotValidForDay && !isDayUnlocked && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                   <div className="flex items-center gap-4 text-center md:text-right">
                      <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500"><Lock size={24}/></div>
                      <div>
                         <p className="text-white font-black">النظام مغلق (غير مخصص لهذا اليوم)</p>
                         <p className="text-xs text-slate-500 font-bold">يرجى إدخال رمز الفك للتعديل في غير يوم الدروس.</p>
                      </div>
                   </div>
                   <form onSubmit={handleDayUnlock} className="flex gap-3 w-full md:w-auto">
                      <input 
                        type="password" placeholder="رمز فك القفل" 
                        className="flex-1 md:w-48 bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-rose-500"
                        value={unlockPassword} onChange={e => setUnlockPassword(e.target.value)}
                      />
                      <button className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg"><Unlock size={14}/> فتح</button>
                   </form>
                </div>
              )}

              {/* Slot Switcher */}
              <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-2xl border border-white/5">
                {(activeTab === 'class-attendance' ? SESSION_SLOTS : PRAYER_SLOTS).map(s => (
                  <button 
                    key={s} 
                    onClick={() => { setSelectedSlot(s); setIsDayUnlocked(false); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${selectedSlot === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
                  >
                    {SLOT_LABELS[s]}
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="bg-white/5 p-6 rounded-[3rem] border border-white/10 flex flex-wrap gap-6 items-end justify-between">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">التاريخ</label>
                    <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setIsDayUnlocked(false); }} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500 min-w-[160px]" />
                  </div>
                </div>
                <div className="relative w-full md:w-[250px]">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="text" placeholder="بحث عن طالب..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 font-bold text-white outline-none focus:border-indigo-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
              </div>

              {/* Student List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => {
                  const record = currentSlotRecords.find(r => r.studentId === student.id);
                  const status = record?.status;
                  return (
                    <div key={student.id} className={`bg-white/5 border p-6 rounded-[2.5rem] flex flex-col gap-6 transition-all group ${!canEdit ? 'opacity-60 grayscale cursor-not-allowed' : ''} ${status === 'present' ? 'border-emerald-500/30 bg-emerald-500/5' : status === 'absent' ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5'}`}>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-xl text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md">{student.name.charAt(0)}</div>
                            <div>
                               <h4 className="font-black text-white">{student.name}</h4>
                               <span className="text-[9px] text-slate-600 font-bold bg-white/5 px-2 py-0.5 rounded-full">{student.group}</span>
                            </div>
                         </div>
                         {status && (
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${status === 'present' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>{STATUS_LABELS[status]}</span>
                         )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => setStatus(student.id, 'present')} className={`py-2 rounded-xl text-[10px] font-black transition-all ${status === 'present' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-emerald-500/20'}`}>حاضر</button>
                        <button onClick={() => setStatus(student.id, 'absent')} className={`py-2 rounded-xl text-[10px] font-black transition-all ${status === 'absent' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-rose-500/20'}`}>غائب</button>
                        <button onClick={() => setStatus(student.id, 'excused')} className={`py-2 rounded-xl text-[10px] font-black transition-all ${status === 'excused' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-amber-500/20'}`}>مستأذن</button>
                        <button onClick={() => setStatus(student.id, 'late')} className={`py-2 rounded-xl text-[10px] font-black transition-all ${status === 'late' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-blue-500/20'}`}>متأخر</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canEdit && (
                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-lg mt-12">
                   <h3 className="text-lg font-black mb-6 flex items-center gap-3"><Plus className="text-indigo-400"/> إضافة طالب جديد</h3>
                   <form onSubmit={addStudent} className="flex flex-col md:flex-row gap-4">
                      <input name="name" required placeholder="اسم الطالب" className="flex-[3] bg-white/5 border border-white/10 rounded-2xl p-4 font-bold text-white outline-none focus:border-indigo-500" />
                      <select name="group" className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 font-bold text-white outline-none focus:border-indigo-500">
                         {GROUPS.map(g => <option key={g} value={g} className="bg-[#18181b]">{g}</option>)}
                      </select>
                      <button type="submit" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl">إضافة</button>
                   </form>
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <div className="space-y-12 animate-slide">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-center gap-5">
                    <button onClick={() => setActiveTab('home')} className="p-3 bg-white/5 rounded-2xl border border-white/5"><Home size={24}/></button>
                    <div>
                       <h2 className="text-3xl font-black text-white">إحصائيات المتابعة</h2>
                       <p className="text-slate-500 font-bold">{supervisor.mosque || 'المسجد المسجل'}</p>
                    </div>
                 </div>
                 <div className="relative w-full md:w-[300px]">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" placeholder="بحث في الإحصائيات..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-10 font-bold text-white outline-none shadow-sm" value={statSearch} onChange={e => setStatSearch(e.target.value)}/>
                 </div>
              </div>

              {selectedStudentId && selectedStudentData ? (
                 <div className="space-y-8 animate-slide">
                    <div className="flex items-center gap-4">
                       <button onClick={() => setSelectedStudentId(null)} className="p-3 bg-white/5 rounded-2xl border border-white/5"><ChevronRight size={24}/></button>
                       <h3 className="text-2xl font-black text-white">تقرير: {selectedStudentData.name}</h3>
                       <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-black">{selectedStudentData.group}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 text-center shadow-lg">
                          <p className="text-xs text-slate-500 font-black mb-2">التزام الحلقات</p>
                          <p className="text-5xl font-black text-indigo-400">{selectedStudentData.lessonStats.rate}%</p>
                       </div>
                       <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 text-center shadow-lg">
                          <p className="text-xs text-slate-500 font-black mb-2">التزام الصلوات</p>
                          <p className="text-5xl font-black text-violet-400">{selectedStudentData.prayerStats.rate}%</p>
                       </div>
                    </div>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {studentStats.filter(s => s.name.includes(statSearch)).map(s => (
                     <div key={s.id} onClick={() => setSelectedStudentId(s.id)} className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-indigo-500/40 cursor-pointer group transition-all shadow-md">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">{s.name.charAt(0)}</div>
                              <div>
                                 <h4 className="font-black text-white text-sm">{s.name}</h4>
                                 <span className="text-[9px] text-indigo-400 font-black bg-indigo-400/10 px-2 py-0.5 rounded-full">{s.group}</span>
                              </div>
                           </div>
                           <div className="text-center"><p className="text-xl font-black text-indigo-400">{s.totalRate}%</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[8px] font-black uppercase border-t border-white/5 pt-3">
                           <div className="flex items-center justify-between text-violet-400"><span>الصلوات</span> <span>{s.prayerStats.rate}%</span></div>
                           <div className="flex items-center justify-between text-indigo-400"><span>الدروس</span> <span>{s.lessonStats.rate}%</span></div>
                        </div>
                     </div>
                   ))}
                </div>
              )}

              {/* Gemini Section */}
              <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 space-y-8 relative overflow-hidden shadow-2xl mt-12">
                 <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black flex items-center gap-4"><Sparkles className="text-indigo-400"/> التحليل الذكي للبيانات</h3>
                    <button onClick={async () => { setIsGenerating(true); setInsights(await getAttendanceInsights(students, monthlyRecs)); setIsGenerating(false); }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs transition-all disabled:opacity-50 shadow-xl" disabled={isGenerating || monthlyRecs.length === 0}>{isGenerating ? 'جاري التحليل...' : 'توليد تقرير شامل'}</button>
                 </div>
                 {insights ? (
                   <div className="p-8 bg-[#0c0c0e] rounded-[2.5rem] text-sm leading-relaxed text-slate-300 whitespace-pre-wrap animate-slide border border-white/5 shadow-inner">{insights}</div>
                 ) : (
                   <div className="text-center py-10 text-slate-600 font-black text-sm">اضغط للتحليل والحصول على توصيات تربوية ذكية بناءً على بيانات {supervisor.mosque}</div>
                 )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Notifications */}
      {feedback && (
        <div className={`fixed bottom-10 left-10 z-[200] px-8 py-4 rounded-[2.5rem] shadow-2xl animate-slide border ${feedback.type === 'success' ? 'bg-indigo-600 border-indigo-400' : 'bg-rose-600 border-rose-400'} flex items-center gap-4`}>
          {feedback.type === 'success' ? <CheckCircle size={20} className="text-white" /> : <AlertCircle size={20} className="text-white" />}
          <span className="font-black text-white text-sm">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
