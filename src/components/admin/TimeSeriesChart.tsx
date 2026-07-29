'use client';

import { useState, useMemo, useRef } from 'react';

/**
 * Gráfica de líneas en SVG, sin librerías.
 *
 * Paleta validada con el script de la guía de dataviz contra el fondo del
 * panel (#0A0B1E, modo oscuro): CVD ΔE 26.3 entre las dos series y contraste
 * ≥3:1 en ambas. No cambiar los colores sin volver a validarlos.
 */
export const SERIES_COLORS = ['#E84B32', '#B563E8'] as const;

const SURFACE = '#0A0B1E';

export interface SeriesDef {
  key: string;
  label: string;
}

export interface ChartPoint {
  label: string;          // etiqueta del eje X (fecha corta)
  fullLabel: string;      // etiqueta completa para el tooltip
  values: number[];       // un valor por serie, en el orden de `series`
}

interface Props {
  title: string;
  subtitle?: string;
  series: SeriesDef[];
  points: ChartPoint[];
  /** Formatea el valor en tooltip y eje. */
  format?: (n: number) => string;
  emptyHint?: string;
}

const W = 760;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 30, left: 44 };

/** Redondea el techo del eje a un número limpio. */
function niceMax(max: number): number {
  if (max <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

export default function TimeSeriesChart({
  title, subtitle, series, points, format = (n) => String(n), emptyHint,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const hasData = points.some((p) => p.values.some((v) => v > 0));

  const { max, xFor, yFor, paths } = useMemo(() => {
    const rawMax = Math.max(1, ...points.flatMap((p) => p.values));
    const max = niceMax(rawMax);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const n = Math.max(1, points.length - 1);

    const xFor = (i: number) => PAD.left + (i / n) * innerW;
    const yFor = (v: number) => PAD.top + innerH - (v / max) * innerH;

    const paths = series.map((_, si) =>
      points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.values[si] ?? 0).toFixed(1)}`)
        .join(' ')
    );

    return { max, xFor, yFor, paths };
  }, [points, series]);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  // Etiquetas del eje X espaciadas para que no colisionen.
  const xLabelEvery = Math.max(1, Math.ceil(points.length / 8));

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const innerW = W - PAD.left - PAD.right;
    const ratio = Math.min(1, Math.max(0, (x - PAD.left) / innerW));
    setHover(Math.round(ratio * (points.length - 1)));
  };

  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="glass rounded-[2rem] p-6 sm:p-8 border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tight text-white">{title}</h3>
          {subtitle && <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">{subtitle}</p>}
        </div>

        {/* Leyenda: identidad nunca depende solo del color, siempre lleva texto. */}
        <div className="flex items-center gap-4">
          {series.map((s, i) => (
            <span key={s.key} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                aria-hidden
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Sin datos todavía</p>
          {emptyHint && <p className="text-zinc-600 text-[10px] mt-2 max-w-sm leading-relaxed">{emptyHint}</p>}
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label={`${title}. ${series.map((s) => s.label).join(' y ')}.`}
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          >
            {/* Rejilla: hairline sólida, recesiva */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left} x2={W - PAD.right}
                  y1={yFor(t)} y2={yFor(t)}
                  stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1}
                />
                <text
                  x={PAD.left - 8} y={yFor(t) + 3}
                  textAnchor="end" fontSize={10} fill="#71717a"
                  fontWeight={700}
                >
                  {format(t)}
                </text>
              </g>
            ))}

            {/* Etiquetas del eje X */}
            {points.map((p, i) =>
              i % xLabelEvery === 0 ? (
                <text
                  key={i} x={xFor(i)} y={H - 10}
                  textAnchor="middle" fontSize={10} fill="#71717a" fontWeight={700}
                >
                  {p.label}
                </text>
              ) : null
            )}

            {/* Relleno de área al 10% + línea de 2px */}
            {series.map((_, si) => {
              const color = SERIES_COLORS[si % SERIES_COLORS.length];
              const area = `${paths[si]} L ${xFor(points.length - 1)} ${yFor(0)} L ${xFor(0)} ${yFor(0)} Z`;
              return (
                <g key={si}>
                  <path d={area} fill={color} fillOpacity={0.1} />
                  <path
                    d={paths[si]} fill="none" stroke={color}
                    strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Crosshair + puntos con anillo del color del fondo */}
            {hover !== null && hp && (
              <g>
                <line
                  x1={xFor(hover)} x2={xFor(hover)}
                  y1={PAD.top} y2={H - PAD.bottom}
                  stroke="#ffffff" strokeOpacity={0.25} strokeWidth={1}
                />
                {series.map((_, si) => (
                  <circle
                    key={si}
                    cx={xFor(hover)} cy={yFor(hp.values[si] ?? 0)} r={4.5}
                    fill={SERIES_COLORS[si % SERIES_COLORS.length]}
                    stroke={SURFACE} strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Tooltip fuera del SVG, para poder usar tipografía del sitio */}
          <div className="mt-4 min-h-[52px]">
            {hp ? (
              <div className="inline-flex flex-col gap-1.5 px-4 py-3 rounded-xl bg-black/60 border border-white/10">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{hp.fullLabel}</span>
                <div className="flex gap-5">
                  {series.map((s, si) => (
                    <span key={s.key} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: SERIES_COLORS[si % SERIES_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="text-xs font-bold text-white">{format(hp.values[si] ?? 0)}</span>
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500">{s.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold pt-3">
                Pasa el cursor sobre la gráfica para ver el detalle
              </p>
            )}
          </div>

          {/* Vista de tabla: los datos nunca quedan detrás del color */}
          <button
            onClick={() => setShowTable((v) => !v)}
            className="mt-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            {showTable ? 'Ocultar tabla' : 'Ver como tabla'}
          </button>

          {showTable && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">Día</th>
                    {series.map((s) => (
                      <th key={s.key} className="text-right py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map((p, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-1.5 text-zinc-400">{p.fullLabel}</td>
                      {p.values.map((v, vi) => (
                        <td key={vi} className="py-1.5 text-right text-white font-bold tabular-nums">{format(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
