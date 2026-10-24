"use client";

import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Sin useSearchParams a propósito: dentro del <Suspense> del layout obliga a
  // Next a no prerenderizar las páginas estáticas, que llegaban en un
  // <div hidden> y no se veían hasta hidratar (LCP de ~3 s en /estudio).
  const [isPending, setIsPending] = useState(false);
  const [displayPathname, setDisplayPathname] = useState(pathname);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // Al cambiar la ruta, mostramos el loader
    if (pathname !== displayPathname) {
      // Usamos requestAnimationFrame o un pequeño delay para evitar el renderizado en cascada síncrono
      const frame = requestAnimationFrame(() => {
        setIsPending(true);
      });
      
      // Simulamos un pequeño delay para que la transición sea perceptible y suave
      const timer = setTimeout(() => {
        setDisplayPathname(pathname);
        setHasNavigated(true);
        setIsPending(false);
      }, 600); // Duración de la animación de salida/entrada

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [pathname, displayPathname]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isPending && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-bonchona-navy flex flex-col items-center justify-center"
          >
            <div className="absolute inset-0 bg-mesh-brand opacity-30"></div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="relative z-10 flex flex-col items-center gap-8"
            >
              <Image 
                src="/logos-bonchona/92.png" 
                alt="Loading..." 
                width={120} 
                height={120} 
                className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_30px_rgba(232,75,50,0.4)]"
              />
              <div className="flex flex-col items-center gap-2">
                <span className="text-bonchona-red font-black tracking-[0.6em] text-[10px] uppercase">
                  Sintonía Total
                </span>
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative mt-2">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-bonchona-red to-transparent w-full"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* En la primera carga no se anima: con opacity:0 en el HTML del
          servidor, nada se veía hasta que hidrataba React y el LCP móvil
          pasaba de 4 s. La entrada animada queda para la navegación. */}
      <motion.div
        key={displayPathname}
        initial={hasNavigated ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
