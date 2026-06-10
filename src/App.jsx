import React, { useState, useEffect } from 'react';

// API Base URL
const API_BASE = '/api';

// Format bytes to readable string (e.g. GB, MB, KB)
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Format date to "time ago"
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Không rõ';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 30) return `${diffDays} ngày trước`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  return `${Math.floor(diffMonths / 12)} năm trước`;
};

// Inline SVG Icons
const Icons = {
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  ),
  Refresh: ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
  ),
  Terminal: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
  ),
  Radar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path><path d="M12 12L21.9 8"></path></svg>
  ),
  Junk: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
  ),
  LargeFiles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
  ),
  Optimization: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
  ),
  Maintenance: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
  ),
  AppSlimmer: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
  ),
  Compress: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6"></path><path d="M20 10h-6V4"></path><path d="M14 10l7-7"></path><path d="M10 14l-7 7"></path></svg>
  ),
  Offload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
  ),
  Restore: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
  ),
  Clean: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>
  ),
  Memory: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="10" y1="6" x2="10.01" y2="6"></line><line x1="14" y1="6" x2="14.01" y2="6"></line><line x1="18" y1="6" x2="18.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line><line x1="10" y1="18" x2="10.01" y2="18"></line><line x1="14" y1="18" x2="14.01" y2="18"></line><line x1="18" y1="18" x2="18.01" y2="18"></line></svg>
  ),
  Uninstall: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
  )
};

