'use client';

import { useState } from 'react';
import Image from 'next/image';
import { loginAdminAction } from '@/app/admin/actions';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    const result = await loginAdminAction(password);
    setLoading(false);

    if (result.success) {
      // Reload page to re-render server component and fetch dashboard
      window.location.reload();
    } else {
      setError(result.error || "Clave incorrecta.");
    }
  };

  return (
    <div className="min-h-screen bg-bonchona-navy text-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* Mesh Background */}
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-20 z-0"></div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Branding Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Image 
            src="/logos-bonchona/92.png" 
            alt="Bonchona Logo" 
            width={90} 
            height={90} 
            className="object-contain drop-shadow-[0_10px_20px_rgba(232,75,50,0.3)] mb-4"
          />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            PANEL <span className="text-gradient">CONTROL.</span>
          </h1>
          <p className="text-zinc-500 text-[10px] tracking-widest uppercase mt-2 font-black">
            Radio Bonchona 107.1 FM
          </p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-[2rem] p-8 sm:p-10 border-white/10 shadow-2xl">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 text-center">
            Ingresa la Clave de Acceso
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-2">
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-center text-sm font-bold text-white placeholder-zinc-700 tracking-widest"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-bonchona-red/10 border border-bonchona-red/20 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-bonchona-red">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 bg-bonchona-red hover:bg-bonchona-red/90 text-white font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50 disabled:pointer-events-none shadow-lg"
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
            Acceso restringido para personal autorizado
          </p>
        </div>

      </div>
    </div>
  );
}
