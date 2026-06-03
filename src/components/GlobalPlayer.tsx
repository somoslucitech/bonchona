"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

// URLs
const PREROLL_URL = "https://cdn.pixabay.com/audio/2022/10/14/audio_9939f77042.mp3"; 
const ICECAST_URL = "https://radio.20favoritas.com:8443/stream"; 
const METADATA_URL = "https://radio.20favoritas.com:8443/status-json.xsl";

export default function GlobalPlayer() {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<"idle" | "playing_preroll" | "playing_live">("idle");
  const [volume, setVolume] = useState(1);
  const [metadata, setMetadata] = useState<string>("");
  const [displayMode, setDisplayMode] = useState<"tagline" | "song">("tagline");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Metadata Fetching ---

  const fetchMetadata = useCallback(async () => {
    try {
      const response = await fetch(METADATA_URL);
      const data = await response.json();
      
      // Intentamos extraer el título de la canción del JSON de Icecast
      // La estructura exacta depende de la configuración de Icecast, normalmente:
      // icestats.source[0].title o icestats.source.title
      const source = data.icestats?.source;
      let currentTitle = "";
      
      if (Array.isArray(source)) {
        currentTitle = source[0]?.title || "";
      } else if (source) {
        currentTitle = source.title || "";
      }

      if (currentTitle) {
        setMetadata(currentTitle);
      }
    } catch (e) {
      console.warn("Could not fetch metadata:", e);
    }
  }, []);

  // Intervalo de metadatos (cada 15 segundos)
  useEffect(() => {
    if (isPlaying && status === "playing_live") {
      fetchMetadata();
      const interval = setInterval(fetchMetadata, 15000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, status, fetchMetadata]);

  // Intervalo de alternancia de visualización (cada 5 segundos)
  useEffect(() => {
    if (isPlaying && status === "playing_live" && metadata) {
      const interval = setInterval(() => {
        setDisplayMode(prev => prev === "tagline" ? "song" : "tagline");
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setDisplayMode("tagline");
    }
  }, [isPlaying, status, metadata]);
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
      <div className="fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-black/95 border-t border-white/10 z-50 flex items-center justify-between px-4 md:px-12 backdrop-blur-xl">
        <div className="flex items-center gap-4 w-1/2 md:w-1/3">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-zinc-900 rounded-xl border border-white/5 animate-pulse"></div>
        </div>
        <div className="flex justify-center w-auto md:w-1/3">
           <div className="w-10 h-10 md:w-12 md:h-12 bg-bonchona-red/20 rounded-full animate-pulse"></div>
        </div>
        <div className="hidden md:block md:w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-black/95 border-t border-white/10 z-50 flex items-center justify-between px-4 md:px-12 backdrop-blur-xl transition-all duration-500" suppressHydrationWarning>
      <audio 
        ref={audioRef} 
        onEnded={handleEnded}
        onError={handleAudioError}
        crossOrigin="anonymous"
        preload="auto"
      />

      {/* Info Group */}
      <div className="flex items-center gap-3 md:gap-4 w-1/2 md:w-1/3">
        <div className="relative flex-shrink-0 w-10 h-10 md:w-14 md:h-14 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
          <Image src="/logos-bonchona/92.png" className="w-7 h-7 md:w-10 md:h-10 object-contain" alt="Logo" width={40} height={40} />
          {isPlaying && <div className="absolute inset-0 bg-bonchona-red/10 animate-pulse"></div>}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-white font-bold text-xs md:text-sm tracking-tight truncate">
            {status === "playing_preroll" ? "Publicidad Premium" : "Radio Bonchona 107.1"}
          </p>
          <div className="h-4 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {status === "playing_preroll" ? (
                <motion.p 
                  key="preroll"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-bonchona-red text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] animate-pulse truncate"
                >
                  Spot publicitario
                </motion.p>
              ) : displayMode === "tagline" || !metadata ? (
                <motion.p 
                  key="tagline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-bonchona-red text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] animate-pulse truncate"
                >
                  Sintonía Total!
                </motion.p>
              ) : (
                <motion.p 
                  key="metadata"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-white/70 text-[9px] md:text-[10px] font-bold uppercase tracking-widest truncate italic"
                >
                  {metadata}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Control Group */}
      <div className="flex items-center justify-center w-auto md:w-1/3 gap-4 md:gap-8">
        <div className="hidden lg:block flex-1 h-12 scale-x-[-1]">
          <canvas ref={canvasLeftRef} width={300} height={60} className="w-full opacity-80 h-10 md:h-12" />
        </div>
        
        <button 
          onClick={togglePlay}
          className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center bg-bonchona-red text-white rounded-full hover:scale-110 transition-transform shadow-[0_0_20px_rgba(232,75,50,0.3)] active:scale-95 z-10"
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          )}
        </button>

        <div className="hidden lg:block flex-1 h-12">
          <canvas ref={canvasRightRef} width={300} height={60} className="w-full opacity-80 h-10 md:h-12" />
        </div>
      </div>

      {/* Action Group */}
      <div className="hidden sm:flex items-center justify-end w-1/3 gap-4">
        <a 
          href="https://wa.me/584144001071?text=Hola%20Bonchona!%20Me%20gustar%C3%ADa%20pedir%20esta%20canci%C3%B3n:" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden xl:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-bonchona-red/20 border border-white/10 rounded-full transition-all group"
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 group-hover:text-bonchona-red transition-colors"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume} className="w-16 h-1 accent-bonchona-red appearance-none bg-zinc-800 rounded-full cursor-pointer" />
        </div>
        
        <div className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-bonchona-red animate-ping' : 'bg-zinc-700'}`} />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate">Live</span>
        </div>
      </div>

      {/* Mobile Live Indicator (visible only on xs) */}
      <div className="flex sm:hidden items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-white/5">
        <div className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-bonchona-red animate-ping' : 'bg-zinc-700'}`} />
        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Live</span>
      </div>
    </div>

  );
}
