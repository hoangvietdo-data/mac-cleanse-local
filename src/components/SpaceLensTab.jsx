import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GlassButton } from "@/components/lazy-ui/glass-button";

export default function SpaceLensTab({ t }) {
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
    
    // Clear previous
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

    // Create a color scale
    const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["rgba(0,255,255,0.1)", "rgba(0,100,255,0.4)"])
      .interpolate(d3.interpolateHcl);

    let focus = root;
    let view;

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
        .attr("fill", d => d.children ? color(d.depth) : "rgba(200,200,255,0.2)")
        .attr("stroke", d => d.children ? "rgba(0,255,255,0.3)" : "none")
        .attr("stroke-width", 1)
        .on("mouseover", function() { d3.select(this).attr("stroke", "#0ff").attr("stroke-width", 2); })
        .on("mouseout", function() { d3.select(this).attr("stroke", d => d.children ? "rgba(0,255,255,0.3)" : "none").attr("stroke-width", 1); })
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

    // Handle multiline labels manually (svg text does not support \n naturally)
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
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input 
          type="text" 
          value={path} 
          onChange={(e) => setPath(e.target.value)} 
          style={{ padding: '10px 15px', borderRadius: '8px', background: 'var(--surface-light)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '300px' }}
          placeholder="Path to scan (e.g. ~/Downloads)"
        />
        <GlassButton onClick={fetchData} disabled={loading} style={{ padding: '10px 20px', background: 'var(--accent-cyan)' }}>
          {loading ? 'Đang tải...' : 'Phân tích'}
        </GlassButton>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '20px' }}>Lỗi: {error}</div>}

      <div className="glass-panel" style={{ width: '100%', minHeight: '600px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-secondary)' }}>Đang tính toán dung lượng...</div>}
        <svg ref={svgRef} width="600" height="600"></svg>
        {!loading && !data && !error && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)' }}>
            Nhập đường dẫn và bấm Phân tích để xem bản đồ thư mục.
          </div>
        )}
      </div>
    </div>
  );
}
