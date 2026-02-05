
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, TrendingUp, Sparkles, ChevronRight, X, Edit3, Target, Heart, Star, Map as MapIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Dream, Milestone, DreamCategory, CATEGORY_COLORS } from './types';
import { getMotivationalInspiration } from './services/geminiService';

const App: React.FC = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [inspiration, setInspiration] = useState<string>("正在為你尋找元氣鼓勵...");
  const [newDreamTitle, setNewDreamTitle] = useState("");
  const [newDreamDesc, setNewDreamDesc] = useState("");
  const [newDreamCategory, setNewDreamCategory] = useState<DreamCategory>('Personal');

  useEffect(() => {
    const saved = localStorage.getItem('dream-path-cute');
    if (saved) {
      try { setDreams(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dream-path-cute', JSON.stringify(dreams));
  }, [dreams]);

  useEffect(() => {
    const fetchInspiration = async () => {
      const msg = await getMotivationalInspiration(dreams.map(d => d.title));
      setInspiration(msg);
    };
    fetchInspiration();
  }, [dreams.length]);

  const totalMilestones = useMemo(() => dreams.reduce((acc, d) => acc + d.milestones.length, 0), [dreams]);
  const completedMilestones = useMemo(() => dreams.reduce((acc, d) => acc + d.milestones.filter(m => m.isCompleted).length, 0), [dreams]);
  const overallProgress = totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

  const chartData = useMemo(() => {
    return [
      { name: '已達成', value: completedMilestones, color: '#f87171' },
      { name: '努力中', value: Math.max(1, totalMilestones - completedMilestones), color: '#fbbf24' }
    ].filter(d => d.value > 0);
  }, [completedMilestones, totalMilestones]);

  const handleAddDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDreamTitle.trim()) return;
    const newDream: Dream = {
      id: crypto.randomUUID(),
      title: newDreamTitle,
      description: newDreamDesc,
      category: newDreamCategory,
      color: CATEGORY_COLORS[newDreamCategory],
      milestones: [],
      createdAt: Date.now(),
    };
    setDreams(prev => [newDream, ...prev]);
    setIsAddModalOpen(false);
    setNewDreamTitle("");
    setNewDreamDesc("");
  };

  const toggleMilestone = (dreamId: string, milestoneId: string) => {
    setDreams(prev => prev.map(d => {
      if (d.id === dreamId) {
        return {
          ...d,
          milestones: d.milestones.map(m => m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m)
        };
      }
      return d;
    }));
  };

  const addMilestone = (dreamId: string, title: string) => {
    if (!title.trim()) return;
    const newM: Milestone = { id: crypto.randomUUID(), title, isCompleted: false, createdAt: Date.now() };
    setDreams(prev => prev.map(d => d.id === dreamId ? { ...d, milestones: [...d.milestones, newM] } : d));
  };

  useEffect(() => {
    if (selectedDream) {
      const updated = dreams.find(d => d.id === selectedDream.id);
      if (updated) setSelectedDream(updated);
    }
  }, [dreams]);

  return (
    <div className="min-h-screen pb-24">
      {/* Header Section */}
      <header className="pt-10 pb-6 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-4 animate-float">
              <div className="bg-yellow-400 p-3 rounded-3xl border-4 border-amber-900 shadow-[0_6px_0_#78350f]">
                <Star size={32} className="text-white fill-current" />
              </div>
              <h1 className="text-4xl font-black text-amber-900 tracking-tight">
                DreamPath!
              </h1>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="game-button flex items-center gap-2 bg-green-400 hover:bg-green-300 text-white px-8 py-4 rounded-[2rem] text-xl font-bold border-green-700 shadow-[0_6px_0_#15803d] transition-all"
            >
              <Plus size={24} strokeWidth={3} />
              <span>種下夢想</span>
            </button>
          </div>

          {/* Scrolling Marquee */}
          <div className="bg-white border-4 border-amber-900 rounded-[2rem] py-3 px-4 relative overflow-hidden shadow-[0_6px_0_#fde68a] mb-10">
            <div className="animate-marquee inline-block">
              <div className="flex gap-16 items-center">
                {dreams.length > 0 ? dreams.map(d => (
                  <span key={d.id} className="text-xl font-bold text-amber-900 flex items-center gap-3">
                    <Heart size={20} className="text-rose-400 fill-current" /> {d.title}
                  </span>
                )) : (
                  <span className="text-xl font-bold text-amber-800 opacity-60">今天也是充滿元氣的一天！點擊右上方按鈕來登記第一個夢想吧！嘿嘿～</span>
                )}
                {/* Repetition for continuous scroll */}
                {dreams.map(d => (
                  <span key={d.id + '-rep'} className="text-xl font-bold text-amber-900 flex items-center gap-3">
                    <Heart size={20} className="text-rose-400 fill-current" /> {d.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Side: Progress & Inspiration */}
        <div className="lg:col-span-4 space-y-10">
          <section className="game-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-400 p-2 rounded-2xl border-2 border-amber-900">
                <TrendingUp size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-amber-900">建設進度</h2>
            </div>
            
            <div className="h-48 relative mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none" strokeWidth={5}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-amber-900">{overallProgress}%</span>
                <span className="text-xs font-bold text-amber-700/60">完成率</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50 p-4 rounded-[1.5rem] text-center border-2 border-amber-100">
                <p className="text-2xl font-black text-amber-900">{dreams.length}</p>
                <p className="text-xs font-bold text-amber-700/60 uppercase">夢想</p>
              </div>
              <div className="bg-rose-50 p-4 rounded-[1.5rem] text-center border-2 border-rose-100">
                <p className="text-2xl font-black text-rose-500">{completedMilestones}</p>
                <p className="text-xs font-bold text-rose-300 uppercase">已完成</p>
              </div>
            </div>
          </section>

          <section className="relative px-2">
            <div className="speech-bubble p-6 mb-4 animate-float">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-yellow-500 fill-current" />
                <span className="text-sm font-black text-amber-900">島內廣播：</span>
              </div>
              <p className="text-lg font-bold text-amber-900 leading-relaxed italic">
                「{inspiration}」
              </p>
            </div>
            <div className="ml-8 mt-2 flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-400 rounded-full border-4 border-amber-900 shadow-lg flex items-center justify-center text-white text-xl">
                🐶
              </div>
              <span className="font-bold text-amber-900">西施惠</span>
            </div>
          </section>
        </div>

        {/* Right Side: Dream Island */}
        <div className="lg:col-span-8">
          <div className="flex items-center gap-4 mb-8">
             <div className="bg-amber-400 p-2 rounded-2xl border-2 border-amber-900">
                <MapIcon size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-amber-900">我的夢想小島</h2>
          </div>

          {dreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {dreams.map(dream => {
                const completedCount = dream.milestones.filter(m => m.isCompleted).length;
                const totalCount = dream.milestones.length;
                const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

                return (
                  <div 
                    key={dream.id}
                    onClick={() => setSelectedDream(dream)}
                    className="game-card group cursor-pointer overflow-hidden p-6 hover-jelly"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-4 py-1 rounded-full text-xs font-black text-white bg-gradient-to-r ${dream.color} border-2 border-amber-900/10 shadow-sm`}>
                        {dream.category}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('真的要刪除這個夢想嗎？')) setDreams(prev => prev.filter(d => d.id !== dream.id)); }}
                        className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <h3 className="text-2xl font-black text-amber-900 mb-2 leading-tight group-hover:text-blue-500 transition-colors">
                      {dream.title}
                    </h3>
                    <p className="text-amber-800/60 text-sm mb-6 h-10 overflow-hidden line-clamp-2">
                      {dream.description || "還在規劃中呢！"}
                    </p>

                    <div className="space-y-3">
                      <div className="h-4 w-full bg-amber-50 rounded-full border-2 border-amber-900/10 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${dream.color} transition-all duration-700`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-amber-900">
                        <span>{completedCount} / {totalCount} 目標</span>
                        <div className="flex items-center gap-1 text-blue-500">
                          進度 {progress}% <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="game-card border-dashed border-8 p-16 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-200">
                <Plus size={64} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-amber-900 mb-2">小島還空蕩蕩的...</h3>
              <p className="text-amber-700/60 mb-8 max-w-xs">點擊「種下夢想」來開始你的第一個未來計畫吧！加油唷！</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="game-button bg-amber-400 text-white px-8 py-4 rounded-[2rem] font-black text-xl border-amber-600 shadow-[0_6px_0_#d97706]"
              >
                前往啟程
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-amber-900/40 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
          <div className="bg-white border-8 border-amber-900 rounded-[3rem] w-full max-w-md p-10 shadow-[0_12px_0_#78350f]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-amber-900">規劃新計畫</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-amber-50 p-2 rounded-full text-amber-900">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddDream} className="space-y-6">
              <div>
                <label className="block text-sm font-black text-amber-800 mb-2">夢想名稱</label>
                <input required type="text" value={newDreamTitle} onChange={e => setNewDreamTitle(e.target.value)} placeholder="想做的事..." className="w-full bg-amber-50 border-4 border-amber-100 rounded-[1.5rem] px-6 py-4 font-bold text-amber-900 focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-black text-amber-800 mb-2">具體類別</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_COLORS) as DreamCategory[]).map(cat => (
                    <button key={cat} type="button" onClick={() => setNewDreamCategory(cat)} className={`py-2 rounded-xl text-xs font-black border-4 transition-all ${newDreamCategory === cat ? 'bg-amber-400 border-amber-600 text-white' : 'bg-white border-amber-100 text-amber-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="game-button w-full bg-blue-400 text-white font-black py-5 rounded-[2rem] text-xl border-blue-600 shadow-[0_6px_0_#2563eb]">
                確認登錄！
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-900/60 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="bg-white border-8 border-amber-900 rounded-[3rem] w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden shadow-[0_16px_0_#78350f]">
            
            <div className="p-10 pb-6 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <div className={`inline-block px-4 py-1 rounded-full text-xs font-black text-white bg-gradient-to-r ${selectedDream.color}`}>
                    {selectedDream.category}
                  </div>
                  <h2 className="text-4xl font-black text-amber-900">{selectedDream.title}</h2>
                  <p className="text-amber-800/50 font-bold">{selectedDream.description || "一個很棒的夢想！"}</p>
                </div>
                <button onClick={() => setSelectedDream(null)} className="p-4 bg-amber-50 hover:bg-amber-100 rounded-full text-amber-900">
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-4 custom-scrollbar">
               <div className="bg-amber-50/50 rounded-[2rem] p-8 border-4 border-amber-100 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black text-amber-900">小小目標清單</h3>
                    <span className="bg-white px-4 py-1 rounded-full border-2 border-amber-100 text-amber-900 font-bold text-sm">
                      {selectedDream.milestones.filter(m => m.isCompleted).length} / {selectedDream.milestones.length}
                    </span>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.target as any).elements.milestone;
                      addMilestone(selectedDream.id, input.value);
                      input.value = "";
                    }}
                    className="flex gap-4 mb-8"
                  >
                    <input 
                      name="milestone" required
                      placeholder="下一步要做什麼？"
                      className="flex-1 bg-white border-4 border-amber-100 rounded-[1.5rem] px-6 py-4 font-bold text-amber-900 focus:outline-none focus:border-amber-400"
                    />
                    <button type="submit" className="game-button bg-orange-400 text-white p-4 rounded-[1.5rem] border-orange-600 shadow-[0_6px_0_#c2410c]">
                      <Plus size={28} strokeWidth={4} />
                    </button>
                  </form>

                  <div className="space-y-4">
                    {selectedDream.milestones.length > 0 ? (
                      selectedDream.milestones.sort((a,b) => b.createdAt - a.createdAt).map(m => (
                        <div key={m.id} className={`group flex items-center gap-4 p-5 rounded-[1.5rem] border-4 transition-all ${m.isCompleted ? 'bg-amber-100/30 border-amber-100 text-amber-300' : 'bg-white border-amber-100 text-amber-900 shadow-sm'}`}>
                          <button 
                            onClick={() => toggleMilestone(selectedDream.id, m.id)}
                            className={`flex-shrink-0 transition-all ${m.isCompleted ? 'text-green-500 scale-125' : 'text-amber-200 hover:text-amber-400'}`}
                          >
                            {m.isCompleted ? <CheckCircle2 size={32} /> : <Circle size={32} strokeWidth={3} />}
                          </button>
                          <span className={`flex-1 text-xl font-bold ${m.isCompleted ? 'line-through' : ''}`}>
                            {m.title}
                          </span>
                          <button 
                             onClick={() => setDreams(prev => prev.map(d => d.id === selectedDream.id ? { ...d, milestones: d.milestones.filter(ms => ms.id !== m.id) } : d))}
                             className="opacity-0 group-hover:opacity-100 p-2 text-rose-300 hover:text-rose-500"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 opacity-30">
                        <Plus size={64} className="mx-auto mb-4" />
                        <p className="font-bold">新增小目標，讓夢想成真吧！</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="p-10 border-t-8 border-amber-100">
              <button 
                onClick={() => setSelectedDream(null)}
                className="game-button w-full bg-amber-900 text-white font-black py-5 rounded-[2rem] text-xl border-amber-950 shadow-[0_6px_0_#451a03]"
              >
                收好計畫清單
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 w-full py-6 px-10 flex justify-center z-40">
        <div className="bg-white border-4 border-amber-900 rounded-full px-8 py-3 shadow-[0_6px_0_#fde68a] flex items-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <p className="text-sm font-black text-amber-900">
             每一小步都是通往夢想大島的路！加油唷！嘿嘿～
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
