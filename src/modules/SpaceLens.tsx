import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Radar, FolderOpen, Play } from 'lucide-react';

export default function SpaceLens({ lang = "vi", theme = "dark" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [path, setPath] = useState('~/Downloads');
  const svgRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/space-lens?path=${encodeURIComponent(path)}&depth=2`);
      if (!res.ok) throw new Error('Network error');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data && svgRef.current) {
      drawChart(data);
    }
  }, [data]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const drawChart = (rootData) => {
    const width = 600;
    const height = 600;
    
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .style("display", "block")
      .style("margin", "0 auto")
      .style("background", "transparent")
      .style("cursor", "pointer");

    const root = d3.hierarchy(rootData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    const pack = d3.pack()
      .size([width, height])
      .padding(3);

    const nodes = pack(root).descendants();

    const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["rgba(161,255,0,0.05)", "rgba(161,255,0,0.3)"])
      .interpolate(d3.interpolateHcl);

    let focus = root;
    let view;

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
        .attr("fill", d => d.children ? color(d.depth) : "rgba(255,255,255,0.05)")
        .attr("stroke", d => d.children ? "rgba(161,255,0,0.2)" : "none")
        .attr("stroke-width", 1)
        .on("mouseover", function() { d3.select(this).attr("stroke", "#A1FF00").attr("stroke-width", 2); })
        .on("mouseout", function(event, d) { d3.select(this).attr("stroke", d.children ? "rgba(161,255,0,0.2)" : "none").attr("stroke-width", 1); })
        .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

    const label = svg.append("g")
        .style("font", "12px sans-serif")
        .style("fill", "#fff")
        .style("text-shadow", "0px 0px 3px #000")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
      .selectAll("text")
      .data(nodes)
      .join("text")
        .style("fill-opacity", d => d.parent === root ? 1 : 0)
        .style("display", d => d.parent === root ? "inline" : "none")
        .text(d => d.data.name + "\\n" + formatBytes(d.value));

    label.each(function(d) {
      const text = d3.select(this);
      const lines = text.text().split('\\n');
      text.text(null);
      lines.forEach((line, i) => {
        text.append("tspan")
          .attr("x", 0)
          .attr("y", i === 0 ? "-0.5em" : "0.7em")
          .style("font-size", i === 0 ? "14px" : "11px")
          .style("font-weight", i === 0 ? "bold" : "normal")
          .style("font-family", "monospace")
          .text(line);
      });
    });

    svg.on("click", (event) => zoom(event, root));

    let currentZoom = [root.x, root.y, root.r * 2];

    function zoomTo(v) {
      const k = width / v[2];
      view = v;
      label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr("r", d => d.r * k);
    }

    function zoom(event, d) {
      focus = d;
      const transition = svg.transition()
          .duration(750)
          .tween("zoom", d => {
            const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
            return t => zoomTo(i(t));
          });

      label
        .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
        .transition(transition)
          .style("fill-opacity", d => d.parent === focus ? 1 : 0)
          .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
          .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
    }

    zoomTo(currentZoom);
  };

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Column */}
      <div className="w-full lg:w-[460px] lg:border-r border-border-main p-6 md:p-10 flex flex-col gap-8 shrink-0 bg-bg-panel">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold italic font-mono">Section 03</span>
            <span className="h-px w-8 bg-text-main/20"></span>
          </div>
          <h2 className="text-3xl font-serif italic leading-tight text-text-main">Space<br />Lens.</h2>
          <p className="text-xs text-text-muted">
            {lang === 'vi' ? 'Quét cấu trúc thư mục dạng Sunburst để dễ dàng tìm ra "thủ phạm" chiếm ổ cứng.' : 'Scan directory structures in Sunburst layout to easily spot storage hogs.'}
          </p>
        </div>

        <div className="space-y-4 flex-1">
          <p className="text-[10px] text-text-sub uppercase tracking-widest font-mono font-bold">Cấu hình quét</p>
          
          <div className="space-y-2">
            <div className="p-3 border border-border-main bg-white/[0.02] rounded space-y-3">
              <label className="text-xs font-mono text-text-main/80">Thư mục phân tích</label>
              <div className="flex items-center gap-2 bg-bg-main border border-border-main rounded px-3 py-2">
                <FolderOpen className="w-4 h-4 text-text-muted" />
                <input 
                  type="text" 
                  value={path} 
                  onChange={(e) => setPath(e.target.value)} 
                  className="bg-transparent border-none outline-none text-sm text-text-main flex-1 font-mono placeholder-white/30"
                  placeholder="~/Downloads"
                />
              </div>
            </div>
          </div>
          
          {error && <div className="text-xs text-red-400 font-mono mt-4 p-3 border border-red-500/20 bg-red-500/5 rounded">{error}</div>}
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className={`w-full py-4 bg-accent text-[#080808] font-bold uppercase text-xs tracking-[0.3em] hover:bg-white hover:text-black transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Đang phân tích...' : 'Phân tích bản đồ'}
        </button>
      </div>

      {/* Right Column */}
      <div className="flex-1 p-6 md:p-12 lg:p-16 flex flex-col items-center justify-center bg-bg-main relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(161,255,0,0.03)_0%,transparent_70%)] pointer-events-none"></div>
        
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-main/80 backdrop-blur z-10">
            <div className="w-12 h-12 rounded-full border-t-2 border-accent animate-spin mb-4"></div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Scanning Space...</p>
          </div>
        )}

        <svg ref={svgRef} className="w-full max-w-[700px] aspect-square"></svg>

        {!loading && !data && !error && (
          <div className="text-center space-y-4 opacity-50">
            <Radar className="w-16 h-16 mx-auto text-text-muted" />
            <p className="text-sm font-mono tracking-widest uppercase">Select path and analyze</p>
          </div>
        )}
      </div>
    </main>
  );
}
