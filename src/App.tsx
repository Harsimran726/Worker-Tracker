/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  Wallet, 
  BarChart3, 
  Plus, 
  ChevronRight, 
  Clock, 
  Phone, 
  TrendingDown,
  TrendingUp,
  LogOut,
  Hammer,
  Smartphone,
  Banknote,
  Search,
  CheckCircle2,
  XCircle,
  Info,
  Clock as HistoryClockIcon,
  Mic,
  MicOff
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { useFirebase } from './hooks/useFirebase';
import { useSpeechToText } from './hooks/useSpeechToText';
import { Artisan, AttendanceRecord, Payment, AttendanceStatus, ClientCollection } from './types';
import { cn, handleFirestoreError, OperationType } from './lib/utils';

export default function App() {
  const { user, loading, login, logout, error } = useFirebase();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workers' | 'attendance' | 'reports' | 'collections'>('dashboard');
  const [workers, setWorkers] = useState<Artisan[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clientCollections, setClientCollections] = useState<ClientCollection[]>([]);
  
  // Modals/Views
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showAddCollection, setShowAddCollection] = useState(false);

  // Sync Data
  useEffect(() => {
    if (!user) return;

    const workersQuery = query(collection(db, 'workers'), where('ownerId', '==', user.uid));
    const unsubWorkers = onSnapshot(workersQuery, (snapshot) => {
      setWorkers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Artisan)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workers'));

    const attendanceQuery = query(collection(db, 'attendance'), where('ownerId', '==', user.uid));
    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));

    const paymentsQuery = query(collection(db, 'payments'), where('ownerId', '==', user.uid));
    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments'));

    const collectionsQuery = query(collection(db, 'client_collections'), where('ownerId', '==', user.uid));
    const unsubCollections = onSnapshot(collectionsQuery, (snapshot) => {
      setClientCollections(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClientCollection)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'client_collections'));

    return () => {
      unsubWorkers();
      unsubAttendance();
      unsubPayments();
      unsubCollections();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FDFCF9]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Hammer className="w-8 h-8 text-amber-900" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={login} error={error} />;
  }

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  return (
    <div className="h-screen flex flex-col bg-[#FDFCF9] text-[#2D241E] max-w-md mx-auto relative overflow-hidden font-sans shadow-2xl border-x border-amber-50">
      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center bg-white border-b border-amber-100 shadow-sm z-30">
        <div>
          <h1 className="text-xl font-serif font-bold text-amber-950 tracking-tight flex items-center gap-2">
            <Hammer className="w-5 h-5 text-amber-900" /> Worker Tracker
          </h1>
          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest opacity-60">Workshop Ledger</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAboutUs(true)} className="p-2 rounded-full hover:bg-amber-50 text-amber-800 transition-colors">
            <Info className="w-5 h-5" />
          </button>
          <button onClick={logout} className="p-2 rounded-full hover:bg-amber-50 text-amber-800 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-6 pt-6 scroll-smooth scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardView key="dashboard" workers={workers} attendance={attendance} payments={payments} collections={clientCollections} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'workers' && (
            <WorkersView 
              key="workers"
              workers={workers} 
              onAddWorker={() => setShowAddWorker(true)}
              onSelectWorker={setSelectedWorkerId}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceView key="attendance" workers={workers} attendance={attendance} user={user} />
          )}
          {activeTab === 'reports' && (
            <ReportsView key="reports" workers={workers} attendance={attendance} payments={payments} />
          )}
          {activeTab === 'collections' && (
            <CollectionsView key="collections" collections={clientCollections} onAdd={() => setShowAddCollection(true)} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-amber-100 px-4 py-4 flex justify-between items-center z-40">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 />} label="Home" />
        <NavButton active={activeTab === 'workers'} onClick={() => setActiveTab('workers')} icon={<Users />} label="Workers" />
        <NavButton active={activeTab === 'collections'} onClick={() => setActiveTab('collections')} icon={<Banknote />} label="Collect" />
        <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<Calendar />} label="Attendance" />
        <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<Wallet />} label="Payroll" />
      </nav>

      {/* Overlays */}
      <AnimatePresence>
        {showAddWorker && (
          <AddWorkerModal key="add-worker" onClose={() => setShowAddWorker(false)} user={user} />
        )}
        {selectedWorker && (
          <WorkerDetailModal 
            key="worker-detail"
            worker={selectedWorker} 
            attendance={attendance.filter(a => a.workerId === selectedWorker.id)}
            payments={payments.filter(p => p.workerId === selectedWorker.id)}
            onClose={() => setSelectedWorkerId(null)}
            onAddPayment={() => setShowAddPayment(true)}
            user={user}
          />
        )}
        {showAddPayment && selectedWorker && (
          <AddPaymentModal 
            key="add-payment"
            worker={selectedWorker} 
            onClose={() => setShowAddPayment(false)} 
            user={user} 
          />
        )}
        {showAboutUs && (
          <AboutUsModal key="about-us" onClose={() => setShowAboutUs(false)} />
        )}
        {showAddCollection && (
          <AddCollectionModal key="add-collection" onClose={() => setShowAddCollection(false)} user={user} />
        )}
      </AnimatePresence>
    </div>
  );
}

