'use client';

import { useState, Suspense } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import GlobalPlayer from "@/components/GlobalPlayer";
import PageTransition from "@/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-bonchona-navy text-foreground pb-24`}
        suppressHydrationWarning
      >
        {/* Mobile Menu Overlay */}
        <div className={`fixed inset-0 bg-bonchona-navy z-[200] flex flex-col items-center justify-center gap-12 transition-all duration-700 md:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="absolute inset-0 bg-mesh-brand opacity-20 pointer-events-none"></div>
           <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-8 right-8 w-14 h-14 flex items-center justify-center glass rounded-full text-white hover:bg-bonchona-red transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

           <div className="flex flex-col items-center gap-8 relative z-10">
             <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase tracking-tighter hover:text-bonchona-red transition-colors text-white">Inicio</Link>
             <Link href="/estudio" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase tracking-tighter hover:text-bonchona-red transition-colors text-white">Estudio</Link>
             <Link href="/famoso" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase tracking-tighter text-bonchona-red">Anúnciate</Link>
             <Link href="/nosotros" onClick={() => setIsMenuOpen(false)} className="text-xl font-bold text-zinc-500 uppercase tracking-[0.3em]">Historia</Link>
           </div>
           
           <div className="absolute bottom-16 flex flex-col items-center gap-6 z-10">
              <Image src="/logos-bonchona/92.png" alt="Logo" className="h-16 w-auto opacity-50" width={64} height={64} />
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.6em]">Sintonía Total</p>
           </div>
        </div>

        {/* Navbar Global */}
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image src="/logos-bonchona/92.png" alt="Bonchona" className="h-10 sm:h-12 w-auto object-contain" width={48} height={48} />
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.3em]">
              <Link href="/estudio" className="hover:text-bonchona-red transition-colors text-zinc-400">Estudio</Link>
              <Link href="/nosotros" className="hover:text-bonchona-red transition-colors text-zinc-400">Historia</Link>
              <Link href="/famoso" className="px-6 py-2.5 bg-bonchona-red text-white rounded-full hover:scale-105 transition-all shadow-[0_10px_20px_rgba(232,75,50,0.2)]">Anúnciate</Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 text-white"
            >
              <div className="w-8 h-6 flex flex-col justify-between items-end">
                <span className="w-8 h-1 bg-white rounded-full"></span>
                <span className="w-5 h-1 bg-bonchona-red rounded-full"></span>
                <span className="w-7 h-1 bg-white rounded-full"></span>
              </div>
            </button>
          </div>
        </nav>

        <main className="pt-16 sm:pt-20 min-h-screen">
          <Suspense fallback={null}>
            <PageTransition>
              {children}
            </PageTransition>
          </Suspense>
        </main>

        <GlobalPlayer />

        {/* Floating WhatsApp CTA */}
        <a 
          href="https://wa.me/584144001071?text=Hola%20Bonchona!%20Me%20gustar%C3%ADa%20pedir%20esta%20canci%C3%B3n:" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-32 sm:bottom-36 right-4 sm:right-12 z-[40] group flex items-center gap-4"
        >
          <div className="hidden sm:block glass text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 shadow-2xl pointer-events-none">
            Pidelá!
          </div>
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(37,211,102,0.3)] hover:scale-110 hover:rotate-12 transition-all duration-500 relative">
            <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20"></div>
            <Image 
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
              alt="WhatsApp" 
              className="w-7 h-7 sm:w-9 sm:h-9 brightness-0 invert" 
              width={36}
              height={36}
            />
          </div>
        </a>

      </body>
    </html>
  );
}
