'use client';

import Link from 'next/link';

export default function QuienesSomosPage() {
  return (
    <div className="flex flex-col items-center w-full bg-[#050505] text-white min-h-screen">
      {/* Cinematic Legacy Hero */}
      <section className="relative w-full h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=2070&auto=format&fit=crop" 
            alt="Vintage Radio Mic" 
            className="w-full h-full object-cover opacity-50 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/80 z-20"></div>
        </div>

        <div className="relative z-30 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/5 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
             <span className="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Legado & Evolución</span>
          </div>
          
          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter mb-8 leading-none italic uppercase">
            NUESTRA <br /><span className="text-brand">HISTORIA.</span>
          </h1>
          
          <p className="text-zinc-400 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-light">
            Honrando el pasado, liderando el presente. Bienvenidos a la <span className="text-white font-bold">Segunda Generación</span> de la Sintonía Total.
          </p>
        </div>
      </section>

      {/* The Legacy Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
         <div className="relative group order-2 lg:order-1">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand/20 to-zinc-800 rounded-[2rem] blur opacity-25"></div>
            <div className="relative rounded-[2rem] border border-white/5 overflow-hidden bg-zinc-900 aspect-square flex items-center justify-center p-12">
               <img src="/logos-bonchona/92.png" className="w-64 h-64 object-contain opacity-20 grayscale absolute" alt="Bonchona Logo" />
               <div className="relative z-10 text-center">
                  <p className="text-brand text-7xl font-black italic mb-2">1997</p>
                  <p className="text-white text-xs font-black uppercase tracking-[0.3em]">El inicio de un sueño</p>
               </div>
            </div>
         </div>
         <div className="order-1 lg:order-2">
            <h2 className="text-brand font-black tracking-[0.3em] text-xs uppercase mb-6 block">Fundación</h2>
            <h3 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8">
               El Legado de <br /> <span className="text-white">Carlos Briceño.</span>
            </h3>
            <div className="space-y-6 text-zinc-400 text-lg leading-relaxed">
               <p>
                  Radio Bonchona 107.1 FM no nació de la nada. Sus raíces se hunden en el éxito rotundo de <strong>"Favoritas"</strong>, el programa musical que marcó una época en el centro del país y que sirvió de inspiración para que nuestro fundador, Carlos Briceño, materializara un sueño mayor.
               </p>
               <p>
                  El 17 de septiembre de 1997, el dial de Valencia cambió para siempre. Con una visión clara y un amor inquebrantable por la radio, se encendieron los transmisores de lo que hoy es la emisora número uno del centro de Venezuela.
               </p>
            </div>
         </div>
      </section>

      {/* Second Generation Section */}
      <section className="w-full bg-zinc-950 py-32 border-y border-white/5">
         <div className="max-w-7xl mx-auto px-6 text-center">
            <span className="text-brand font-black tracking-[0.3em] text-xs uppercase mb-8 block">El Presente</span>
            <h2 className="text-5xl md:text-[6rem] font-black italic uppercase tracking-tighter mb-12 leading-none">
               LA SEGUNDA <br /><span className="text-brand">GENERACIÓN.</span>
            </h2>
            <p className="text-zinc-500 text-xl max-w-4xl mx-auto leading-relaxed mb-20 font-light">
               Hoy, asumimos el reto de llevar el legado a nuevas fronteras. Somos la evolución de la radio tradicional, fusionando la potencia del FM con la vanguardia digital. En esta nueva etapa, Bonchona es más que sonido: es contenido audiovisual de alta gama, sintonía global y el compromiso de seguir siendo la compañía diaria de miles de hogares.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
               {[
                  { title: "Misión", text: "Brindar programación de alta factura que conecte con la audiencia a través de los éxitos del momento y la promoción del talento emergente, siendo el puente definitivo entre la radio y el mundo audiovisual." },
                  { title: "Visión", text: "Consolidarnos como el multimedio líder en el centro del país, manteniendo el estandarte de la Sintonía Total y expandiendo nuestra esencia bonchona a cada rincón del mundo digital." },
                  { title: "Valores", text: "Excelencia, Innovación, Compromiso Local y la pasión innegociable por la comunicación profesional que nos ha caracterizado por más de 25 años." }
               ].map((item, i) => (
                  <div key={i} className="p-10 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 hover:border-brand/30 transition-all group">
                     <h4 className="text-brand font-black uppercase italic text-2xl mb-6 tracking-tighter group-hover:translate-x-2 transition-transform">{item.title}</h4>
                     <p className="text-zinc-400 text-sm leading-relaxed">{item.text}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Sintonía Total Stats */}
      <section className="w-full py-32 px-6">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 text-center">
            {[
               { val: "+25", label: "Años de Historia" },
               { val: "107.1", label: "Frecuencia Lider" },
               { val: "FULL", label: "Sintonía Total" },
               { val: "4K", label: "Contenido Visual" }
            ].map((stat, i) => (
               <div key={i} className="flex flex-col items-center">
                  <span className="text-6xl md:text-7xl font-black italic mb-4 text-white">{stat.val}</span>
                  <span className="text-brand font-black uppercase tracking-widest text-[10px]">{stat.label}</span>
               </div>
            ))}
         </div>
      </section>

      {/* Final CTA */}
      <section className="w-full max-w-5xl mx-auto px-6 py-48 text-center relative overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 blur-[120px] -z-10"></div>
         <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter mb-12">
            Nacidos para <br /><span className="text-brand">Liderar.</span>
         </h2>
         <Link href="/" className="px-16 py-6 bg-brand text-white font-black rounded-full hover:scale-105 transition-all uppercase tracking-widest text-sm shadow-[0_0_50px_rgba(255,79,0,0.3)]">
            Escuchar en Vivo
         </Link>
      </section>

      <div className="pb-24 flex flex-col items-center gap-8">
         <img src="/logos-bonchona/92.png" className="h-12 opacity-20 grayscale" alt="Logo" />
         <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em]">Radio Bonchona 107.1 FM - Sintonía Total</p>
      </div>
    </div>
  );
}
