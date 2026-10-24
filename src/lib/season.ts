"use client";

import { useSyncExternalStore } from "react";
import { parseSeason, seasonForDate, SEASON_STORAGE_KEY, type Season } from "./season-calendar";

export type { Season } from "./season-calendar";
export { parseSeason } from "./season-calendar";

const EVENT = "season-change";

function readOverride(): Season | null {
  try {
    return parseSeason(sessionStorage.getItem(SEASON_STORAGE_KEY));
  } catch {
    return null;
  }
}

// Prioridad: parámetro de la URL > lo elegido antes en esta pestaña > fecha.
// Solo se guarda lo que viene de la URL; la temporada por fecha no se guarda,
// para que cambie sola cuando toca.
export function resolveSeason(param: string | null): Season {
  const fromUrl = parseSeason(param);
  if (fromUrl) {
    try {
      sessionStorage.setItem(SEASON_STORAGE_KEY, fromUrl);
    } catch {
      // Sin storage el override solo dura en esta página; no es grave.
    }
    return fromUrl;
  }
  return readOverride() ?? seasonForDate(new Date());
}

export function setSeason(season: Season) {
  if (season === "ninguna") delete document.documentElement.dataset.season;
  else document.documentElement.dataset.season = season;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function useSeason(): Season {
  return useSyncExternalStore(
    subscribe,
    () => parseSeason(document.documentElement.dataset.season) ?? "ninguna",
    () => "ninguna",
  );
}
