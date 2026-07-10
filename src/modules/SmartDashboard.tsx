import React, { useState, useEffect } from 'react';
import { Radar, Zap, Activity, HardDrive, Layers, CheckCircle2 } from 'lucide-react';

const API_BASE = '/api';

export default function SmartDashboard({ lang = "vi", theme = "dark" }) {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [systemStats, setSystemStats] = useState({ total: 0, free: 0, ramTotal: 0, ramFree: 0 });
  const [junkStats, setJunkStats] = useState({ userCaches: 0, userLogs: 0, xcodeDerivedData: 0, trash: 0 });
  const [largeFiles, setLargeFiles] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [apps, setApps] = useState([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (text) => setLogs(prev => [{ text, time: new Date().toLocaleTimeString() }, ...prev]);

  const fetchSystemStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/system-stats`);
      if (res.ok) setSystemStats(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const handleScan = async () => {
    if (loading || cleaning) return;
    setLoading(true);
    setScanComplete(false);
    addLog('Bắt đầu Phân Tích Toàn Diện hệ thống...');
    
    try {
      await fetchSystemStats();
      addLog('Đang đo kích thước bộ nhớ đệm (Caches), Nhật ký (Logs)...');
      const junkRes = await fetch(`${API_BASE}/junk-stats`);
      setJunkStats(await junkRes.json());
      
      addLog('Đang tìm kiếm các tập tin lớn...');
      const lfRes = await fetch(`${API_BASE}/large-files`);
      setLargeFiles(await lfRes.json());
      
      addLog('Đang quét danh sách ứng dụng...');
      const appsRes = await fetch(`${API_BASE}/apps`);
      setApps(await appsRes.json());
      
      addLog('Đang thống kê tiến trình tiêu thụ tài nguyên...');
      const procRes = await fetch(`${API_BASE}/processes`);
      setProcesses(await procRes.json());
      
      addLog('Phân tích hoàn tất.');
      setScanComplete(true);
    } catch (e) {
      addLog(`Lỗi quét: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartClean = async () => {
    if (cleaning || loading || !scanComplete) return;
    setCleaning(true);
    addLog('Đang tiến hành Dọn Dẹp Thông Minh...');
    
    try {
      const res = await fetch(`${API_BASE}/clean-junk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanCaches: true, cleanLogs: true, cleanXcode: true, cleanTrash: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      addLog(`Hoạt động dọn dẹp đã hoàn tất! Giải phóng: ${formatBytes(data.freedSize)}`);
      setJunkStats({ userCaches: 0, userLogs: 0, xcodeDerivedData: 0, trash: 0 });
      await fetchSystemStats();
    } catch (e) {
      addLog(`Lỗi dọn dẹp: ${e.message}`);
    } finally {
      setCleaning(false);
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
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold italic font-mono">Module 00</span>
            <span className="h-px w-8 bg-text-main/20"></span>
          </div>
          <h2 className="text-3xl font-serif italic leading-tight text-text-main">Smart<br />Dashboard.</h2>
          <p className="text-xs text-text-muted">
            {lang === 'vi' ? 'Hệ thống Telemetry và quét sâu APFS. Cung cấp báo cáo thời gian thực về tình trạng sức khỏe ổ đĩa cứng.' : 'Telemetry system and APFS deep scan. Provides real-time health reports on your storage drive.'}
          </p>
        </div>

        <div className="space-y-4 flex-1">
          <div className="p-4 border border-border-main bg-white/[0.02] rounded space-y-3">
            <div className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold flex items-center justify-between">
              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-accent" /> {lang === 'vi' ? 'Tình trạng' : 'Status'}</span>
              {scanComplete ? (
                <span className="text-accent flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'vi' ? 'Ổn Định' : 'Stable'}</span>
              ) : (
                <span className="text-text-muted">{lang === 'vi' ? 'Chưa rõ' : 'Unknown'}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-text-main/60">Bộ nhớ trống</span>
              <span className="text-accent">{formatBytes(systemStats.free)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-text-main/60">Tổng dung lượng</span>
              <span className="text-text-main">{formatBytes(systemStats.total)}</span>
            </div>
            <div className="h-1.5 w-full bg-text-main/10 rounded overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-1000" 
                style={{ width: `${Math.max(0, 100 - (systemStats.free / systemStats.total) * 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-text-sub bg-black/40 border border-border-main rounded p-4 h-32">
            <p className="text-accent uppercase tracking-widest border-b border-border-main pb-2 mb-2">System Log</p>
            {logs.map((log, i) => (
              <div key={i}><span className="text-text-muted">[{log.time}]</span> {log.text}</div>
            ))}
            {logs.length === 0 && <div className="italic text-text-muted">Waiting for actions...</div>}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleScan}
            disabled={loading || cleaning}
            className={`flex-1 py-4 bg-text-main/5 border border-border-main text-text-main font-bold uppercase text-xs tracking-[0.1em] hover:bg-text-main/10 transition-all ${loading ? 'opacity-50' : ''}`}
          >
            <span className="relative z-10 font-bold uppercase tracking-widest text-[11px]">
              {loading ? (lang === 'vi' ? 'Đang Phân Tích...' : 'Analyzing...') : (lang === 'vi' ? 'Phân Tích Toàn Diện' : 'Full Analysis')}
            </span>
          </button>
          
          <button
            onClick={handleSmartClean}
            disabled={cleaning || loading || !scanComplete}
            className={`flex-1 py-4 bg-accent text-[#080808] font-bold uppercase text-xs tracking-[0.1em] hover:bg-white hover:text-black transition-all ${(cleaning || loading || !scanComplete) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="relative z-10 font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              {cleaning ? (lang === 'vi' ? 'Đang Dọn Dẹp...' : 'Cleaning...') : (lang === 'vi' ? 'Dọn Dẹp Thông Minh' : 'Smart Cleanup')}
            </span>
          </button>
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 p-6 md:p-12 flex items-center justify-center bg-bg-main overflow-y-auto">
        {!scanComplete && !loading ? (
          <div className="text-center opacity-50 space-y-4">
            <Radar className="w-16 h-16 mx-auto text-accent/50" />
            <p className="font-mono text-xs uppercase tracking-widest text-text-sub">Chưa có dữ liệu phân tích</p>
          </div>
        ) : loading ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-border-main border-t-[#A1FF00] animate-spin"></div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Scanning Subsystems...</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 border border-border-main bg-white/[0.02] rounded relative overflow-hidden group hover:border-accent/50 transition-colors">
              <Zap className="w-6 h-6 text-accent mb-4" />
              <h3 className="text-2xl font-serif italic text-text-main">{formatBytes(totalJunk)}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mt-1">Rác Hệ Thống (Có thể dọn)</p>
            </div>
            
            <div className="p-6 border border-border-main bg-white/[0.02] rounded relative overflow-hidden group hover:border-accent/50 transition-colors">
              <HardDrive className="w-6 h-6 text-text-sub mb-4 group-hover:text-accent transition-colors" />
              <h3 className="text-2xl font-serif italic text-text-main">{largeFiles.length}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mt-1">Tệp Tin Lớn / Cũ</p>
            </div>

            <div className="p-6 border border-border-main bg-white/[0.02] rounded relative overflow-hidden group hover:border-accent/50 transition-colors">
              <Activity className="w-6 h-6 text-text-sub mb-4 group-hover:text-accent transition-colors" />
              <h3 className="text-2xl font-serif italic text-text-main">{processes.length}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mt-1">Tiến Trình Chạy Ngầm</p>
            </div>

            <div className="p-6 border border-border-main bg-white/[0.02] rounded relative overflow-hidden group hover:border-accent/50 transition-colors">
              <Layers className="w-6 h-6 text-text-sub mb-4 group-hover:text-accent transition-colors" />
              <h3 className="text-2xl font-serif italic text-text-main">{apps.length}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mt-1">Ứng Dụng Khả Dụng</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
