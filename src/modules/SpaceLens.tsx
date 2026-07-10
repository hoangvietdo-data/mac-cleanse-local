import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  HardDrive, Folder, Search, ChevronRight, X, Sparkles, FileText
} from 'lucide-react';


const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function SpaceLens({ lang = "vi", theme = "dark" }: { lang?: string, theme?: string }) {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'ANALYZED'>('IDLE');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPath, setScanPath] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [basePath, setBasePath] = useState('Macintosh HD');
  const [sunburstData, setSunburstData] = useState<any>(null);
  
  // Filters
  const [hideSystem, setHideSystem] = useState(true);
  const [showPackages, setShowPackages] = useState(false);
  const [largeOnly, setLargeOnly] = useState(false);
  
  // Search & AI
  const [searchQuery, setSearchQuery] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [apiKeys, setApiKeys] = useState(localStorage.getItem('gemini_api_keys') || '');
  const [generatingAI, setGeneratingAI] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScan = async () => {
    setStatus('SCANNING');
    setScanProgress(0);
    
    // Simulate some initial progress for UX
    const interval = setInterval(() => {
      setScanProgress(p => p < 90 ? p + (90 - p) * 0.1 : p);
    }, 150);

    try {
      const res = await fetch('/api/scan-space-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scanPath: basePath === 'Macintosh HD' ? '/' : basePath,
          hideSystem,
          showPackages,
          largeOnly
        })
      });
      const data = await res.json();
      
      clearInterval(interval);
      setScanProgress(100);
      
      if (data.error) {
        alert(data.error);
        setStatus('IDLE');
      } else {
        setSunburstData(data);
        setTimeout(() => setStatus('ANALYZED'), 500);
      }
    } catch (e) {
      clearInterval(interval);
      console.error(e);
      alert('Failed to scan disk.');
      setStatus('IDLE');
    }
  };

  // Auto rescan when filters change, but only if already scanned
  useEffect(() => {
    if (status === 'ANALYZED' || status === 'IDLE' && basePath !== 'Macintosh HD') {
      // Don't auto-scan on initial load if idle and Macintosh HD, let user press start
      if (sunburstData) {
        startScan();
      }
    }
  }, [hideSystem, showPackages, largeOnly]);

  // Redraw when sunburstData or searchQuery changes
  useEffect(() => {
    if (status === 'ANALYZED') {
      drawSunburst();
    }
  }, [status, sunburstData, searchQuery]);

  const getFullPath = (node: any) => {
    if (!node) return '';
    const pathNames = node.ancestors().reverse().map((d: any) => d.data.name);
    // Thay thế tên gốc (Macintosh HD hoặc Custom Path)
    pathNames[0] = basePath === 'Macintosh HD' ? '' : basePath;
    let fullPath = pathNames.join('/');
    if (fullPath.startsWith('//')) fullPath = fullPath.substring(1);
    return fullPath || '/';
  };

  const handleReveal = async () => {
    if (!selectedNode) return;
    const path = getFullPath(selectedNode);
    try {
      const res = await fetch('/api/open-in-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path })
      });
      const data = await res.json();
      if (!data.success) {
        alert(lang === 'vi' ? `Không thể mở: ${data.error}` : `Cannot open: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error opening in Finder');
    }
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    const path = getFullPath(selectedNode);
    if (!confirm(lang === 'vi' ? `Bạn có chắc chắn muốn xoá ${path}?` : `Are you sure you want to delete ${path}?`)) return;
    try {
      const res = await fetch('/api/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path })
      });
      const data = await res.json();
      if (data.success) {
        alert(lang === 'vi' ? `Đã xoá thành công!` : `Deleted successfully!`);
      } else {
        alert(lang === 'vi' ? `Lỗi: ${data.error}` : `Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting file');
    }
  };

  const handleCustomFolder = async () => {
    try {
      const res = await fetch('/api/select-folder');
      const data = await res.json();
      if (data.path) {
        setBasePath(data.path);
        // Ngay sau khi setBasePath, trigger startScan
        // Wait, startScan uses the old state of basePath if we call it directly here.
        // It's better to pass it or let a useEffect handle it.
        // For simplicity, we can fetch immediately using data.path
        setStatus('SCANNING');
        setScanProgress(0);
        
        const interval = setInterval(() => {
          setScanProgress(p => p < 90 ? p + (90 - p) * 0.1 : p);
        }, 150);

        const scanRes = await fetch('/api/scan-space-lens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scanPath: data.path,
            hideSystem,
            showPackages,
            largeOnly
          })
        });
        const scanData = await scanRes.json();
        
        clearInterval(interval);
        setScanProgress(100);
        
        if (scanData.error) {
          alert(scanData.error);
          setStatus('IDLE');
        } else {
          setSunburstData(scanData);
          setTimeout(() => setStatus('ANALYZED'), 500);
        }
      }
    } catch (e) {
      console.error('Select folder canceled or error', e);
    }
  };

  const drawSunburst = () => {
    if (!svgRef.current || !containerRef.current || !sunburstData) return;
    
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) / 2 - 20;
    
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .style("width", "100%")
      .style("height", "100%")
      .style("font", "10px sans-serif");

    const root = d3.hierarchy(sunburstData)
      .sum(d => d.children && d.children.length > 0 ? 0 : Math.max(0, d.value))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    partition(root);
    
    root.each((d: any) => d.current = d);

    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    const color = d3.scaleLinear<string>()
      .domain([0, 4])
      .range(["rgba(161,255,0,0.1)", "rgba(161,255,0,0.6)"]);

    const q = searchQuery.toLowerCase().trim();
    const searchMatches = new Set();
    if (q.length > 0) {
      root.each(d => {
        if (d.data.name.toLowerCase().includes(q)) {
          let curr = d;
          while (curr) {
            searchMatches.add(curr);
            curr = curr.parent;
          }
        }
      });
    }

    const path = svg.append("g")
      .selectAll("path")
      .data(root.descendants().filter(d => d.depth && d.x1 - d.x0 > 0.01))
      .join("path")
        .attr("fill", d => color(d.depth))
        .attr("opacity", d => q.length === 0 || searchMatches.has(d) ? 1 : 0.15)
        .attr("stroke", "rgba(161,255,0,0.1)")
        .attr("stroke-width", "0.5")
        .attr("d", arc)
        .style("cursor", "pointer")
        .style("transition", "fill 0.2s, stroke 0.2s")
        .on("mouseover", function(event, d) {
          d3.select(this).attr("fill", "rgba(161,255,0,0.8)").attr("stroke", "#A1FF00").attr("stroke-width", "1.5");
          setSelectedNode(d);
        })
        .on("mouseout", function(event, d: any) {
          d3.select(this).attr("fill", color(d.depth)).attr("stroke", "rgba(161,255,0,0.1)").attr("stroke-width", "0.5");
        })
        .on("click", clicked);

    function labelVisible(d: any) {
      return d.y1 <= radius && d.y0 >= 0 && (d.x1 - d.x0) > 0.08;
    }

    function labelTransform(d: any) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    const label = svg.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().filter(d => d.depth && d.x1 - d.x0 > 0.01))
      .join("text")
        .attr("dy", "0.35em")
        .attr("fill", "rgba(255,255,255,0.7)")
        .style("font-size", "10px")
        .style("font-family", "var(--font-mono)")
        .attr("fill-opacity", d => labelVisible(d.current) ? 1 : 0)
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data.name);

    const parent = svg.append("circle")
      .datum(root)
      .attr("r", radius / root.height)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("click", clicked);

    const centerText = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .style("fill", "var(--color-text-main)")
      .style("font-family", "var(--font-serif)")
      .style("font-size", "1.5rem")
      .style("font-style", "italic");

    const centerSize = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .attr("dy", "1.5em")
      .style("fill", "var(--color-accent)")
      .style("font-family", "var(--font-mono)")
      .style("font-size", "0.875rem");

    function updateCenterText(d: any) {
      centerText.text(d.data.name);
      centerSize.text(formatBytes(d.value));
    }
    
    updateCenterText(root);

    function clicked(event: any, p: any) {
      // Prevent zooming if they clicked a node that is almost transparent (filtered out by search)
      if (q.length > 0 && !searchMatches.has(p)) return;
      
      parent.datum(p.parent || root);
      updateCenterText(p);
      setSelectedNode(p);

      root.each((d: any) => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth * (radius / root.height)),
        y1: Math.max(0, d.y1 - p.depth * (radius / root.height))
      });

      const t = svg.transition().duration(750) as any;

      path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return (t: number) => d.current = i(t);
        })
        .filter(function(d: any) {
          return +(this.getAttribute("fill-opacity") || 1) || Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) > 0;
        })
        .attr("fill-opacity", (d: any) => arcVisible(d.target) ? 1 : 0)
        .attrTween("d", (d: any) => () => arc(d.current) as string);

      label.transition(t)
        .filter(function(d: any) {
          return +(this.getAttribute("fill-opacity") || 0) || labelVisible(d.target);
        })
        .attr("fill-opacity", (d: any) => labelVisible(d.target) ? 1 : 0)
        .attrTween("transform", (d: any) => () => labelTransform(d.current));
    }

    function arcVisible(d: any) {
      return d.y1 <= radius && d.y0 >= 0 && d.x1 > d.x0;
    }
  };

  const generateAIReport = async () => {
    if (!apiKeys.trim()) {
      setShowAI(true);
      return;
    }
    if (!sunburstData) return;

    setGeneratingAI(true);
    
    // Extract top files
    const extractTopFiles = (node: any, arr: any[] = []) => {
      if (node.children) {
        node.children.forEach((c: any) => extractTopFiles(c, arr));
      } else {
        arr.push({ name: node.name, size: node.value });
      }
      return arr;
    };
    
    const files = extractTopFiles(sunburstData);
    files.sort((a, b) => b.size - a.size);
    const topFiles = files.slice(0, 50).map(f => `${f.name}: ${formatBytes(f.size)}`).join('\\n');

    const prompt = `You are a macOS clean-up expert. Based on the following largest files on the user's disk, write a brief, professional report in ${lang === 'vi' ? 'Vietnamese' : 'English'} analyzing their disk usage, pointing out what takes the most space, and giving actionable advice on what they can safely delete. Use plain text (no markdown formatting like ** or ##).\\n\\nTop files:\\n${topFiles}`;

    const keys = apiKeys.split(',').map(k => k.trim()).filter(k => k);
    let resultText = '';
    let lastError = '';
    
    // Updated list of active Groq models
    const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"];

    outerLoop:
    for (const key of keys) {
      for (const model of groqModels) {
        try {
          console.log(`Trying Groq API key: ${key.substring(0, 5)}... with model: ${model}`);
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({ 
              model: model,
              messages: [{ role: "user", content: prompt }]
            })
          });
          
          const data = await response.json();
          if (!response.ok) {
            console.error(`Groq API Error Response (${model}):`, data);
            lastError = data.error?.message || 'Unknown API Error';
            // If rate limited, switch to the next key immediately instead of next model
            if (response.status === 429) {
              break; 
            }
            throw new Error(lastError);
          }
          
          resultText = data.choices[0].message.content;
          break outerLoop;
        } catch (e: any) {
          console.warn(`Attempt failed (Key: ${key.substring(0,5)}..., Model: ${model}), trying next...`, e);
          lastError = e.message;
        }
      }
    }

    setGeneratingAI(false);

    if (!resultText) {
      alert((lang === 'vi' ? 'Lỗi API: ' : 'API Error: ') + lastError);
      return;
    }

    // Use native browser print for perfect Unicode/Vietnamese support
    const printWindow = window.open('', '', 'width=800,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Mac Cleanse Local - AI Analysis Report</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                padding: 40px; 
                color: #222; 
                line-height: 1.6; 
              }
              h1 { 
                color: #000; 
                font-size: 24px; 
                border-bottom: 4px solid #a1ff00; 
                padding-bottom: 10px; 
                margin-bottom: 20px;
              }
              .content { 
                white-space: pre-wrap; 
                font-size: 14px;
              }
              @media print {
                body { padding: 0; }
                @page { margin: 2cm; }
              }
            </style>
          </head>
          <body>
            <h1>Mac Cleanse Local - AI Analysis Report</h1>
            <div class="content">${resultText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            <script>
              window.onload = () => {
                window.print();
                // Close window after printing dialogue is closed
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-bg-main relative">
      
      {/* Left Sidebar (Config & Filters) */}
      <div className="w-full lg:w-[320px] lg:border-r border-border-main p-6 flex flex-col gap-6 shrink-0 bg-bg-panel z-20">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold italic font-mono">Section 03</span>
            <span className="h-px w-8 bg-text-main/20"></span>
          </div>
          <h2 className="text-3xl font-serif italic leading-tight text-text-main">Space<br />Lens.</h2>
        </div>

        {status === 'IDLE' && (
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-3">
              <div className="w-12 h-12 border border-dashed border-text-muted rounded-full flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-text-muted" />
              </div>
              <div>
                <p className="text-sm text-text-main">
                  {lang === 'vi' ? 'Sẵn sàng quét' : 'Ready to Scan'}
                </p>
                {sunburstData && (
                  <p className="text-xs text-text-muted font-mono">{formatBytes(sunburstData.value)} Total</p>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                <span>{basePath}</span>
              </div>
              <button 
                onClick={() => {
                  setBasePath('Macintosh HD');
                  startScan();
                }}
                className="w-full py-3 bg-accent text-[#080808] font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-colors"
              >
                {lang === 'vi' ? 'Phân tích' : 'Analyze Storage'}
              </button>
            </div>
            
            <div onClick={handleCustomFolder} className="p-4 border border-border-main bg-white/[0.02] rounded flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="text-sm text-text-main">{lang === 'vi' ? 'Thư mục tùy chỉnh...' : 'Custom Folder...'}</p>
                  <p className="text-[10px] text-text-muted font-mono">{lang === 'vi' ? 'Chọn đường dẫn' : 'Choose specific path'}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          </div>
        )}

        {status === 'SCANNING' && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-xs text-text-muted uppercase tracking-wider font-mono">{lang === 'vi' ? 'Đang phân tích...' : 'Mapping Drive...'}</p>
                <p className="text-accent font-mono text-xl">{Math.floor(scanProgress)}%</p>
              </div>
              <div className="h-1 bg-border-main rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-150" style={{ width: `${scanProgress}%` }}></div>
              </div>
              <p className="text-[10px] text-text-muted font-mono truncate">{scanPath}</p>
            </div>
          </div>
        )}

        {status === 'ANALYZED' && (
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">{lang === 'vi' ? 'Tìm kiếm' : 'Search'}</p>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tìm file/folder...' : 'Search files...'}
                  className="w-full bg-black/20 border border-border-main text-text-main text-sm py-2 pl-9 pr-3 outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-border-main">
              <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">{lang === 'vi' ? 'Bộ lọc' : 'Filters'}</p>
              
              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm text-text-main cursor-pointer hover:text-accent transition-colors" onClick={() => setHideSystem(!hideSystem)}>
                  <div className={`w-4 h-4 border flex items-center justify-center ${hideSystem ? 'border-accent bg-accent/20' : 'border-border-main'}`}>
                    {hideSystem && <div className="w-2 h-2 bg-accent"></div>}
                  </div>
                  {lang === 'vi' ? 'Ẩn tệp hệ thống' : 'Hide System Files'}
                </label>
                <label className="flex items-center gap-3 text-sm text-text-main cursor-pointer hover:text-accent transition-colors" onClick={() => setShowPackages(!showPackages)}>
                  <div className={`w-4 h-4 border flex items-center justify-center ${showPackages ? 'border-accent bg-accent/20' : 'border-border-main'}`}>
                    {showPackages && <div className="w-2 h-2 bg-accent"></div>}
                  </div>
                  {lang === 'vi' ? 'Hiện gói dạng thư mục' : 'Show Packages as Folders'}
                </label>
                <label className="flex items-center gap-3 text-sm text-text-main cursor-pointer hover:text-accent transition-colors" onClick={() => setLargeOnly(!largeOnly)}>
                  <div className={`w-4 h-4 border flex items-center justify-center ${largeOnly ? 'border-accent bg-accent/20' : 'border-border-main'}`}>
                    {largeOnly && <div className="w-2 h-2 bg-accent"></div>}
                  </div>
                  {lang === 'vi' ? 'Chỉ tệp lớn (> 1GB)' : 'Large Files Only (> 1GB)'}
                </label>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-border-main">
              <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">{lang === 'vi' ? 'Thao tác nhanh' : 'Quick Actions'}</p>
              <button 
                onClick={generateAIReport}
                disabled={generatingAI}
                className="w-full py-2 flex items-center justify-center gap-2 bg-accent/10 border border-accent/30 text-accent text-xs font-mono hover:bg-accent/20 transition-colors px-3">
                <Sparkles className="w-3 h-3" />
                {generatingAI 
                  ? (lang === 'vi' ? 'Đang tạo...' : 'Generating...') 
                  : (lang === 'vi' ? 'AI PDF Report' : 'AI PDF Report')}
              </button>
              
              <button 
                onClick={() => setShowAI(true)}
                className="w-full py-2 flex items-center justify-center gap-2 border border-border-main text-text-main text-xs font-mono hover:bg-white/5 transition-colors px-3">
                {lang === 'vi' ? 'Cấu hình AI' : 'AI Settings'}
              </button>

              <button 
                onClick={() => {
                  if (!sunburstData) return;
                  const report = JSON.stringify(sunburstData, null, 2);
                  const blob = new Blob([report], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `mac_cleanse_raw_${new Date().getTime()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full py-2 border border-border-main text-text-main text-xs font-mono hover:bg-white/5 transition-colors text-left px-3">
                {lang === 'vi' ? 'Xuất JSON thô...' : 'Export Raw JSON...'}
              </button>
              <button onClick={() => { startScan(); }} className="w-full py-2 border border-border-main text-text-main text-xs font-mono hover:bg-white/5 transition-colors text-left px-3">
                {lang === 'vi' ? 'Quét lại' : 'Rescan Drive'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Settings Modal */}
      {showAI && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-bg-panel border border-border-main p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAI(false)} className="absolute top-4 right-4 text-text-muted hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-accent font-mono mb-4 text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {lang === 'vi' ? 'Cấu hình API Key (AI)' : 'AI API Configuration'}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {lang === 'vi' 
                ? 'Nhập Groq API Key để AI có thể tự động phân tích đĩa và tạo PDF báo cáo. Bạn có thể nhập nhiều key cách nhau bằng dấu phẩy (,).'
                : 'Enter Groq API Key(s) to generate PDF reports. You can enter multiple keys separated by commas.'}
            </p>
            <textarea 
              value={apiKeys}
              onChange={(e) => setApiKeys(e.target.value)}
              placeholder="gsk_..."
              className="w-full h-24 bg-black/50 border border-border-main text-text-main p-3 text-sm font-mono outline-none focus:border-accent mb-4"
            />
            <button 
              onClick={() => {
                localStorage.setItem('gemini_api_keys', apiKeys);
                setShowAI(false);
              }}
              className="w-full py-3 bg-accent text-[#080808] font-bold uppercase text-xs tracking-widest hover:bg-white transition-colors"
            >
              {lang === 'vi' ? 'Lưu cấu hình' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Center Visualization */}
      <div className="flex-1 relative flex items-center justify-center p-8 z-10" ref={containerRef}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(161,255,0,0.03)_0%,transparent_70%)] pointer-events-none"></div>
        
        <svg ref={svgRef} className={`w-full h-full transition-opacity duration-1000 ${status === 'ANALYZED' ? 'opacity-100' : 'opacity-0'}`}></svg>
        
        {/* Placeholder Sunburst for IDLE/SCANNING */}
        {status !== 'ANALYZED' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="w-64 h-64 border-4 border-dashed border-accent rounded-full animate-[spin_60s_linear_infinite]"></div>
            <div className="absolute w-48 h-48 border-4 border-dotted border-text-main rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
            <div className="absolute w-32 h-32 border border-accent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Right Details Panel */}
      {status === 'ANALYZED' && (
        <div className="w-full lg:w-[320px] lg:border-l border-border-main p-6 flex flex-col bg-bg-panel z-20 shrink-0 transform transition-transform duration-300">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">{lang === 'vi' ? 'Chi tiết lựa chọn' : 'Selection Details'}</p>
            {selectedNode && (
              <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-1">
                <h3 className="text-xl font-serif text-text-main truncate" title={selectedNode.data.name}>
                  {selectedNode.data.name}
                </h3>
                <p className="text-accent font-mono text-sm">{formatBytes(selectedNode.value)}</p>
                <p className="text-xs text-text-muted pt-1">
                  {sunburstData && ((selectedNode.value / sunburstData.value * 100).toFixed(1))}% {lang === 'vi' ? 'của' : 'of'} {basePath}
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t border-border-main">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">{lang === 'vi' ? 'Loại' : 'Type'}</span>
                  <span className="text-text-main font-mono">{selectedNode.children ? (lang === 'vi' ? 'Thư mục' : 'Folder') : (lang === 'vi' ? 'Tệp' : 'File')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">{lang === 'vi' ? 'Số lượng' : 'Items'}</span>
                  <span className="text-text-main font-mono">
                    {selectedNode.data.files || (selectedNode.children ? selectedNode.children.length : 1)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">{lang === 'vi' ? 'Sửa đổi' : 'Modified'}</span>
                  <span className="text-text-main font-mono">{lang === 'vi' ? 'Hôm nay' : 'Today'}, 10:42 AM</span>
                </div>
              </div>

              <div className="space-y-2 pt-6">
                <button onClick={handleReveal} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors border border-white/20">
                  {lang === 'vi' ? 'Hiện trong Finder' : 'Reveal in Finder'}
                </button>
                <button onClick={handleDelete} className="w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider transition-colors">
                  {lang === 'vi' ? 'Xoá...' : 'Delete...'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-3">
              <div className="w-12 h-12 border border-dashed border-text-muted rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-xs text-text-muted">
                {lang === 'vi' ? 'Di chuột hoặc click vào mảng' : 'Hover or click on a segment'}
                <br />
                {lang === 'vi' ? 'để xem chi tiết.' : 'to view details.'}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
