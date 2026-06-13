"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * LogoIntro — Full-screen logo splash with stardust particle burst.
 *
 * Sequence:
 *  0.05s  — Logo fades in (centred, large, with green/teal glow)
 *  0–0.85s — Stardust particles burst outward
 *  0.85s  — Black overlay fades out over 0.55s
 *  1.1s   — Main page content rises in from below (handled in layout)
 *
 * Only shown once per browser session (sessionStorage flag).
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colour: string;
  life: number;
  decay: number;
  trail: { x: number; y: number }[];
}

const COLOURS = [
  "rgba(255,255,255,",
  "rgba(34,197,94,",
  "rgba(20,184,166,",
  "rgba(103,232,249,",
  "rgba(74,222,128,",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function spawnParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = randomBetween(1.2, 6.5);
  return {
    x: cx + randomBetween(-80, 80),
    y: cy + randomBetween(-50, 50),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: randomBetween(0.6, 2.8),
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    life: 1,
    decay: randomBetween(0.006, 0.022),
    trail: [],
  };
}

export function LogoIntro({ logoSrc }: { logoSrc: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only show once per session
    if (sessionStorage.getItem("gfa_intro_shown")) return;
    sessionStorage.setItem("gfa_intro_shown", "1");
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    // Trigger exit animation at 0.85s
    const exitTimer = window.setTimeout(() => setExiting(true), 850);
    // Remove from DOM at 1.6s
    const removeTimer = window.setTimeout(() => setVisible(false), 1600);

    if (canvas && ctx) {
      let particles: Particle[] = [];
      let startTime: number | null = null;

      function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      resize();
      window.addEventListener("resize", resize);

      function initParticles() {
        if (!canvas) return;
        particles = [];
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        for (let i = 0; i < 220; i++) particles.push(spawnParticle(cx, cy));
      }

      function drawFrame(elapsed: number) {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 320);
        grd.addColorStop(0, "rgba(34,197,94,0.18)");
        grd.addColorStop(0.45, "rgba(20,184,166,0.09)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 7) p.trail.shift();

          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++)
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            ctx.strokeStyle = `${p.colour}${(p.life * 0.35).toFixed(2)})`;
            ctx.lineWidth = p.size * 0.55;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `${p.colour}${p.life.toFixed(2)})`;
          ctx.fill();

          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.99;
          p.vy *= 0.99;
          p.life -= p.decay;
        });

        particles = particles.filter((p) => p.life > 0);

        if (elapsed < 700 && particles.length < 120 && canvas) {
          const cx2 = canvas.width / 2;
          const cy2 = canvas.height / 2;
          for (let i = 0; i < 4; i++) particles.push(spawnParticle(cx2, cy2));
        }
      }

      function animLoop(timestamp: number) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        drawFrame(elapsed);
        if (elapsed < 2000) {
          animFrameRef.current = requestAnimationFrame(animLoop);
        } else {
          ctx?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
        }
      }

      initParticles();
      animFrameRef.current = requestAnimationFrame(animLoop);

      return () => {
        window.removeEventListener("resize", resize);
      };
    }

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      if (animFrameRef.current) {
        window.cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: exiting
          ? "gfaSplashFadeOut 0.55s ease-in-out forwards"
          : "none",
        pointerEvents: exiting ? "none" : "all",
      }}
    >
      <style>{`
        @keyframes gfaSplashFadeOut {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes gfaLogoAppear {
          0%   { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "min(320px, 60vw)",
          animation: "gfaLogoAppear 0.3s ease-out 0.05s both",
          filter:
            "drop-shadow(0 0 40px rgba(34,197,94,0.6)) drop-shadow(0 0 80px rgba(20,184,166,0.35))",
        }}
      >
        <Image
          src={logoSrc}
          alt="Transport Action Group Ecosystem"
          width={320}
          height={120}
          priority
          style={{ width: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}
