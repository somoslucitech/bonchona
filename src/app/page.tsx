'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

const PROGRAMS = [
  {
    id: 'que-paso-ayer',
    time: "08:00 AM - 10:00 AM",
    title: "¿Qué pasó ayer?",
    locutor: "Alejandra Melian y Alejandro Rodríguez",
    banner: "/programas/que_paso_ayer.png",
    description: "¿Qué pasó ayer? es tu magazine matutino definitivo, liderado por el carisma de Alejandra Melian y Alejandro Rodríguez. Despierta con el pulso vibrante de la farándula, las noticias de actualidad más impactantes y un análisis entretenido de lo que realmente importa. El programa ideal para empezar el día con energía, bien informado y con la dosis perfecta de picardía que solo Bonchona te ofrece.",
    richText: "Tu mañana ya no será igual. Sintoniza un espacio donde la actualidad se encuentra con el entretenimiento puro. Noticias, tendencias y la mejor compañía para que no te pierdas de nada."
  },
  {
    id: 'concursos-y-variedades',
    time: "10:00 AM - 12:00 PM",
    title: "Mucha People",
    locutor: "Eduardo Rod y Víctor Matite",
    banner: "/programas/mucha_pipol.png",
    description: "La alegría se apodera de tus mañanas en Mucha People, el corazón de Concursos y Variedades. Eduardo Rod y Víctor Matite transforman tu radio en una fiesta interactiva llena de juegos dinámicos, entrevistas exclusivas con tus artistas favoritos y sorpresas que te mantendrán pegado al dial. Es el espacio donde el protagonista eres tú, con la mejor energía de Valencia de lunes a viernes.",
    richText: "De 10 a 12, vive la experiencia Mucha People. Risas, premios y la conexión total con la gente que hace del centro del país un lugar bonchón."
  },
  {
    id: 'te-lo-dije',
    time: "01:00 PM - 03:00 PM",
    title: "¡Te lo dije!",
    locutor: "Paola Meza y Richhel Aponte",
    banner: "/programas/te_lo_dije.png",
    description: "¡Te lo dije! es el punto de encuentro donde Paola Meza y Richhel Aponte te ponen al día con todo lo que necesitas saber. Desde los datos curiosos más asombrosos hasta la información deportiva más relevante a nivel regional, nacional e internacional. Un espacio ágil, inteligente y con mucha personalidad que marca la pauta informativa de tus tardes, de lunes a viernes por Bonchona 107.1 FM.",
    richText: "Entérate de todo antes que nadie. Deportes, curiosidades y el análisis fresco que estabas buscando para tus mediodías."
  },
  {
    id: 'favoritas-107',
    time: "04:00 PM - 06:00 PM",
    title: "Favoritas 107",
    locutor: "Carlos Briceño Jr.",
    banner: "/programas/favoritas.png",
    description: "Favoritas 107 es el resumen musical de mayor impacto en el país, conducido por Carlos Briceño Jr. Sumérgete en un viaje por los éxitos más recientes y lo más sonado en el panorama musical global. Con una selección curada para los oídos más exigentes, este espacio es el refugio perfecto para los amantes del buen ritmo. Disfruta de 4 a 6 de la tarde de la mejor selección musical en un solo lugar, con el sello de calidad Briceño.",
    richText: "El conteo más esperado del día. Los hits que dominan las listas mundiales suenan primero y mejor en tus Favoritas 107."
  }
];