export default function App() {
  const [activeTab, setActiveTab] = useState('smart_scan');
  
  // State
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [logs, setLogs] = useState([]);
  const [systemStats, setSystemStats] = useState({ total: 0, occupied: 0, free: 0 });
  const [modal, setModal] = useState({ isOpen: false, type: '', data: null });

  // Tab 1: Smart Scan States
  const [scanState, setScanState] = useState('idle'); // idle, scanning, scanned, cleaning, cleaned
  
  // Tab 2: System Junk States
  const [junkStats, setJunkStats] = useState({ userCaches: 0, userLogs: 0, xcodeDerivedData: 0, trash: 0 });
  const [selectedJunk, setSelectedJunk] = useState({ caches: true, logs: true, xcode: true, trash: true });

  // Tab 3: Large Files States
  const [largeFiles, setLargeFiles] = useState([]);
  const [selectedLargeFiles, setSelectedLargeFiles] = useState(new Set());
  const [largeFilesCategory, setLargeFilesCategory] = useState('All'); // All, Video, Archive, Document, Audio, Image, Other

  // Tab 4: Processes States
  const [processes, setProcesses] = useState([]);
  const [processSort, setProcessSort] = useState('mem'); // mem, cpu

  // Tab 5: App Slimmer States
  const [apps, setApps] = useState([]);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [appFilter, setAppFilter] = useState('all'); // all, slimmable, offloaded, running, system
  const [appSearch, setAppSearch] = useState('');

  // Add a line to the action console
  const addLog = (text, type = 'info') => {
    setLogs((prev) => [
      { text, type, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49)
    ]);
  };

  // Scan System Space Stats
  const fetchSystemStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/system-stats`);
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Smart Scan (performs scan across all domains)
  const runSmartScan = async () => {
    if (loading) return;
    setLoading(true);
    setScanState('scanning');
    addLog('Bắt đầu Quét Thông Minh...', 'info');

    try {
      addLog('Đang phân tích dung lượng ổ đĩa hệ thống...', 'info');
      await fetchSystemStats();

      addLog('Đang đo kích thước bộ nhớ đệm (Caches), Nhật ký (Logs) và Xcode DerivedData...', 'info');
      const junkRes = await fetch(`${API_BASE}/junk-stats`);
      const junkData = await junkRes.json();
      setJunkStats(junkData);

      addLog('Đang tìm kiếm các tập tin lớn (>50 MB) trong thư mục người dùng...', 'info');
      const lfRes = await fetch(`${API_BASE}/large-files`);
      const lfData = await lfRes.json();
      setLargeFiles(lfData);

      addLog('Đang quét danh sách ứng dụng khả dụng...', 'info');
      const appsRes = await fetch(`${API_BASE}/apps`);
      const appsData = await appsRes.json();
      setApps(appsData);

      addLog('Đang thống kê tiến trình tiêu thụ nhiều tài nguyên CPU/RAM...', 'info');
      const procRes = await fetch(`${API_BASE}/processes`);
      const procData = await procRes.json();
      setProcesses(procData);

      setScanState('scanned');
      addLog('Quét Thông Minh hoàn tất! Bạn có thể xem kết quả chi tiết ở từng mục hoặc chọn dọn dẹp ngay.', 'success');
    } catch (e) {
      setScanState('idle');
      addLog(`Quét thất bại: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fast fetch data when tabs are switched
  const loadTabData = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'system_junk') {
        const res = await fetch(`${API_BASE}/junk-stats`);
        const data = await res.json();
        setJunkStats(data);
      } else if (tab === 'large_files') {
        const res = await fetch(`${API_BASE}/large-files`);
        const data = await res.json();
        setLargeFiles(data);
        setSelectedLargeFiles(new Set());
      } else if (tab === 'optimization') {
        const res = await fetch(`${API_BASE}/processes`);
        const data = await res.json();
        setProcesses(data);
      } else if (tab === 'app_slimmer') {
        const res = await fetch(`${API_BASE}/apps`);
        const data = await res.json();
        setApps(data);
        setSelectedApps(new Set());
      }
      await fetchSystemStats();
    } catch (e) {
      addLog(`Lỗi tải dữ liệu cho tab: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
    if (activeTab !== 'smart_scan') {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  // Clean System Junk
  const cleanJunk = async (isSmartClean = false) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    if (!isSmartClean) setLoading(true);
    
    addLog('Bắt đầu dọn dẹp rác hệ thống...', 'info');
    try {
      const res = await fetch(`${API_BASE}/clean-junk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanCaches: isSmartClean ? true : selectedJunk.caches,
          cleanLogs: isSmartClean ? true : selectedJunk.logs,
          cleanXcode: isSmartClean ? true : selectedJunk.xcode,
          cleanTrash: isSmartClean ? true : selectedJunk.trash
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      data.logs.forEach(l => addLog(l, 'success'));
      addLog('Đã dọn sạch rác hệ thống thành công!', 'success');

      // Reload
      if (isSmartClean) {
        setJunkStats({ userCaches: 0, userLogs: 0, xcodeDerivedData: 0, trash: 0 });
      } else {
        await loadTabData('system_junk');
      }
    } catch (e) {
      addLog(`Lỗi dọn dẹp: ${e.message}`, 'error');
    } finally {
      setActionInProgress(false);
      if (!isSmartClean) setLoading(false);
    }
  };

  // Smart Clean (All-in-one Smart Clean)
  const cleanEverythingSmart = async () => {
    if (actionInProgress) return;
    setActionInProgress(true);
    setScanState('cleaning');
    addLog('Đang tiến hành dọn dẹp thông minh toàn bộ hệ thống...', 'info');

    try {
      // 1. Clean Junk
      await cleanJunk(true);

      // 2. Refresh stats
      await fetchSystemStats();
      
      setScanState('cleaned');
      addLog('Hoạt động dọn dẹp thông minh đã hoàn tất xuất sắc!', 'success');
    } catch (e) {
      setScanState('scanned');
      addLog(`Dọn dẹp thông minh gặp lỗi: ${e.message}`, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete specific Large File
  const deleteLargeFile = async (file) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    addLog(`Đang xóa tập tin lớn: ${file.name}...`, 'info');
    
    try {
      const res = await fetch(`${API_BASE}/delete-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: file.path })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      addLog(`Đã xóa thành công tệp: ${file.name}`, 'success');
      await loadTabData('large_files');
    } catch (e) {
      addLog(`Xóa tệp thất bại: ${e.message}`, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete selected large files bulk
  const deleteSelectedLargeFiles = async () => {
    if (selectedLargeFiles.size === 0 || actionInProgress) return;
    setActionInProgress(true);
    addLog(`Đang xóa ${selectedLargeFiles.size} tập tin lớn đã chọn...`, 'info');

    let success = 0;
    let fail = 0;

    for (const filePath of selectedLargeFiles) {
      try {
        const res = await fetch(`${API_BASE}/delete-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath })
        });
        if (res.ok) success++;
        else fail++;
      } catch (e) {
        fail++;
      }
    }

    addLog(`Xóa hàng loạt hoàn tất. Thành công: ${success}, Thất bại: ${fail}`, 'success');
    setSelectedLargeFiles(new Set());
    setActionInProgress(false);
    loadTabData('large_files');
  };

  // Force close Process
  const killProcess = async (proc) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    addLog(`Đang gửi tín hiệu buộc đóng tiến trình: ${proc.name} (PID: ${proc.pid})...`, 'info');

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
      addLog(`Buộc đóng tiến trình ${proc.name} thành công.`, 'success');
      // Reload processes
      const procRes = await fetch(`${API_BASE}/processes`);
      const procData = await procRes.json();
      setProcesses(procData);
    } catch (e) {
      addLog(`Không thể tắt tiến trình ${proc.name}: ${e.message}`, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Maintenance Actions
  const runMaintenance = async (type) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    
    let url = '';
    let startMsg = '';
    let successMsg = '';
    let errorMsg = '';

    if (type === 'ram') {
      url = `${API_BASE}/maintenance/ram`;
      startMsg = 'Đang giải phóng bộ nhớ RAM không hoạt động (Purge RAM Cache)...';
      successMsg = 'RAM đã được dọn sạch hoàn hảo!';
      errorMsg = 'Giải phóng RAM thất bại.';
    } else if (type === 'dns') {
      url = `${API_BASE}/maintenance/dns`;
      startMsg = 'Đang xóa cache và khởi động lại dịch vụ DNS resolver...';
      successMsg = 'Xóa DNS Cache thành công!';
      errorMsg = 'Xóa DNS Cache thất bại.';
    }

    addLog(startMsg, 'info');

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addLog(successMsg, 'success');
      await fetchSystemStats();
    } catch (e) {
      addLog(`${errorMsg} Chi tiết: ${e.message}`, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // App Slimmer backend actions
  const handleAppAction = async (type, app) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    setModal({ isOpen: false, type: '', data: null });
    
    let url = '';
    let body = {};
    let startMsg = '';
    let successMsg = '';
    let errorMsg = '';

    switch (type) {
      case 'compress':
        url = `${API_BASE}/compress`;
        body = { appPath: app.path };
        startMsg = `Đang nén ứng dụng "${app.name}" bằng APFS...`;
        successMsg = `Đã nén thành công "${app.name}".`;
        errorMsg = `Nén "${app.name}" thất bại.`;
        break;
      case 'offload':
        url = `${API_BASE}/offload`;
        body = { appPath: app.path, bundleId: app.bundleId, executableName: app.executableName };
        startMsg = `Đang giải phóng dung lượng cho "${app.name}" và tạo stub tự phục hồi...`;
        successMsg = `Giải phóng thành công "${app.name}". Chỉ giữ lại stub để kích hoạt.`;
        errorMsg = `Giải phóng "${app.name}" thất bại.`;
        break;
      case 'restore':
        url = `${API_BASE}/restore`;
        body = { appPath: app.path, bundleId: app.bundleId };
        startMsg = `Đang phục hồi ứng dụng "${app.name}" từ file lưu trữ...`;
        successMsg = `Phục hồi thành công "${app.name}". Bạn đã có thể sử dụng bình thường.`;
        errorMsg = `Phục hồi "${app.name}" thất bại.`;
        break;
      case 'clean':
        url = `${API_BASE}/clean-cache`;
        body = { cachePath: app.cachePath };
        startMsg = `Đang dọn dẹp dữ liệu ẩn & bộ nhớ đệm cho "${app.name}"...`;
        successMsg = `Đã dọn dẹp sạch dữ liệu ẩn & bộ nhớ đệm cho "${app.name}".`;
        errorMsg = `Dọn dẹp dữ liệu ẩn cho "${app.name}" thất bại.`;
        break;
      case 'uninstall':
        url = `${API_BASE}/uninstall`;
        body = { appPath: app.path, cachePath: app.cachePath };
        startMsg = `Đang thực hiện gỡ cài đặt sạch ứng dụng "${app.name}"...`;
        successMsg = `Đã gỡ cài đặt hoàn toàn "${app.name}" và xóa các file liên quan.`;
        errorMsg = `Gỡ cài đặt "${app.name}" thất bại.`;
        break;
      default:
        setActionInProgress(false);
        return;
    }

    addLog(startMsg, 'info');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addLog(successMsg, 'success');
      await loadTabData('app_slimmer');
    } catch (e) {
      addLog(`${errorMsg} Chi tiết: ${e.message}`, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Bulk operations App Slimmer
  const handleBulkAppAction = async (type) => {
    if (selectedApps.size === 0 || actionInProgress) return;
    const appsToProcess = apps.filter(a => selectedApps.has(a.bundleId));
    addLog(`Bắt đầu xử lý hàng loạt (${type}) cho ${appsToProcess.length} ứng dụng...`, 'info');
    
    setActionInProgress(true);
    let success = 0;
    let fail = 0;

    for (const app of appsToProcess) {
      if (app.isSystem) continue;
      if (app.isRunning && type !== 'clean') continue;

      let url = '';
      let body = {};
      
      if (type === 'compress' && !app.isStub) {
        url = `${API_BASE}/compress`;
        body = { appPath: app.path };
      } else if (type === 'offload' && !app.isStub) {
        url = `${API_BASE}/offload`;
        body = { appPath: app.path, bundleId: app.bundleId, executableName: app.executableName };
      } else if (type === 'clean' && app.cacheSize > 0) {
        url = `${API_BASE}/clean-cache`;
        body = { cachePath: app.cachePath };
      }

      if (!url) continue;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) success++;
        else fail++;
      } catch (e) {
        fail++;
      }
    }

    addLog(`Đã hoàn tất hoạt động hàng loạt. Thành công: ${success}, Thất bại: ${fail}`, 'success');
    setActionInProgress(false);
    setSelectedApps(new Set());
    loadTabData('app_slimmer');
  };

  // Calculations
  const totalSystemJunk = junkStats.userCaches + junkStats.userLogs + junkStats.xcodeDerivedData + junkStats.trash;
  const filteredLargeFiles = largeFiles.filter(f => largeFilesCategory === 'All' || f.category === largeFilesCategory);
  
  // Sort processes
  const sortedProcesses = [...processes].sort((a, b) => {
    if (processSort === 'mem') return b.mem - a.mem;
    return b.cpu - a.cpu;
  });

  // App Slimmer Filter
  const filteredApps = apps.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(appSearch.toLowerCase()) || app.bundleId.toLowerCase().includes(appSearch.toLowerCase());
    if (!matchesSearch) return false;

    switch (appFilter) {
      case 'slimmable': return !app.isSystem && !app.isStub;
      case 'offloaded': return app.isStub;
      case 'running': return app.isRunning;
      case 'system': return app.isSystem;
      default: return true;
    }
  });

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon">▲</div>
            <div className="brand-name">MacCleanse Local</div>
          </div>
          
          <ul className="sidebar-menu">
            <li>
              <a className={`menu-item ${activeTab === 'smart_scan' ? 'active' : ''}`} onClick={() => setActiveTab('smart_scan')}>
                <Icons.Radar /> Quét Thông Minh
              </a>
            </li>
            <div style={{ margin: '10px 0 5px 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Dọn Dẹp</div>
            <li>
              <a className={`menu-item ${activeTab === 'system_junk' ? 'active' : ''}`} onClick={() => setActiveTab('system_junk')}>
                <Icons.Junk /> Rác Hệ Thống
              </a>
            </li>
            <li>
              <a className={`menu-item ${activeTab === 'large_files' ? 'active' : ''}`} onClick={() => setActiveTab('large_files')}>
                <Icons.LargeFiles /> Tập Tin Lớn & Cũ
              </a>
            </li>
            <div style={{ margin: '10px 0 5px 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Quản Trị</div>
            <li>
              <a className={`menu-item ${activeTab === 'optimization' ? 'active' : ''}`} onClick={() => setActiveTab('optimization')}>
                <Icons.Optimization /> Tối Ưu Hóa
              </a>
            </li>
            <li>
              <a className={`menu-item ${activeTab === 'maintenance' ? 'active' : ''}`} onClick={() => setActiveTab('maintenance')}>
                <Icons.Maintenance /> Bảo Trì
              </a>
            </li>
            <li>
              <a className={`menu-item ${activeTab === 'app_slimmer' ? 'active' : ''}`} onClick={() => setActiveTab('app_slimmer')}>
                <Icons.AppSlimmer /> App Slimmer
              </a>
            </li>
          </ul>
        </div>
        
        {/* Memory status widget */}
        <div className="glass-panel" style={{ padding: '15px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Khả dụng:</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{formatBytes(systemStats.free)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Ổ đĩa:</span>
            <span style={{ color: 'var(--text-primary)' }}>{formatBytes(systemStats.occupied)} / {formatBytes(systemStats.total)}</span>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <main className="main-content">
        
        {/* ========================================== */}
        {/* TAB 1: SMART SCAN (QUÉT THÔNG MINH)        */}
        {/* ========================================== */}
        {activeTab === 'smart_scan' && (
          <div>
            <header className="header">
              <div className="header-title">
                <h1>Quét Thông Minh</h1>
                <p>Khởi chạy phân tích toàn diện rác hệ thống, tệp tin lớn và tình trạng bộ nhớ thiết bị của bạn.</p>
              </div>
            </header>

            <div className="smart-scan-container">
              {/* Central scanning button */}
              <div 
                className={`scan-radar ${scanState === 'scanning' ? 'scanning' : ''}`}
                onClick={scanState === 'scanning' || scanState === 'cleaning' ? null : runSmartScan}
              >
                <div className="scan-radar-glow" />
                <div className="scan-radar-inner">
                  {scanState === 'idle' && 'QUÉT'}
                  {scanState === 'scanning' && 'ĐANG QUÉT...'}
                  {scanState === 'scanned' && 'HOÀN TẤT'}
                  {scanState === 'cleaning' && 'ĐANG DỌN...'}
                  {scanState === 'cleaned' && 'ĐÃ DỌN Xong'}
                </div>
              </div>

              {scanState === 'idle' && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Nhấp vào nút để bắt đầu phân tích thiết bị của bạn</p>
              )}

              {/* Smart Scan cards review row */}
              {(scanState === 'scanned' || scanState === 'scanning' || scanState === 'cleaning' || scanState === 'cleaned') && (
                <div className="scan-cards-row">
                  <div className={`glass-panel scan-detail-card ${totalSystemJunk > 0 ? 'warning' : 'ready'}`}>
                    <div className="icon-holder"><Icons.Junk /></div>
                    <div style={{ fontWeight: '600' }}>Rác Hệ Thống</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {loading ? '...' : formatBytes(totalSystemJunk)}
                    </div>
                  </div>

                  <div className={`glass-panel scan-detail-card ${largeFiles.length > 0 ? 'warning' : 'ready'}`}>
                    <div className="icon-holder"><Icons.LargeFiles /></div>
                    <div style={{ fontWeight: '600' }}>Tập Tin Lớn & Cũ</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {loading ? '...' : `${largeFiles.length} tập tin`}
                    </div>
                  </div>

                  <div className="glass-panel scan-detail-card ready">
                    <div className="icon-holder"><Icons.Memory /></div>
                    <div style={{ fontWeight: '600' }}>Bộ Nhớ RAM</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                      {formatBytes(systemStats.free)} Trống
                    </div>
                  </div>

                  <div className="glass-panel scan-detail-card ready">
                    <div className="icon-holder"><Icons.AppSlimmer /></div>
                    <div style={{ fontWeight: '600' }}>Ứng Dụng Nén</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                      {apps.filter(a => a.isStub).length} giải phóng
                    </div>
                  </div>
                </div>
              )}

              {/* Big run action button */}
              {scanState === 'scanned' && (
                <button 
                  className="btn-primary" 
                  style={{ padding: '16px 40px', fontSize: '16px', borderRadius: '12px' }}
                  onClick={cleanEverythingSmart}
                  disabled={actionInProgress}
                >
                  Dọn Dẹp Thông Minh ({formatBytes(totalSystemJunk)})
                </button>
              )}

              {scanState === 'cleaned' && (
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ color: 'var(--color-success)', marginBottom: '10px' }}>Hệ thống của bạn đã hoàn toàn sạch sẽ!</h3>
                  <button className="btn-secondary" onClick={() => setScanState('idle')}>Quay lại</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: SYSTEM JUNK (RÁC HỆ THỐNG)          */}
        {/* ========================================== */}
        {activeTab === 'system_junk' && (
          <div>
            <header className="header">
              <div className="header-title">
                <h1>Rác Hệ Thống</h1>
                <p>Loại bỏ bộ nhớ đệm ứng dụng, tệp tin ghi nhật ký cũ và tệp tin rác của nhà phát triển để lấy lại không gian đĩa.</p>
              </div>
            </header>

            <div className="junk-list">
              <div className="glass-panel junk-item">
                <div className="junk-info">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={selectedJunk.caches} 
                      onChange={(e) => setSelectedJunk({...selectedJunk, caches: e.target.checked})}
                    />
                    <span className="checkmark" />
                  </label>
                  <div>
                    <div className="junk-title">Bộ Nhớ Đệm Của Ứng Dụng (User Caches)</div>
                    <div className="junk-path">~/Library/Caches</div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatBytes(junkStats.userCaches)}</div>
              </div>

              <div className="glass-panel junk-item">
                <div className="junk-info">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={selectedJunk.logs} 
                      onChange={(e) => setSelectedJunk({...selectedJunk, logs: e.target.checked})}
                    />
                    <span className="checkmark" />
                  </label>
                  <div>
                    <div className="junk-title">Nhật Ký Hoạt Động (User Logs)</div>
                    <div className="junk-path">~/Library/Logs</div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatBytes(junkStats.userLogs)}</div>
              </div>

              <div className="glass-panel junk-item">
                <div className="junk-info">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={selectedJunk.xcode} 
                      onChange={(e) => setSelectedJunk({...selectedJunk, xcode: e.target.checked})}
                    />
                    <span className="checkmark" />
                  </label>
                  <div>
                    <div className="junk-title">Dữ Liệu Xcode DerivedData (Dành cho Lập trình viên)</div>
                    <div className="junk-path">~/Library/Developer/Xcode/DerivedData</div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatBytes(junkStats.xcodeDerivedData)}</div>
              </div>

              <div className="glass-panel junk-item">
                <div className="junk-info">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={selectedJunk.trash} 
                      onChange={(e) => setSelectedJunk({...selectedJunk, trash: e.target.checked})}
                    />
                    <span className="checkmark" />
                  </label>
                  <div>
                    <div className="junk-title">Thùng Rác Hệ Thống (Trash Bins)</div>
                    <div className="junk-path">~/.Trash</div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatBytes(junkStats.trash)}</div>
              </div>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => cleanJunk(false)}
              disabled={actionInProgress || (!selectedJunk.caches && !selectedJunk.logs && !selectedJunk.xcode && !selectedJunk.trash)}
            >
              Làm Sạch Rác Hệ Thống
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: LARGE & OLD FILES (FILE LỚN & CŨ)   */}
        {/* ========================================== */}
        {activeTab === 'large_files' && (
          <div>
            <header className="header">
              <div className="header-title">
                <h1>Tập Tin Lớn & Cũ</h1>
                <p>Khám phá các file chiếm dụng dung lượng lớn nhất trong Downloads, Documents, Desktop, Movies...</p>
              </div>
            </header>

            <div className="large-files-layout">
              {/* Left sidebar filtering categories */}
              <div className="large-files-sidebar">
                {['All', 'Video', 'Archive', 'Document', 'Audio', 'Image', 'Other'].map(cat => (
                  <div 
                    key={cat} 
                    className={`cat-item ${largeFilesCategory === cat ? 'active' : ''}`}
                    onClick={() => setLargeFilesCategory(cat)}
                  >
                    <span>{cat === 'All' ? 'Tất cả tập tin' : cat}</span>
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>
                      ({cat === 'All' ? largeFiles.length : largeFiles.filter(f => f.category === cat).length})
                    </span>
                  </div>
                ))}

                {selectedLargeFiles.size > 0 && (
                  <button 
                    className="btn-primary" 
                    style={{ marginTop: '20px', background: 'var(--color-danger)', fontSize: '12px' }}
                    onClick={deleteSelectedLargeFiles}
                    disabled={actionInProgress}
                  >
                    Xóa đã chọn ({selectedLargeFiles.size})
                  </button>
                )}
              </div>

              {/* Right list table */}
              <div className="large-files-content glass-panel">
                {loading ? (
                  <div className="loading-container">
                    <div className="spinner" />
                    <p>Đang tìm kiếm tệp tin lớn...</p>
                  </div>
                ) : filteredLargeFiles.length === 0 ? (
                  <div className="empty-state">
                    Không tìm thấy tệp tin nào lớn hơn 50 MB ở chuyên mục này.
                  </div>
                ) : (
                  <table className="apps-table">
                    <thead>
                      <tr>
                        <th className="checkbox-cell">
                          <label className="checkbox-container">
                            <input 
                              type="checkbox" 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLargeFiles(new Set(filteredLargeFiles.map(f => f.path)));
                                } else {
                                  setSelectedLargeFiles(new Set());
                                }
                              }}
                              checked={filteredLargeFiles.length > 0 && filteredLargeFiles.every(f => selectedLargeFiles.has(f.path))}
                            />
                            <span className="checkmark" />
                          </label>
                        </th>
                        <th>Tên Tệp</th>
                        <th>Kích Thước</th>
                        <th>Lần Cuối Sửa</th>
                        <th>Đường Dẫn</th>
                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLargeFiles.map((file) => (
                        <tr key={file.path}>
                          <td className="checkbox-cell">
                            <label className="checkbox-container">
                              <input 
                                type="checkbox" 
                                checked={selectedLargeFiles.has(file.path)}
                                onChange={() => {
                                  const next = new Set(selectedLargeFiles);
                                  if (next.has(file.path)) next.delete(file.path);
                                  else next.add(file.path);
                                  setSelectedLargeFiles(next);
                                }}
                              />
                              <span className="checkmark" />
                            </label>
                          </td>
                          <td style={{ fontWeight: '500' }}>{file.name}</td>
                          <td>{formatBytes(file.size)}</td>
                          <td>{formatTimeAgo(file.modified)}</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.path}>
                            {file.path}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn-action-icon danger" 
                              onClick={() => openConfirmationModal('delete_file', file)}
                              disabled={actionInProgress}
                            >
                              <Icons.Uninstall />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: OPTIMIZATION (TỐI ƯU HÓA TIẾN TRÌNH) */}
        {/* ========================================== */}
        {activeTab === 'optimization' && (
          <div>
            <header className="header">
              <div className="header-title">
                <h1>Tối Ưu Hóa Tiến Trình</h1>
                <p>Theo dõi và chấm dứt các ứng dụng/tiến trình đang chạy ngầm gây tốn CPU & RAM làm chậm máy Mac của bạn.</p>
              </div>
              <button className="btn-secondary" onClick={() => loadTabData('optimization')} disabled={loading}>
                <Icons.Refresh className={loading ? 'spinner' : ''} /> Cập Nhật
              </button>
            </header>

            <div className="process-list-header">
              <div className="filters">
                <button className={`btn-filter ${processSort === 'mem' ? 'active' : ''}`} onClick={() => setProcessSort('mem')}>Theo RAM (%)</button>
                <button className={`btn-filter ${processSort === 'cpu' ? 'active' : ''}`} onClick={() => setProcessSort('cpu')}>Theo CPU (%)</button>
              </div>
            </div>

            <div className="glass-panel">
              {loading ? (
                <div className="loading-container">
                  <div className="spinner" />
                  <p>Đang nạp các tiến trình đang chạy...</p>
                </div>
              ) : (
                <table className="apps-table">
                  <thead>
                    <tr>
                      <th>Tên Tiến Trình</th>
                      <th>Mã PID</th>
                      <th>Sử dụng CPU</th>
                      <th>Sử dụng RAM</th>
                      <th>Đường Dẫn</th>
                      <th style={{ textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProcesses.map(proc => (
                      <tr key={proc.pid}>
                        <td style={{ fontWeight: '600' }}>{proc.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{proc.pid}</td>
                        <td style={{ color: proc.cpu > 50 ? 'var(--color-danger)' : 'inherit', fontWeight: proc.cpu > 50 ? 'bold' : 'normal' }}>
                          {proc.cpu}%
                        </td>
                        <td style={{ color: proc.mem > 5 ? 'var(--color-warning)' : 'inherit', fontWeight: proc.mem > 5 ? 'bold' : 'normal' }}>
                          {proc.mem}%
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={proc.path}>
                          {proc.path}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'rgba(230, 57, 70, 0.2)' }}
                            onClick={() => killProcess(proc)}
                            disabled={actionInProgress}
                          >
                            Đóng
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: MAINTENANCE (BẢO TRÌ)              */}
        {/* ========================================== */}
        {activeTab === 'maintenance' && (
          <div>
            <header className="header">
              <div className="header-title">
                <h1>Bảo Trì Hệ Thống</h1>
                <p>Chạy các script bảo trì để phục hồi hiệu suất và tốc độ phản hồi gốc của hệ điều hành macOS.</p>
              </div>
            </header>

            <div className="maintenance-grid">
              <div className="glass-panel maintenance-card">
                <div className="maintenance-header">
                  <div className="maintenance-icon-box"><Icons.Memory /></div>
                  <div className="maintenance-content">
                    <h3>Giải phóng bộ nhớ RAM</h3>
                    <p>Giải phóng lượng RAM không hoạt động đang được giữ làm bộ đệm ổ đĩa. Giúp lấy lại dung lượng bộ nhớ khả dụng cho các ứng dụng khác ngay lập tức.</p>
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => runMaintenance('ram')}
                  disabled={actionInProgress}
                >
                  Giải phóng RAM
                </button>
              </div>

              <div className="glass-panel maintenance-card">
                <div className="maintenance-header">
                  <div className="maintenance-icon-box"><Icons.Refresh /></div>
                  <div className="maintenance-content">
                    <h3>Làm sạch Cache DNS</h3>
                    <p>Làm mới DNS resolver. Khắc phục các vấn đề liên quan đến tải trang web chậm hoặc lỗi không thể truy cập các địa chỉ web mới thay đổi.</p>
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => runMaintenance('dns')}
                  disabled={actionInProgress}
                >
                  Xóa Cache DNS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 6: APP SLIMMER (NÉN & GIẢI PHÓNG APP)  */}
        {/* ========================================== */}
        {activeTab === 'app_slimmer' && (
          <div>
            <header className="header">
              <div className="header-title">
                <h1>App Slimmer</h1>
                <p>Nén các ứng dụng dung lượng lớn trực tiếp hoặc giải phóng chúng thành các stub 12 KB tự động khôi phục khi nhấp đúp.</p>
              </div>
              <button className="btn-secondary" onClick={() => loadTabData('app_slimmer')} disabled={loading}>
                <Icons.Refresh className={loading ? 'spinner' : ''} /> Quét Lại
              </button>
            </header>

            {/* Controls */}
            <section className="control-row">
              <div className="search-bar">
                <Icons.Search />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm ứng dụng..." 
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                />
              </div>
              
              <div className="filters">
                <button className={`btn-filter ${appFilter === 'all' ? 'active' : ''}`} onClick={() => setAppFilter('all')}>Tất cả</button>
                <button className={`btn-filter ${appFilter === 'slimmable' ? 'active' : ''}`} onClick={() => setAppFilter('slimmable')}>Có thể Slim</button>
                <button className={`btn-filter ${appFilter === 'offloaded' ? 'active' : ''}`} onClick={() => setAppFilter('offloaded')}>Đã giải phóng</button>
                <button className={`btn-filter ${appFilter === 'running' ? 'active' : ''}`} onClick={() => setAppFilter('running')}>Đang chạy</button>
                <button className={`btn-filter ${appFilter === 'system' ? 'active' : ''}`} onClick={() => setAppFilter('system')}>Hệ thống</button>
                
                {selectedApps.size > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '15px' }}>
                    <button className="btn-primary" onClick={() => handleBulkAppAction('compress')} style={{ padding: '8px 12px', fontSize: '13px' }}>
                      <Icons.Compress /> Nén chọn ({selectedApps.size})
                    </button>
                    <button className="btn-primary" onClick={() => handleBulkAppAction('offload')} style={{ padding: '8px 12px', fontSize: '13px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))' }}>
                      <Icons.Offload /> Giải phóng ({selectedApps.size})
                    </button>
                    <button className="btn-secondary" onClick={() => handleBulkAppAction('clean')} style={{ padding: '8px 12px', fontSize: '13px' }}>
                      <Icons.Clean /> Dọn Dữ Liệu Ẩn ({selectedApps.size})
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Apps table list */}
            <section className="glass-panel table-panel">
              {loading ? (
                <div className="loading-container">
                  <div className="spinner" />
                  <p>Đang phân tích ứng dụng...</p>
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="empty-state">Không tìm thấy ứng dụng phù hợp với bộ lọc.</div>
              ) : (
                <table className="apps-table">
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <label className="checkbox-container">
                          <input 
                            type="checkbox" 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedApps(new Set(filteredApps.filter(a => !a.isSystem).map(a => a.bundleId)));
                              } else {
                                setSelectedApps(new Set());
                              }
                            }}
                            checked={filteredApps.length > 0 && filteredApps.filter(a => !a.isSystem).every(a => selectedApps.has(a.bundleId))}
                          />
                          <span className="checkmark" />
                        </label>
                      </th>
                      <th>Tên Ứng Dụng</th>
                      <th>Dung Lượng Bộ Cài</th>
                      <th>Dung Lượng Ẩn (Cache/Data)</th>
                      <th>Lần Cuối Mở</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map(app => (
                      <tr key={app.bundleId}>
                        <td className="checkbox-cell">
                          {!app.isSystem && (
                            <label className="checkbox-container">
                              <input 
                                type="checkbox" 
                                checked={selectedApps.has(app.bundleId)}
                                onChange={() => {
                                  const next = new Set(selectedApps);
                                  if (next.has(app.bundleId)) next.delete(app.bundleId);
                                  else next.add(app.bundleId);
                                  setSelectedApps(next);
                                }}
                              />
                              <span className="checkmark" />
                            </label>
                          )}
                        </td>
                        <td>
                          <div className="app-meta-cell">
                            <div className="app-icon-container">
                              {app.icon ? (
                                <img src={app.icon} alt={app.name} className="app-icon" />
                              ) : (
                                <div className="app-fallback-icon">{app.name.charAt(0).toUpperCase()}</div>
                              )}
                            </div>
                            <div className="app-name-container">
                              <span className="app-name-title">{app.name}</span>
                              <span className="app-bundle-id" title={app.path}>{app.bundleId}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: '500' }}>{formatBytes(app.physicalSize)}</td>
                        <td>{formatBytes(app.cacheSize)}</td>
                        <td>{formatTimeAgo(app.lastUsed)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {app.isSystem && <span className="badge badge-system">Hệ thống</span>}
                            {app.isRunning && <span className="badge badge-running">Đang chạy</span>}
                            {app.isStub && <span className="badge badge-stub">Đã giải phóng</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                            {!app.isSystem && !app.isStub && (
                              <button 
                                className="btn-action-icon" 
                                title="Nén bằng APFS"
                                onClick={() => openConfirmationModal('compress', app)}
                                disabled={app.isRunning || actionInProgress}
                              >
                                <Icons.Compress />
                              </button>
                            )}

                            {!app.isSystem && !app.isStub && (
                              <button 
                                className="btn-action-icon" 
                                title="Giải phóng dung lượng (lưu trữ zip + stub)"
                                onClick={() => openConfirmationModal('offload', app)}
                                disabled={app.isRunning || actionInProgress}
                              >
                                <Icons.Offload />
                              </button>
                            )}

                            {app.isStub && (
                              <button 
                                className="btn-action-icon" 
                                title="Phục hồi ứng dụng về gốc"
                                onClick={() => handleAppAction('restore', app)}
                                disabled={actionInProgress}
                                style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(0, 245, 212, 0.2)' }}
                              >
                                <Icons.Restore />
                              </button>
                            )}

                            {app.cacheSize > 0 && (
                              <button 
                                className="btn-action-icon" 
                                title="Dọn dẹp Dữ liệu & Cache ẩn"
                                onClick={() => handleAppAction('clean', app)}
                                disabled={actionInProgress}
                              >
                                <Icons.Clean />
                              </button>
                            )}

                            {!app.isSystem && (
                              <button 
                                className="btn-action-icon danger" 
                                title="Gỡ cài đặt hoàn toàn"
                                onClick={() => openConfirmationModal('uninstall', app)}
                                disabled={app.isRunning || actionInProgress}
                              >
                                <Icons.Uninstall />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}

        {/* Live Event Console Logger (Standard for all tabs) */}
        <section className="glass-panel console-panel">
          <div className="console-header">
            <span className="console-title"><Icons.Terminal /> Nhật ký hoạt động</span>
            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setLogs([])}>Xóa logs</button>
          </div>
          <div className="console-logs">
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>Chưa có hoạt động nào được ghi lại.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`console-line ${log.type}`}>
                  [{log.time}] <span style={{ color: 'var(--text-muted)' }}>&gt;</span> {log.text}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Action Dialog Confirmation Modals */}
      {modal.isOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 className="modal-header">
              {modal.type === 'compress' && 'Nén Ứng Dụng'}
              {modal.type === 'offload' && 'Giải Phóng Dung Lượng Ứng Dụng'}
              {modal.type === 'uninstall' && 'Gỡ Cài Đặt Sạch'}
              {modal.type === 'delete_file' && 'Xác Nhận Xóa Tập Tin'}
            </h3>
            
            <div className="modal-body">
              {modal.type === 'compress' && (
                <>
                  Bạn có muốn nén ứng dụng <strong>{modal.data?.name}</strong>?
                  <br /><br />
                  Hành động này sẽ tối ưu hóa cấu trúc dữ liệu của ứng dụng bằng nén APFS tích hợp. 
                  Ứng dụng hoạt động bình thường nhưng chiếm ít dung lượng ổ đĩa hơn.
                </>
              )}
              {modal.type === 'offload' && (
                <>
                  Bạn có muốn giải phóng ứng dụng <strong>{modal.data?.name}</strong>?
                  <br /><br />
                  Tất cả tài nguyên sẽ được nén zip lưu tại thư mục <code>~/.appslimmer/archives/</code>. 
                  Ứng dụng gốc sẽ được thay thế bằng một **Stub App** nhẹ (12 KB). 
                  Nhấp đúp vào stub này ở Launchpad/Finder để phục hồi và chạy bất cứ lúc nào.
                </>
              )}
              {modal.type === 'uninstall' && (
                <>
                  Bạn có chắc chắn muốn gỡ cài đặt hoàn toàn <strong>{modal.data?.name}</strong>?
                  <br /><br />
                  Hành động này sẽ xóa vĩnh viễn tệp ứng dụng cùng các thư mục Cache liên quan. Không thể phục hồi.
                </>
              )}
              {modal.type === 'delete_file' && (
                <>
                  Bạn có chắc muốn xóa tệp tin lớn này không?
                  <br /><br />
                  <strong>Tên tệp:</strong> {modal.data?.name}
                  <br />
                  <strong>Kích thước:</strong> {formatBytes(modal.data?.size)}
                  <br />
                  <strong>Đường dẫn:</strong> <code style={{ wordBreak: 'break-all', fontSize: '11px' }}>{modal.data?.path}</code>
                  <br /><br />
                  Hành động này sẽ xóa vĩnh viễn tệp khỏi ổ cứng của bạn.
                </>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setModal({ isOpen: false, type: '', data: null })}
                disabled={actionInProgress}
              >
                Hủy bỏ
              </button>
              <button 
                className={`btn-primary ${modal.type === 'uninstall' || modal.type === 'delete_file' ? 'danger' : ''}`}
                style={modal.type === 'uninstall' || modal.type === 'delete_file' ? { background: 'var(--color-danger)', boxShadow: '0 4px 15px rgba(230, 57, 70, 0.2)' } : {}}
                onClick={() => {
                  if (modal.type === 'delete_file') {
                    deleteLargeFile(modal.data);
                  } else {
                    handleAppAction(modal.type, modal.data);
                  }
                }}
                disabled={actionInProgress}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