function AboutUsModal({ onClose }: { onClose: () => void, key?: React.Key }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-amber-950/40 backdrop-blur-md p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute right-6 top-6 text-amber-900/40 p-2 hover:bg-amber-50 rounded-full transition-colors"><XCircle /></button>
        <div className="text-center">
            <div className="w-16 h-16 bg-amber-900 rounded-2xl flex items-center justify-center mb-6 mx-auto rotate-3 shadow-xl shadow-amber-900/20">
              <Hammer className="w-8 h-8 text-white -rotate-3" />
            </div>
            <h2 className="text-2xl font-serif font-black text-amber-950 mb-2">About Worker Tracker</h2>
            <p className="text-xs text-amber-900/60 font-medium mb-8">Professional management system for your workforce.</p>
            
            <div className="space-y-4 text-left bg-amber-50 rounded-[2rem] p-6 border border-amber-100">
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-900 opacity-40">Developer</p>
                   <p className="text-sm font-black text-amber-950">Harsimran Singh</p>
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-900 opacity-40">Company</p>
                   <p className="text-sm font-black text-amber-950">Local Sync AI</p>
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-900 opacity-40">Contact</p>
                   <p className="text-sm font-black text-amber-950">7814351011</p>
                </div>
            </div>
            
            <p className="mt-8 text-[9px] font-black uppercase tracking-widest text-amber-900/30">Version 1.0.0 • 2026</p>
        </div>
      </motion.div>
    </div>
  );
}

// --- Views ---

function LoginView({ onLogin, error }: { onLogin: () => void, error: string | null }) {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFCF9] p-10 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="w-20 h-20 bg-amber-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-amber-900/20 mx-auto rotate-12">
          <Hammer className="w-10 h-10 text-white -rotate-12" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-amber-950 mb-2 leading-tight">Worker Tracker</h1>
        <p className="text-amber-800 font-medium opacity-60">Smart attendance for your workshop</p>
      </motion.div>
      
      <button 
        onClick={onLogin}
        className="w-full bg-amber-950 text-white py-5 px-6 rounded-3xl font-bold shadow-xl shadow-amber-950/20 flex items-center justify-center gap-3 active:scale-95 transition-transform"
      >
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
           <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
        </div>
        Sign in with Google
      </button>

      {error && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-4 py-2 rounded-xl"
        >
          {error}
        </motion.p>
      )}
      
      <p className="mt-12 text-[10px] uppercase font-bold tracking-widest text-amber-900/40 max-w-[240px]">
        Professional Management Tool • Built for Carpenters
      </p>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all outline-none",
        active ? "text-amber-900 translate-y-[-4px]" : "text-amber-300"
      )}
    >
      <div className={cn(
        "p-2.5 rounded-2xl transition-all shadow-sm",
        active ? "bg-amber-900 text-white shadow-amber-900/20" : "bg-transparent shadow-none"
      )}>
        {icon}
      </div>
      <span className={cn("text-[9px] font-extrabold uppercase tracking-[0.1em]", active ? "opacity-100" : "opacity-40")}>{label}</span>
      {active && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-amber-900 rounded-full" />}
    </button>
  );
}

