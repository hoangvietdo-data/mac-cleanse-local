"use client";

import { motion, useReducedMotion } from "motion/react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

// Deterministic PRNG so the bling offsets are hydration-stable.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A four-point twinkle with concave sides.
const SPARKLE_PATH =
  "M12 0c.9 6.6 4.4 10.1 11 11-6.6.9-10.1 4.4-11 11-.9-6.6-4.4-10.1-11-11 6.6-.9 10.1-4.4 11-11Z";

// Knock the rounded interior out, leaving only the `t`-wide perimeter band.
function band(t) {
  return {
    padding: t,
    boxSizing: "border-box",
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    maskComposite: "exclude",
  };
}

// A wedge centred on `--angle` that fades out along a smoothstep-shaped feather
// on each flank, so the lit arc dissolves into the dark rim with no hard seam.
function cone(half) {
  const core = Math.max(4, Math.min(150, half));
  const feather = Math.min(155, core * 0.9 + 14);
  const a = Math.min(179, core + feather);
  const N = 7;
  const fwd = ["#fff 0deg", `#fff ${core.toFixed(1)}deg`];
  const back = [];
  for (let i = 1; i <= N; i++) {
    const f = i / N;
    const deg = Math.min(a, core + feather * f);
    const alpha = (1 - f * f * (3 - 2 * f)).toFixed(3); // smoothstep 1 → 0
    fwd.push(`rgba(255,255,255,${alpha}) ${deg.toFixed(1)}deg`);
    back.unshift(`rgba(255,255,255,${alpha}) ${(360 - deg).toFixed(1)}deg`);
  }
  back.push(`#fff ${(360 - core).toFixed(1)}deg`, "#fff 360deg");
  return `conic-gradient(from var(--angle) at 50% 50%, ${[...fwd, ...back].join(", ")})`;
}

const smoothstep = (k) => k * k * (3 - 2 * k);

// Cursor angle in the same frame conic-gradient uses: 0° at top, clockwise.
function angleTo(px, py, cx, cy) {
  const a = Math.atan2(py - cy, px - cx) * (180 / Math.PI) + 90;
  return a < 0 ? a + 360 : a;
}

// Nearest point on the card's rectangular border, in % — where the bling sits.
function nearestBorder(lx, ly, w, h) {
  const dl = lx;
  const dr = w - lx;
  const dt = ly;
  const db = h - ly;
  const m = Math.min(dl, dr, dt, db);
  let bx = lx;
  let by = ly;
  if (m === dl) bx = 0;
  else if (m === dr) bx = w;
  else if (m === dt) by = 0;
  else by = h;
  return { x: (bx / w) * 100, y: (by / h) * 100 };
}

