'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

export default function QuienesSomosPage() {
  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy text-white min-h-screen overflow-x-hidden">
      {/* Mesh Gradient Background Layer */}
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-40 z-0"></div>

      {/* Cinematic Legacy Hero */}
      <section className="relative w-full min-h-[85dvh] sm:min-h-[90dvh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-24 py-20 sm:py-24 z-10">
        <div className="max-w-7xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full glass border-white/10 mb-10 sm:mb-12 shadow-xl"
          >
             <span className="w-2 h-2 bg-bonchona-red rounded-full animate-pulse"></span>
             <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/60">Legado & Evolución</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-5xl sm:text-7xl md:text-8xl lg:text-[100px] xl:text-[115px] font-black tracking-tighter mb-8 sm:mb-10 leading-[0.85] italic uppercase"
          >
            NUESTRA <br /><span className="text-gradient">HISTORIA.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 text-base sm:text-lg md:text-xl max-w-4xl mx-auto leading-relaxed font-medium px-4 sm:px-0"
          >
            Honrando el pasado, liderando el presente. Bienvenidos a la <span className="text-white font-black italic">Segunda Generación</span> de la Sintonía Total.
          </motion.p>
        </div>
      </section>

      {/* The Legacy Section - Asymmetric Editorial */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center z-10 border-t border-white/5">
         <div className="relative group order-2 lg:order-1 px-4 sm:px-0">
            <div className="absolute -inset-10 bg-bonchona-red/10 blur-[120px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative glass rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden border-white/10 p-8 sm:p-10 aspect-square flex flex-col items-center justify-center">
               <Image src="/logos-bonchona/92.png" className="w-32 h-32 sm:w-40 sm:h-40 object-contain opacity-10 grayscale absolute" alt="Bonchona Logo" width={160} height={160} />
               <div className="relative z-10 text-center">
                  <motion.p 
                    whileInView={{ scale: 1.1 }}
                    className="text-bonchona-red text-6xl sm:text-8xl font-black italic mb-4 tracking-tighter"
                  >
                    1997
                  </motion.p>
                  <p className="text-white text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] opacity-60">El inicio de un sueño</p>
               </div>
            </div>
         </div>
         
         <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:order-2">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-[10px] sm:text-xs uppercase mb-6 sm:mb-8 block">Fundación</span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black italic uppercase tracking-tighter mb-8 sm:mb-10 leading-[0.9]">
               EL LEGADO DE <br /> <span className="text-white">CARLOS BRICEÑO.</span>
            </h2>
            <div className="space-y-6 text-zinc-400 text-base sm:text-lg leading-relaxed font-medium">
               <p>
                  Radio Bonchona 107.1 FM no nació de la nada. Sus raíces se hunden en el éxito rotundo de <span className="text-white italic">&quot;Favoritas&quot;</span>, el programa musical que marcó una época en el centro del país.
               </p>
               <p>
                  El 17 de septiembre de 1997, el dial de Valencia cambió para siempre. Con una visión clara y un amor inquebrantable por la radio, se encendieron los transmisores de lo que hoy es la emisora número uno.
               </p>
            </div>
         </div>
      </section>

      {/* Second Generation Section - High Visual Density */}
      <section className="w-full bg-bonchona-navy/50 py-16 sm:py-20 z-10 border-y border-white/5">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-[10px] sm:text-xs uppercase mb-8 sm:mb-10 block">El Presente</span>
            <h2 className="text-4xl sm:text-6xl md:text-9xl font-black italic uppercase tracking-tighter mb-10 sm:mb-12 leading-none">
               LA SEGUNDA <br /><span className="text-gradient">GENERACIÓN.</span>
            </h2>
            <p className="text-zinc-500 text-base sm:text-lg md:text-xl max-w-4xl mx-auto leading-relaxed mb-16 sm:mb-20 font-medium">
               Hoy, asumimos el reto de llevar el legado a nuevas fronteras. Somos la evolución de la radio tradicional, fusionando la potencia del FM con la vanguardia digital. En esta nueva etapa, Bonchona es más que sonido: es contenido audiovisual de alta gama.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 text-left">
               {[
                  { title: "MISIÓN", text: "Brindar programación de alta factura que conecte con la audiencia a través de los éxitos del momento y la promoción del talento emergente." },
                  { title: "VISIÓN", text: "Consolidarnos como el multimedio líder en el centro del país, manteniendo el estandarte de la Sintonía Total y expandiendo nuestra esencia digital." },
                  { title: "VALORES", text: "Excelencia, Innovación, Compromiso Local y la pasión innegociable por la comunicación profesional que nos ha caracterizado por más de 25 años." }
               ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -10 }}
                    className="p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] glass border-white/5 hover:border-bonchona-red/30 transition-all group shadow-xl"
                  >
                     <h4 className="text-bonchona-red font-black uppercase italic text-xl sm:text-2xl mb-4 sm:mb-6 tracking-tighter group-hover:translate-x-2 transition-transform leading-none">{item.title}</h4>
                     <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-medium">{item.text}</p>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Sintonía Total Stats - Impact Marquee Style */}
      <section className="w-full py-16 sm:py-24 px-4 sm:px-6 z-10 bg-bonchona-red relative overflow-hidden shadow-2xl">
         <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-16 text-center text-black">
            {[
               { val: "+25", label: "Años de Historia" },
               { val: "107.1", label: "Frecuencia Líder" },
               { val: "FULL", label: "Sintonía Total" },
               { val: "4K", label: "Contenido Visual" }
            ].map((stat, i) => (
               <div key={i} className="flex flex-col items-center">
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black italic mb-2 tracking-tighter leading-none">{stat.val}</span>
                  <span className="text-black font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[8px] sm:text-[9px] opacity-60 leading-tight">{stat.label}</span>
               </div>
            ))}
         </div>
      </section>

      {/* Final CTA - Hero Style Normalized */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-40 text-center z-10 relative border-t border-white/5">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-bonchona-red/5 blur-[100px] sm:blur-[150px] -z-10"></div>
         <motion.h2 
           whileInView={{ opacity: 1, scale: 1 }}
           initial={{ opacity: 0, scale: 0.9 }}
           className="text-4xl sm:text-6xl md:text-9xl font-black uppercase italic tracking-tighter mb-12 sm:mb-16 leading-none"
         >
            NACIDOS PARA <br /><span className="text-gradient">LIDERAR.</span>
         </motion.h2>
         <motion.div
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           className="inline-block w-full sm:w-auto"
         >
           <Link href="/" className="block px-10 sm:px-16 py-5 sm:py-7 bg-bonchona-red text-white font-black rounded-full shadow-[0_20px_40px_rgba(232,75,50,0.3)] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm">
              Escuchar en Vivo
           </Link>
         </motion.div>
      </section>

      {/* Final Identity Strip / Footer */}
      <footer className="w-full py-16 sm:py-20 px-4 sm:px-6 z-10 bg-bonchona-navy border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-10 sm:gap-12">
          <div className="flex flex-col items-center gap-6">
            <Image src="/logos-bonchona/92.png" alt="Logo" width={80} height={80} className="w-16 sm:w-20 h-auto opacity-40 object-contain" />
            <div className="text-center">
              <h2 className="text-[70px] sm:text-[100px] md:text-[140px] font-black text-white/5 leading-none italic uppercase tracking-tighter select-none">
                107.1
              </h2>
              <p className="text-zinc-600 font-black uppercase tracking-[0.6em] sm:tracking-[0.8em] text-[9px] sm:text-[10px] mt-4">Valencia, Venezuela</p>
            </div>
          </div>
          
          <div className="w-full h-px bg-white/5"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-8 text-center md:text-left">
            <p className="text-[9px] sm:text-[10px] text-zinc-700 font-bold uppercase tracking-widest">© 2026 Radio Bonchona. Todos los derechos reservados.</p>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
              <Link href="/nosotros" className="text-[9px] sm:text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">Empresa</Link>
              <Link href="/estudio" className="text-[9px] sm:text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">Estudio</Link>
              <Link href="/famoso" className="text-[9px] sm:text-[10px] font-bold text-bonchona-red hover:text-white transition-colors uppercase tracking-widest">Anúnciate</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
