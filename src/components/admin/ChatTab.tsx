'use client';

import { useState, useTransition } from 'react';
import { saveChatConfigAction, saveChatPinAction } from '@/app/admin/chat-actions';
import { CHAT_LIMITS, type ChatConfig, type ChatAuditEntry } from '@/lib/chat-client';

const field =
  'p-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none transition-all text-sm font-bold text-white placeholder-zinc-700';
const label = 'text-[9px] font-black uppercase tracking-widest text-zinc-500';
const card = 'glass rounded-[2.5rem] p-8 sm:p-12 border-white/10 shadow-2xl';

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Caracas',
  });
}

/** 480 -> "08:00". Las franjas se guardan en minutos desde medianoche. */
function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function timeToMin(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

const ACCION_LABEL: Record<string, string> = {
  delete: 'borró un mensaje',
  ban: 'expulsó',
  unban: 'readmitió',
  shadowban: 'silenció en la sombra',
  freeze: 'pausó el chat',
  unfreeze: 'reabrió el chat',
  clear: 'vació el chat',
  pin: 'fijó un mensaje',
  unpin: 'quitó el mensaje fijado',
};

interface Props {
  initialConfig: ChatConfig;
  initialPin: string;
  initialAudit: ChatAuditEntry[];
  showStatus: (text: string, type?: 'success' | 'error') => void;
}

export default function ChatTab({
  initialConfig,
  initialPin,
  initialAudit,
  showStatus,
}: Props) {
  const [config, setConfig] = useState<ChatConfig>(initialConfig);
  const [pin, setPin] = useState(initialPin);
  const [pending, startTransition] = useTransition();

  const patch = (changes: Partial<ChatConfig>) => setConfig((c) => ({ ...c, ...changes }));

  const save = (changes: Partial<ChatConfig>) => {
    startTransition(async () => {
      const res = await saveChatConfigAction({ ...config, ...changes });
      if (res.success && res.config) {
        // Se toma lo que devuelve el servidor, ya normalizado y acotado: si
        // pediste un aforo de 99.999 verás en pantalla el tope real.
        setConfig(res.config);
        showStatus('Configuración del chat guardada.');
      } else {
        showStatus(res.error ?? 'No se pudo guardar.', 'error');
      }
    });
  };

  const savePin = () => {
    startTransition(async () => {
      const res = await saveChatPinAction(pin);
      showStatus(
        res.success ? (pin.trim() ? 'Mensaje fijado.' : 'Mensaje fijado retirado.') : (res.error ?? 'Error'),
        res.success ? 'success' : 'error'
      );
    });
  };

  const addSlot = () => patch({ slots: [...config.slots, { startMin: 480, endMin: 1320 }] });
  const removeSlot = (i: number) => patch({ slots: config.slots.filter((_, x) => x !== i) });
  const editSlot = (i: number, changes: { startMin?: number; endMin?: number }) =>
    patch({ slots: config.slots.map((s, x) => (x === i ? { ...s, ...changes } : s)) });

  return (
    <div className="space-y-6">
      {/* --- Interruptor y horario --- */}
      <div className={card}>
        <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-bonchona-red mb-4">
          Chat en vivo
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed mb-8 max-w-xl font-medium">
          Enciende y apaga el chat de la barra de música sin tocar código. Al apagarlo, quien
          esté dentro sale al instante.
        </p>

        <div className="flex flex-wrap items-center gap-4 mb-8">
          <button
            type="button"
            disabled={pending}
            onClick={() => save({ enabled: !config.enabled })}
            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
              config.enabled
                ? 'bg-bonchona-red text-white shadow-[0_20px_40px_rgba(232,75,50,0.3)]'
                : 'bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {config.enabled ? 'Chat encendido' : 'Chat apagado'}
          </button>
          <p className="text-[11px] text-zinc-600 font-medium">
            {config.enabled
              ? 'El botón aparece en la barra de música.'
              : 'La barra queda como si el chat no existiera.'}
          </p>
        </div>

        <div className="border-t border-white/10 pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => save({ scheduleEnabled: !config.scheduleEnabled })}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                config.scheduleEnabled ? 'bg-bonchona-purple text-white' : 'bg-white/10 text-zinc-400'
              }`}
            >
              {config.scheduleEnabled ? 'Horario activo' : 'Sin horario'}
            </button>
            <p className="text-[11px] text-zinc-600 font-medium">
              Franjas en hora de Venezuela. Fuera de ellas el chat se cierra solo.
            </p>
          </div>

          {config.scheduleEnabled && (
            <div className="space-y-3">
              {config.slots.length === 0 && (
                <p className="text-[11px] text-amber-400 font-bold">
                  Sin franjas configuradas el chat permanece abierto. Añade al menos una.
                </p>
              )}
              {config.slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="time"
                    value={minToTime(slot.startMin)}
                    onChange={(e) => editSlot(i, { startMin: timeToMin(e.target.value) })}
                    className={`${field} py-2.5`}
                  />
                  <span className="text-zinc-600 font-black text-xs">a</span>
                  <input
                    type="time"
                    value={minToTime(slot.endMin)}
                    onChange={(e) => editSlot(i, { endMin: timeToMin(e.target.value) })}
                    className={`${field} py-2.5`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-bonchona-red transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className="flex gap-3">
                {config.slots.length < CHAT_LIMITS.maxSlots && (
                  <button
                    type="button"
                    onClick={addSlot}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Añadir franja
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save({})}
                  className="px-4 py-2 rounded-full bg-bonchona-red text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  Guardar franjas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Reglas de la sala --- */}
      <div className={card}>
        <h3 className="text-lg font-black italic uppercase tracking-tight text-white mb-6">
          Reglas de la sala
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col gap-2">
            <label className={label}>Modo lento (segundos)</label>
            <input
              type="number"
              min={CHAT_LIMITS.slowMs.min / 1000}
              max={CHAT_LIMITS.slowMs.max / 1000}
              value={Math.round(config.slowMs / 1000)}
              onChange={(e) => patch({ slowMs: Number(e.target.value) * 1000 })}
              className={field}
            />
            <p className="text-[10px] text-zinc-600 font-medium">
              Espera entre mensajes. Los moderadores no la tienen.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className={label}>Máximo de caracteres</label>
            <input
              type="number"
              min={CHAT_LIMITS.maxChars.min}
              max={CHAT_LIMITS.maxChars.max}
              value={config.maxChars}
              onChange={(e) => patch({ maxChars: Number(e.target.value) })}
              className={field}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={label}>Aforo máximo</label>
            <input
              type="number"
              min={CHAT_LIMITS.capacity.min}
              max={CHAT_LIMITS.capacity.max}
              value={config.capacity}
              onChange={(e) => patch({ capacity: Number(e.target.value) })}
              className={field}
            />
            <p className="text-[10px] text-zinc-600 font-medium">
              Por encima, la gente entra en cola.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Toggle
            on={config.autoSlow}
            onClick={() => patch({ autoSlow: !config.autoSlow })}
            label="Modo lento automático"
          />
          <Toggle
            on={config.blockLinks}
            onClick={() => patch({ blockLinks: !config.blockLinks })}
            label="Bloquear enlaces"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-2">
            <label className={label}>Palabras prohibidas</label>
            <textarea
              rows={4}
              value={config.blockedWords.join('\n')}
              onChange={(e) => patch({ blockedWords: e.target.value.split('\n') })}
              placeholder="Una por línea"
              className={`${field} resize-y`}
            />
            <p className="text-[10px] text-zinc-600 font-medium">
              Se comparan ignorando acentos, mayúsculas y números que imitan letras.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className={label}>Nombres reservados</label>
            <textarea
              rows={4}
              value={config.reservedNicks.join('\n')}
              onChange={(e) => patch({ reservedNicks: e.target.value.split('\n') })}
              placeholder="Una por línea"
              className={`${field} resize-y`}
            />
            <p className="text-[10px] text-zinc-600 font-medium">
              Nadie podrá usarlos. Los de la emisora no se pueden quitar.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => save({})}
          className="px-8 py-3 rounded-full bg-bonchona-red text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:scale-[1.02] transition-transform"
        >
          {pending ? 'Guardando…' : 'Guardar reglas'}
        </button>
      </div>

      {/* --- Mensaje fijado --- */}
      <div className={card}>
        <h3 className="text-lg font-black italic uppercase tracking-tight text-white mb-2">
          Mensaje fijado
        </h3>
        <p className="text-zinc-500 text-xs leading-relaxed mb-6 max-w-xl font-medium">
          Aparece arriba del chat para todo el mundo. Déjalo vacío para quitarlo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <input
            type="text"
            value={pin}
            maxLength={240}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Ej: Pide tu canción al 0414-4001071"
            className={`${field} flex-1`}
          />
          <button
            type="button"
            disabled={pending}
            onClick={savePin}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* --- Auditoría --- */}
      <div className={card}>
        <h3 className="text-lg font-black italic uppercase tracking-tight text-white mb-2">
          Registro de moderación
        </h3>
        <p className="text-zinc-500 text-xs leading-relaxed mb-6 max-w-xl font-medium">
          Últimas acciones. Se actualiza al recargar el panel.
        </p>

        {initialAudit.length === 0 ? (
          <p className="text-[11px] text-zinc-600 font-medium">Sin acciones registradas.</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {initialAudit.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 border-b border-white/5 text-[12px]"
              >
                <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
                  {fmtDate(entry.ts)}
                </span>
                <span className="font-black text-white">{entry.actor}</span>
                {entry.actorKind === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded-full bg-bonchona-purple/40 text-[8px] font-black uppercase tracking-widest text-white">
                    Panel
                  </span>
                )}
                <span className="text-zinc-400 font-medium">
                  {ACCION_LABEL[entry.action] ?? entry.action}
                </span>
                {entry.target && <span className="font-bold text-bonchona-red">{entry.target}</span>}
                {entry.detail && (
                  <span className="text-zinc-600 font-medium truncate">— {entry.detail}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label: text }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
        on ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-600'
      }`}
    >
      {on ? '✓ ' : ''}
      {text}
    </button>
  );
}
