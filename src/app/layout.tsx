'use client';

import { useState } from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import GlobalPlayer from "@/components/GlobalPlayer";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground pb-24`}
        suppressHydrationWarning
      >
        {/* Mobile Menu Overlay - Movido fuera de nav para control total */}
        <div className={`fixed inset-0 bg-[#050505] z-[200] flex flex-col items-center justify-center gap-12 transition-all duration-500 md:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white hover:bg-brand transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

           <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-4xl font-black italic uppercase tracking-tighter hover:text-brand transition-colors text-white">Inicio</Link>
           <Link href="/estudio" onClick={() => setIsMenuOpen(false)} className="text-4xl font-black italic uppercase tracking-tighter hover:text-brand transition-colors text-white">Estudio</Link>
           <Link href="/famoso" onClick={() => setIsMenuOpen(false)} className="text-4xl font-black italic uppercase tracking-tighter text-brand">Anúnciate</Link>
           <Link href="/nosotros" onClick={() => setIsMenuOpen(false)} className="text-xl font-bold text-zinc-500 uppercase tracking-widest">Nuestra Historia</Link>
           
           <div className="absolute bottom-12 flex flex-col items-center gap-4">
              <img src="/logos-bonchona/92.png" alt="Logo" className="h-12 opacity-50" />
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em]">Sintonía Total</p>
           </div>
        </div>

        {/* Navbar Global */}
        <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/logos-bonchona/92.png" alt="Bonchona" className="h-10 object-contain" />
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
              <Link href="/estudio" className="hover:text-brand transition-colors text-zinc-400">Estudio</Link>
              <Link href="/famoso" className="px-4 py-2 bg-brand text-white rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,79,0,0.3)]">Anúnciate</Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 text-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </nav>

        <main className="pt-16 min-h-screen">
          {children}
        </main>

        <GlobalPlayer />

        {/* Floating WhatsApp CTA */}
        <a 
          href="https://wa.me/584144001071?text=Hola%20Bonchona!%20Me%20gustar%C3%ADa%20pedir%20esta%20canci%C3%B3n:" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-32 right-6 md:right-12 z-[40] group flex items-center gap-3"
        >
          <div className="bg-zinc-950 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 backdrop-blur-md shadow-2xl pointer-events-none">
            Pidelá!
          </div>
          <div className="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,211,102,0.4)] hover:scale-110 hover:rotate-12 transition-all duration-500 relative">
            <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20"></div>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
              alt="WhatsApp" 
              className="w-8 h-8 brightness-0 invert" 
            />
          </div>
        </a>
      </body>
    </html>
  );
}
