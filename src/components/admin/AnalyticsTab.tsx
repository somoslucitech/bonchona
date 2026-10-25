'use client';

import type { AnalyticsSummary } from '@/lib/analytics';
import TimeSeriesChart, { type ChartPoint } from './TimeSeriesChart';

function StatTile({
  label, value, hint,
}: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-5 border-white/5">
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white mt-2 tabular-nums">{value}</p>
      {hint && <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-1.5">{hint}</p>}
    </div>
  );
}

function shortDay(day: string): string {
  const [, m, d] = day.split('-');
  return `${Number(d)}/${Number(m)}`;
}

function fullDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('es-VE', {
    weekday: 'short', day: 'numeric', month: 'long',
  });
}

// Nombres legibles para los canales que asigna traffic-source.ts. Un canal
// nuevo (p. ej. ?utm_source=concurso) se muestra tal cual.
const SOURCE_LABELS: Record<string, string> = {
  directo: 'Directo / sin referencia',
  fm: 'Al aire (bonchonaradio.com/envivo)',
  app: 'App instalada',
  google: 'Google',
  bing: 'Bing',
  buscadores: 'Otros buscadores',
  ia: 'Asistentes de IA',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X / Twitter',
  whatsapp: 'WhatsApp',
  directorios: 'Directorios de radio',
  'otros-sitios': 'Otros sitios',
};

function pct(part: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((part / total) * 100)}%`;
}

function agoLabel(ts: number | null): string {
  if (!ts) return 'sin muestras aún';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 2) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  return `hace ${h} h`;
}

export default function AnalyticsTab({ data }: { data: AnalyticsSummary }) {
  const { series, listenersNow, lastSampleAt, totals, sources, totalVisits, totalPlays } = data;

  const listenerPoints: ChartPoint[] = series.map((p) => ({
    label: shortDay(p.day),
    fullLabel: fullDay(p.day),
    values: [p.peak, p.avg],
  }));

  const visitPoints: ChartPoint[] = series.map((p) => ({
    label: shortDay(p.day),
    fullLabel: fullDay(p.day),
    values: [p.views, p.visitors],
  }));

  const noSamples = totals.sampleCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-bonchona-red mb-2">
          Métricas y Analíticas
        </h2>
        <p className="text-zinc-500 text-xs leading-relaxed max-w-2xl">
          Datos propios, en tiempo real. Los oyentes salen del contador del servidor de transmisión,
          así que incluyen a todo el que escucha (web, apps, cualquier reproductor), no solo desde el sitio.
        </p>
      </div>

      {/* Cifras de cabecera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Escuchando ahora"
          value={listenersNow === null ? '—' : String(listenersNow)}
          hint={agoLabel(lastSampleAt)}
        />
        <StatTile
          label="Pico histórico"
          value={String(totals.peakAllTime)}
          hint="oyentes a la vez"
        />
        <StatTile
          label="Visitantes hoy"
          value={String(totals.visitorsToday)}
          hint="personas únicas"
        />
        <StatTile
          label="Vistas hoy"
          value={String(totals.viewsToday)}
          hint="páginas cargadas"
        />
      </div>

      {noSamples && (
        <div className="glass rounded-2xl p-5 border-bonchona-red/20 flex items-start gap-4">
          <span className="w-2 h-2 rounded-full bg-bonchona-red animate-pulse mt-1.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">Aún no hay muestras de oyentes</p>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
              El medidor toma una muestra cada 5 minutos. Si acabas de desplegarlo, dale unos minutos.
              Las visitas empiezan a contarse desde la primera persona que entre al sitio.
            </p>
          </div>
        </div>
      )}

      <section className="glass rounded-2xl p-5 sm:p-6 border-white/5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">De dónde llegan · 30 días</h3>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed max-w-xl">
              Cada visita se asigna al canal que la trajo. &quot;Escucharon&quot; son las visitas que le dieron
              a play: el número que más importa para crecer en oyentes.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Visitas que escuchan</p>
            <p className="text-3xl font-black italic tracking-tighter text-bonchona-red tabular-nums">{pct(totalPlays, totalVisits)}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">{totalPlays} de {totalVisits}</p>
          </div>
        </div>

        {sources.length === 0 ? (
          <p className="text-[11px] text-zinc-500">
            Aún no hay datos: se empiezan a contar desde este despliegue, con la primera visita.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                  <th className="py-2 pr-4">Canal</th>
                  <th className="py-2 pr-4 text-right">Visitas</th>
                  <th className="py-2 pr-4 text-right">Escucharon</th>
                  <th className="py-2 text-right">% que escucha</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((r) => (
                  <tr key={r.source} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-4 text-white font-bold">{SOURCE_LABELS[r.source] ?? r.source}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-300">{r.visits}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-300">{r.plays}</td>
                    <td className="py-2.5 text-right tabular-nums text-bonchona-red font-bold">{pct(r.plays, r.visits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TimeSeriesChart
        title="Oyentes por día"
        subtitle="Personas conectadas al mismo tiempo"
        series={[{ key: 'peak', label: 'Pico' }, { key: 'avg', label: 'Promedio' }]}
        points={listenerPoints}
        emptyHint="Se llenará sola con las muestras del servidor de transmisión."
      />

      <TimeSeriesChart
        title="Visitas al sitio por día"
        subtitle="Personas que entran a la web"
        series={[{ key: 'views', label: 'Vistas' }, { key: 'visitors', label: 'Únicos' }]}
        points={visitPoints}
        emptyHint="Se cuenta desde el navegador, así que los robots no inflan el número."
      />
    </div>
  );
}
