'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

const ROTATIVE_RATES = [
  { freq: "6 veces al día", durations: [
    { time: "20s", price: 200 },
    { time: "30s", price: 250 },
    { time: "40s", price: 300 },
    { time: "1m", price: 380 }
  ]},
  { freq: "8 veces al día", durations: [
    { time: "20s", price: 270 },
    { time: "30s", price: 335 },
    { time: "40s", price: 400 },
    { time: "1m", price: 500 }
  ]},
  { freq: "10 veces al día", durations: [
    { time: "20s", price: 335 },
    { time: "30s", price: 420 },
    { time: "40s", price: 500 },
    { time: "1m", price: 635 }
  ]}
];

const LIVE_PROGRAMS = [
  { 
    title: "¿Qué pasó ayer?", 
    time: "08:00 AM - 10:00 AM", 
    price: 350, 
    banner: "/programas/que_paso_ayer.png",
    accent: "from-bonchona-red/20"
  },
  { 
    title: "Mucha People", 
    time: "10:00 AM - 12:00 PM", 
    price: 350, 
    banner: "/programas/mucha_pipol.png",
    accent: "from-bonchona-purple/20"
  },
  { 
    title: "¡Te lo dije!", 
    time: "01:00 PM - 03:00 PM", 
    price: 350, 
    banner: "/programas/te_lo_dije.png",
    accent: "from-bonchona-rubine/20"
  },
  { 
    title: "Favoritas 107", 
    time: "04:00 PM - 06:00 PM", 
    price: 350, 
    banner: "/programas/favoritas.png",
    accent: "from-bonchona-navy/40"
  }
];