export default function Home() {
  const [selectedProgram, setSelectedProgram] = useState<typeof PROGRAMS[0] | null>(null);

  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy overflow-x-hidden">
      {/* Mesh Gradient Background Layer */}
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-40 z-0"></div>

      {/* Hero Section - Asymmetric Premium */}
      <section className="relative w-full min-h-[100dvh] flex items-center justify-center px-6 lg:px-24 py-24 z-10">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start text-left"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="w-8 h-px bg-bonchona-red"></span>
              <span className="text-bonchona-red font-black tracking-[0.4em] text-xs uppercase">
                107.1 FM | Sintonía Total
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-[110px] font-black tracking-tight leading-[0.9] mb-8 uppercase italic">
              VIVE EL <br /> 
              <span className="text-gradient">BONCHE.</span>
            </h1>
            
            <p className="text-zinc-400 text-lg md:text-xl max-w-md mb-12 leading-relaxed font-medium">
              La número 1 del centro del país. Desde Valencia, marcando el ritmo de toda Venezuela con un legado de excelencia.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.dispatchEvent(new CustomEvent('play-radio'))}
                className="px-12 py-5 bg-bonchona-red text-white font-black rounded-full transition-all shadow-[0_20px_40px_rgba(232,75,50,0.3)] flex items-center justify-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
                ESCUCHAR EN VIVO
              </motion.button>
              
              <Link href="/famoso" className="px-10 py-5 glass hover:bg-white/10 text-white font-bold rounded-full transition-all flex items-center justify-center">
                PUBLICIDAD
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-10 bg-bonchona-purple/20 blur-[120px] rounded-full animate-pulse"></div>
            <div className="relative aspect-square w-full glass rounded-[3rem] p-12 overflow-hidden flex items-center justify-center border-white/5 shadow-2xl">
              <Image 
                src="/logos-bonchona/92.png" 
                alt="Bonchona Logo" 
                width={500} 
                height={500} 
                className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(232,75,50,0.3)]"
              />
              <div className="absolute bottom-10 left-10 flex flex-col gap-1">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Valencia, Carabobo</span>
                <span className="text-bonchona-red font-bold text-sm tracking-widest uppercase italic">Centro de Venezuela</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-bonchona-red to-transparent"></div>
        </div>
      </section>

      {/* Stats Marquee Strip */}
      <section className="w-full bg-bonchona-red py-8 relative z-10 overflow-hidden shadow-[0_0_50px_rgba(232,75,50,0.2)]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { n: "107.1", t: "Mega Watts de Poder" },
            { n: "+25", t: "Años Liderando" },
            { n: "#1", t: "Ranking Regional" },
            { n: "FULL", t: "Sintonía Total" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center md:items-start text-black">
              <span className="text-4xl lg:text-5xl font-black italic tracking-tighter">{stat.n}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{stat.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Programming Section - Bento Grid Style */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 z-10">
        <div className="flex flex-col items-start mb-20">
          <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-xs uppercase mb-6 block">Nuestra Parrilla</span>
          <h2 className="text-5xl md:text-7xl font-black mb-8 italic uppercase tracking-tighter leading-none">
            PROGRAMACIÓN <br /> <span className="text-gradient">ELITE.</span>
          </h2>
          <p className="text-zinc-500 max-w-xl text-lg">
            Los programas que mueven a Valencia y al centro de Venezuela. Talento, música y sintonía total todos los días.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROGRAMS.map((show, idx) => (
            <motion.div 
              key={idx} 
              whileHover={{ y: -10 }}
              onClick={() => setSelectedProgram(show)}
              className="group relative h-[450px] glass rounded-[2.5rem] overflow-hidden cursor-pointer border-white/5 hover:border-bonchona-red/50 transition-all duration-500"
            >
              <Image 
                src={show.banner} 
                alt={show.title} 
                fill 
                className="object-cover opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-700 grayscale group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bonchona-navy via-bonchona-navy/40 to-transparent"></div>
              
              <div className="absolute inset-0 p-10 flex flex-col justify-end">
                <span className="text-bonchona-red text-[10px] font-black tracking-widest block mb-4 uppercase">{show.time}</span>
                <h3 className="text-3xl font-black mb-4 text-white uppercase italic tracking-tighter leading-none">{show.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-500">
                  Con la conducción de <br />
                  <span className="text-white font-bold">{show.locutor}</span>
                </p>
                <div className="mt-8 flex items-center gap-3 text-[10px] font-black text-bonchona-purple-medium uppercase tracking-widest">
                  <div className="w-8 h-px bg-bonchona-purple-medium group-hover:w-12 transition-all"></div>
                  Ver Detalle
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ad Space - Premium Inlay */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-40 z-10">
        <div className="relative w-full h-80 md:h-[450px] glass rounded-[4rem] flex items-center justify-center overflow-hidden group border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-0 bg-mesh-brand opacity-30"></div>
          <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-bonchona-red/10 blur-[150px] animate-pulse"></div>
          <div className="absolute -left-40 -bottom-40 w-[600px] h-[600px] bg-bonchona-purple/10 blur-[150px] animate-pulse"></div>
          
          <div className="relative z-10 text-center px-12 max-w-4xl">
            <span className="text-bonchona-red font-black tracking-[0.6em] text-[10px] md:text-xs uppercase mb-8 block">Marketing de Impacto</span>
            <h3 className="text-5xl md:text-[80px] font-black mb-12 italic uppercase tracking-tighter leading-[0.85]">
              TU MARCA EN <br /> <span className="text-gradient">SINTONÍA TOTAL.</span>
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-10">
              <Link href="/famoso" className="px-14 py-6 bg-white text-black font-black rounded-full hover:bg-bonchona-red hover:text-white transition-all uppercase tracking-widest text-[11px] shadow-2xl">
                Contratar Espacio
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-bonchona-red animate-ping"></div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.4em]">Resultados Reales</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Estudio Section - Asymmetric Editorial */}
      <section id="estudio" className="w-full max-w-7xl mx-auto px-6 py-32 z-10 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-8 bg-bonchona-red/10 blur-[100px] rounded-full"></div>
            <div className="relative rounded-[3rem] overflow-hidden border border-white/10 group">
              <Image 
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop" 
                alt="Estudio de Grabación" 
                width={800}
                height={600}
                className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-bonchona-purple/20 mix-blend-color group-hover:opacity-0 transition-opacity"></div>
            </div>
            
            <div className="absolute -bottom-10 -right-10 hidden xl:block glass p-10 rounded-[2.5rem] max-w-xs shadow-2xl border-white/10">
              <div className="w-10 h-1 bg-bonchona-red mb-4"></div>
              <p className="text-white font-bold mb-3 uppercase italic">Estudio Elite</p>
              <p className="text-zinc-500 text-xs leading-relaxed">Captura de voz, doblaje y producción musical con el equipamiento más avanzado del país.</p>
            </div>
          </div>

          <div className="flex flex-col items-start order-1 lg:order-2">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-xs uppercase mb-8 block">Servicios de Audio</span>
            <h2 className="text-5xl md:text-7xl font-black mb-10 leading-[0.9] italic uppercase tracking-tighter">
              BONCHONA <br /><span className="text-gradient">ESTUDIO.</span>
            </h2>
            <p className="text-zinc-400 text-xl leading-relaxed mb-12 font-medium">
              Mucho más que una radio. Ofrecemos una infraestructura de producción profesional para marcas que buscan la perfección sonora.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
              {[
                { l: "LOCUCIÓN", d: "Voces que venden impacto" },
                { l: "PRODUCCIÓN", d: "Spots, jingles y branding" },
                { l: "PODCASTING", d: "Equipamiento de alto nivel" },
                { l: "MIX & MASTER", d: "Fidelidad sonora absoluta" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-2 p-6 glass rounded-2xl border-white/5 hover:border-bonchona-purple/40 transition-all">
                  <span className="text-bonchona-red font-black text-sm tracking-widest">{item.l}</span>
                  <span className="text-zinc-500 text-xs font-medium uppercase">{item.d}</span>
                </div>
              ))}
            </div>

            <Link href="/estudio" className="mt-16 text-[10px] font-black uppercase tracking-[0.4em] text-white hover:text-bonchona-red transition-all flex items-center gap-4 group">
              Explorar Estudio
              <div className="w-12 h-px bg-white/20 group-hover:bg-bonchona-red group-hover:w-20 transition-all"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Identity */}
      <footer className="w-full py-48 px-6 z-10 bg-bonchona-navy border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center w-full mb-40">
            <div className="flex flex-col items-start gap-12">
              <Image src="/logos-bonchona/92.png" alt="Bonchona Logo" width={120} height={120} className="opacity-90" />
              <div className="space-y-8">
                <h4 className="text-bonchona-red font-black text-xs uppercase tracking-[0.5em]">Legado Carlos Briceño</h4>
                <p className="text-zinc-400 text-2xl leading-relaxed max-w-lg font-medium italic">
                  Radio Bonchona es un compromiso innegociable con el entretenimiento de Venezuela. Desde 1997, liderando el dial.
                </p>
              </div>
              <Link href="/nosotros" className="text-white font-black uppercase tracking-[0.5em] text-[11px] hover:text-bonchona-red transition-all flex items-center gap-5 group">
                 CONOCE NUESTRA HISTORIA
                 <div className="w-12 h-px bg-white/20 group-hover:bg-bonchona-red group-hover:w-20 transition-all"></div>
              </Link>
            </div>
            
            <div className="flex flex-col lg:items-end justify-center relative">
              <span className="text-bonchona-purple-medium font-black text-xs uppercase tracking-[1.2em] mb-6 mr-6">VALENCIA</span>
              <h2 className="text-[140px] md:text-[240px] font-black text-white/5 leading-none italic uppercase tracking-tighter select-none">
                107.1
              </h2>
              <p className="text-zinc-700 font-black italic uppercase tracking-[0.5em] -mt-10 md:-mt-16 mr-6 text-sm md:text-lg">La que te gusta.</p>
            </div>
          </div>

          <div className="w-full pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-16 text-center md:text-left">
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.5em]">© 2026 Radio Bonchona</p>
              <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.3em]">Carabobo, Venezuela. Sintonía Total.</p>
            </div>
            
            <div className="flex gap-14">
               {[
                 { l: "Instagram", h: "#" },
                 { l: "X / Twitter", h: "#" },
                 { l: "WhatsApp", h: "#" }
               ].map((soc, i) => (
                 <a key={i} href={soc.h} className="text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.4em]">{soc.l}</a>
               ))}
            </div>

            <div className="flex gap-10">
              <Link href="/nosotros" className="text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.4em]">Empresa</Link>
              <Link href="/estudio" className="text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.4em]">Servicios</Link>
              <Link href="/famoso" className="text-[10px] font-black text-bonchona-red hover:text-white transition-colors uppercase tracking-[0.4em]">Talento</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Programas */}
      {selectedProgram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-2xl bg-bonchona-navy/90">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-5xl glass rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedProgram(null)}
              className="absolute top-8 right-8 z-20 w-14 h-14 flex items-center justify-center bg-black/50 hover:bg-bonchona-red text-white rounded-full border border-white/10 transition-all backdrop-blur-md"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="flex flex-col lg:flex-row min-h-[600px]">
              {/* Image Side */}
              <div className="w-full lg:w-1/2 relative h-80 lg:h-auto overflow-hidden">
                <Image 
                  src={selectedProgram.banner} 
                  alt={selectedProgram.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bonchona-navy via-transparent to-transparent"></div>
              </div>

              {/* Content Side */}
              <div className="w-full lg:w-1/2 p-10 lg:p-16 flex flex-col justify-center">
                <span className="text-bonchona-red text-xs font-black uppercase tracking-[0.4em] mb-6 block">Sintonía Elite</span>
                <h2 className="text-5xl lg:text-7xl font-black mb-10 italic uppercase tracking-tighter leading-none">
                  {selectedProgram.title}
                </h2>
                
                <div className="space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-bonchona-purple flex items-center justify-center text-white font-black italic shadow-xl">
                      {selectedProgram.time.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-white font-bold text-xl mb-1">{selectedProgram.time}</p>
                      <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest italic">Horario Oficial</p>
                    </div>
                  </div>

                  <p className="text-zinc-300 text-xl leading-relaxed font-medium italic border-l-4 border-bonchona-red pl-8">
                    &quot;{selectedProgram.richText}&quot;
                  </p>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-bonchona-purple-medium uppercase tracking-[0.3em]">Conducción</span>
                    <p className="text-white font-black text-2xl uppercase tracking-tighter italic">{selectedProgram.locutor}</p>
                  </div>

                  <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
                    {selectedProgram.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedProgram(null)}></div>
        </div>
      )}
    </div>
  );
}

