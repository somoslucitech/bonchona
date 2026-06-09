'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Program, RotativeRate } from '@/lib/db';
import { saveProgramsAction, saveRatesAction, uploadPrerollAction, logoutAdminAction } from '@/app/admin/actions';

interface AdminClientProps {
  initialPrograms: Program[];
  initialRotativeRates: RotativeRate[];
}

export default function AdminClient({ initialPrograms, initialRotativeRates }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<'programs' | 'rates' | 'preroll'>('programs');
  
  // Programs State
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [programForm, setProgramForm] = useState<Partial<Program>>({
    title: '',
    time: '',
    locutor: '',
    banner: '',
    description: '',
    richText: '',
    price: 0,
  });

  // Rates State
  const [rates, setRates] = useState<RotativeRate[]>(initialRotativeRates);

  // File Upload State
  const [prerollFile, setPrerollFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prerollStatus, setPrerollStatus] = useState<string | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // --- Programs Handlers ---
  const handleEditClick = (program: Program) => {
    setEditingProgram(program);
    setProgramForm(program);
    setIsAdding(false);
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setEditingProgram(null);
    setProgramForm({
      title: '',
      time: '',
      locutor: '',
      banner: '/logos-bonchona/92.png',
      description: '',
      richText: '',
      price: 0,
    });
  };

  const handleCancelProgram = () => {
    setEditingProgram(null);
    setIsAdding(false);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.title || !programForm.time || !programForm.locutor) {
      showStatus("Por favor, rellena los campos obligatorios.", "error");
      return;
    }

    let updatedPrograms: Program[] = [];

    if (isAdding) {
      const newId = (programForm.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const newProg: Program = {
        id: newId,
        title: programForm.title || '',
        time: programForm.time || '',
        locutor: programForm.locutor || '',
        banner: programForm.banner || '/logos-bonchona/92.png',
        description: programForm.description || '',
        richText: programForm.richText || '',
        price: Number(programForm.price) || 0,
      };
      
      updatedPrograms = [...programs, newProg];
    } else if (editingProgram) {
      updatedPrograms = programs.map(p => 
        p.id === editingProgram.id 
          ? {
              ...p,
              title: programForm.title || p.title,
              time: programForm.time || p.time,
              locutor: programForm.locutor || p.locutor,
              banner: programForm.banner || p.banner,
              description: programForm.description || p.description,
              richText: programForm.richText || p.richText,
              price: Number(programForm.price) ?? p.price,
            }
          : p
      );
    }

    const ok = await saveProgramsAction(updatedPrograms);
    if (ok) {
      setPrograms(updatedPrograms);
      setEditingProgram(null);
      setIsAdding(false);
      showStatus("Programa guardado con éxito.");
    } else {
      showStatus("Error al guardar los programas en el servidor.", "error");
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este programa?")) return;
    
    const updatedPrograms = programs.filter(p => p.id !== id);
    const ok = await saveProgramsAction(updatedPrograms);
    if (ok) {
      setPrograms(updatedPrograms);
      showStatus("Programa eliminado con éxito.");
    } else {
      showStatus("Error al eliminar el programa.", "error");
    }
  };

  // --- Rates Handlers ---
  const handleRatePriceChange = (rateIndex: number, durationIndex: number, newPrice: number) => {
    const updatedRates = [...rates];
    updatedRates[rateIndex].durations[durationIndex].price = newPrice;
    setRates(updatedRates);
  };

  const handleSaveRates = async () => {
    const ok = await saveRatesAction(rates);
    if (ok) {
      showStatus("Tarifario publicitario guardado con éxito.");
    } else {
      showStatus("Error al guardar los precios.", "error");
    }
  };

  // --- File Upload Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPrerollFile(e.target.files[0]);
      setPrerollStatus(null);
    }
  };

  const handleUploadPreroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prerollFile) {
      setPrerollStatus("Por favor, selecciona un archivo MP3.");
      return;
    }

    setUploading(true);
    setPrerollStatus("Subiendo comercial...");

    const formData = new FormData();
    formData.append("preroll", prerollFile);

    const result = await uploadPrerollAction(formData);
    setUploading(false);
    
    if (result.success) {
      setPrerollFile(null);
      setPrerollStatus("Comercial subido y publicado exitosamente.");
      showStatus("¡Audio comercial actualizado!");
    } else {
      setPrerollStatus(`Error: ${result.error || "No se pudo subir."}`);
    }
  };

  return (
    <div className="min-h-screen bg-bonchona-navy text-white pt-8 pb-24 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
      {/* Mesh Background */}
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-20 z-0"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Title */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/5 pb-6 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter">
              PANEL <span className="text-gradient">CONTROL.</span>
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm tracking-widest uppercase mt-2 font-bold">
              Gestión visual para Radio Bonchona 107.1
            </p>
            <button
              onClick={async () => {
                await logoutAdminAction();
                window.location.reload();
              }}
              className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-bonchona-red mt-3 transition-colors block text-center md:text-left"
            >
              Cerrar Sesión
            </button>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 p-1.5 glass rounded-full border-white/10">
            <button
              onClick={() => { setActiveTab('programs'); handleCancelProgram(); }}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'programs' ? 'bg-bonchona-red text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Programación
            </button>
            <button
              onClick={() => { setActiveTab('rates'); handleCancelProgram(); }}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'rates' ? 'bg-bonchona-red text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Tarifas Publicidad
            </button>
            <button
              onClick={() => { setActiveTab('preroll'); handleCancelProgram(); }}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'preroll' ? 'bg-bonchona-red text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Comercial Preroll
            </button>
          </div>
        </div>

        {/* Global Status Message */}
        {statusMsg && (
          <div className={`fixed bottom-10 left-10 z-[200] p-5 rounded-2xl shadow-2xl flex items-center gap-4 transition-all duration-300 border ${statusMsg.type === 'error' ? 'bg-black/90 border-bonchona-red text-bonchona-red' : 'bg-black/90 border-green-500 text-green-400'}`}>
            <span className="w-2 h-2 rounded-full animate-ping bg-current"></span>
            <p className="text-xs font-black uppercase tracking-widest leading-none">{statusMsg.text}</p>
          </div>
        )}

        {/* TAB 1: PROGRAMS */}
        {activeTab === 'programs' && (
          <div className="space-y-6">
            {!editingProgram && !isAdding ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-bonchona-red">Programas de la Radio</h2>
                  <button 
                    onClick={handleAddClick}
                    className="px-6 py-3 bg-white text-black font-black rounded-full hover:bg-bonchona-red hover:text-white transition-all uppercase tracking-widest text-[9px]"
                  >
                    + Agregar Programa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {programs.map((show) => (
                    <div key={show.id} className="glass rounded-3xl p-6 sm:p-8 flex gap-6 items-center border-white/5 hover:border-white/10 transition-all">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-950 border border-white/10">
                        <Image src={show.banner || "/logos-bonchona/92.png"} alt={show.title} fill className="object-cover" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <span className="text-bonchona-red text-[9px] font-black tracking-widest uppercase block mb-1">{show.time}</span>
                        <h3 className="text-lg sm:text-xl font-black truncate uppercase italic tracking-tight">{show.title}</h3>
                        <p className="text-zinc-500 text-[10px] font-bold truncate uppercase tracking-widest mt-1">Con: {show.locutor}</p>
                        
                        <div className="flex gap-4 mt-4">
                          <button
                            onClick={() => handleEditClick(show)}
                            className="text-[9px] font-black uppercase tracking-widest text-white hover:text-bonchona-red transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteProgram(show.id)}
                            className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-bonchona-red transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Add / Edit Form
              <div className="glass rounded-[2.5rem] p-8 sm:p-12 border-white/10 shadow-2xl">
                <h3 className="text-2xl font-black italic uppercase tracking-tight mb-8 text-bonchona-red">
                  {isAdding ? "Nuevo Programa" : `Editar: ${editingProgram?.title}`}
                </h3>

                <form onSubmit={handleSaveProgram} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Título del Programa *</label>
                      <input 
                        type="text" 
                        value={programForm.title || ''}
                        onChange={e => setProgramForm({...programForm, title: e.target.value})}
                        placeholder="Ej: Despertando con Venezuela"
                        className="p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Horario (Texto) *</label>
                      <input 
                        type="text" 
                        value={programForm.time || ''}
                        onChange={e => setProgramForm({...programForm, time: e.target.value})}
                        placeholder="Ej: 06:00 AM - 08:00 AM"
                        className="p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Locutor(es) *</label>
                      <input 
                        type="text" 
                        value={programForm.locutor || ''}
                        onChange={e => setProgramForm({...programForm, locutor: e.target.value})}
                        placeholder="Ej: Pedro Pérez y María Ruiz"
                        className="p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Precio Patrocinio En Vivo (En Euros) *</label>
                      <input 
                        type="number" 
                        value={programForm.price ?? 0}
                        onChange={e => setProgramForm({...programForm, price: Number(e.target.value)})}
                        placeholder="Ej: 350"
                        className="p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Ruta de Banner (O URL de imagen)</label>
                      <input 
                        type="text" 
                        value={programForm.banner || ''}
                        onChange={e => setProgramForm({...programForm, banner: e.target.value})}
                        placeholder="Ej: /programas/que_paso_ayer.png (Puedes dejar el valor por defecto)"
                        className="p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Descripción Larga del Programa</label>
                    <textarea 
                      value={programForm.description || ''}
                      onChange={e => setProgramForm({...programForm, description: e.target.value})}
                      placeholder="Escribe una descripción completa del contenido y propósito del programa..."
                      rows={4}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Frase Destacada (Para el detalle modal)</label>
                    <input 
                      type="text" 
                      value={programForm.richText || ''}
                      onChange={e => setProgramForm({...programForm, richText: e.target.value})}
                      placeholder="Ej: ¡Tu mañana ya no será igual!"
                      className="p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="px-8 py-4 bg-bonchona-red text-white font-black rounded-full hover:scale-105 transition-all uppercase tracking-widest text-[9px]"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelProgram}
                      className="px-8 py-4 glass text-zinc-400 hover:text-white font-black rounded-full transition-all uppercase tracking-widest text-[9px]"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RATES */}
        {activeTab === 'rates' && (
          <div className="glass rounded-[2.5rem] p-8 sm:p-12 border-white/10 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-bonchona-red mb-8">Tarifario de Publicidad Rotativa</h2>
            
            <div className="space-y-10">
              {rates.map((rate, rIdx) => (
                <div key={rIdx} className="space-y-4">
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">
                    Frecuencia: {rate.freq}
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rate.durations.map((dur, dIdx) => (
                      <div key={dIdx} className="flex flex-col gap-2 p-4 glass rounded-2xl border-white/5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Duración: {dur.time}</label>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 focus-within:border-bonchona-red transition-all">
                          <span className="text-zinc-600 font-bold mr-1">€</span>
                          <input 
                            type="number" 
                            value={dur.price}
                            onChange={e => handleRatePriceChange(rIdx, dIdx, Number(e.target.value))}
                            className="w-full py-3 bg-transparent border-none focus:outline-none text-sm font-bold text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="pt-6 border-t border-white/5">
                <button
                  onClick={handleSaveRates}
                  className="px-8 py-4 bg-bonchona-red text-white font-black rounded-full hover:scale-105 transition-all uppercase tracking-widest text-[9px]"
                >
                  Actualizar Tarifario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PREROLL */}
        {activeTab === 'preroll' && (
          <div className="glass rounded-[2.5rem] p-8 sm:p-12 border-white/10 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-bonchona-red mb-4">Comercial de Preroll</h2>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed mb-8 max-w-xl font-medium">
              Este archivo MP3 es el spot comercial corto que suena automáticamente la primera vez que un oyente hace clic en &quot;Escuchar en vivo&quot;.
            </p>

            <form onSubmit={handleUploadPreroll} className="space-y-8 max-w-md">
              <div className="flex flex-col gap-4">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Subir nuevo archivo MP3</label>
                
                <div className="relative border-2 border-dashed border-white/10 hover:border-bonchona-red/50 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group bg-white/5">
                  <input 
                    type="file" 
                    accept="audio/mpeg, audio/mp3" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎙️</span>
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">
                    {prerollFile ? prerollFile.name : "Seleccionar o arrastrar archivo MP3"}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-2">Max. tamaño recomendado: 5MB</span>
                </div>
              </div>

              {prerollStatus && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-bonchona-red animate-pulse"></span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">{prerollStatus}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="px-8 py-4 bg-bonchona-red text-white font-black rounded-full hover:scale-105 transition-all uppercase tracking-widest text-[9px] disabled:opacity-50 disabled:pointer-events-none"
              >
                {uploading ? "Subiendo comercial..." : "Subir Comercial MP3"}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
