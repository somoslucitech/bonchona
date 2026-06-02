'use client';

import Link from 'next/link';
import Image from 'next/image';

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
    <div className="flex flex-col items-center w-full bg-[#050505] text-white min-h-screen">
      {/* Cinematic Hero */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            muted 
            loop 
            className="w-full h-full object-cover opacity-40 grayscale"
            poster="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop"
          >
            {/* Si tuvieras un video real, iría aquí. Usamos poster por ahora */}
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/20 to-black"></div>
        </div>

        <div className="relative z-10 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/5 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
             <span className="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">The Production House</span>
          </div>
          
          <h1 className="text-6xl md:text-[10rem] font-black tracking-tighter mb-8 leading-none italic uppercase mix-blend-difference">
            ESTUDIO <br /><span className="text-brand">ELITE.</span>
          </h1>
          
          <p className="text-zinc-400 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-light">
            Donde la tecnología <span className="text-white font-bold">4K</span> se encuentra con la acústica perfecta. Tu contenido merece la calidad de los líderes.
          </p>

          <div className="mt-12 flex justify-center gap-6">
             <div className="w-[1px] h-24 bg-gradient-to-b from-brand to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
         <div>
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8">
               Tu visión, <br /> nuestro <span className="text-brand">Espacio.</span>
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed mb-8">
               En Bonchona Estudio no solo grabamos audio. Diseñamos atmósferas. Nuestro set es totalmente camaleónico: desde una iluminación tenue para podcasts íntimos hasta una configuración vibrante y colorida para producciones musicales.
            </p>
            <div className="space-y-4">
               {["Decoración Adaptable", "Cámaras 4K de Alta Gama", "Tratamiento Acústico Profesional", "Staff Técnico Especializado"].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                     <div className="w-12 h-[1px] bg-zinc-800 group-hover:w-16 group-hover:bg-brand transition-all"></div>
                     <span className="text-sm font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{item}</span>
                  </div>
               ))}
            </div>
         </div>
         <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand to-orange-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <Image 
               src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1974&auto=format&fit=crop" 
               alt="Studio Setup" 
               className="relative rounded-[2rem] border border-white/5 shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] object-cover"
               width={800}
               height={600}
            />
         </div>
      </section>

      {/* Premium Services Cards */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 bg-zinc-950/50 rounded-[4rem] border border-white/5">
        <div className="text-center mb-24">
           <h3 className="text-brand font-black tracking-[0.5em] text-xs uppercase mb-4">Portafolio de Servicios</h3>
           <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">Soluciones de Grado <span className="text-brand">Broadcast.</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service, i) => (
            <div key={i} className="group relative p-12 rounded-[3rem] bg-zinc-900/30 border border-white/5 hover:border-brand/40 transition-all duration-700 flex flex-col h-full">
              <div className="text-5xl mb-8 group-hover:scale-110 transition-transform duration-700 inline-block">{service.icon}</div>
              <h3 className="text-3xl font-black uppercase italic mb-6 tracking-tighter text-white group-hover:text-brand transition-colors">
                {service.title}
              </h3>
              <p className="text-zinc-500 leading-relaxed text-sm mb-8 flex-1">
                {service.desc}
              </p>
              
              <ul className="space-y-3 mb-10">
                 {service.features.map((f, j) => (
                    <li key={j} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-brand rounded-full"></span> {f}
                    </li>
                 ))}
              </ul>

              <a 
                href={`https://wa.me/${WHATSAPP_CONTACT}?text=${encodeURIComponent(service.msg)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-5 bg-white/5 group-hover:bg-brand group-hover:text-white border border-white/10 group-hover:border-transparent text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs text-center"
              >
                Contratar Servicio
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="w-full max-w-5xl mx-auto px-6 py-48 text-center">
         <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter mb-12">
            Eleva tu <br /><span className="text-brand">Estándar.</span>
         </h2>
         <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <a 
               href={`https://wa.me/${WHATSAPP_CONTACT}?text=Hola%20Bonchona!%20Deseo%20hacer%20una%20consulta%20general%20sobre%20sus%20servicios%20de%20contrataci%C3%B3n.`}
               target="_blank" 
               rel="noopener noreferrer"
               className="px-16 py-6 bg-brand text-white font-black rounded-full hover:scale-105 transition-all uppercase tracking-widest text-sm shadow-[0_0_50px_rgba(255,79,0,0.3)]"
            >
               Consultar ahora
            </a>
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors uppercase font-black tracking-widest text-xs">
               Explorar Radio
            </Link>
         </div>
      </section>

      <div className="pb-24">
         <Image src="/logos-bonchona/92.png" className="h-12 w-auto opacity-20 grayscale object-contain" alt="Logo" width={48} height={48} />
      </div>
    </div>
  );
}
