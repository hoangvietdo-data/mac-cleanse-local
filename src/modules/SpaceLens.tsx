import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  HardDrive, Folder, Search, ChevronRight, X
} from 'lucide-react';

const MOCK_HD_DATA = {
  name: "Macintosh HD",
  children: [
    {
      name: "Applications",
      children: [
        { name: "Adobe Creative Cloud", value: 45000000000, files: 1240 },
        { name: "Xcode.app", value: 30000000000, files: 1 },
        { name: "Final Cut Pro.app", value: 25000000000, files: 1 },
        { name: "Google Chrome.app", value: 2000000000, files: 1 },
        { name: "Other Apps", value: 48000000000, files: 84 },
      ]
    },
    {
      name: "Users",
      children: [
        { 
          name: "macbook", 
          children: [
            { name: "Downloads", value: 80000000000, files: 452 },
            { name: "Documents", value: 50000000000, files: 12045 },
            { name: "Desktop", value: 20000000000, files: 120 },
            { 
              name: "Library", 
              children: [
                { name: "Caches", value: 25000000000, files: 8540 },
                { name: "Application Support", value: 10000000000, files: 1250 },
                { name: "Containers", value: 5000000000, files: 603 }
              ]
            },
          ]
        },
        { name: "Shared", value: 10000000000, files: 45 }
      ]
    },
    {
      name: "System",
      children: [
        { name: "Library", value: 40000000000, files: 8450 },
        { name: "CoreServices", value: 10000000000, files: 412 },
      ]
    },
    {
      name: "Library",
      children: [
        { name: "Caches", value: 50000000000, files: 12040 },
        { name: "Application Support", value: 20000000000, files: 410 },
        { name: "Containers", value: 10000000000, files: 852 }
      ]
    },
    {
      name: "Developer",
      children: [
        { name: "Xcode", value: 32000000000, files: 10540 }
      ]
    }
  ]
};

function computeValues(node: any) {
  if (node.children) {
    node.value = node.children.reduce((acc: number, child: any) => acc + computeValues(child), 0);
  }
  return node.value || 0;
}
computeValues(MOCK_HD_DATA);

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
  
  const svgRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScan = () => {
    setStatus('SCANNING');
    let progress = 0;
    const paths = [
      '/System/Library/CoreServices',
      '/Users/macbook/Downloads/Design_Assets',
      '/Applications/Xcode.app/Contents/Developer',
      '/Library/Application Support/Adobe',
      '/Users/macbook/Library/Caches/Google',
    ];
    
    const interval = setInterval(() => {
      progress += Math.random() * 5 + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setStatus('ANALYZED'), 500);
      }
      setScanProgress(progress);
      setScanPath(paths[Math.floor(Math.random() * paths.length)]);
    }, 150);
  };

  useEffect(() => {
    if (status === 'ANALYZED') {
      drawSunburst();
    }
  }, [status]);

  const drawSunburst = () => {
    if (!svgRef.current || !containerRef.current) return;
    
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

    const root = d3.hierarchy(MOCK_HD_DATA)
      .sum(d => Math.max(0, d.value))
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

    const path = svg.append("g")
      .selectAll("path")
      .data(root.descendants().filter(d => d.depth && d.x1 - d.x0 > 0.01))
      .join("path")
        .attr("fill", d => color(d.depth))
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
    }

    function arcVisible(d: any) {
      return d.y1 <= radius && d.y0 >= 0 && d.x1 > d.x0;
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
            <div className="p-4 border border-accent/30 bg-accent/5 rounded space-y-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-accent" />
                <div>
                  <p className="text-sm font-bold text-text-main">Macintosh HD</p>
                  <p className="text-xs text-text-muted font-mono">{formatBytes(MOCK_HD_DATA.value)} Total</p>
                </div>
              </div>
              <button 
                onClick={startScan}
                className="w-full py-3 bg-accent text-[#080808] font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-colors"
              >
                Analyze Storage
              </button>
            </div>
            
            <div className="p-4 border border-border-main bg-white/[0.02] rounded flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="text-sm text-text-main">Custom Folder...</p>
                  <p className="text-[10px] text-text-muted font-mono">Choose specific path</p>
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
                <p className="text-xs text-text-muted uppercase tracking-wider font-mono">Mapping Drive...</p>
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
              <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">Filters</p>
              
              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm text-text-main cursor-pointer hover:text-accent transition-colors">
                  <div className="w-4 h-4 border border-accent flex items-center justify-center bg-accent/20">
                    <div className="w-2 h-2 bg-accent"></div>
                  </div>
                  Hide System Files
                </label>
                <label className="flex items-center gap-3 text-sm text-text-main cursor-pointer hover:text-accent transition-colors">
                  <div className="w-4 h-4 border border-border-main flex items-center justify-center"></div>
                  Show Packages as Folders
                </label>
                <label className="flex items-center gap-3 text-sm text-text-main cursor-pointer hover:text-accent transition-colors">
                  <div className="w-4 h-4 border border-border-main flex items-center justify-center"></div>
                  Large Files Only ({'>'} 1GB)
                </label>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-border-main">
              <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">Quick Actions</p>
              <button className="w-full py-2 border border-border-main text-text-main text-xs font-mono hover:bg-white/5 transition-colors text-left px-3">
                Export Analysis Report...
              </button>
              <button onClick={() => { setStatus('IDLE'); setSelectedNode(null); }} className="w-full py-2 border border-border-main text-text-main text-xs font-mono hover:bg-white/5 transition-colors text-left px-3">
                Rescan Drive
              </button>
            </div>
          </div>
        )}
      </div>

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
            <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">Selection Details</p>
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
                  {(selectedNode.value / MOCK_HD_DATA.value * 100).toFixed(1)}% of Macintosh HD
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t border-border-main">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Type</span>
                  <span className="text-text-main font-mono">{selectedNode.children ? 'Folder' : 'File'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Items</span>
                  <span className="text-text-main font-mono">
                    {selectedNode.data.files || (selectedNode.children ? selectedNode.children.length : 1)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Modified</span>
                  <span className="text-text-main font-mono">Today, 10:42 AM</span>
                </div>
              </div>

              <div className="space-y-2 pt-6">
                <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors border border-white/20">
                  Reveal in Finder
                </button>
                <button className="w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider transition-colors">
                  Delete...
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-3">
              <div className="w-12 h-12 border border-dashed border-text-muted rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-xs text-text-muted">Hover or click on a segment<br />to view details.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
