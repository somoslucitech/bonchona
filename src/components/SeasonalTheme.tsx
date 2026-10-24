"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { resolveSeason, setSeason, useSeason } from "@/lib/season";

// Aplica la máscara de temporada (colores vía data-season en <html>, ver
// globals.css) y pinta la decoración encima del sitio. Todo es
// pointer-events-none para no tapar el chat, el reproductor ni WhatsApp.
export default function SeasonalTheme() {
  const searchParams = useSearchParams();
  const season = useSeason();

  useEffect(() => {
    setSeason(resolveSeason(searchParams.get("temporada")));
  }, [searchParams]);

  if (season === "halloween") return <HalloweenDecor />;
  if (season === "navidad") return <ChristmasDecor />;
  return null;
}

const WEB_SPOKES = [0, 18, 36, 54, 72, 90].map((deg) => (deg * Math.PI) / 180);

// Un anillo de la telaraña: entre cada par de radios, una curva que se
// hunde hacia el centro como un hilo con peso.
function webRing(r: number) {
  const pt = (a: number, rr: number) => `${(rr * Math.cos(a)).toFixed(1)} ${(rr * Math.sin(a)).toFixed(1)}`;
  return WEB_SPOKES.slice(1)
    .map((a, i) => {
      const prev = WEB_SPOKES[i];
      return `${i === 0 ? `M${pt(prev, r)} ` : ""}Q${pt((prev + a) / 2, r * 0.85)} ${pt(a, r)}`;
    })
    .join(" ");
}

function HalloweenDecor() {
  return (
    <div aria-hidden className="pointer-events-none">
      {/* Telaraña colgando bajo la navbar, esquina izquierda */}
      <svg
        className="fixed top-16 sm:top-20 left-0 z-[49] w-28 sm:w-44 h-auto opacity-40"
        viewBox="0 0 200 200"
        fill="none"
        stroke="white"
        strokeWidth="1.2"
      >
        {WEB_SPOKES.map((a) => (
          <line key={a} x1="0" y1="0" x2={200 * Math.cos(a)} y2={200 * Math.sin(a)} />
        ))}
        {[40, 75, 110, 145, 180].map((r) => (
          <path key={r} d={webRing(r)} />
        ))}
        <line x1="150" y1="0" x2="150" y2="95" />
        <g transform="translate(150 105)" fill="white" stroke="none">
          <ellipse rx="7" ry="9" />
          <circle cy="-10" r="4.5" />
        </g>
      </svg>

      {/* Murciélagos que cruzan de vez en cuando */}
      <div className="fixed inset-x-0 top-24 h-[60vh] z-[30] overflow-hidden">
        {[
          { top: "8%", delay: "0s", duration: "26s", size: 44 },
          { top: "30%", delay: "9s", duration: "32s", size: 30 },
          { top: "18%", delay: "17s", duration: "28s", size: 36 },
        ].map((bat, i) => (
          <svg
            key={i}
            className="season-bat absolute -left-20 text-black drop-shadow-[0_0_12px_rgba(255,117,24,0.5)]"
            style={{ top: bat.top, width: bat.size, animationDelay: bat.delay, animationDuration: bat.duration }}
            viewBox="0 0 64 32"
            fill="currentColor"
          >
            <path d="M32 10c2-4 4-4 4-4l1 4c3 0 5 2 5 2 4-6 12-8 22-6-6 2-8 8-8 12-4-2-8-1-10 3-2-3-6-3-8-1-2-1-4-1-6 0-2-2-6-2-8 1-2-4-6-5-10-3 0-4-2-10-8-12 10-2 18 0 22 6 0 0 2-2 5-2l1-4s2 0 4 4z" />
          </svg>
        ))}
      </div>

      {/* Niebla baja sobre la barra del reproductor */}
      <div className="season-fog fixed inset-x-0 bottom-20 md:bottom-24 h-28 z-[30]" />
    </div>
  );
}

const LIGHT_COLORS = ["#E84B32", "#D4AF37", "#2E9E5B", "#F5F5F5"];

function ChristmasDecor() {
  return (
    <div aria-hidden className="pointer-events-none">
      {/* Guirnalda de luces colgada del borde inferior de la navbar */}
      <div className="fixed top-16 sm:top-20 inset-x-0 z-[49] h-6 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
        <div className="flex justify-between px-2">
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className={`season-bulb flex flex-col items-center ${i % 2 ? "mt-1" : ""} ${i >= 20 ? "hidden md:flex" : ""}`}
              style={{
                color: LIGHT_COLORS[i % LIGHT_COLORS.length],
                animationDelay: `${(i * 0.37) % 2.4}s`,
              }}
            >
              <span className="w-1 h-1 bg-zinc-600" />
              <span className="w-2 h-3 rounded-b-full bg-current shadow-[0_0_10px_currentColor]" />
            </span>
          ))}
        </div>
      </div>

      <Snow />
    </div>
  );
}

function Snow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let flakes: { x: number; y: number; r: number; vy: number; drift: number; phase: number }[] = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Menos copos en pantallas chicas: menos ruido y menos batería.
      const count = Math.round(Math.min(120, window.innerWidth / 12));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.3 + Math.random() * 0.9,
        drift: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (const f of flakes) {
        if (!reduceMotion) {
          f.y += f.vy;
          f.phase += 0.01;
          f.x += Math.sin(f.phase) * f.drift * 0.5;
          if (f.y > window.innerHeight + 5) {
            f.y = -5;
            f.x = Math.random() * window.innerWidth;
          }
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[30] w-full h-full opacity-70" />;
}
