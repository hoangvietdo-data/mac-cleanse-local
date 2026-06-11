import React, { useRef, useEffect } from 'react';

export function AuroraMesh({
  colors = ["#000000", "#0a0a0a", "#171717", "#262626", "#404040"],
  speed = 0.2,
  wireframe = true,
  mouseFollow = true,
  ripple = true,
  className = ''
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    let width = canvas.width = canvas.offsetWidth || window.innerWidth;
    let height = canvas.height = canvas.offsetHeight || window.innerHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
      initMesh();
    };

    window.addEventListener('resize', handleResize);

    // Mesh Grid Settings
    const spacing = 50; // grid spacing
    let cols = Math.ceil(width / spacing) + 2;
    let rows = Math.ceil(height / spacing) + 2;
    let points = [];
    
    let mouse = { x: width / 2, y: height / 2, tx: width / 2, ty: height / 2 };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - rect.left;
      mouse.ty = e.clientY - rect.top;
    };

    if (mouseFollow) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    class Point {
      constructor(x, y) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.phase = Math.random() * Math.PI * 2;
        this.amplitude = 10 + Math.random() * 10;
        this.speed = (0.01 + Math.random() * 0.01) * speed * 5;
      }

      update(time) {
        // Base sine wave motion
        this.phase += this.speed;
        let dx = Math.sin(this.phase) * this.amplitude;
        let dy = Math.cos(this.phase) * this.amplitude;

        // Mouse follow interaction
        if (mouseFollow) {
          const mdx = this.baseX - mouse.x;
          const mdy = this.baseY - mouse.y;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (dist < 250) {
            const force = (250 - dist) / 250;
            dx += (mdx / dist) * force * 20;
            dy += (mdy / dist) * force * 20;
          }
        }

        this.x = this.baseX + dx;
        this.y = this.baseY + dy;
      }
    }

    const initMesh = () => {
      cols = Math.ceil(width / spacing) + 2;
      rows = Math.ceil(height / spacing) + 2;
      points = [];
      for (let r = 0; r < rows; r++) {
        points[r] = [];
        for (let c = 0; c < cols; c++) {
          points[r][c] = new Point(
            (c - 1) * spacing,
            (r - 1) * spacing
          );
        }
      }
    };

    initMesh();

    let time = 0;
    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse position
      mouse.x += (mouse.tx - mouse.x) * 0.1;
      mouse.y += (mouse.ty - mouse.y) * 0.1;

      // Draw background fill using colors[0] or dark tone
      ctx.fillStyle = colors[0] || '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw Aurora Gradient background overlay
      const grad = ctx.createRadialGradient(
        mouse.x, mouse.y, 10,
        mouse.x, mouse.y, Math.max(width, height) * 0.8
      );
      grad.addColorStop(0, colors[2] || 'rgba(23, 23, 23, 0.4)');
      grad.addColorStop(0.5, colors[1] || 'rgba(10, 10, 10, 0.2)');
      grad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Update points
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          points[r][c].update(time);
        }
      }

      // Draw wireframe grid
      if (wireframe) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p = points[r][c];
            
            // Connect to right neighbor
            if (c < cols - 1) {
              const pr = points[r][c + 1];
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(pr.x, pr.y);
              ctx.stroke();
            }
            
            // Connect to bottom neighbor
            if (r < rows - 1) {
              const pb = points[r + 1][c];
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(pb.x, pb.y);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mouseFollow) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [colors, speed, wireframe, mouseFollow, ripple]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
}
