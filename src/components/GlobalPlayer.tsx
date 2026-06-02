"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

// URLs
const PREROLL_URL = "https://cdn.pixabay.com/audio/2022/10/14/audio_9939f77042.mp3"; 
const ICECAST_URL = "https://radio.20favoritas.com:8443/stream"; 

export default function GlobalPlayer() {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<"idle" | "playing_preroll" | "playing_live">("idle");
  const [volume, setVolume] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
  const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // --- Audio Logic ---

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; 
      analyser.smoothingTimeConstant = 0.8;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      console.error("AudioContext failure:", e);
    }
  }, []);

  const drawWave = useCallback(() => {
    if (!analyserRef.current || !canvasRightRef.current || !canvasLeftRef.current) return;

    const canvasR = canvasRightRef.current;
    const canvasL = canvasLeftRef.current;
    const ctxR = canvasR.getContext("2d");
    const ctxL = canvasL.getContext("2d");
    if (!ctxR || !ctxL) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!analyserRef.current) return;
      animationRef.current = requestAnimationFrame(render);
      
      analyserRef.current.getByteFrequencyData(dataArray);

      let lowFreqSum = 0;
      for (let i = 0; i < 10; i++) lowFreqSum += dataArray[i];
      const intensity = lowFreqSum / (10 * 255);

      ctxR.clearRect(0, 0, canvasR.width, canvasR.height);
      ctxL.clearRect(0, 0, canvasL.width, canvasL.height);
      
      const time = Date.now() / 1000;
      const centerY = canvasR.height / 2;
      
      const BRAND_ORANGE = "#FF4F00";
      const BRAND_PURPLE = "#5C0F8B";
      
      const waves = [
        { color: BRAND_ORANGE, opacity: 0.8, freq: 0.04, speed: 4, amp: 8 },
        { color: BRAND_PURPLE, opacity: 0.6, freq: 0.02, speed: 2, amp: 12 },
        { color: BRAND_ORANGE, isGradient: true, opacity: 0.4, freq: 0.06, speed: 6, amp: 5 }
      ];

      const drawOnContext = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        waves.forEach((w) => {
          ctx.beginPath();
          ctx.lineWidth = 2;
          
          const isPurple = w.color === BRAND_PURPLE || w.isGradient;
          const shadowColor = isPurple ? BRAND_PURPLE : BRAND_ORANGE;

          ctx.strokeStyle = w.isGradient ? BRAND_ORANGE : w.color;
          ctx.globalAlpha = w.opacity;
          
          // Potenciamos el brillo basándonos en la intensidad del audio
          ctx.shadowBlur = isPlaying ? 25 * intensity : 0;
          ctx.shadowColor = shadowColor;

          // Creamos un degradado horizontal para difuminar los bordes
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
          
          if (w.isGradient) {
            gradient.addColorStop(0, "rgba(255, 79, 0, 0)"); // Transparente inicio
            gradient.addColorStop(0.2, BRAND_ORANGE);       // Naranja 20%
            gradient.addColorStop(0.8, BRAND_PURPLE);       // Morado 80%
            gradient.addColorStop(1, "rgba(92, 15, 139, 0)"); // Transparente final (morado)
          } else {
            const r = parseInt(w.color.slice(1, 3), 16);
            const g = parseInt(w.color.slice(3, 5), 16);
            const b = parseInt(w.color.slice(5, 7), 16);
            
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`); // Transparente inicio
            gradient.addColorStop(0.2, w.color);            // Color sólido 20%
            gradient.addColorStop(0.8, w.color);            // Color sólido 80%
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`); // Transparente final
          }
          
          ctx.strokeStyle = gradient;

          for (let x = 0; x <= canvas.width; x += 2) {
            // waveAmp base + reacción al audio
            const waveAmp = w.amp + (intensity * 25);
            
            // Suavizado vertical: multiplicamos por una máscara senoidal 
            // para que en los bordes (x=0 y x=width) la amplitud sea siempre 0
            const edgeSoftener = Math.sin((x / canvas.width) * Math.PI);
            
            const stringShape = Math.sin(x * w.freq);
            const vibration = Math.sin(time * w.speed);
            
            // Aplicamos el suavizado de bordes a la posición final
            const y = centerY + (stringShape * vibration * waveAmp * edgeSoftener);
            
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
      };

      drawOnContext(ctxR, canvasR);
      drawOnContext(ctxL, canvasL);

      ctxR.globalAlpha = 1;
      ctxR.shadowBlur = 0;
      ctxL.globalAlpha = 1;
      ctxL.shadowBlur = 0;
    };

    render();
  }, [isPlaying]);

  const playLive = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    setStatus("playing_live");
    audio.src = ICECAST_URL;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error("Live play error:", e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPlaying && mounted) {
      drawWave();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, mounted, drawWave]);

  const handleEnded = useCallback(() => {
    if (status === "playing_preroll") {
      playLive();
    }
  }, [status, playLive]);

  const handleAudioError = useCallback(() => {
    // Si falla el preroll o cualquier audio, intentamos ir al live como fallback silencioso
    if (status === "playing_preroll" || status === "idle") {
      console.warn("Preroll failed or unconfigured, skipping to live...");
      playLive();
    }
  }, [status, playLive]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      // 1. Inicializar contexto si es necesario
      initAudioContext();
      
      // 2. Resume si estaba suspendido (autoclick policy)
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // 3. Cargar URL si es la primera vez
      if (status === "idle") {
        setStatus("playing_preroll");
        audio.src = PREROLL_URL;
      }
      
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Error silencioso: si falla el play (por ejemplo preroll roto), saltamos al live
        playLive();
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [isPlaying, status, initAudioContext, playLive]);

  useEffect(() => {
    const handleRemotePlay = () => {
      if (!isPlaying) togglePlay();
    };
    window.addEventListener('play-radio', handleRemotePlay);
    return () => window.removeEventListener('play-radio', handleRemotePlay);
  }, [isPlaying, togglePlay]);

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };

  if (!mounted) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/95 border-t border-white/10 z-50 flex items-center justify-between px-6 md:px-12 backdrop-blur-xl">
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-14 h-14 bg-zinc-900 rounded-xl border border-white/5 animate-pulse"></div>
        </div>
        <div className="flex justify-center w-1/3">
           <div className="w-12 h-12 bg-brand/20 rounded-full animate-pulse"></div>
        </div>
        <div className="w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/95 border-t border-white/10 z-50 flex items-center justify-between px-6 md:px-12 backdrop-blur-xl" suppressHydrationWarning>
      <audio 
        ref={audioRef} 
        onEnded={handleEnded}
        onError={handleAudioError}
        crossOrigin="anonymous"
        preload="auto"
      />

      <div className="flex items-center gap-4 w-1/3">
        <div className="relative w-14 h-14 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
          <Image src="/logos-bonchona/92.png" className="w-10 h-10 object-contain" alt="Logo" width={40} height={40} />
          {isPlaying && <div className="absolute inset-0 bg-brand/10 animate-pulse"></div>}
        </div>
        <div className="hidden sm:block">
          <p className="text-white font-bold text-sm tracking-tight truncate">
            {status === "playing_preroll" ? "Publicidad Premium" : "Radio Bonchona 107.1"}
          </p>
          <p className="text-brand text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
            {status === "playing_preroll" ? "Spot publicitario" : "Sintonía Total"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center w-1/3 gap-4 md:gap-8">
        <div className="hidden sm:block flex-1 h-12 scale-x-[-1]">
          <canvas ref={canvasLeftRef} width={300} height={60} className="w-full opacity-80 h-10 md:h-12" />
        </div>
        
        <button 
          onClick={togglePlay}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-brand text-white rounded-full hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,79,0,0.3)] active:scale-95 z-10"
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          )}
        </button>

        <div className="hidden sm:block flex-1 h-12">
          <canvas ref={canvasRightRef} width={300} height={60} className="w-full opacity-80 h-10 md:h-12" />
        </div>
      </div>

      <div className="flex items-center justify-end w-1/3 gap-4">
        <a 
          href="https://wa.me/584144001071?text=Hola%20Bonchona!%20Me%20gustar%C3%ADa%20pedir%20esta%20canci%C3%B3n:" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-brand/20 border border-white/10 rounded-full transition-all group"
        >
          <Image 
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
            alt="WhatsApp" 
            className="w-4 h-4" 
            width={16}
            height={16}
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Pidelá!</span>
        </a>

        <div className="hidden md:flex items-center gap-2 group">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 group-hover:text-brand transition-colors"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume} className="w-16 h-1 accent-brand appearance-none bg-zinc-800 rounded-full cursor-pointer" />
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1 rounded-full border border-white/5">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-brand animate-ping' : 'bg-zinc-700'}`} />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate">Live</span>
        </div>
      </div>
    </div>
  );
}
