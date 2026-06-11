"use client";

import React, {
  useEffect,
  useRef,
} from "react";
import * as THREE from "three";

const VS = /* glsl */ `
precision highp float;
attribute vec3 position;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position, 1.0);
}`;

// Single composite pass — fbm-driven mask sweeps from imageA to imageB,
// with a velocity-style refraction concentrated at the moving boundary.
const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D imageA;
uniform sampler2D imageB;
uniform vec2 imageARes;
uniform vec2 imageBRes;
uniform vec2 canvasRes;
uniform float progress;
uniform float time;
uniform float distortion;
uniform float softness;
uniform float noiseScale;
uniform float drip;
uniform int direction;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = p * 2.02 + 7.13;
    a *= 0.5;
  }
  return v;
}

vec2 cover(vec2 uv, vec2 tr, vec2 cr) {
  vec2 ratio = vec2(
    min((cr.x / cr.y) / (tr.x / tr.y), 1.0),
    min((cr.y / cr.x) / (tr.y / tr.x), 1.0)
  );
  return uv * ratio + (1.0 - ratio) * 0.5;
}

void main() {
  float bias;
  if (direction == 1) {
    bias = vUv.x;
  } else if (direction == 2) {
    bias = 1.0 - vUv.y;
  } else if (direction == 3) {
    bias = length(vUv - 0.5) * 1.4142;
  } else {
    bias = 0.5;
  }

  vec2 np = vUv * noiseScale + vec2(time * 0.06, time * 0.04);
  float n = fbm(np);
  float field = mix(n, bias, drip);

  float t = mix(-softness, 1.0 + softness, progress);
  float mask = smoothstep(field - softness, field + softness, t);

  float edge = 1.0 - abs(mask * 2.0 - 1.0);

  vec2 dn = vec2(
    fbm(np + vec2(3.7, 1.2)) - 0.5,
    fbm(np + vec2(8.3, 4.5)) - 0.5
  );
  vec2 disp = dn * distortion * edge;

  vec2 uvA = cover(vUv + disp, imageARes, canvasRes);
  vec2 uvB = cover(vUv + disp, imageBRes, canvasRes);

  vec4 a = texture2D(imageA, uvA);
  vec4 b = texture2D(imageB, uvB);
  vec4 c = mix(a, b, mask);
  gl_FragColor = vec4(c.rgb, max(c.a, max(a.a, b.a)));
}`;

function dirToInt(d) {
  switch (d) {
    case "horizontal":
      return 1;
    case "vertical":
      return 2;
    case "radial":
      return 3;
    default:
      return 0;
  }
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function LiquidTransition({
  imageA,
  imageB,
  progress,
  autoPlay = true,
  duration = 2400,
  hold = 1200,
  loop = true,
  distortion = 0.08,
  softness = 0.18,
  noiseScale = 2.4,
  drip = 0.55,
  direction = "noise",
  onComplete,
  className,
  style,
  ...rest
}) {
  const mountRef = useRef(null);
  const knobsRef = useRef({
    progress,
    autoPlay,
    duration,
    hold,
    loop,
    distortion,
    softness,
    noiseScale,
    drip,
    direction,
  });
  const onCompleteRef = useRef(undefined);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    knobsRef.current = {
      progress,
      autoPlay,
      duration,
      hold,
      loop,
      distortion,
      softness,
      noiseScale,
      drip,
      direction,
    };
  }, [
    progress,
    autoPlay,
    duration,
    hold,
    loop,
    distortion,
    softness,
    noiseScale,
    drip,
    direction,
  ]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const canvas = renderer.domElement;
    canvas.style.cssText =
      "width:100%;height:100%;display:block;border-radius:inherit;";
    mount.prepend(canvas);

    const canvasRes = new THREE.Vector2(1, 1);
    const imageARes = new THREE.Vector2(1, 1);
    const imageBRes = new THREE.Vector2(1, 1);

    const uniforms = {
      imageA: { value: null },
      imageB: { value: null },
      imageARes: { value: imageARes },
      imageBRes: { value: imageBRes },
      canvasRes: { value: canvasRes },
      progress: { value: 0 },
      time: { value: 0 },
      distortion: { value: distortion },
      softness: { value: softness },
      noiseScale: { value: noiseScale },
      drip: { value: drip },
      direction: { value: dirToInt(direction) },
    };

    const material = new THREE.RawShaderMaterial({
      vertexShader: VS,
      fragmentShader: FS,
      uniforms,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    const scene = new THREE.Scene();
    scene.add(mesh);
    const camera = new THREE.Camera();

    const measure = () => {
      const rect = mount.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvasRes.set(w, h);
      renderer.setSize(w, h, false);
    };
    measure();

    let resizeRaf = null;
    const ro = new ResizeObserver(() => {
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        if (disposed) return;
        measure();
      });
    });
    ro.observe(mount);

    let visible = true;
    let pageVisible = !document.hidden;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        visible = !!e && e.isIntersecting && e.intersectionRatio > 0;
      },
      { threshold: [0, 0.01] }
    );
    io.observe(mount);

    const handleVisibility = () => {
      pageVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    let texA = null;
    let texB = null;

    function configureTex(t) {
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
    }
    function loadTex(url) {
      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (t) => {
            configureTex(t);
            resolve(t);
          },
          undefined,
          (err) => reject(err)
        );
      });
    }

    let phase = "forward";
    let phaseStart = performance.now();
    let progressVal = 0;
    const startTime = performance.now();

    function advancePhase(now) {
      const k = knobsRef.current;
      const dt = now - phaseStart;
      if (phase === "forward") {
        progressVal = clamp(dt / Math.max(1, k.duration), 0, 1);
        if (dt >= k.duration) {
          progressVal = 1;
          onCompleteRef.current?.();
          if (k.loop) {
            phase = "holdF";
            phaseStart = now;
          } else {
            phase = "done";
          }
        }
      } else if (phase === "holdF") {
        progressVal = 1;
        if (dt >= k.hold) {
          phase = "backward";
          phaseStart = now;
        }
      } else if (phase === "backward") {
        progressVal = 1 - clamp(dt / Math.max(1, k.duration), 0, 1);
        if (dt >= k.duration) {
          progressVal = 0;
          onCompleteRef.current?.();
          phase = "holdB";
          phaseStart = now;
        }
      } else if (phase === "holdB") {
        progressVal = 0;
        if (dt >= k.hold) {
          phase = "forward";
          phaseStart = now;
        }
      }
    }

    let rafId = null;
    function frame() {
      rafId = requestAnimationFrame(frame);
      if (!visible || !pageVisible) return;
      const now = performance.now();
      const k = knobsRef.current;

      if (k.progress !== undefined) {
        progressVal = clamp(k.progress, 0, 1);
      } else if (k.autoPlay) {
        advancePhase(now);
      }

      uniforms.progress.value = progressVal;
      uniforms.time.value = (now - startTime) / 1000;
      uniforms.distortion.value = k.distortion;
      uniforms.softness.value = k.softness;
      uniforms.noiseScale.value = k.noiseScale;
      uniforms.drip.value = k.drip;
      uniforms.direction.value = dirToInt(k.direction);

      renderer.render(scene, camera);
    }

    (async () => {
      try {
        const [a, b] = await Promise.all([loadTex(imageA), loadTex(imageB)]);
        if (disposed) {
          a.dispose();
          b.dispose();
          return;
        }
        texA = a;
        texB = b;
        const aw = a.image?.width ?? 1;
        const ah = a.image?.height ?? 1;
        const bw = b.image?.width ?? 1;
        const bh = b.image?.height ?? 1;
        imageARes.set(aw, ah);
        imageBRes.set(bw, bh);
        uniforms.imageA.value = texA;
        uniforms.imageB.value = texB;
        frame();
      } catch (e) {
        // Texture load failed
      }
    })();

    return () => {
      disposed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      material.dispose();
      geometry.dispose();
      texA?.dispose();
      texB?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [imageA, imageB]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        ...style,
      }}
      {...rest}
    />
  );
}

LiquidTransition.displayName = "LiquidTransition";
export default LiquidTransition;
