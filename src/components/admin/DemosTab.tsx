'use client';

import { useState, useTransition } from 'react';
import { DEMO_STATUSES, formatBytes, type Demo, type DemoPage, type DemoStatus } from '@/lib/demos';
import { listDemosAction, setDemoStatusAction, deleteDemoAction } from '@/app/admin/demo-actions';

const STATUS_STYLE: Record<DemoStatus, string> = {
  nuevo: 'bg-bonchona-red/20 text-bonchona-red',
  escuchado: 'bg-white/10 text-zinc-300',
  aprobado: 'bg-green-500/20 text-green-400',
  descartado: 'bg-zinc-700/40 text-zinc-500',
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString('es-VE', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Caracas',
  });
}

function DemoRow({
  demo, onChange, showStatus,
}: {
  demo: Demo;
  onChange: () => void;
  showStatus: (t: string, type?: 'success' | 'error') => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const setStatus = (status: DemoStatus) => {
    startTransition(async () => {
      const res = await setDemoStatusAction(demo.id, status);
      if (res.success) { showStatus(`Marcado como ${status}.`); onChange(); }
      else showStatus(res.error ?? 'Error', 'error');
    });
  };

  const remove = () => {
    if (!confirm(`¿Eliminar el demo de ${demo.artistName}? Se borra también el audio.`)) return;
    startTransition(async () => {
      const res = await deleteDemoAction(demo.id);
      if (res.success) { showStatus('Demo eliminado.'); onChange(); }
      else showStatus(res.error ?? 'Error', 'error');
    });
  };

  return (
    <div className={`glass rounded-2xl border-white/5 overflow-hidden transition-opacity ${pending ? 'opacity-50' : ''}`}>
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_STYLE[demo.status]}`}>
              {DEMO_STATUSES.find((s) => s.value === demo.status)?.label}
            </span>
            {demo.genre && (
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{demo.genre}</span>
            )}
            {demo.city && (
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">· {demo.city}</span>
            )}
          </div>
          <h4 className="text-sm font-black uppercase italic tracking-tight text-white truncate">
            {demo.artistName} — {demo.trackTitle}
          </h4>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mt-1">
            {fmtDate(demo.createdAt)} · {formatBytes(demo.fileSize)}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <a
            href={`/api/demos/${demo.id}/download`}
            className="px-5 py-2.5 bg-bonchona-red text-white font-black rounded-full uppercase tracking-widest text-[9px] hover:scale-105 transition-transform"
          >
            Descargar
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
          >
            {open ? 'Ocultar' : 'Detalles'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 p-5 bg-black/20 space-y-4">
          {/* Reproductor: escuchar sin tener que descargar */}
          <audio controls preload="none" src={`/api/demos/${demo.id}/download`} className="w-full h-10" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <Detail label="Nombre real" value={`${demo.firstName} ${demo.lastName}`} />
            <Detail label="Correo" value={demo.email} href={`mailto:${demo.email}`} />
            {demo.whatsapp && (
              <Detail
                label="WhatsApp" value={demo.whatsapp}
                href={`https://wa.me/${demo.whatsapp.replace(/\D/g, '')}`}
              />
            )}
            {demo.instagram && (
              <Detail
                label="Instagram" value={demo.instagram}
                href={`https://instagram.com/${demo.instagram.replace(/^@/, '')}`}
              />
            )}
            {demo.spotify && <Detail label="Spotify" value={demo.spotify} href={demo.spotify} />}
            <Detail label="Archivo" value={demo.fileName} />
            <Detail
              label="Derechos"
              value={demo.rightsConfirmed ? 'Declaró ser el autor' : 'NO confirmado'}
            />
          </div>

          {demo.message && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Mensaje del artista</p>
              <p className="text-xs text-zinc-400 leading-relaxed italic">{demo.message}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {DEMO_STATUSES.filter((s) => s.value !== demo.status).map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className="px-4 py-2 glass rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white border-white/10 transition-colors"
              >
                Marcar {s.label}
              </button>
            ))}
            <button
              onClick={remove}
              className="px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-bonchona-red transition-colors ml-auto"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 flex-shrink-0 w-24 pt-0.5">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-bonchona-red transition-colors break-all">
          {value}
        </a>
      ) : (
        <span className="text-zinc-300 break-all">{value}</span>
      )}
    </div>
  );
}

export default function DemosTab({
  initialData, showStatus,
}: {
  initialData: DemoPage;
  showStatus: (t: string, type?: 'success' | 'error') => void;
}) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<DemoStatus | 'all'>('all');
  const [, startTransition] = useTransition();

  const reload = (status = filter, page = data.page) => {
    startTransition(async () => {
      const res = await listDemosAction({ status, page });
      if (res) setData(res);
    });
  };

  const chip = (active: boolean) =>
    `px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-bonchona-red text-white' : 'glass text-zinc-400 hover:text-white border-white/10'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-bonchona-red mb-2">
          Zona de Talento
        </h2>
        <p className="text-zinc-500 text-xs leading-relaxed max-w-2xl">
          Demos que mandan los músicos desde la página de publicidad. Puedes escucharlos aquí mismo
          o descargarlos. Los audios son privados: solo se abren con sesión del panel.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_STATUSES.map((s) => (
          <div key={s.value} className="glass rounded-2xl p-5 border-white/5">
            <p className="text-3xl font-black italic tracking-tighter text-white tabular-nums">{data.counts[s.value]}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setFilter('all'); reload('all', 1); }} className={chip(filter === 'all')}>Todos</button>
        {DEMO_STATUSES.map((s) => (
          <button key={s.value} onClick={() => { setFilter(s.value); reload(s.value, 1); }} className={chip(filter === s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {data.items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border-white/5">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
              Todavía no hay demos por aquí
            </p>
          </div>
        ) : (
          data.items.map((d) => (
            <DemoRow key={d.id} demo={d} onChange={() => reload()} showStatus={showStatus} />
          ))
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={data.page <= 1}
            onClick={() => reload(filter, data.page - 1)}
            className="px-5 py-2.5 glass rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none border-white/10"
          >
            ← Anterior
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {data.page} / {data.totalPages} · {data.total} demos
          </span>
          <button
            disabled={data.page >= data.totalPages}
            onClick={() => reload(filter, data.page + 1)}
            className="px-5 py-2.5 glass rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none border-white/10"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
