'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

const SERVICES = [
  {
    title: "Podcast Pro 4K",
    desc: "Crea contenido visual de impacto con nuestro sistema de cámaras Blackmagic 4K y switchers profesionales. Ideal para YouTubers, marcas y creadores de contenido elite.",
    features: ["3 Cámaras 4K", "Iluminación Cinemática", "Switching en Vivo", "Set Personalizable"],
    icon: "🎬",
    msg: "Hola Bonchona! Me interesa el servicio de Estudio para grabar un Podcast."
  },
  {
    title: "Grabación Musical",
    desc: "Captura tu talento con microfonía de clase mundial y preamps analógicos. Un entorno acústico perfecto para que tu música suene con la potencia de Radio Bonchona.",
    features: ["Neumann / AKG Pro", "Sala Tratada", "Ingeniero Pro", "Mezcla Elite"],
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

      {/* Cinematic Hero */}
      <section className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center text-center px-6 lg:px-24 py-24 z-10">
        <div className="max-w-7xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full glass border-white/10 mb-12"
          >
             <span className="w-2 h-2 bg-bonchona-red rounded-full animate-pulse"></span>
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">The Production House</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-[10rem] lg:text-[13rem] font-black tracking-tighter mb-12 leading-none italic uppercase"
          >
            ESTUDIO <br /><span className="text-gradient">ELITE.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 text-xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-medium"
          >
            Donde la tecnología <span className="text-white font-black italic">4K</span> se encuentra con la acústica perfecta. Tu contenido merece la calidad de los líderes.
          </motion.p>
        </div>
      </section>

      {/* Philosophy Section - Asymmetric Editorial */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center z-10">
         <div className="flex flex-col items-start">
            <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-xs uppercase mb-8 block">Nuestra Visión</span>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-10 leading-[0.9]">
               TU VISIÓN, <br /> NUESTRO <span className="text-bonchona-red">ESPACIO.</span>
            </h2>
            <p className="text-zinc-500 text-xl leading-relaxed mb-12 max-w-lg font-medium">
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

      {/* Premium Services Cards - Bento Style */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 z-10 border-t border-white/5">
        <div className="flex flex-col items-start mb-24">
           <h3 className="text-bonchona-purple-medium font-black tracking-[0.5em] text-xs uppercase mb-6 block">Portafolio de Servicios</h3>
           <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">SOLUCIONES DE <br /><span className="text-gradient">GRADO BROADCAST.</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -12 }}
              className="group relative p-12 rounded-[3rem] glass border-white/5 hover:border-bonchona-red/40 transition-all duration-700 flex flex-col h-full"
            >
              <div className="text-5xl mb-10 group-hover:scale-110 transition-transform duration-700">{service.icon}</div>
              <h3 className="text-3xl font-black uppercase italic mb-8 tracking-tighter text-white group-hover:text-bonchona-red transition-colors leading-none">
                {service.title}
              </h3>
              <p className="text-zinc-500 leading-relaxed text-sm mb-12 flex-1 font-medium">
                {service.desc}
              </p>
              
              <ul className="grid grid-cols-1 gap-4 mb-12">
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
                className="w-full py-6 bg-bonchona-red text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(232,75,50,0.2)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px] text-center"
              >
                Contratar Servicio
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Final - Impact Editorial */}
      <section className="w-full max-w-7xl mx-auto px-6 py-48 text-center z-10">
         <motion.h2 
           whileInView={{ opacity: 1, scale: 1 }}
           initial={{ opacity: 0, scale: 0.9 }}
           className="text-6xl md:text-[140px] font-black uppercase italic tracking-tighter mb-16 leading-none"
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
               className="px-16 py-7 bg-bonchona-red text-white font-black rounded-full shadow-[0_20px_40px_rgba(232,75,50,0.3)] uppercase tracking-[0.2em] text-sm"
            >
               Consultar ahora
            </motion.a>
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors uppercase font-black tracking-[0.4em] text-[10px]">
               Explorar Radio
            </Link>
         </div>
      </section>

      <footer className="pb-32 z-10 opacity-30">
         <Image src="/logos-bonchona/92.png" className="h-16 w-auto" alt="Logo" width={64} height={64} />
      </footer>
    </div>
  );
}

