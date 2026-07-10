import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2, FolderOpen, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE = '/api';

export default function SmartCleanup({ lang = "vi", theme = "dark" }) {
  const [junkStats, setJunkStats] = useState({ userCaches: 0, userLogs: 0, xcodeDerivedData: 0, trash: 0 });
  const [selectedJunk, setSelectedJunk] = useState({ caches: true, logs: true, xcode: true, trash: true });
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (text) => setLogs((prev) => [{ text, time: new Date().toLocaleTimeString() }, ...prev]);

  const fetchJunkStats = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}/junk-stats`);
      const data = await res.json();
      setJunkStats(data);
    } catch (e) {
      addLog(`Lỗi tải dữ liệu: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchJunkStats();
  }, []);

  const handleClean = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch(`${API_BASE}/clean-junk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanCaches: selectedJunk.caches,
          cleanLogs: selectedJunk.logs,
          cleanXcode: selectedJunk.xcode,
          cleanTrash: selectedJunk.trash
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addLog(`Đã dọn dẹp thành công ${formatBytes(data.freedSize)}`);
      fetchJunkStats();
    } catch (e) {
      addLog(`Lỗi dọn dẹp: ${e.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, dm = 2, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const totalJunk = junkStats.userCaches + junkStats.userLogs + junkStats.xcodeDerivedData + junkStats.trash;

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Column */}
      <div className="w-full lg:w-[460px] lg:border-r border-border-main p-6 md:p-10 flex flex-col gap-8 shrink-0 bg-bg-panel">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold italic font-mono">Section 02</span>
            <span className="h-px w-8 bg-text-main/20"></span>
          </div>
          <h2 className="text-3xl font-serif italic leading-tight text-text-main">Smart<br />Cleanup.</h2>
          <p className="text-xs text-text-muted">
            {lang === 'vi' ? 'Cấu hình thuật toán dọn rác hệ thống và nhật ký hệ điều hành.' : 'Configure intelligent garbage collection and OS log sweeping algorithms.'}
          </p>
        </div>

        <div className="space-y-4 flex-1">
          <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">Thành phần dọn dẹp</p>
          
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 border border-border-main bg-white/[0.02] rounded cursor-pointer hover:border-border-main transition-all">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedJunk.caches} onChange={(e) => setSelectedJunk({...selectedJunk, caches: e.target.checked})} className="accent-[#A1FF00]" />
                <span className="text-sm font-mono text-text-main/80">User Caches</span>
              </div>
              <span className="text-xs font-mono text-accent font-bold">{formatBytes(junkStats.userCaches)}</span>
            </label>
            <label className="flex items-center justify-between p-3 border border-border-main bg-white/[0.02] rounded cursor-pointer hover:border-border-main transition-all">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedJunk.logs} onChange={(e) => setSelectedJunk({...selectedJunk, logs: e.target.checked})} className="accent-[#A1FF00]" />
                <span className="text-sm font-mono text-text-main/80">User Logs</span>
              </div>
              <span className="text-xs font-mono text-accent font-bold">{formatBytes(junkStats.userLogs)}</span>
            </label>
            <label className="flex items-center justify-between p-3 border border-border-main bg-white/[0.02] rounded cursor-pointer hover:border-border-main transition-all">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedJunk.xcode} onChange={(e) => setSelectedJunk({...selectedJunk, xcode: e.target.checked})} className="accent-[#A1FF00]" />
                <span className="text-sm font-mono text-text-main/80">Xcode DerivedData</span>
              </div>
              <span className="text-xs font-mono text-accent font-bold">{formatBytes(junkStats.xcodeDerivedData)}</span>
            </label>
            <label className="flex items-center justify-between p-3 border border-border-main bg-white/[0.02] rounded cursor-pointer hover:border-border-main transition-all">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedJunk.trash} onChange={(e) => setSelectedJunk({...selectedJunk, trash: e.target.checked})} className="accent-[#A1FF00]" />
                <span className="text-sm font-mono text-text-main/80">Trash Bins</span>
              </div>
              <span className="text-xs font-mono text-accent font-bold">{formatBytes(junkStats.trash)}</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleClean}
          disabled={isCleaning || isScanning}
          className={`w-full py-4 bg-accent text-[#080808] font-bold uppercase text-xs tracking-[0.3em] hover:bg-white hover:text-black transition-all ${isCleaning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCleaning ? 'Đang dọn dẹp...' : 'Dọn rác hệ thống'}
        </button>
      </div>

      {/* Right Column */}
      <div className="flex-1 p-6 md:p-12 lg:p-16 flex flex-col items-center justify-center bg-bg-main">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 mx-auto rounded-full border border-border-main flex items-center justify-center relative">
            <div className={`absolute inset-0 rounded-full border border-accent/20 ${isScanning ? 'animate-spin' : ''}`}></div>
            <Trash2 className={`w-12 h-12 text-accent ${isCleaning ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h1 className="text-5xl font-serif italic text-text-main">{formatBytes(totalJunk)}</h1>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-text-muted mt-2">Tổng không gian có thể giải phóng</p>
          </div>
          
          <div className="mt-8 max-w-lg mx-auto bg-black/40 border border-border-main rounded p-4 text-left font-mono text-[10px] text-text-sub space-y-2 h-48 overflow-y-auto w-full">
            <p className="text-accent uppercase tracking-widest border-b border-border-main pb-2 mb-2">Terminal Log</p>
            {logs.map((log, i) => (
              <div key={i}><span className="text-text-muted">[{log.time}]</span> {log.text}</div>
            ))}
            {logs.length === 0 && <div className="italic text-text-muted">Waiting for actions...</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
