"use client";

// Arranca el reproductor global por el mismo bus de CustomEvent que usa el
// hero del inicio; las páginas de servidor no pueden tocar su estado.
export default function ListenLiveButton({ label = "ESCUCHAR EN VIVO" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("play-radio"))}
      className="px-8 sm:px-10 py-4 sm:py-5 bg-bonchona-red text-white font-black rounded-full transition-all shadow-[0_20px_40px_rgba(232,75,50,0.3)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4 text-sm sm:text-base"
    >
      <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><polygon points="5 3 19 12 5 21 5 3" /></svg>
      </span>
      {label}
    </button>
  );
}