function DashboardView({ workers, attendance, payments, collections, setActiveTab }: { workers: Artisan[], attendance: AttendanceRecord[], payments: Payment[], collections: ClientCollection[], setActiveTab: any, key?: React.Key }) {
  const activeWorkers = workers.filter(w => w.status === 'active').length;
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const thisMonthPayments = payments.filter(p => p.date.startsWith(currentMonth));
  const totalAdvances = thisMonthPayments.filter(p => p.type === 'advance').reduce((acc, p) => acc + p.amount, 0);

  const totalCollected = collections.reduce((acc, c) => acc + c.amount, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          label="Total Team" 
          value={activeWorkers.toString()} 
          icon={<Users className="w-4 h-4" />} 
          variant="light"
        />
        <StatCard 
          label="Attendance" 
          value={`${presentToday}/${activeWorkers}`} 
          icon={<CheckCircle2 className="w-4 h-4" />} 
          variant="accent"
        />
      </div>

      <div className="bg-amber-950 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-amber-950/30 relative overflow-hidden group">
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <p className="text-amber-200/60 text-[10px] font-black uppercase tracking-[0.2em]">Workshop Balance</p>
            </div>
            <div className="flex gap-8">
               <div>
                 <p className="text-[8px] font-black uppercase text-amber-200/30 mb-1">Collections</p>
                 <h2 className="text-2xl font-serif font-black tracking-tight">₹{totalCollected.toLocaleString()}</h2>
               </div>
               <div>
                 <p className="text-[8px] font-black uppercase text-amber-200/30 mb-1">Advances</p>
                 <h2 className="text-2xl font-serif font-black tracking-tight text-red-300">₹{totalAdvances.toLocaleString()}</h2>
               </div>
            </div>
            <button 
              onClick={() => setActiveTab('reports')}
              className="mt-6 flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/10 transition-colors"
            >
              <HistoryClockIcon className="w-3 h-3" />
              Financial Reports
            </button>
          </div>
        </div>
        <Wallet className="absolute -bottom-6 -right-6 w-40 h-40 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      <section>
        <h3 className="text-sm font-black text-amber-950/30 uppercase tracking-[0.2em] mb-4 ml-2 italic">Management Core</h3>
        <div className="grid grid-cols-1 gap-3">
          <QuickAction 
            onClick={() => setActiveTab('collections')}
            icon={<Banknote className="text-amber-900" />} 
            label="Client Collection" 
            sub="Record new client income" 
            bgColor="bg-green-50/50"
          />
          <QuickAction 
            onClick={() => setActiveTab('attendance')}
            icon={<Calendar className="text-amber-900" />} 
            label="Mark Attendance" 
            sub="Register presence and overtime"
            bgColor="bg-amber-50"
          />
          <QuickAction 
             onClick={() => setActiveTab('workers')}
            icon={<Users className="text-amber-900" />} 
            label="Worker Directory" 
            sub="View salary and phone details"
            bgColor="bg-amber-50"
          />
        </div>
      </section>
    </motion.div>
  );
}

function StatCard({ label, value, icon, variant }: { label: string, value: string, icon: React.ReactNode, variant: 'light' | 'accent' }) {
  const styles = {
    light: "bg-white border-amber-50 text-amber-950 shadow-sm",
    accent: "bg-amber-50 border-amber-100/50 text-amber-900 shadow-sm"
  };
  
  return (
    <div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-32 transition-transform active:scale-95", styles[variant])}>
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", variant === 'light' ? "bg-amber-50" : "bg-white")}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{label}</p>
        <p className="text-2xl font-black font-serif">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, sub, bgColor, onClick }: { icon: React.ReactNode, label: string, sub: string, bgColor: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn("flex items-center gap-5 p-5 rounded-[2rem] border border-transparent hover:border-amber-100 transition-all active:scale-[0.98] text-left", bgColor)}
    >
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm text-amber-900">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-black text-sm text-amber-950">{label}</h4>
        <p className="text-[10px] font-medium text-amber-900/40 uppercase tracking-widest mt-0.5">{sub}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center">
        <ChevronRight className="w-4 h-4 opacity-40" />
      </div>
    </button>
  );
}

