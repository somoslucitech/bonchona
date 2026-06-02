export default function FamosoPage() {
  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      
      {/* Header Publicidad & Talento */}
      <section className="w-full py-24 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 italic uppercase">
          IMPULSA TU <span className="text-brand">MARCA.</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          La vitrina comercial más potente del centro del país. Planes diseñados para empresas que buscan resultados reales y presencia de impacto.
        </p>
        
        {/* Aviso para Músicos */}
        <div className="mt-8 inline-block px-6 py-2 bg-brand/10 border border-brand/20 rounded-full">
          <p className="text-brand text-xs font-bold tracking-widest uppercase">
            🎵 Atención Artistas: Los músicos no pagan por sonar. <span className="underline cursor-pointer ml-2">Envía tu demo aquí.</span>
          </p>
        </div>
      </section>

      {/* Business Pricing Plans */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan 1 - En Vivo */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-3xl p-10 flex flex-col hover:border-brand/30 transition-all group">
            <div className="mb-8">
              <h3 className="text-3xl font-black mb-2 italic uppercase group-hover:text-brand transition-colors text-white">Presencia <br />En Vivo</h3>
              <p className="text-zinc-500 text-sm">Ideal para marcas que quieren asociarse a nuestros locutores estrella.</p>
            </div>
            <div className="text-4xl font-black mb-8 text-white">$200<span className="text-sm text-zinc-600 font-bold tracking-widest ml-2 uppercase">/mes</span></div>
            <ul className="space-y-4 mb-10 text-sm text-zinc-400 flex-grow">
              <li className="flex items-center gap-3 font-medium"><span className="text-brand">●</span> Menciones en programas en vivo</li>
              <li className="flex items-center gap-3 font-medium"><span className="text-brand">●</span> Presencia en el Prime Time</li>
              <li className="flex items-center gap-3 font-medium"><span className="text-brand">●</span> Branding en nuestras redes</li>
            </ul>
            <a 
              href="https://wa.me/584244001367?text=Hola%20Bonchona!%20Deseo%20m%C3%A1s%20informaci%C3%B3n%20sobre%20el%20Plan%20Presencia%20En%20Vivo." 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-brand hover:text-white transition-all uppercase tracking-tighter text-sm text-center"
            >
              Contratar Ahora
            </a>
          </div>

          {/* Plan 2 - Mix 3 (Destacado) */}
          <div className="bg-zinc-900 border-2 border-brand rounded-3xl p-10 flex flex-col relative transform md:-translate-y-6 shadow-[0_30px_60px_rgba(255,79,0,0.15)]">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand text-white px-6 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg">Más Recomendado</div>
            <div className="mb-8">
              <h3 className="text-3xl font-black mb-2 italic uppercase text-white">Impacto <br />Mix 3</h3>
              <p className="text-zinc-400 text-sm">El balance perfecto entre radio en vivo y recordación de marca.</p>
            </div>
            <div className="text-5xl font-black mb-8 text-white">$450<span className="text-sm text-zinc-300 font-bold tracking-widest ml-2 uppercase">/mes</span></div>
            <ul className="space-y-4 mb-10 text-sm text-zinc-200 flex-grow">
              <li className="flex items-center gap-3 font-bold"><span className="text-white">✔</span> Todo lo del Plan En Vivo</li>
              <li className="flex items-center gap-3 font-bold"><span className="text-white">✔</span> 3 Cuñas diarias (1 minuto c/u)</li>
              <li className="flex items-center gap-3 font-bold"><span className="text-white">✔</span> Rotación en horarios rotativos</li>
              <li className="flex items-center gap-3 font-bold"><span className="text-white">✔</span> Reporte de sintonía mensual</li>
            </ul>
            <a 
              href="https://wa.me/584244001367?text=Hola%20Bonchona!%20Me%20interesa%20contratar%20el%20Plan%20Impacto%20Mix%203." 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-5 bg-brand text-white font-black rounded-xl hover:bg-white hover:text-black transition-all uppercase tracking-tighter text-sm shadow-[0_10px_20px_rgba(255,79,0,0.3)] text-center"
            >
              Dominar el Dial
            </a>
          </div>

          {/* Plan 3 - Dominación 10 */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-3xl p-10 flex flex-col hover:border-brand/30 transition-all group">
            <div className="mb-8">
              <h3 className="text-3xl font-black mb-2 italic uppercase group-hover:text-brand transition-colors text-white">Sintonía <br />Total 10</h3>
              <p className="text-zinc-500 text-sm">Dominación total del mercado con máxima frecuencia diaria.</p>
            </div>
            <div className="text-4xl font-black mb-8 text-white">$850<span className="text-sm text-zinc-600 font-bold tracking-widest ml-2 uppercase">/mes</span></div>
            <ul className="space-y-4 mb-10 text-sm text-zinc-400 flex-grow">
              <li className="flex items-center gap-3 font-medium"><span className="text-brand">●</span> Todo lo del Plan Mix 3</li>
              <li className="flex items-center gap-3 font-medium"><span className="text-brand">●</span> 10 Cuñas diarias (1 a 2 min)</li>
              <li className="flex items-center gap-3 font-medium"><span className="text-brand">●</span> Entrevista especial de marca</li>
              <li className="flex items-center gap-3 font-medium"><span className="text-brand">●</span> Prioridad en eventos externos</li>
            </ul>
            <a 
              href="https://wa.me/584244001367?text=Hola%20Bonchona!%20Deseo%20informaci%C3%B3n%20para%20el%20Plan%20Corporativo%20Sinton%C3%ADa%20Total%2010." 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-brand hover:text-white transition-all uppercase tracking-tighter text-sm text-center"
            >
              Plan Corporativo
            </a>
          </div>

        </div>
      </section>

      {/* Spot Production Services */}
      <section className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-brand font-black text-xs tracking-[0.3em] uppercase mb-4 block">Producción de Audio</span>
            <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter uppercase italic text-white">¿No tienes <span className="text-brand">spot?</span> <br />Nosotros lo creamos.</h2>
            <p className="text-zinc-500 mb-8 text-lg leading-relaxed">
              Contamos con tecnología de punta y locutores profesionales para que tu marca suene increíble. Elige el método que mejor se adapte a tu presupuesto.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-2xl group hover:border-brand/50 transition-all">
              <h4 className="text-xl font-bold mb-2 text-white italic uppercase">Producción con IA <span className="text-brand text-xs ml-2">Quick & Low Cost</span></h4>
              <p className="text-zinc-500 text-sm">Voces hiper-realistas generadas con inteligencia artificial. Rápido, efectivo y económico.</p>
            </div>
            <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-2xl group hover:border-brand/50 transition-all">
              <h4 className="text-xl font-bold mb-2 text-white italic uppercase">Producción Artesanal <span className="text-brand text-xs ml-2">Premium Outsourcing</span></h4>
              <p className="text-zinc-500 text-sm">Locutores de carne y hueso, edición musical a medida y guionistas creativos dedicados a tu marca.</p>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">* La producción de spots es un servicio adicional que se suma al costo del plan elegido.</p>
          </div>
        </div>
      </section>

      {/* Final Ad Space */}
      <section className="w-full max-w-5xl mx-auto px-6 py-12 mb-24 flex justify-center">
         <div className="w-full md:w-[728px] h-[90px] bg-zinc-900/20 border border-white/5 flex items-center justify-center rounded-xl overflow-hidden relative group cursor-pointer">
            <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors"></div>
            <span className="text-zinc-700 text-[10px] tracking-[0.5em] font-black uppercase z-10">
               Espacio Disponible para Publicidad
            </span>
         </div>
      </section>

    </div>
  );
}