export function BorderGlow({
  children,
  className,
  mode = "auto",
  colors = ["#a78bfa", "#f0abfc", "#67e8f9"],
  thickness = 1.5,
  radius = 20,
  coneSpread = 58,
  glowSize = 22,
  intensity = 1,
  speed = 1,
  cursorRadius = 200,
  bling = true,
  sparkleCount = 8,
  seed = 1,
  background = "#0b0b0f",
  style,
  ...props
}) {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const ringRef = useRef(null);
  const blingRef = useRef(null);
  const angleRef = useRef(90);
  const params = useRef({ cursorRadius, intensity });

  useEffect(() => {
    params.current.cursorRadius = cursorRadius;
    params.current.intensity = intensity;
  });

  const ring = useMemo(
    () =>
      `conic-gradient(from 90deg at 50% 50%, ${[...colors, colors[0]].join(", ")})`,
    [colors],
  );

  const sparkles = useMemo(() => {
    if (reduced || !bling || sparkleCount <= 0) return [];
    const rand = mulberry32(seed * 2654435761);
    return Array.from({ length: sparkleCount }, () => ({
      dx: (rand() - 0.5) * 64,
      dy: (rand() - 0.5) * 64,
      color: colors[Math.floor(rand() * colors.length)],
      size: 4 + rand() * 5,
      delay: rand() * 1.6,
      dur: 1 + rand() * 1.1,
      gap: 0.4 + rand() * 1.4,
      peak: 0.55 + rand() * 0.4,
    }));
  }, [reduced, bling, sparkleCount, seed, colors]);

  const setGlow = useCallback((it) => {
    if (ringRef.current) ringRef.current.style.opacity = `${it}`;
  }, []);

  useEffect(() => {
    if (mode !== "auto" || reduced) return;
    let raf = 0;
    let prev = 0;
    const step = (t) => {
      if (!prev) prev = t;
      angleRef.current = (angleRef.current + ((t - prev) / 1000) * 60 * speed) % 360;
      prev = t;
      rootRef.current?.style.setProperty("--angle", `${angleRef.current}deg`);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mode, reduced, speed]);

  useEffect(() => {
    if (mode !== "cursor" || reduced) return;
    const el = rootRef.current;
    if (!el) return;

    let rect = el.getBoundingClientRect();
    const refresh = () => {
      rect = el.getBoundingClientRect();
    };

    let lx = 0;
    let ly = 0;
    let curAngle = angleRef.current;
    let curGlow = 0;
    let prev = 0;
    let raf = 0;

    const tick = (t) => {
      const dt = prev ? Math.min(0.05, (t - prev) / 1000) : 0.016;
      prev = t;

      const { cursorRadius: cr, intensity: it } = params.current;
      const dx = Math.max(rect.left - lx, 0, lx - rect.right);
      const dy = Math.max(rect.top - ly, 0, ly - rect.bottom);
      const dist = Math.hypot(dx, dy);
      const k = dist >= cr ? 0 : 1 - dist / cr;
      const targetGlow = smoothstep(k) * it;
      const cxC = rect.left + rect.width / 2;
      const cyC = rect.top + rect.height / 2;
      const targetAngle = angleTo(lx, ly, cxC, cyC);

      const ease = (tau) => 1 - Math.exp(-dt / tau);
      const diff = ((targetAngle - curAngle + 540) % 360) - 180;
      curAngle = (curAngle + diff * ease(0.08) + 360) % 360;
      curGlow += (targetGlow - curGlow) * ease(0.13);

      angleRef.current = curAngle;
      el.style.setProperty("--angle", `${curAngle}deg`);
      setGlow(curGlow);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (e) => {
      lx = e.clientX;
      ly = e.clientY;
    };

    const ro = new ResizeObserver(refresh);
    ro.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", refresh, { passive: true, capture: true });
    window.addEventListener("resize", refresh);

    return () => {
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", refresh, { capture: true });
      window.removeEventListener("resize", refresh);
      cancelAnimationFrame(raf);
    };
  }, [mode, reduced, setGlow]);

  const onPointerMove = useCallback(
    (e) => {
      if (reduced) return;
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const lx = e.clientX - r.left;
      const ly = e.clientY - r.top;
      if (bling) {
        const b = nearestBorder(lx, ly, r.width, r.height);
        el.style.setProperty("--bling-x", `${b.x}%`);
        el.style.setProperty("--bling-y", `${b.y}%`);
      }
      if (mode === "hover") {
        el.style.setProperty("--angle", `${angleTo(lx, ly, r.width / 2, r.height / 2)}deg`);
        setGlow(params.current.intensity);
      }
    },
    [reduced, bling, mode, setGlow],
  );

  const onPointerEnter = useCallback(() => {
    if (reduced) return;
    if (bling && blingRef.current) blingRef.current.style.opacity = "1";
  }, [reduced, bling]);

  const onPointerLeave = useCallback(() => {
    if (blingRef.current) blingRef.current.style.opacity = "0";
    if (mode === "hover") setGlow(0);
  }, [mode, setGlow]);

  const ringRest = reduced
    ? 0.26 * intensity
    : mode === "auto"
      ? 0.9 * intensity
      : 0;

  const coneRing = reduced ? undefined : cone(coneSpread);

  const glowColors = [
    colors[0],
    colors[Math.floor(colors.length / 2)] ?? colors[0],
    colors[colors.length - 1],
  ];
  const dropGlow =
    reduced || glowSize <= 0
      ? undefined
      : `drop-shadow(0 0 ${(glowSize * 0.4).toFixed(1)}px ${glowColors[0]}) ` +
        `drop-shadow(0 0 ${(glowSize * 1).toFixed(1)}px ${glowColors[1]}) ` +
        `drop-shadow(0 0 ${(glowSize * 1.9).toFixed(1)}px ${glowColors[2]})`;

  return (
    <div
      ref={rootRef}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={className}
      style={{
        position: "relative",
        isolation: "isolate",
        borderRadius: radius,
        transform: "translateZ(0)",
        "--angle": "90deg",
        "--bling-x": "50%",
        "--bling-y": "50%",
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          borderRadius: "inherit",
          background,
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          opacity: ringRest,
          zIndex: 2,
          pointerEvents: "none",
          filter: dropGlow,
          transition: mode === "cursor" ? "none" : "opacity 0.3s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            ...(coneRing
              ? { WebkitMaskImage: coneRing, maskImage: coneRing }
              : {}),
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              overflow: "hidden",
              ...band(thickness),
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: ring }} />
          </div>
        </div>
      </div>

      {sparkles.length > 0 && (
        <div
          ref={blingRef}
          aria-hidden
          style={{
            position: "absolute",
            left: "var(--bling-x)",
            top: "var(--bling-y)",
            width: 0,
            height: 0,
            opacity: 0,
            transition: "opacity 0.25s ease",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          {sparkles.map((s, i) => (
            <motion.span
              key={i}
              style={{
                position: "absolute",
                left: s.dx,
                top: s.dy,
                width: s.size,
                height: s.size,
                translate: "-50% -50%",
                color: s.color,
                filter: `drop-shadow(0 0 3px ${s.color})`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 0], opacity: [0, s.peak, 0], rotate: [0, 45] }}
              transition={{
                duration: s.dur,
                delay: s.delay,
                repeat: Infinity,
                repeatDelay: s.gap,
                ease: "easeInOut",
              }}
            >
              <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
                <path d={SPARKLE_PATH} />
              </svg>
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}

BorderGlow.displayName = "BorderGlow";

export default BorderGlow;
