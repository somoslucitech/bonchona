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
      <section className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center text-center px-6 lg:px-24 py-24 z-10">
        <div className="max-w-7xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full glass border-white/10 mb-12"
          >
             <span className="w-2 h-2 bg-bonchona-red rounded-full animate-pulse"></span>
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">Legado & Evolución</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-[8rem] lg:text-[11rem] font-black tracking-tighter mb-12 leading-none italic uppercase"
          >
            NUESTRA <br /><span className="text-gradient">HISTORIA.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 text-xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-medium"
          >
            Honrando el pasado, liderando el presente. Bienvenidos a la <span className="text-white font-black italic">Segunda Generación</span> de la Sintonía Total.
          </motion.p>
        </div>
      </section>

      {/* The Legacy Section - Asymmetric Editorial */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center z-10">
         <div className="relative group order-2 lg:order-1">
            <div className="absolute -inset-10 bg-bonchona-red/10 blur-[120px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative glass rounded-[3rem] overflow-hidden border-white/10 p-12 aspect-square flex flex-col items-center justify-center">
               <Image src="/logos-bonchona/92.png" className="w-48 h-48 object-contain opacity-10 grayscale absolute" alt="Bonchona Logo" width={192} height={192} />
               <div className="relative z-10 text-center">
                  <motion.p 
                    whileInView={{ scale: 1.1 }}
                    className="text-bonchona-red text-9xl font-black italic mb-4 tracking-tighter"
                  >
                    1997
                  </motion.p>
                  <p className="text-white text-xs font-black uppercase tracking-[0.4em] opacity-60">El inicio de un sueño</p>
               </div>
            </div>
         </div>
         
         <div className="flex flex-col items-start order-1 lg:order-2">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-xs uppercase mb-8 block">Fundación</span>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-10 leading-[0.9]">
               EL LEGADO DE <br /> <span className="text-white">CARLOS BRICEÑO.</span>
            </h2>
            <div className="space-y-8 text-zinc-400 text-xl leading-relaxed font-medium">
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
      <section className="w-full bg-bonchona-navy/50 py-32 z-10 border-y border-white/5">
         <div className="max-w-7xl mx-auto px-6 text-center">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-xs uppercase mb-10 block">El Presente</span>
            <h2 className="text-6xl md:text-[9rem] font-black italic uppercase tracking-tighter mb-16 leading-none">
               LA SEGUNDA <br /><span className="text-gradient">GENERACIÓN.</span>
            </h2>
            <p className="text-zinc-500 text-xl md:text-2xl max-w-5xl mx-auto leading-relaxed mb-32 font-medium">
               Hoy, asumimos el reto de llevar el legado a nuevas fronteras. Somos la evolución de la radio tradicional, fusionando la potencia del FM con la vanguardia digital. En esta nueva etapa, Bonchona es más que sonido: es contenido audiovisual de alta gama.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
               {[
                  { title: "MISIÓN", text: "Brindar programación de alta factura que conecte con la audiencia a través de los éxitos del momento y la promoción del talento emergente." },
                  { title: "VISIÓN", text: "Consolidarnos como el multimedio líder en el centro del país, manteniendo el estandarte de la Sintonía Total y expandiendo nuestra esencia digital." },
                  { title: "VALORES", text: "Excelencia, Innovación, Compromiso Local y la pasión innegociable por la comunicación profesional que nos ha caracterizado por más de 25 años." }
               ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -10 }}
                    className="p-12 rounded-[3rem] glass border-white/5 hover:border-bonchona-red/30 transition-all group"
                  >
                     <h4 className="text-bonchona-red font-black uppercase italic text-3xl mb-8 tracking-tighter group-hover:translate-x-2 transition-transform leading-none">{item.title}</h4>
                     <p className="text-zinc-400 text-sm leading-relaxed font-medium">{item.text}</p>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Sintonía Total Stats - Impact Marquee Style */}
      <section className="w-full py-40 px-6 z-10 bg-bonchona-red relative overflow-hidden">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20 text-center text-black">
            {[
               { val: "+25", label: "Años de Historia" },
               { val: "107.1", label: "Frecuencia Líder" },
               { val: "FULL", label: "Sintonía Total" },
               { val: "4K", label: "Contenido Visual" }
            ].map((stat, i) => (
               <div key={i} className="flex flex-col items-center">
                  <span className="text-7xl md:text-8xl font-black italic mb-4 tracking-tighter">{stat.val}</span>
                  <span className="text-black font-black uppercase tracking-[0.3em] text-[10px] opacity-60">{stat.label}</span>
               </div>
            ))}
         </div>
      </section>

      {/* Final CTA - Hero Style */}
      <section className="w-full max-w-7xl mx-auto px-6 py-48 text-center z-10 relative">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-bonchona-red/5 blur-[150px] -z-10"></div>
         <motion.h2 
           whileInView={{ opacity: 1, scale: 1 }}
           initial={{ opacity: 0, scale: 0.9 }}
           className="text-7xl md:text-[140px] font-black uppercase italic tracking-tighter mb-16 leading-none"
         >
            NACIDOS PARA <br /><span className="text-gradient">LIDERAR.</span>
         </motion.h2>
         <motion.div
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           className="inline-block"
         >
           <Link href="/" className="px-20 py-8 bg-bonchona-red text-white font-black rounded-full shadow-[0_25px_50px_rgba(232,75,50,0.3)] uppercase tracking-[0.3em] text-sm">
              Escuchar en Vivo
           </Link>
         </motion.div>
      </section>

      <footer className="pb-32 z-10 opacity-30 flex flex-col items-center gap-10">
         <Image src="/logos-bonchona/92.png" className="h-16 w-auto" alt="Logo" width={64} height={64} />
         <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.6em]">Radio Bonchona 107.1 FM - Sintonía Total</p>
      </footer>
    </div>
  );
}

