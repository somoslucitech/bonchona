'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { NEWS_CATEGORIES, getCategory, type NewsCategorySlug } from '@/lib/news';
import type { AdminNewsPage, AdminArticleRow } from '@/lib/news-admin';
import {
  listNewsAction, toggleFeaturedAction, publishNowAction, unpublishAction,
  requeueAction, deleteArticleAction, saveQueueConfigAction,
} from '@/app/admin/news-actions';

type StatusFilter = 'all' | 'published' | 'queued' | 'draft' | 'discarded';

interface NewsTabProps {
  initialData: AdminNewsPage;
  initialQueue: { slotHours: number[]; horizonDays: number };
  showStatus: (text: string, type?: 'success' | 'error') => void;
}

function fmt(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-VE', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Caracas',
  });
}

function StatusBadge({ a }: { a: AdminArticleRow }) {
  if (a.status === 'discarded')
    return <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-700/40 text-zinc-400">Descartada</span>;
  if (a.status === 'draft')
    return <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">Borrador</span>;
  if (a.queued)
    return <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-bonchona-purple/30 text-bonchona-purple-medium">En cola</span>;
  return <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Publicada</span>;
}

export default function NewsTab({ initialData, initialQueue, showStatus }: NewsTabProps) {
  const [data, setData] = useState<AdminNewsPage>(initialData);
  const [status, setStatusFilter] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<NewsCategorySlug | 'all'>('all');
  const [search, setSearch] = useState('');
  const [pending, startTransition] = useTransition();

  const [queue, setQueue] = useState(initialQueue);
  const [showQueueConfig, setShowQueueConfig] = useState(false);

  const reload = (over: Partial<{ status: StatusFilter; category: NewsCategorySlug | 'all'; search: string; page: number }> = {}) => {
    const filters = {
      status: over.status ?? status,
      category: over.category ?? category,
      search: over.search ?? search,
      page: over.page ?? 1,
    };
    startTransition(async () => {
      const res = await listNewsAction(filters);
      if (res) setData(res);
    });
  };

  // Cada mutación recarga la página actual para reflejar el estado real del servidor.
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        showStatus(okMsg);
        const fresh = await listNewsAction({ status, category, search, page: data.page });
        if (fresh) setData(fresh);
      } else {
        showStatus(res.error || 'No se pudo completar la acción.', 'error');
      }
    });
  };

  const chip = (active: boolean) =>
    `px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-bonchona-red text-white' : 'glass text-zinc-400 hover:text-white border-white/10'
    }`;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          ['Publicadas', data.counts.published, 'text-green-400'],
          ['En cola', data.counts.queued, 'text-bonchona-purple-medium'],
          ['Borradores', data.counts.draft, 'text-zinc-400'],
          ['Descartadas', data.counts.discarded, 'text-zinc-500'],
        ] as const).map(([label, n, color]) => (
          <div key={label} className="glass rounded-2xl p-5 border-white/5">
            <p className={`text-3xl font-black italic tracking-tighter ${color}`}>{n}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Configuración de la cola */}
      <div className="glass rounded-[2rem] p-6 sm:p-8 border-white/10">
        <button
          onClick={() => setShowQueueConfig((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h3 className="text-base font-black uppercase italic tracking-tight text-bonchona-red">Cola de publicación</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              {queue.slotHours.length} al día ({queue.slotHours.map((h) => `${h}:00`).join(', ')}) · descarta a los {queue.horizonDays} días
            </p>
          </div>
          <span className="text-zinc-500 text-xl">{showQueueConfig ? '−' : '+'}</span>
        </button>

        {showQueueConfig && (
          <div className="mt-6 pt-6 border-t border-white/5 space-y-5">
            <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
              n8n sigue cargando noticias sin límite, pero salen al aire de a poco en estos horarios
              (hora de Venezuela). Si una noticia no alcanza turno dentro del horizonte, se marca como
              descartada en vez de acumularse: así nunca publicas notas musicales viejas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Horas de publicación (0-23, separadas por coma)</label>
                <input
                  type="text"
                  defaultValue={queue.slotHours.join(', ')}
                  onBlur={(e) => setQueue({ ...queue, slotHours: e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)) })}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none text-sm font-bold text-white"
                />
              </div>
              <div className="flex flex-col gap-2 sm:w-48">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Horizonte (días)</label>
                <input
                  type="number" min={1} max={60}
                  defaultValue={queue.horizonDays}
                  onBlur={(e) => setQueue({ ...queue, horizonDays: Number(e.target.value) })}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none text-sm font-bold text-white"
                />
              </div>
            </div>
            <button
              onClick={() => startTransition(async () => {
                const res = await saveQueueConfigAction(queue.slotHours, queue.horizonDays);
                showStatus(res.success ? 'Cola actualizada.' : (res.error ?? 'Error'), res.success ? 'success' : 'error');
              })}
              className="px-6 py-3 bg-bonchona-red text-white font-black rounded-full uppercase tracking-widest text-[9px]"
            >
              Guardar cola
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {([['all', 'Todas'], ['published', 'Publicadas'], ['queued', 'En cola'], ['draft', 'Borradores'], ['discarded', 'Descartadas']] as const).map(([v, label]) => (
            <button key={v} onClick={() => { setStatusFilter(v); reload({ status: v }); }} className={chip(status === v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setCategory('all'); reload({ category: 'all' }); }} className={chip(category === 'all')}>
            Toda categoría
          </button>
          {NEWS_CATEGORIES.map((c) => (
            <button key={c.slug} onClick={() => { setCategory(c.slug); reload({ category: c.slug }); }} className={chip(category === c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') reload({ search }); }}
            placeholder="Buscar por título o contenido…"
            className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none text-sm font-bold text-white placeholder-zinc-700"
          />
          <button onClick={() => reload({ search })} className="px-6 py-3 glass rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white border-white/10">
            Buscar
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className={`space-y-3 transition-opacity ${pending ? 'opacity-50' : ''}`}>
        {data.items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border-white/5">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Sin noticias para este filtro.</p>
          </div>
        ) : (
          data.items.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-4 sm:p-5 border-white/5 hover:border-white/10 transition-all flex gap-4 items-start">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-950 border border-white/10">
                <Image src={a.image || '/logos-bonchona/92.png'} alt="" fill className="object-cover" sizes="80px" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <StatusBadge a={a} />
                  {a.featured && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-bonchona-red/20 text-bonchona-red">Destacada</span>
                  )}
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
                    {getCategory(a.category)?.name}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">{a.title}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mt-1.5">
                  {a.queued ? `Sale el ${fmt(a.publishedAt)}` : fmt(a.publishedAt)}
                </p>

                <div className="flex flex-wrap gap-3 mt-3">
                  {a.status === 'published' && !a.queued && (
                    <a href={`/noticias/${a.slug}`} target="_blank" rel="noreferrer"
                      className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                      Ver
                    </a>
                  )}
                  <button onClick={() => run(() => toggleFeaturedAction(a.id, !a.featured), a.featured ? 'Quitada de destacadas.' : 'Marcada como destacada.')}
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-bonchona-red transition-colors">
                    {a.featured ? 'Quitar destacada' : 'Destacar'}
                  </button>
                  {(a.queued || a.status === 'draft') && (
                    <button onClick={() => run(() => publishNowAction(a.id), 'Publicada.')}
                      className="text-[9px] font-black uppercase tracking-widest text-green-400 hover:text-white transition-colors">
                      Publicar ya
                    </button>
                  )}
                  {a.status === 'published' && (
                    <button onClick={() => run(() => unpublishAction(a.id), 'Devuelta a borrador.')}
                      className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                      Despublicar
                    </button>
                  )}
                  {a.status === 'discarded' && (
                    <button onClick={() => run(() => requeueAction(a.id), 'Reagendada en la cola.')}
                      className="text-[9px] font-black uppercase tracking-widest text-bonchona-purple-medium hover:text-white transition-colors">
                      Reagendar
                    </button>
                  )}
                  <button onClick={() => {
                      if (!confirm(`¿Eliminar "${a.title}"? Esta acción no se puede deshacer.`)) return;
                      run(() => deleteArticleAction(a.id), 'Noticia eliminada.');
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-bonchona-red transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            disabled={data.page <= 1}
            onClick={() => reload({ page: data.page - 1 })}
            className="px-5 py-2.5 glass rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none border-white/10"
          >
            ← Anterior
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {data.page} / {data.totalPages} · {data.total} noticias
          </span>
          <button
            disabled={data.page >= data.totalPages}
            onClick={() => reload({ page: data.page + 1 })}
            className="px-5 py-2.5 glass rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none border-white/10"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
