import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <h1 className="text-9xl font-black text-brand mb-4 italic uppercase">404</h1>
      <h2 className="text-3xl font-bold mb-8 uppercase tracking-tighter">Sintonía Perdida</h2>
      <p className="text-zinc-500 max-w-md mb-12 leading-relaxed">
        Lo sentimos, la página que buscas no está en nuestra frecuencia. Tal vez cambió de horario o fue retirada de la programación.
      </p>
      <Link 
        href="/" 
        className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-brand hover:text-white transition-all uppercase tracking-tighter text-sm"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}
