'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DEMO_GENRES, MAX_DEMO_BYTES, formatBytes } from '@/lib/demos';

const field =
  "w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700";
const label = "text-[9px] font-black uppercase tracking-widest text-zinc-500";

export default function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const formRef = useRef<HTMLFormElement | null>(null);

  const close = useCallback(() => {
    onClose();
    // Deja el formulario limpio para la próxima apertura.
    setTimeout(() => { setDone(false); setError(null); setFileName(null); }, 300);
  }, [onClose]);

  // Con el modal abierto, bloqueamos el scroll del fondo.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Cerrar con Escape, como espera cualquiera que use un modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError(null);
    if (!f) { setFileName(null); setFileSize(0); return; }
    if (f.size > MAX_DEMO_BYTES) {
      setError(`Tu archivo pesa ${formatBytes(f.size)} y el máximo es ${formatBytes(MAX_DEMO_BYTES)}.`);
      setFileName(null); setFileSize(0);
      e.target.value = "";
      return;
    }
    setFileName(f.name);
    setFileSize(f.size);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    if (!(data.get("demo") instanceof File) || (data.get("demo") as File).size === 0) {
      setError("Adjunta tu canción en MP3.");
      return;
    }
    if (data.get("rightsConfirmed") !== "true") {
      setError("Necesitamos que confirmes que la canción es tuya.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/demos", { method: "POST", body: data });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "No pudimos recibir tu demo. Intenta de nuevo.");
      } else {
        setDone(true);
        form.reset();
        setFileName(null);
      }
    } catch {
      setError("Se cayó la conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  // Portal a <body>: si el modal se renderiza dentro de una sección con
  // z-index propio, esa sección crea un contexto de apilamiento y el z-[300]
  // del modal solo compite dentro de ella — por eso el título de "Publicidad
  // Rotativa" se montaba encima.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-bonchona-navy/95 backdrop-blur-2xl"
            onClick={close}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-label="Enviar demo"
            className="relative w-full max-w-2xl glass rounded-[2rem] sm:rounded-[2.5rem] border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.6)] my-auto"
          >
            <button
              onClick={close}
              aria-label="Cerrar"
              className="absolute top-5 right-5 z-10 w-11 h-11 flex items-center justify-center bg-black/50 hover:bg-bonchona-red text-white rounded-full border border-white/10 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {done ? (
              <div className="p-10 sm:p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-bonchona-red/15 text-bonchona-red flex items-center justify-center mx-auto mb-6 text-3xl">🎧</div>
                <h3 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter mb-4">
                  ¡Ya te <span className="text-gradient">escuchamos!</span>
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto">
                  Tu canción llegó a la cabina. La escuchamos con calma y si nos vuela la peluca
                  te escribimos al correo que dejaste.
                </p>
                <button
                  onClick={close}
                  className="mt-10 px-10 py-4 bg-bonchona-red text-white font-black rounded-full uppercase tracking-widest text-[10px]"
                >
                  Listo
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="p-7 sm:p-10">
                <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-[10px] uppercase block mb-3">
                  Zona de Talento
                </span>
                <h3 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter mb-3">
                  Queremos <span className="text-gradient">escucharte.</span>
                </h3>
                <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed mb-8">
                  Sonar en Bonchona no cuesta nada. Mándanos tu tema en MP3 y lo escuchamos.
                </p>

                {/* Trampa para bots: invisible para personas. */}
                <input
                  type="text" name="website" tabIndex={-1} autoComplete="off"
                  aria-hidden="true"
                  className="absolute opacity-0 pointer-events-none h-0 w-0"
                />

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-firstName">Nombre *</label>
                      <input id="d-firstName" name="firstName" required className={field} placeholder="Pedro" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-lastName">Apellido *</label>
                      <input id="d-lastName" name="lastName" required className={field} placeholder="Pérez" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={label} htmlFor="d-artistName">Nombre artístico *</label>
                    <input id="d-artistName" name="artistName" required className={field} placeholder="Con el que quieres sonar al aire" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-trackTitle">Título del tema *</label>
                      <input id="d-trackTitle" name="trackTitle" required className={field} placeholder="Nombre de la canción" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-genre">Género</label>
                      <select id="d-genre" name="genre" className={field} defaultValue="">
                        <option value="" disabled>Elige uno</option>
                        {DEMO_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-email">Correo *</label>
                      <input id="d-email" name="email" type="email" required className={field} placeholder="tucorreo@ejemplo.com" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-whatsapp">WhatsApp</label>
                      <input id="d-whatsapp" name="whatsapp" className={field} placeholder="0414 000 0000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-city">Ciudad</label>
                      <input id="d-city" name="city" className={field} placeholder="Valencia" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-instagram">Instagram</label>
                      <input id="d-instagram" name="instagram" className={field} placeholder="@tucuenta" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={label} htmlFor="d-spotify">Spotify</label>
                      <input id="d-spotify" name="spotify" className={field} placeholder="Enlace a tu perfil" />
                    </div>
                  </div>

                  {/* Archivo */}
                  <div className="flex flex-col gap-2">
                    <label className={label}>Tu canción en MP3 * (máx. {formatBytes(MAX_DEMO_BYTES)})</label>
                    <div className="relative border-2 border-dashed border-white/10 hover:border-bonchona-red/50 rounded-2xl p-7 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group bg-white/5">
                      <input
                        type="file" name="demo" accept="audio/mpeg,.mp3" required
                        onChange={handleFile}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">🎵</span>
                      <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors break-all px-4">
                        {fileName ? `${fileName} · ${formatBytes(fileSize)}` : "Selecciona o arrastra tu MP3"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={label} htmlFor="d-message">Cuéntanos algo del tema (opcional)</label>
                    <textarea id="d-message" name="message" rows={3} className={field} placeholder="De qué va, qué te inspiró, lo que quieras contarnos." />
                  </div>

                  {/* Derechos */}
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-white/5 border border-white/10">
                    <input
                      type="checkbox" name="rightsConfirmed" value="true" required
                      className="mt-0.5 w-4 h-4 accent-bonchona-red flex-shrink-0"
                    />
                    <span className="text-[11px] text-zinc-400 leading-relaxed">
                      Declaro que la canción es de mi autoría o que tengo los derechos para enviarla,
                      y autorizo a Radio Bonchona 107.1 FM a transmitirla. *
                    </span>
                  </label>
                </div>

                {error && (
                  <div role="alert" className="mt-6 p-4 rounded-xl bg-bonchona-red/10 border border-bonchona-red/25">
                    <p className="text-[11px] font-bold text-bonchona-red leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="mt-8 w-full py-5 bg-bonchona-red text-white font-black rounded-full uppercase tracking-[0.2em] text-[11px] shadow-[0_15px_30px_rgba(232,75,50,0.25)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {sending ? "Enviando tu tema…" : "Enviar mi demo"}
                </button>
                <p className="text-[9px] text-zinc-600 text-center mt-4 uppercase tracking-widest font-bold">
                  Enviar tu demo es gratis, siempre
                </p>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
