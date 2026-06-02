'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <div className="flex flex-col items-center w-full">
      {/* Hero Section - Sintonía Total */}
      <section className="relative w-full h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-black">
        {/* Visual de fondo que evoca potencia y ciudad */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1514525253344-a812da993201?q=80&w=1933&auto=format&fit=crop")' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50"></div>

        <div className="relative z-10 max-w-5xl flex flex-col items-center">
          <div className="flex items-center gap-4 mb-6">
            <span className="h-[2px] w-12 bg-brand"></span>
            <span className="text-brand font-black tracking-[0.3em] text-sm md:text-base uppercase">
              107.1 FM | VALENCIA, VENEZUELA
            </span>
            <span className="h-[2px] w-12 bg-brand"></span>
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-4 leading-none italic uppercase">
            SINTONÍA <br /> <span className="text-brand">TOTAL.</span>
          </h1>
          
          <h2 className="text-xl md:text-2xl font-bold tracking-widest text-white/90 mb-10 uppercase">
            La número 1 del centro del país
          </h2>
          
          <div className="flex flex-col md:flex-row gap-5">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('play-radio'))}
              className="px-10 py-5 bg-brand hover:bg-brand-hover text-white font-black rounded-full transition-all shadow-[0_0_40px_rgba(255,79,0,0.4)] hover:scale-105 flex items-center gap-4 group"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="group-hover:animate-pulse"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              ESCUCHAR EN VIVO
            </button>
            <Link href="/famoso" className="px-10 py-5 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white font-bold rounded-full border border-white/10 transition-all flex items-center gap-3">
              PUBLICIDAD
            </Link>
          </div>
        </div>

        {/* Floating Tag */}
        <div className="absolute bottom-12 right-12 hidden lg:block animate-bounce">
          <p className="text-xs font-mono text-zinc-500 rotate-90 origin-right tracking-[0.5em] uppercase">
            EST. 1997 - LEGADO CARLOS BRICEÑO
          </p>
        </div>
      </section>

      {/* Stats / Proof Section */}
      <section className="w-full bg-brand py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-8 text-black">
          <div className="flex flex-col">
            <span className="text-4xl font-black">107.1</span>
            <span className="text-xs font-bold uppercase tracking-wider">Mega Watts de Poder</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-black">+25</span>
            <span className="text-xs font-bold uppercase tracking-wider">Años Liderando</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-black">#1</span>
            <span className="text-xs font-bold uppercase tracking-wider">En el centro del país</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-black">FULL</span>
            <span className="text-xs font-bold uppercase tracking-wider">Sintonía Total</span>
          </div>
        </div>
      </section>

      {/* Stat Section ... ya existente */}

      {/* Espacio Publicitario 1 - Alta Visibilidad */}
      <section className="w-full max-w-7xl mx-auto px-6 pt-24">
        <div className="w-full h-48 md:h-64 bg-zinc-900 border border-white/5 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-transparent to-brand/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="z-10 text-center">
            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">Espacio Publicitario Premium</span>
            <p className="text-zinc-500 italic font-medium">Tu marca aquí en Sintonía Total</p>
          </div>
          <Link href="/famoso" className="absolute bottom-6 right-8 text-[10px] font-black uppercase tracking-widest text-brand hover:text-white transition-colors">
            Contratar Espacio
          </Link>
        </div>
      </section>

      {/* Parrilla de Programación Real */}
      <section className="w-full max-w-7xl mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase italic">Programación <span className="text-brand">Elite.</span></h2>
            <p className="text-zinc-500">Los programas que mueven a Valencia y al centro de Venezuela. Talento, música y sintonía total todos los días.</p>
          </div>
          <div className="flex gap-2">
            <div className="w-12 h-1 bg-brand"></div>
            <div className="w-4 h-1 bg-zinc-800"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PROGRAMS.map((show, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedProgram(show)}
              className="p-8 rounded-2xl border border-white/5 bg-zinc-900 group hover:border-brand/40 hover:bg-zinc-800/50 transition-all duration-500 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 blur-3xl -z-0 group-hover:bg-brand/10 transition-colors"></div>
              <span className="text-brand text-xs font-bold tracking-widest block mb-4">{show.time}</span>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-brand transition-colors uppercase italic tracking-tighter">{show.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Con la conducción de <br /><span className="text-white font-bold">{show.locutor}</span></p>
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">
                <span>Ver detalles</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal de Programas */}
      {selectedProgram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-xl bg-black/80">
          <div 
            className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedProgram(null)}
              className="absolute top-6 right-6 z-20 w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-brand text-white rounded-full border border-white/10 transition-all backdrop-blur-md"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="flex flex-col md:flex-row h-full">
              {/* Image Side */}
              <div className="w-full md:w-1/2 relative h-64 md:h-[600px] overflow-hidden group">
                <img 
                  src={selectedProgram.banner} 
                  alt={selectedProgram.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                <div className="absolute bottom-8 left-8">
                  <span className="px-4 py-2 bg-brand text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                    {selectedProgram.time}
                  </span>
                </div>
              </div>

              {/* Content Side */}
              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-brand text-xs font-black uppercase tracking-[0.3em] mb-4">Programa Oficial</h3>
                <h2 className="text-4xl md:text-5xl font-black mb-6 italic uppercase tracking-tighter leading-none">
                  {selectedProgram.title}
                </h2>
                
                <div className="space-y-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-white font-bold text-lg mb-1">{selectedProgram.locutor}</p>
                    <p className="text-zinc-500 text-xs uppercase font-black tracking-widest italic">Host Principal</p>
                  </div>

                  <p className="text-zinc-300 text-lg leading-relaxed font-medium italic">
                    "{selectedProgram.richText}"
                  </p>

                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {selectedProgram.description}
                  </p>
                </div>

                <div className="mt-10 flex items-center gap-4">
                   <div className="h-[1px] flex-1 bg-white/10"></div>
                   <img src="/logos-bonchona/92.png" className="h-6 opacity-30" alt="Logo" />
                   <div className="h-[1px] flex-1 bg-white/10"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedProgram(null)}></div>
        </div>
      )}

      {/* Sección de Estudio */}
      <section id="estudio" className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute -inset-4 bg-brand/20 blur-3xl rounded-full"></div>
            <img 
              src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop" 
              alt="Estudio de Grabación" 
              className="relative rounded-3xl border border-white/10 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl max-w-xs">
              <p className="text-white font-bold mb-2">Tecnología de Punta</p>
              <p className="text-zinc-400 text-xs leading-relaxed">Equipamiento profesional para captura de voz, doblaje y producción musical de alta fidelidad.</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="text-brand font-black tracking-[0.3em] text-xs uppercase mb-4 block">Servicios Premium</span>
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-none italic uppercase tracking-tighter">
              Bonchona <br /><span className="text-brand">Estudio.</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-10">
              Mucho más que una radio. Ofrecemos servicios de grabación profesional, producción de spots publicitarios, doblaje, podcasting y post-producción de audio con los más altos estándares de la industria.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Locución", desc: "Voces de impacto" },
                { label: "Producción", desc: "Spots y jingles" },
                { label: "Podcasting", desc: "Estudio equipado" },
                { label: "Mix & Master", desc: "Sonido elite" }
              ].map((item, i) => (
                <div key={i} className="group">
                  <p className="text-white font-black uppercase text-sm mb-1 group-hover:text-brand transition-colors tracking-tighter">{item.label}</p>
                  <p className="text-zinc-500 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
            <Link href="/estudio" className="inline-flex mt-12 px-8 py-4 bg-white/5 hover:bg-brand border border-white/10 rounded-xl text-white font-bold transition-all uppercase tracking-widest text-xs">
              Saber más
            </Link>
          </div>
        </div>
      </section>

      {/* Banner Publicitario Nativo */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="w-full bg-gradient-to-r from-zinc-900 to-black border border-white/5 rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[100px] -z-0"></div>
          <div className="z-10 flex-1">
            <span className="text-brand font-bold text-xs tracking-widest uppercase mb-3 block">Anúnciate con los líderes</span>
            <h3 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter uppercase italic">Tu marca en <br /> Sintonía Total.</h3>
            <p className="text-zinc-400 max-w-md text-lg leading-relaxed">
              Forma parte de la emisora número 1. Llegamos a Carabobo, Aragua, Cojedes y Guárico con la mayor efectividad publicitaria.
            </p>
          </div>
          <div className="z-10 flex flex-col gap-4">
            <a 
              href="https://wa.me/584244001367?text=Hola%20Bonchona!%20Me%20gustar%C3%ADa%20consultar%20tarifas%20publicitarias." 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-brand hover:text-white transition-all uppercase tracking-tighter text-sm text-center"
            >
              Consultar Tarifas
            </a>
            <p className="text-[10px] text-center text-zinc-600 font-mono tracking-widest uppercase">Publicidad 100% Efectiva</p>
          </div>
        </div>
      </section>

      {/* Espacio Publicitario 3 - Cierre de Home */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="w-full h-32 md:h-40 bg-zinc-950 border border-white/10 rounded-3xl flex items-center justify-between px-10 relative overflow-hidden group">
          <div className="z-10">
            <span className="text-zinc-700 text-[9px] font-black uppercase tracking-[0.5em] mb-2 block">Premium Ad Network</span>
            <p className="text-zinc-600 text-sm font-bold uppercase tracking-tighter">Disponible para campañas nacionales</p>
          </div>
          <a 
            href="https://wa.me/584244001367?text=Hola%20Bonchona!%20Deseo%20informaci%C3%B3n%20sobre%20espacios%20publicitarios%20en%20la%20web." 
            target="_blank" 
            rel="noopener noreferrer"
            className="z-10 px-6 py-3 border border-zinc-800 hover:border-brand text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Anúnciate
          </a>
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        </div>
      </section>

      {/* Footer Identity */}
      <section className="w-full py-24 px-6 border-t border-white/5 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
             <img src="/logos-bonchona/92.png" alt="Bonchona Logo" className="h-16 mb-8" />
             <p className="text-zinc-500 leading-relaxed text-sm max-w-sm mb-6">
                Bonchona 107.1 FM es un legado de Carlos Briceño. Desde 1997, marcando la pauta musical y el entretenimiento en el centro de Venezuela. ¡Sintonía Total!
             </p>
             <Link href="/nosotros" className="text-brand font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors flex items-center gap-2">
                Conoce nuestra historia
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
             </Link>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-zinc-700 text-8xl font-black italic select-none">107.1</p>
            <p className="text-brand font-bold tracking-[1em] text-xs uppercase -mt-4 mr-2">Valencia</p>
          </div>
        </div>
      </section>
    </div>
  );
}
