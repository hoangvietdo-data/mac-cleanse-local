import React, { useState, useEffect } from 'react';
import { Layers, Search, ShieldAlert, Archive, Trash2, Zap, Package } from 'lucide-react';

const API_BASE = '/api';

export default function AppSlimmer({ lang = "vi", theme = "dark" }) {
  const [apps, setApps] = useState([]);
  const [leftovers, setLeftovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [view, setView] = useState('apps'); // apps, leftovers
  const [search, setSearch] = useState('');
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [selectedLeftovers, setSelectedLeftovers] = useState(new Set());
  const [logs, setLogs] = useState([]);

  const addLog = (text) => setLogs((prev) => [{ text, time: new Date().toLocaleTimeString() }, ...prev]);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/apps`);
      if (res.ok) setApps(await res.json());
    } catch (e) {
      addLog(`Lỗi tải apps: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeftovers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/scan-leftovers`);
      if (res.ok) setLeftovers(await res.json());
    } catch (e) {
      addLog(`Lỗi tải leftovers: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'apps') fetchApps();
    else fetchLeftovers();
  }, [view]);

  const handleAppAction = async (type, app) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    let url = '', body = {};
    
    if (type === 'compress') {
      url = `${API_BASE}/compress`;
      body = { appPath: app.path };
      addLog(`Đang nén ${app.name}...`);
    } else if (type === 'offload') {
      url = `${API_BASE}/offload`;
      body = { appPath: app.path, bundleId: app.bundleId, executableName: app.executableName };
      addLog(`Đang giải phóng ${app.name}...`);
    } else if (type === 'restore') {
      url = `${API_BASE}/restore`;
      body = { appPath: app.path, bundleId: app.bundleId };
      addLog(`Đang phục hồi ${app.name}...`);
    } else if (type === 'clean') {
      url = `${API_BASE}/clean-cache`;
      body = { cachePath: app.cachePath };
      addLog(`Đang xóa cache ${app.name}...`);
    } else if (type === 'uninstall') {
      url = `${API_BASE}/uninstall`;
      body = { appPath: app.path, cachePath: app.cachePath };
      addLog(`Đang gỡ cài đặt ${app.name}...`);
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addLog(`Hành động ${type} hoàn tất cho ${app.name}.`);
      fetchApps();
    } catch (e) {
      addLog(`Lỗi: ${e.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteLeftovers = async () => {
    if (selectedLeftovers.size === 0 || actionInProgress) return;
    setActionInProgress(true);
    addLog(`Đang dọn dẹp ${selectedLeftovers.size} tàn dư...`);
    try {
      const paths = Array.from(selectedLeftovers);
      const res = await fetch(`${API_BASE}/delete-leftovers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths })
      });
      if (res.ok) {
        addLog(`Dọn dẹp tàn dư thành công!`);
        setSelectedLeftovers(new Set());
        fetchLeftovers();
      }
    } catch (e) {
      addLog(`Lỗi: ${e.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredApps = apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.bundleId.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Column */}
      <div className="w-full lg:w-[460px] lg:border-r border-border-main p-6 md:p-10 flex flex-col gap-8 shrink-0 bg-bg-panel">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold italic font-mono">Section 05</span>
            <span className="h-px w-8 bg-text-main/20"></span>
          </div>
          <h2 className="text-3xl font-serif italic leading-tight text-text-main">App<br />Slimmer.</h2>
          <p className="text-xs text-text-muted">
            {lang === 'vi' ? 'Giải phóng dung lượng ứng dụng mà không cần gỡ cài đặt (Offload & Nén).' : 'Free up app storage without uninstalling via Offload & APFS compression.'}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">Chế độ hiển thị</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setView('apps')}
              className={`flex-1 py-3 text-xs font-mono font-bold tracking-wider rounded border transition-all ${view === 'apps' ? 'bg-accent text-black border-accent' : 'bg-transparent text-text-sub border-border-main hover:border-white/30'}`}
            >
              ỨNG DỤNG
            </button>
            <button 
              onClick={() => setView('leftovers')}
              className={`flex-1 py-3 text-xs font-mono font-bold tracking-wider rounded border transition-all ${view === 'leftovers' ? 'bg-amber-400 text-black border-amber-400' : 'bg-transparent text-text-sub border-border-main hover:border-white/30'}`}
            >
              TÀN DƯ (LEFTOVERS)
            </button>
          </div>
        </div>

        {view === 'apps' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-bg-main border border-border-main rounded px-3 py-2">
              <Search className="w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="bg-transparent border-none outline-none text-sm text-text-main flex-1 font-mono placeholder-white/30"
                placeholder="Tìm kiếm ứng dụng..."
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 font-mono text-[10px] text-text-sub bg-black/40 border border-border-main rounded p-4">
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
            <p className="mt-4 font-mono text-xs text-accent uppercase tracking-widest">Đang tải dữ liệu...</p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {view === 'leftovers' && (
            <div className="mb-6 flex justify-between items-center">
              <h3 className="font-serif text-xl italic text-text-main">Tìm thấy {leftovers.length} tàn dư</h3>
              <button 
                onClick={handleDeleteLeftovers}
                disabled={selectedLeftovers.size === 0 || actionInProgress}
                className="px-4 py-2 bg-red-500/20 text-red-400 font-mono text-xs font-bold uppercase tracking-wider rounded border border-red-500/50 hover:bg-red-500/30 disabled:opacity-50"
              >
                Xóa mục đã chọn ({selectedLeftovers.size})
              </button>
            </div>
          )}

          <div className="space-y-2">
            {view === 'apps' ? filteredApps.map(app => (
              <div key={app.bundleId} className="flex items-center justify-between p-4 bg-white/[0.02] border border-border-main hover:border-border-main transition-all rounded">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-black/50 border border-border-main flex items-center justify-center overflow-hidden">
                    {app.icon ? <img src={app.icon} alt={app.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-text-muted" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-main">{app.name}</h4>
                    <p className="text-[10px] text-text-muted font-mono">{app.bundleId}</p>
                    <div className="flex gap-2 mt-1">
                      {app.isSystem && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">System</span>}
                      {app.isRunning && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 font-mono">Running</span>}
                      {app.isStub && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-400 font-mono">Offloaded</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-mono text-xs text-text-main/80">{formatBytes(app.physicalSize)}</p>
                    <p className="font-mono text-[10px] text-text-muted">Cache: {formatBytes(app.cacheSize)}</p>
                  </div>
                  {!app.isSystem && (
                    <div className="flex gap-2">
                      {!app.isStub && <button onClick={() => handleAppAction('compress', app)} className="p-2 border border-border-main rounded hover:text-accent hover:border-accent transition-colors"><Archive className="w-4 h-4" /></button>}
                      {!app.isStub && <button onClick={() => handleAppAction('offload', app)} className="p-2 border border-border-main rounded hover:text-blue-400 hover:border-blue-400 transition-colors"><Layers className="w-4 h-4" /></button>}
                      {app.isStub && <button onClick={() => handleAppAction('restore', app)} className="p-2 border border-accent/50 rounded text-accent hover:bg-accent/10 transition-colors">Restore</button>}
                      <button onClick={() => handleAppAction('uninstall', app)} className="p-2 border border-border-main rounded hover:text-red-400 hover:border-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            )) : leftovers.map(l => (
              <div key={l.path} className="flex flex-col gap-2 p-4 bg-white/[0.02] border border-border-main hover:border-border-main transition-all rounded">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={selectedLeftovers.has(l.path)}
                      onChange={(e) => {
                        const newSet = new Set(selectedLeftovers);
                        if (e.target.checked) newSet.add(l.path);
                        else newSet.delete(l.path);
                        setSelectedLeftovers(newSet);
                      }}
                      className="accent-red-500"
                    />
                    <div>
                      <p className="text-sm font-mono text-text-main/80 truncate max-w-lg">{l.path}</p>
                      <p className="text-xs text-text-muted">{l.consequence}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-amber-400">{formatBytes(l.size)}</span>
                </div>
                <div className="ml-7 flex gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${l.safety === 'Safe' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {l.safety}
                  </span>
                </div>
              </div>
            ))}
            
            {view === 'apps' && filteredApps.length === 0 && !loading && (
              <div className="text-center py-12 text-text-muted font-mono text-xs uppercase">No applications found</div>
            )}
            {view === 'leftovers' && leftovers.length === 0 && !loading && (
              <div className="text-center py-12 text-accent font-mono text-xs uppercase flex items-center justify-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Hệ thống sạch sẽ, không có tàn dư
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