export default function FamosoPage() {
  const [activeRotative, setActiveRotative] = useState(0);

  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy text-white min-h-screen overflow-x-hidden">
      {/* Mesh Gradient Background Layer */}
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-40 z-0"></div>

      {/* Header Publicidad & Talento - Normalized Proportions */}
      <section className="relative w-full py-20 px-6 text-center max-w-7xl mx-auto z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full glass border-white/10 mb-12 shadow-xl"
        >
           <span className="w-2 h-2 bg-bonchona-red rounded-full animate-pulse"></span>
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">Soluciones Comerciales</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl lg:text-[110px] font-black tracking-tighter mb-10 leading-[0.9] italic uppercase"
        >
          IMPULSA TU <br /><span className="text-gradient">MARCA.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-zinc-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium mb-12"
        >
          La vitrina comercial más potente del centro del país. Planes diseñados para empresas que buscan resultados reales y presencia de impacto.
        </motion.p>
        
        {/* Aviso para Músicos */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="mt-8 inline-block px-10 py-5 glass border-bonchona-red/20 rounded-[2rem] shadow-xl cursor-pointer"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-10 h-10 rounded-full bg-bonchona-red flex items-center justify-center text-xl shadow-[0_0_20px_rgba(232,75,50,0.4)]">🎵</div>
            <div className="text-left">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Zona de Talento</p>
              <p className="text-white font-bold text-xs uppercase tracking-tight">Los músicos no pagan por sonar. Envía tu demo.</p>
            </div>
            <div className="w-8 h-px bg-white/10 hidden md:block"></div>
            <span className="text-bonchona-red font-black text-[10px] uppercase tracking-widest">Enviar Demo →</span>
          </div>
        </motion.div>
      </section>

      {/* Publicidad Rotativa - Bento Table Style */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20 z-10 border-t border-white/5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-24 gap-10">
          <div className="flex flex-col items-start max-w-xl">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-xs uppercase mb-6 block">Tarifario 2026</span>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">PUBLICIDAD <br /><span className="text-gradient">ROTATIVA.</span></h2>
            <p className="text-zinc-500 mt-10 text-lg font-medium">Spots distribuidos estratégicamente a lo largo de nuestra programación diaria (Lunes a Viernes).</p>
          </div>
          
          <div className="flex flex-wrap gap-2 glass rounded-full p-2 border-white/10 shadow-xl">
            {ROTATIVE_RATES.map((rate, i) => (
              <button
                key={i}
                onClick={() => setActiveRotative(i)}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeRotative === i ? 'bg-bonchona-red text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}
              >
                {rate.freq}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROTATIVE_RATES[activeRotative].durations.map((d, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-10 rounded-[3rem] glass border-white/5 hover:border-bonchona-red/40 transition-all group flex flex-col items-center text-center shadow-lg"
            >
              <span className="text-bonchona-purple-medium text-[10px] font-black uppercase tracking-[0.4em] mb-6">Duración</span>
              <h4 className="text-4xl font-black italic mb-10 text-white leading-none">{d.time}</h4>
              <div className="w-full h-px bg-white/5 mb-10"></div>
              <div className="flex flex-col gap-2 mb-12">
                <span className="text-4xl font-black text-white leading-none">${d.price}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Inversión Mensual</span>
              </div>
              <a 
                href={`https://wa.me/584244001367?text=Hola%20Bonchona!%20Me%20interesa%20la%20publicidad%20rotativa%20de%20${d.time}%20con%20frecuencia%20de%20${ROTATIVE_RATES[activeRotative].freq}.`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-5 glass border-white/10 group-hover:bg-bonchona-red group-hover:border-transparent group-hover:text-white text-zinc-400 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
              >
                Seleccionar
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Publicidad En Vivo - PREMIUM SHOWCASE NORMALIZED */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20 z-10 border-t border-white/5 bg-bonchona-navy/40 relative">
        <div className="absolute inset-0 bg-mesh-brand opacity-10 pointer-events-none"></div>
        
        <div className="flex flex-col items-start mb-24 relative z-10">
           <span className="text-bonchona-red font-black tracking-[0.4em] text-xs uppercase mb-6 block">Asociación Premium</span>
           <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-10">
             PRESENCIA <br /> <span className="text-gradient">EN VIVO.</span>
           </h2>
           <p className="text-zinc-500 max-w-xl text-lg font-medium leading-relaxed">
             Tu marca integrada orgánicamente en nuestros programas estelares. Apertura, Cierre y Menciones Directas.
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          {LIVE_PROGRAMS.map((prog, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -8 }}
              className="group relative h-[480px] rounded-[3rem] overflow-hidden border border-white/5 shadow-xl transition-all duration-700"
            >
              <Image 
                src={prog.banner} 
                alt={prog.title} 
                fill 
                className="object-cover opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-1000 grayscale group-hover:grayscale-0"
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${prog.accent} to-bonchona-navy/95`}></div>
              
              <div className="absolute inset-0 p-12 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-bonchona-red font-black text-[10px] tracking-[0.4em] uppercase">{prog.time}</span>
                    <h3 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{prog.title}</h3>
                  </div>
                  <div className="w-16 h-16 glass rounded-full flex items-center justify-center border-white/20">
                    <Image src="/logos-bonchona/92.png" alt="Logo" width={32} height={32} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-3 gap-3">
                    {["Apertura", "Cierre", "2 Menciones"].map((inc, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 p-3 glass rounded-xl border-white/5">
                        <div className="w-1 h-1 rounded-full bg-bonchona-red"></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{inc}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-6 pt-8 border-t border-white/10">
                    <div className="flex flex-col gap-1">
                      <span className="text-4xl font-black text-white italic tracking-tighter">${prog.price}</span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Inversión Mensual</span>
                    </div>
                    <motion.a 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={`https://wa.me/584244001367?text=Hola%20Bonchona!%20Me%20interesa%20la%20publicidad%20en%20vivo%20en%20el%20programa%20${prog.title}.`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-10 py-5 bg-bonchona-red text-white font-black rounded-full shadow-[0_15px_30px_rgba(232,75,50,0.25)] uppercase tracking-[0.2em] text-[10px]"
                    >
                      Reservar Cupo
                    </motion.a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-24 text-center relative z-10">
          <p className="text-zinc-600 font-black uppercase tracking-[0.6em] text-[9px] italic underline underline-offset-[10px] decoration-bonchona-red/30">
            Exclusividad Garantizada por Rubro Comercial
          </p>
        </div>
      </section>

      {/* Spot Production Services - Editorial Split Normalized */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20 z-10 border-t border-white/5 overflow-visible">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div className="flex flex-col items-start">
            <span className="text-bonchona-purple-medium font-black text-xs tracking-[0.4em] uppercase mb-10 block">Audio Branding</span>
            <h2 className="text-5xl md:text-7xl font-black mb-10 tracking-tight uppercase italic text-white leading-[0.9]">
               ¿SIN <br /> <span className="text-gradient">SPOT?</span>
            </h2>
            <p className="text-zinc-500 mb-8 text-xl leading-relaxed font-medium italic">
              Diseñamos tu identidad sonora con los estándares más altos de la industria.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {[
              { t: "Producción IA", s: "Quick & Low Cost", d: "Voces hiper-realistas generadas con inteligencia artificial. Rápido y económico.", c: "bonchona-red" },
              { t: "Artesanal Premium", s: "Full Boutique", d: "Locutores profesionales, edición cinematográfica y guionistas creativos.", c: "bonchona-purple" }
            ].map((prod, i) => (
              <motion.div 
                key={i}
                whileHover={{ x: 8 }}
                className="p-10 glass border-white/5 rounded-[3rem] group hover:border-white/20 transition-all relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 p-8 text-[9px] font-black uppercase tracking-widest text-${prod.c} opacity-40`}>{prod.s}</div>
                <h4 className="text-2xl md:text-3xl font-black mb-4 text-white italic uppercase leading-none">{prod.t}</h4>
                <p className="text-zinc-400 text-base md:text-lg font-medium leading-relaxed italic max-w-sm">{prod.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Identity Strip / Footer */}
      <footer className="w-full py-20 px-6 z-10 bg-bonchona-navy border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-6">
            <Image src="/logos-bonchona/92.png" alt="Logo" width={80} height={80} className="opacity-40" />
            <div className="text-center">
              <h2 className="text-[100px] md:text-[140px] font-black text-white/5 leading-none italic uppercase tracking-tighter select-none">
                107.1
              </h2>
              <p className="text-zinc-600 font-black uppercase tracking-[0.8em] text-[10px] mt-4">Valencia, Venezuela</p>
            </div>
          </div>
          
          <div className="w-full h-px bg-white/5"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-8">
            <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">© 2026 Radio Bonchona. Todos los derechos reservados.</p>
            <div className="flex gap-8">
              <Link href="/nosotros" className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">Empresa</Link>
              <Link href="/estudio" className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">Estudio</Link>
              <Link href="/" className="text-[10px] font-bold text-bonchona-red hover:text-white transition-colors uppercase tracking-widest">Escuchar</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


