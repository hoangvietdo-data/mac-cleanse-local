import React, { useState, useEffect } from 'react';
import DiagnosticControl from './modules/DiagnosticControl';
import SmartCleanup from './modules/SmartCleanup';
import SpaceLens from './modules/SpaceLens';
import AppSlimmer from './modules/AppSlimmer';

import SmartDashboard from './modules/SmartDashboard';
import SystemTuning from './modules/SystemTuning';
import { MessageSquare, Heart, Sun, Moon, Globe } from 'lucide-react';

export default function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [lang, setLang] = useState('vi');
  const [theme, setTheme] = useState('dark');
  const [showDonate, setShowDonate] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleLang = () => setLang(prev => prev === 'vi' ? 'en' : 'vi');

  return (
    <div className={`min-h-screen bg-bg-main text-text-main font-sans flex flex-col selection:bg-accent selection:text-bg-main transition-colors duration-300`}>
      {/* Top Navigation */}
      <nav className="h-20 border-b border-border-main flex items-center justify-between px-6 md:px-12 shrink-0 bg-bg-main/90 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-12">
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tighter italic font-serif">MacCleanseLocal</span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-accent font-mono leading-none">System Engine v4.0</span>
          </div>
          <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.25em] font-bold text-text-muted overflow-x-auto">
            <span 
              className={`hover:text-text-main transition-colors cursor-pointer ${activeModule === 'dashboard' ? 'text-accent' : ''}`} 
              onClick={() => setActiveModule('dashboard')}
            >{lang === 'vi' ? 'Tổng Quan' : 'Smart Dashboard'}</span>
            <span 
              className={`hover:text-text-main transition-colors cursor-pointer ${activeModule === 'diagnostic' ? 'text-accent' : ''}`} 
              onClick={() => setActiveModule('diagnostic')}
            >{lang === 'vi' ? 'Kiểm Soát Tệp' : 'Diagnostic Control'}</span>
            <span 
              className={`hover:text-text-main transition-colors cursor-pointer ${activeModule === 'cleanup' ? 'text-accent' : ''}`} 
              onClick={() => setActiveModule('cleanup')}
            >{lang === 'vi' ? 'Dọn Rác' : 'Smart Cleanup'}</span>
            <span 
              className={`hover:text-text-main transition-colors cursor-pointer ${activeModule === 'lens' ? 'text-accent' : ''}`} 
              onClick={() => setActiveModule('lens')}
            >{lang === 'vi' ? 'Phân Tích Ổ Đĩa' : 'Space Lens'}</span>
            <span 
              className={`hover:text-text-main transition-colors cursor-pointer ${activeModule === 'tuning' ? 'text-accent' : ''}`} 
              onClick={() => setActiveModule('tuning')}
            >{lang === 'vi' ? 'Tối Ưu' : 'System Tuning'}</span>
            <span 
              className={`hover:text-text-main transition-colors cursor-pointer ${activeModule === 'slimmer' ? 'text-accent' : ''}`} 
              onClick={() => setActiveModule('slimmer')}
            >{lang === 'vi' ? 'Gỡ Ứng Dụng' : 'App Slimmer'}</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.location.href = 'mailto:vietdohoang.work@gmail.com'}
            className="p-2 text-text-sub hover:text-text-main hover:bg-border-main rounded transition-all"
            title={lang === 'vi' ? 'Góp ý' : 'Feedback'}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowDonate(true)}
            className="p-2 text-accent hover:bg-accent/10 rounded transition-all flex items-center gap-2"
            title={lang === 'vi' ? 'Nuôi em' : 'Donate'}
          >
            <Heart className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleLang}
            className="p-2 text-text-sub hover:text-text-main hover:bg-border-main rounded transition-all text-xs font-bold"
            title={lang === 'vi' ? 'Đổi ngôn ngữ' : 'Change Language'}
          >
            {lang.toUpperCase()}
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 text-text-sub hover:text-text-main hover:bg-border-main rounded transition-all"
            title={lang === 'vi' ? 'Giao diện' : 'Theme'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Module Rendering */}
      {activeModule === 'dashboard' && <SmartDashboard lang={lang} theme={theme} />}
      {activeModule === 'diagnostic' && <DiagnosticControl lang={lang} theme={theme} />}
      {activeModule === 'cleanup' && <SmartCleanup lang={lang} theme={theme} />}
      {activeModule === 'lens' && <SpaceLens lang={lang} theme={theme} />}
      {activeModule === 'tuning' && <SystemTuning lang={lang} theme={theme} />}
      {activeModule === 'slimmer' && <AppSlimmer lang={lang} theme={theme} />}

      {/* Donate Modal */}
      {showDonate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-panel border border-border-main rounded-xl p-8 max-w-sm w-full relative">
            <button 
              onClick={() => setShowDonate(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main uppercase font-mono text-[10px] tracking-widest"
            >
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
            <h3 className="text-xl font-serif italic text-text-main mb-2">
              {lang === 'vi' ? 'Nuôi em ☕' : 'Support Me ☕'}
            </h3>
            <p className="text-xs text-text-sub mb-6">
              {lang === 'vi' ? 'Cảm ơn bạn đã sử dụng MacCleanseLocal! Nếu ứng dụng giúp ích cho bạn, hãy cân nhắc mời mình một ly cà phê nhé.' : 'Thank you for using MacCleanseLocal! If you found it useful, consider buying me a coffee.'}
            </p>
            <img src="/qr-momo.jpeg" alt="Donate QR" className="w-full aspect-square bg-white rounded-lg object-contain mb-4" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'block'; }} />
            <div className="hidden text-center text-xs text-text-sub italic bg-border-main p-8 rounded-lg mb-4">
              [QR Code Placeholder]
            </div>
            <div className="text-center font-mono text-[10px] text-text-sub uppercase tracking-widest">
              MoMo / Vietcombank
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