function CollectionsView({ collections, onAdd }: { collections: ClientCollection[], onAdd: () => void, key?: React.Key }) {
  const [search, setSearch] = useState('');
  const filtered = collections.filter(c => c.clientName.toLowerCase().includes(search.toLowerCase()));
  
  const totalCollected = collections.reduce((acc, c) => acc + c.amount, 0);
  const onlineTotal = collections.filter(c => c.paymentMethod === 'online').reduce((acc, c) => acc + c.amount, 0);
  const cashTotal = collections.filter(c => c.paymentMethod === 'cash').reduce((acc, c) => acc + c.amount, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-serif font-black text-amber-950">Client Ledger</h2>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Income Tracker</p>
        </div>
        <button 
          onClick={onAdd}
          className="w-12 h-12 bg-amber-950 text-white rounded-2xl shadow-xl shadow-amber-950/20 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
         <div className="bg-white p-3 rounded-2xl border border-amber-50 shadow-sm text-center">
            <p className="text-[7px] font-black uppercase text-amber-900/40 mb-1">Total</p>
            <p className="text-sm font-black text-amber-950">₹{totalCollected.toLocaleString()}</p>
         </div>
         <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 shadow-sm text-center">
            <p className="text-[7px] font-black uppercase text-amber-600 mb-1">Online</p>
            <p className="text-sm font-black text-amber-900">₹{onlineTotal.toLocaleString()}</p>
         </div>
         <div className="bg-white p-3 rounded-2xl border border-amber-50 shadow-sm text-center">
            <p className="text-[7px] font-black uppercase text-amber-900/40 mb-1">Cash</p>
            <p className="text-sm font-black text-amber-950">₹{cashTotal.toLocaleString()}</p>
         </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300 group-focus-within:text-amber-900 transition-colors" />
        <input 
          type="text" 
          placeholder="Search clients..." 
          className="w-full bg-white border border-amber-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-50 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-10">
        {filtered.map(item => (
          <motion.div 
            layout
            key={item.id}
            className="p-5 bg-white rounded-[2rem] border border-amber-50 shadow-sm flex items-center justify-between group"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-900">
                {item.paymentMethod === 'cash' ? <Banknote className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-950">{item.clientName}</h4>
                <p className="text-[9px] font-bold text-amber-400 uppercase tracking-tighter">{format(parseISO(item.date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-lg text-green-600">₹{item.amount.toLocaleString()}</p>
              <p className="text-[8px] font-black uppercase text-amber-900/20">{item.paymentMethod}</p>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
           <div className="py-20 text-center opacity-20 italic">
             <BarChart3 className="w-12 h-12 mx-auto mb-4" />
             <p className="text-sm font-bold">No collections found</p>
           </div>
        )}
      </div>
    </motion.div>
  );
}

function AddCollectionModal({ onClose, user }: { onClose: () => void, user: any, key?: React.Key }) {
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('online');
  const [notes, setNotes] = useState('');

  const { isListening, isSupported, toggleListening } = useSpeechToText((text) => {
    setNotes(prev => (prev + ' ' + text).trim());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !amount) return;
    try {
      await addDoc(collection(db, 'client_collections'), {
        clientName,
        amount: parseFloat(amount),
        paymentMethod,
        notes,
        date: new Date().toISOString(),
        ownerId: user.uid
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'client_collections');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-amber-950/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-md bg-[#FDFCF9] rounded-[3rem] p-8 pb-12 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute right-8 top-8 text-amber-900/40 p-2 hover:bg-amber-50 rounded-full transition-colors"><XCircle /></button>
        <h2 className="text-3xl font-serif font-black text-amber-950 mb-8 pr-12 leading-tight">Client Collection</h2>
        
        <div className="flex gap-2 mb-6 p-1 bg-amber-50 rounded-2xl">
            <button 
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                paymentMethod === 'cash' ? "bg-white text-amber-900 shadow-sm" : "text-amber-900/40"
              )}
            >
              <Banknote className="w-3 h-3" />
              Cash
            </button>
            <button 
              type="button"
              onClick={() => setPaymentMethod('online')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                paymentMethod === 'online' ? "bg-white text-amber-900 shadow-sm" : "text-amber-900/40"
              )}
            >
              <Smartphone className="w-3 h-3" />
              Online
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Client Name" placeholder="e.g. Villa Project - A1" value={clientName} onChange={setClientName} />
          <Input label="Collected Amount (₹)" type="number" placeholder="0.00" value={amount} onChange={setAmount} />
          <Input 
            label="Notes" 
            placeholder="Advance, final etc." 
            value={notes} 
            onChange={setNotes} 
            rightElement={isSupported && (
              <button 
                type="button" 
                onClick={() => toggleListening('pa-IN')}
                className={cn("p-2 rounded-xl transition-all shadow-sm flex items-center justify-center", isListening ? "bg-red-100 text-red-500 animate-pulse" : "bg-amber-50 text-amber-900/50 hover:bg-amber-100")}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            )}
          />
          
          <button type="submit" className="w-full bg-amber-950 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-amber-950/30 active:scale-95 transition-all mt-4">
            Record Collection
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function WorkersView({ workers, onAddWorker, onSelectWorker }: { workers: Artisan[], onAddWorker: () => void, onSelectWorker: (id: string) => void, key?: React.Key }) {
  const [search, setSearch] = useState('');
  const filtered = workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-serif font-black text-amber-950">Workshop Team</h2>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Management Directory</p>
        </div>
        <button 
          onClick={onAddWorker}
          className="w-12 h-12 bg-amber-950 text-white rounded-2xl shadow-xl shadow-amber-950/20 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300 group-focus-within:text-amber-900 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by name..." 
          className="w-full bg-white border border-amber-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-50 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-10">
        {filtered.map(worker => (
          <motion.div 
            layout
            key={worker.id}
            onClick={() => onSelectWorker(worker.id)}
            className="p-5 bg-white rounded-[2rem] border border-amber-50 shadow-sm flex items-center justify-between group active:bg-amber-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center font-serif font-black text-2xl text-amber-900 group-hover:scale-105 transition-transform">
                {worker.name[0]}
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-950">{worker.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[8px] font-black uppercase tracking-tighter">
                     ₹{worker.dailySalary}/day
                   </div>
                   <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[8px] font-black uppercase tracking-tighter">
                     {worker.workingHours}h SHIFT
                   </div>
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-4 h-4 opacity-40" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function AttendanceView({ workers, attendance, user }: { workers: Artisan[], attendance: AttendanceRecord[], user: any, key?: React.Key }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const handleToggle = async (workerId: string, currentStatus: AttendanceStatus | undefined) => {
    const existing = attendance.find(a => a.workerId === workerId && a.date === dateStr);
    const nextStatus: AttendanceStatus = currentStatus === 'present' ? 'absent' : 'present';
    
    try {
      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), { status: nextStatus });
      } else {
        await addDoc(collection(db, 'attendance'), {
          workerId,
          date: dateStr,
          status: 'present',
          hoursWorked: workers.find(w => w.id === workerId)?.workingHours || 8,
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-amber-950 p-6 rounded-[2.5rem] shadow-2xl shadow-amber-950/20">
        <div className="flex justify-between items-center text-white">
          <button onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() - 1)))} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="text-center">
             <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Select Work Date</p>
            <h3 className="text-lg font-serif font-black">{format(selectedDate, 'MMMM do, yyyy')}</h3>
          </div>
          <button onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() + 1)))} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3 pb-8">
        {workers.filter(w => w.status === 'active').map(worker => {
          const record = attendance.find(a => a.workerId === worker.id && a.date === dateStr);
          const isPresent = record?.status === 'present';
          const isAbsent = record?.status === 'absent';

          return (
            <div 
              key={worker.id}
              className={cn(
                "p-5 rounded-[2rem] border transition-all duration-300 flex items-center justify-between",
                isPresent ? "bg-green-50/50 border-green-100" : 
                isAbsent ? "bg-red-50/50 border-red-100" : "bg-white border-amber-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  isPresent ? "bg-green-600 text-white rotate-6" : 
                  isAbsent ? "bg-red-600 text-white rotate-[-6deg]" : "bg-amber-100 text-amber-900"
                )}>
                  {isPresent ? <CheckCircle2 className="w-6 h-6" /> : 
                   isAbsent ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6 opacity-40" />}
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-950">{worker.name}</h4>
                  <p className="text-[10px] font-bold text-amber-900/40">{worker.workingHours}h Standard Shift</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToggle(worker.id, record?.status)}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    isPresent ? "bg-green-600 text-white shadow-lg shadow-green-600/20" : "bg-amber-50 text-amber-400 hover:text-amber-900"
                  )}
                >
                  Present
                </button>
                {!isPresent && (
                  <button 
                    onClick={() => handleToggle(worker.id, 'present')}
                    className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold transition-all",
                      isAbsent ? "bg-red-600 text-white" : "bg-amber-50 text-amber-200"
                    )}
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ReportsView({ workers, attendance, payments }: { workers: Artisan[], attendance: AttendanceRecord[], payments: Payment[], key?: React.Key }) {
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));

  const reports = useMemo(() => {
    return workers.map(worker => {
      const wAttendance = attendance.filter(a => a.workerId === worker.id && a.date.startsWith(reportMonth));
      const wPayments = payments.filter(p => p.workerId === worker.id && p.date.startsWith(reportMonth));
      
      const daysPresent = wAttendance.filter(a => a.status === 'present').length;
      const totalDays = daysPresent;
      
      const earned = totalDays * worker.dailySalary;
      const advances = wPayments.filter(p => p.type === 'advance').reduce((sum, p) => sum + p.amount, 0);
      const deductions = wPayments.filter(p => p.type === 'deduction').reduce((sum, p) => sum + p.amount, 0);
      const net = earned - advances - deductions;

      return { worker, daysPresent, earned, advances: advances + deductions, net };
    }).filter(r => r.earned > 0 || r.advances > 0);
  }, [workers, attendance, payments, reportMonth]);

  const totalPayout = reports.reduce((sum, r) => sum + r.net, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-3xl font-serif font-black text-amber-950">Payroll Hub</h2>
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-1">Automatic Salary Generation</p>
        </div>
        <input 
          type="month" 
          value={reportMonth} 
          onChange={(e) => setReportMonth(e.target.value)}
          className="bg-white border-2 border-amber-100 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-amber-900 transition-colors"
        />
      </div>

      <div className="bg-amber-100 border-2 border-amber-200/50 rounded-[2.5rem] p-8 text-center shadow-xl shadow-amber-900/5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800/40 mb-2">Total Monthly Payout Estimated</p>
        <h3 className="text-4xl font-serif font-black text-amber-950">₹{totalPayout.toLocaleString()}</h3>
      </div>

      <div className="space-y-4 pb-10 font-sans">
        {reports.map((report) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={report.worker.id} 
            className="bg-white p-6 rounded-[2rem] border border-amber-50 shadow-sm relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center font-serif font-black text-amber-900 text-xs">
                  {report.worker.name[0]}
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-950">{report.worker.name}</h4>
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">{report.daysPresent} Work Days • ₹{report.worker.dailySalary} Rate</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-amber-950">₹{report.net.toLocaleString()}</p>
                 <div className="flex items-center justify-end gap-1">
                   <TrendingDown className="w-2.5 h-2.5 text-red-500" />
                   <p className="text-[9px] text-red-500 font-black uppercase tracking-tighter">₹{report.advances} Adv.</p>
                 </div>
              </div>
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-amber-900/20">
                 <span>Earning Progress</span>
                 <span>{(report.net / (report.earned || 1) * 100).toFixed(0)}% After Advances</span>
               </div>
               <div className="h-2 bg-amber-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(report.net / (report.earned || 1)) * 100}%` }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="h-full bg-amber-900 rounded-full" 
                  />
               </div>
            </div>
          </motion.div>
        ))}
        {reports.length === 0 && (
          <div className="py-20 text-center opacity-20 italic flex flex-col items-center gap-4">
            <BarChart3 className="w-12 h-12" />
            <p className="text-sm font-bold">No records for this month yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Overlays ---

function AddWorkerModal({ onClose, user }: { onClose: () => void, user: any, key?: React.Key }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [hours, setHours] = useState('8');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salary) return;
    try {
      await addDoc(collection(db, 'workers'), {
        name,
        phone,
        dailySalary: parseFloat(salary),
        workingHours: parseFloat(hours),
        status: 'active',
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workers');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-amber-950/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-md bg-[#FDFCF9] rounded-[3rem] p-8 pb-12 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute right-8 top-8 text-amber-900/40 p-2 hover:bg-amber-50 rounded-full transition-colors"><XCircle /></button>
        <h2 className="text-3xl font-serif font-black text-amber-950 mb-8 pr-12 leading-tight">Contract New Artisan</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Artisan Name" placeholder="e.g. Rahul Sharma" value={name} onChange={setName} />
          <Input label="Primary Phone" placeholder="Contact number" value={phone} onChange={setPhone} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Daily Pay (₹)" type="number" placeholder="500" value={salary} onChange={setSalary} />
            <Input label="Work Hours" type="number" placeholder="8" value={hours} onChange={setHours} />
          </div>
          <button type="submit" className="w-full bg-amber-950 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-amber-950/30 active:scale-95 transition-all mt-4">
            Initialize File
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function WorkerDetailModal({ worker, attendance, payments, onClose, onAddPayment, user }: { worker: Artisan, attendance: AttendanceRecord[], payments: Payment[], onClose: () => void, onAddPayment: () => void, user: any, key?: React.Key }) {
  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      className="fixed inset-0 z-50 bg-[#FDFCF9] flex flex-col max-w-md mx-auto shadow-2xl"
    >
      <header className="p-6 flex items-center gap-6 border-b border-amber-50 bg-white">
         <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-amber-50 rounded-2xl hover:bg-amber-100 transition-colors">
           <ChevronRight className="rotate-180 text-amber-950 w-5 h-5" />
         </button>
         <div>
            <h2 className="text-xl font-serif font-black text-amber-950">Service Record</h2>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-0.5">Individual Archive</p>
         </div>
      </header>
      
      <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-10 scrollbar-hide">
        <div className="text-center py-10">
          <div className="w-28 h-28 bg-amber-100 rounded-[2.5rem] flex items-center justify-center font-serif text-5xl font-black text-amber-900 mx-auto mb-6 border-8 border-white shadow-2xl rotate-3">
            {worker.name[0]}
          </div>
          <h3 className="text-3xl font-serif font-black text-amber-950 mb-2">{worker.name}</h3>
          <div className="flex items-center justify-center p-2 rounded-2xl border border-amber-50 bg-white w-max mx-auto shadow-sm">
             <Phone className="w-3 h-3 text-amber-900 mr-2" />
             <span className="text-[10px] font-black text-amber-900 uppercase tracking-[0.1em]">{worker.phone || 'No Contact Link'}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <DetailStat label="Standard Pay" val={`₹${worker.dailySalary}`} />
          <DetailStat label="Daily Shift" val={`${worker.workingHours}h`} />
          <DetailStat label="Contract" val={worker.status} isBadge />
        </div>

        <section>
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
              <h4 className="font-serif font-black text-amber-950">Financial Ledger</h4>
              <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Advances & payouts</p>
            </div>
            <button 
              onClick={onAddPayment}
              className="px-4 py-2 bg-amber-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-amber-950/20"
            >
              Add Entry
            </button>
          </div>
          <div className="space-y-4">
            {payments.slice().reverse().map(p => (
              <div key={p.id} className="p-5 bg-white rounded-[2.5rem] border border-amber-50 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:scale-105",
                    p.type === 'advance' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                  )}>
                    {p.type === 'advance' ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black uppercase text-amber-950 tracking-tight">{p.type.replace('_', ' ')}</p>
                      {p.paymentMethod && (
                        <span className="text-[7px] font-black uppercase px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 flex items-center gap-1">
                          {p.paymentMethod === 'cash' ? <Banknote className="w-2.5 h-2.5" /> : <Smartphone className="w-2.5 h-2.5" />}
                          {p.paymentMethod}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-tighter">{format(parseISO(p.date), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-black text-xl leading-none mb-1", p.type === 'advance' ? "text-red-500" : "text-green-600")}>
                    {p.type === 'advance' ? '-' : '+'}₹{p.amount.toLocaleString()}
                  </p>
                  <p className="text-[8px] font-black uppercase text-amber-900/20 tracking-widest">Recorded</p>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="py-20 border-2 border-dashed border-amber-100 rounded-[3rem] text-center opacity-20">
                <Wallet className="w-12 h-12 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Zero Transaction History</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-6 px-2">
            <h4 className="font-serif font-black text-amber-950">Attendance Matrix</h4>
            <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Last 10 sessions</p>
          </div>
          <div className="flex gap-2.5 p-4 bg-white border border-amber-50 rounded-[2.5rem] overflow-x-auto scrollbar-hide">
            {[...Array(10)].map((_, i) => {
              const dateObj = new Date();
              dateObj.setDate(dateObj.getDate() - (9 - i));
              const dateStr = format(dateObj, 'yyyy-MM-dd');
              const rec = attendance.find(a => a.date === dateStr);
              
              return (
                <div key={dateStr} className="flex flex-col items-center gap-2 flex-shrink-0">
                   <div className={cn(
                     "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm transition-all",
                     rec?.status === 'present' ? "bg-green-600 text-white scale-110" : 
                     rec?.status === 'absent' ? "bg-red-500 text-white" : "bg-amber-50 text-amber-200"
                   )}>
                     {rec?.status === 'present' ? 'P' : rec?.status === 'absent' ? 'A' : '-'}
                   </div>
                   <span className="text-[8px] font-black text-amber-900/20 uppercase tracking-widest">{format(dateObj, 'EE')}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function AddPaymentModal({ worker, onClose, user }: { worker: Artisan, onClose: () => void, user: any, key?: React.Key }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'advance' | 'deduction'>('advance');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [notes, setNotes] = useState('');

  const { isListening, isSupported, toggleListening } = useSpeechToText((text) => {
    setNotes(prev => (prev + ' ' + text).trim());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    try {
      await addDoc(collection(db, 'payments'), {
        workerId: worker.id,
        amount: parseFloat(amount),
        type,
        paymentMethod,
        notes,
        date: new Date().toISOString(),
        ownerId: user.uid
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-amber-950/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-md bg-white rounded-[3rem] p-8 pb-12 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-8">
           <div className={cn(
             "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
             type === 'advance' ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900"
           )}>
             <Wallet className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-2xl font-serif font-black text-amber-950 leading-tight">Payment Entry</h2>
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Adjust Worker Balance</p>
           </div>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-amber-50 rounded-2xl">
          <button 
            type="button"
            onClick={() => setType('advance')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              type === 'advance' ? "bg-white text-amber-900 shadow-sm" : "text-amber-900/40"
            )}
          >
            Advance
          </button>
          <button 
            type="button"
            onClick={() => setType('deduction')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              type === 'deduction' ? "bg-white text-red-600 shadow-sm" : "text-amber-900/40"
            )}
          >
            Deduction
          </button>
        </div>

        <div className="mb-6">
          <label className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest pl-4 mb-2 block">
            Payment Method
          </label>
          <div className="flex gap-2 p-1 bg-amber-50 rounded-2xl">
            <button 
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                paymentMethod === 'cash' ? "bg-white text-amber-900 shadow-sm" : "text-amber-900/40"
              )}
            >
              <Banknote className="w-3 h-3" />
              Cash
            </button>
            <button 
              type="button"
              onClick={() => setPaymentMethod('online')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                paymentMethod === 'online' ? "bg-white text-amber-900 shadow-sm" : "text-amber-900/40"
              )}
            >
              <Smartphone className="w-3 h-3" />
              Online
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
             label={`${type === 'advance' ? 'Advance' : 'Deduction'} Amount (₹)`} 
             type="number" 
             placeholder="0.00" 
             value={amount} 
             onChange={setAmount} 
             autoFocus 
          />
          <Input label="Reason / Notes" placeholder={type === 'advance' ? 'Personal use, travel...' : 'Fine, damage compensation...'} value={notes} onChange={setNotes} rightElement={isSupported && (
              <button 
                type="button" 
                onClick={() => toggleListening('pa-IN')}
                className={cn("p-2 rounded-xl transition-all shadow-sm flex items-center justify-center", isListening ? "bg-red-100 text-red-500 animate-pulse" : "bg-amber-50 text-amber-900/50 hover:bg-amber-100")}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            )} />
          <div className="flex gap-3 pt-2">
             <button type="button" onClick={onClose} className="flex-1 bg-amber-50 text-amber-950 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px]">Back</button>
             <button type="submit" className="flex-1 bg-amber-950 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-amber-950/20">Finalize</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- UI Primitives ---

function Input({ label, value, onChange, placeholder, type = "text", autoFocus = false, rightElement }: any) {
  return (
    <div className="space-y-2 flex-1 group">
      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-900 opacity-30 ml-2 group-focus-within:opacity-100 transition-opacity">{label}</label>
      <div className="relative">
        <input 
          type={type}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white border border-amber-100 rounded-[1.5rem] p-5 text-sm font-bold text-amber-950 placeholder:text-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-900/20 transition-all shadow-sm",
            rightElement ? "pr-14" : ""
          )}
        />
        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailStat({ label, val, isBadge }: { label: string, val: string, isBadge?: boolean }) {
  return (
    <div className="bg-white p-4 rounded-[1.8rem] border border-amber-50 text-center shadow-sm">
      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-900/30 mb-2">{label}</p>
      {isBadge ? (
        <span className="text-[8px] uppercase font-black bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100">{val}</span>
      ) : (
        <p className="text-sm font-black text-amber-950">{val}</p>
      )}
    </div>
  );
}
