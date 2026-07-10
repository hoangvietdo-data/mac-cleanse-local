import React, { useState, useEffect } from 'react';
import { Activity, Globe, Cpu, XCircle, ArrowUpDown } from 'lucide-react';

const API_BASE = '/api';

export default function SystemTuning({ lang = "vi", theme = "dark" }) {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [sortParam, setSortParam] = useState('mem'); // mem, cpu
  const [logs, setLogs] = useState([]);

  const addLog = (text) => setLogs(prev => [{ text, time: new Date().toLocaleTimeString() }, ...prev]);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/processes`);
      if (res.ok) setProcesses(await res.json());
    } catch (e) {
      addLog(`Lỗi tải tiến trình: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const killProcess = async (proc) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    addLog(`Đang đóng tiến trình: ${proc.name} (PID: ${proc.pid})...`);

    try {
      const res = await fetch(`${API_BASE}/kill-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: proc.pid })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      addLog(`Đóng tiến trình ${proc.name} thành công.`);
      fetchProcesses();
    } catch (e) {
      addLog(`Lỗi đóng tiến trình: ${e.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const runMaintenance = async (type) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    
    let url = '';
    let startMsg = '';
    
    if (type === 'ram') {
      url = `${API_BASE}/maintenance/ram`;
      startMsg = 'Đang giải phóng bộ nhớ RAM không hoạt động...';
    } else if (type === 'dns') {
      url = `${API_BASE}/maintenance/dns`;
      startMsg = 'Đang xóa cache DNS và khởi động lại dịch vụ...';
    }

    addLog(startMsg);

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (type === 'ram') {
        addLog(`RAM đã được giải phóng! (${formatBytes(data.freedSize)})`);
      } else {
        addLog(`DNS cache đã được dọn dẹp thành công!`);
      }
    } catch (e) {
      addLog(`Bảo trì thất bại: ${e.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, dm = 2, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const sortedProcesses = [...processes].sort((a, b) => {
    if (sortParam === 'mem') return b.mem - a.mem;
    return b.cpu - a.cpu;
  });

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Column */}
      <div className="w-full lg:w-[460px] lg:border-r border-border-main p-6 md:p-10 flex flex-col gap-8 shrink-0 bg-bg-panel">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold italic font-mono">Section 04</span>
            <span className="h-px w-8 bg-text-main/20"></span>
          </div>
          <h2 className="text-3xl font-serif italic leading-tight text-text-main">System<br />Tuning.</h2>
          <p className="text-xs text-text-muted">
            {lang === 'vi' ? 'Giám sát tiến trình và tối ưu hóa tài nguyên (RAM, CPU, DNS).' : 'Monitor processes and optimize system resources (RAM, CPU, DNS).'}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">Bảo Trì Hệ Thống</p>
          <div className="flex gap-2">
            <button 
              onClick={() => runMaintenance('ram')}
              disabled={actionInProgress}
              className="flex-1 p-4 bg-white/[0.02] border border-border-main rounded hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
            >
              <Cpu className="w-5 h-5 text-text-sub mb-2 group-hover:text-accent transition-colors" />
              <div className="text-sm font-bold text-text-main">Purge RAM</div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">Giải phóng RAM thừa</div>
            </button>
            <button 
              onClick={() => runMaintenance('dns')}
              disabled={actionInProgress}
              className="flex-1 p-4 bg-white/[0.02] border border-border-main rounded hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
            >
              <Globe className="w-5 h-5 text-text-sub mb-2 group-hover:text-accent transition-colors" />
              <div className="text-sm font-bold text-text-main">Flush DNS</div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">Xóa bộ đệm mạng</div>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto font-mono text-[10px] text-text-sub bg-black/40 border border-border-main rounded p-4 h-32 mt-4">
          <p className="text-accent uppercase tracking-widest border-b border-border-main pb-2 mb-2">Terminal Log</p>
          {logs.map((log, i) => (
            <div key={i}><span className="text-text-muted">[{log.time}]</span> {log.text}</div>
          ))}
          {logs.length === 0 && <div className="italic text-text-muted">Waiting for actions...</div>}
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 bg-bg-main flex flex-col relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-bg-main/80 backdrop-blur z-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-t-2 border-accent rounded-full animate-spin"></div>
            <p className="mt-4 font-mono text-xs text-accent uppercase tracking-widest">Đang tải tiến trình...</p>
          </div>
        )}
        
        <div className="p-6 md:px-10 md:py-6 border-b border-border-main flex justify-between items-center bg-bg-panel/50">
          <h3 className="font-serif italic text-xl text-text-main">Tiến Trình Chạy Ngầm</h3>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted">Sắp xếp theo:</span>
            <button 
              onClick={() => setSortParam('mem')}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${sortParam === 'mem' ? 'bg-text-main/10 border-border-main text-text-main' : 'border-transparent text-text-muted hover:text-text-main'}`}
            >
              RAM
            </button>
            <button 
              onClick={() => setSortParam('cpu')}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${sortParam === 'cpu' ? 'bg-text-main/10 border-border-main text-text-main' : 'border-transparent text-text-muted hover:text-text-main'}`}
            >
              CPU
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-2">
          {sortedProcesses.map(proc => (
            <div key={proc.pid} className="flex items-center justify-between p-4 bg-white/[0.02] border border-border-main hover:border-border-main transition-all rounded">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-black/50 border border-border-main flex items-center justify-center text-text-muted">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text-main truncate max-w-[200px] md:max-w-xs">{proc.name}</h4>
                  <p className="text-[10px] text-text-muted font-mono">PID: {proc.pid}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">CPU</p>
                    <p className="font-mono text-sm text-text-main">{proc.cpu.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1">RAM</p>
                    <p className="font-mono text-sm text-accent">{formatBytes(proc.mem)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => killProcess(proc)}
                  disabled={actionInProgress}
                  className="p-2 border border-border-main rounded hover:text-red-400 hover:border-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  title="Buộc đóng tiến trình"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          
          {!loading && sortedProcesses.length === 0 && (
            <div className="text-center py-12 text-text-muted font-mono text-xs uppercase">Không có tiến trình nào</div>
          )}
        </div>
      </div>
    </main>
  );
}
