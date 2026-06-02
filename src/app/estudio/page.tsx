'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

const SERVICES = [
  {
    title: "Podcast Pro 4K",
    desc: "Crea contenido visual de impacto con nuestro sistema de cámaras Blackmagic 4K y switchers profesionales. Ideal para YouTubers, marcas y creadores de contenido premium.",
    features: ["3 Cámaras 4K", "Iluminación Cinemática", "Switching en Vivo", "Set Personalizable"],
    icon: "🎬",
    msg: "Hola Bonchona! Me interesa el servicio de Estudio para grabar un Podcast."
  },
  {
    title: "Grabación Musical",
    desc: "Captura tu talento con microfonía de clase mundial y preamps analógicos. Un entorno acústico perfecto para que tu música suene con la potencia de Radio Bonchona.",
    features: ["Neumann / AKG Pro", "Sala Tratada", "Ingeniero Pro", "Mezcla Master"],
    icon: "🎵",
    msg: "Hola Bonchona! Me interesa el servicio de Estudio para grabar música."
  },
  {
    title: "Jingles & Identidad",
    desc: "Creamos el ADN sonoro de tu marca. Desde jingles pegajosos hasta logos auditivos que se quedan en la mente de tu audiencia para siempre.",
    features: ["Composición Original", "Voces de Impacto", "Mix Publicitario", "Entrega Multiformato"],
    icon: "🎙️",
    msg: "Hola Bonchona! Me interesa la creación de un Jingle para mi marca."
  }
];

export default function EstudioPage() {
  const WHATSAPP_CONTACT = "584244001367";

  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy text-white min-h-screen overflow-x-hidden">
      {/* Mesh Gradient Background Layer */}
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-40 z-0"></div>

      {/* Cinematic Hero - Tighter Spacing */}
      <section className="relative w-full min-h-[90dvh] flex flex-col items-center justify-center text-center px-6 lg:px-24 py-20 z-10">
        <div className="max-w-7xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full glass border-white/10 mb-10 shadow-xl"
          >
             <span className="w-2 h-2 bg-bonchona-red rounded-full animate-pulse"></span>
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">The Production House</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-6xl md:text-8xl lg:text-[110px] font-black tracking-tighter mb-10 leading-[0.9] italic uppercase"
          >
            ESTUDIO <br /><span className="text-gradient">MASTER.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 text-lg md:text-xl max-w-4xl mx-auto leading-relaxed font-medium"
          >
            Donde la tecnología <span className="text-white font-black italic">4K</span> se encuentra con la acústica perfecta. Tu contenido merece la calidad de los líderes.
          </motion.p>
        </div>
      </section>

      {/* Philosophy Section - Balanced Editorial Spacing */}
      <section className="w-full max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center z-10 border-t border-white/5">
         <div className="flex flex-col items-start">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-xs uppercase mb-8 block">Nuestra Visión</span>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-8 leading-[0.9]">
               TU VISIÓN, <br /> NUESTRO <span className="text-bonchona-red">ESPACIO.</span>
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed mb-10 max-w-lg font-medium">
               En Bonchona Estudio no solo grabamos audio. Diseñamos atmósferas camaleónicas: desde una iluminación tenue para podcasts íntimos hasta configuraciones vibrantes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
               {[
                 "Decoración Adaptable", 
                 "Cámaras 4K de Alta Gama", 
                 "Acústica Profesional", 
                 "Staff Especializado"
               ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group p-4 glass rounded-2xl border-white/5">
                     <div className="w-2 h-2 bg-bonchona-red rounded-full group-hover:scale-150 transition-all"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{item}</span>
                  </div>
               ))}
            </div>
         </div>
         <div className="relative group">
            <div className="absolute -inset-10 bg-bonchona-red/10 blur-[120px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative glass rounded-[3rem] overflow-hidden border-white/10 p-4">
              <Image 
                 src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1974&auto=format&fit=crop" 
                 alt="Studio Setup" 
                 className="relative rounded-[2.5rem] grayscale group-hover:grayscale-0 transition-all duration-1000 object-cover w-full h-auto"
                 width={800}
                 height={600}
              />
            </div>
         </div>
      </section>

      {/* Premium Services Cards - Bento Style Tight */}
      <section className="w-full max-w-7xl mx-auto px-6 py-16 z-10 border-t border-white/5">
        <div className="flex flex-col items-start mb-16">
           <h3 className="text-bonchona-purple-medium font-black tracking-[0.5em] text-xs uppercase mb-6 block">Portafolio de Servicios</h3>
           <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">SOLUCIONES DE <br /><span className="text-gradient">GRADO BROADCAST.</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -12 }}
              className="group relative p-10 rounded-[3rem] glass border-white/5 hover:border-bonchona-red/40 transition-all duration-700 flex flex-col h-full shadow-xl"
            >
              <div className="text-4xl mb-8 group-hover:scale-110 transition-transform duration-700">{service.icon}</div>
              <h3 className="text-3xl font-black uppercase italic mb-6 tracking-tighter text-white group-hover:text-bonchona-red transition-colors leading-none">
                {service.title}
              </h3>
              <p className="text-zinc-500 leading-relaxed text-sm mb-10 flex-1 font-medium">
                {service.desc}
              </p>
              
              <ul className="grid grid-cols-1 gap-4 mb-10">
                 {service.features.map((f, j) => (
                    <li key={j} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-3">
                       <span className="w-1.5 h-1.5 bg-bonchona-red rounded-full"></span> {f}
                    </li>
                 ))}
              </ul>

              <a 
                href={`https://wa.me/${WHATSAPP_CONTACT}?text=${encodeURIComponent(service.msg)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-5 bg-bonchona-red text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px] text-center"
              >
                Contratar Servicio
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Final - Impact Editorial Normalized */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 text-center z-10 border-t border-white/5">
         <motion.h2 
           whileInView={{ opacity: 1, scale: 1 }}
           initial={{ opacity: 0, scale: 0.9 }}
           className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter mb-16 leading-none"
         >
            ELEVA TU <br /><span className="text-gradient">ESTÁNDAR.</span>
         </motion.h2>
         <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            <motion.a 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               href={`https://wa.me/${WHATSAPP_CONTACT}?text=Hola%20Bonchona!%20Deseo%20hacer%20una%20consulta%20general%20sobre%20sus%20servicios%20de%20contrataci%C3%B3n.`}
               target="_blank" 
               rel="noopener noreferrer"
               className="px-14 py-6 bg-bonchona-red text-white font-black rounded-full shadow-[0_20px_40px_rgba(232,75,50,0.3)] uppercase tracking-[0.2em] text-xs"
            >
               Consultar ahora
            </motion.a>
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors uppercase font-black tracking-[0.4em] text-[10px]">
               Explorar Radio
            </Link>
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
              <Link href="/famoso" className="text-[10px] font-bold text-bonchona-red hover:text-white transition-colors uppercase tracking-widest">Anúnciate</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


