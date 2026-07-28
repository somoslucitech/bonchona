import { getCloudflareEnv } from "./cf-env";

export interface Program {
  id: string;
  time: string;
  title: string;
  locutor: string;
  banner: string;
  description: string;
  richText: string;
  price?: number; // Precio de mención en vivo
}

// Seed Data
export const DEFAULT_PROGRAMS: Program[] = [
  {
    id: 'que-paso-ayer',
    time: "08:00 AM - 10:00 AM",
    title: "¿Qué pasó ayer?",
    locutor: "Alejandra Melian y Alejandro Rodríguez",
    banner: "/programas/que_paso_ayer.png",
    description: "¿Qué pasó ayer? es tu magazine matutino definitivo, liderado por el carisma de Alejandra Melian y Alejandro Rodríguez. Despierta con el pulso vibrante de la farándula, las noticias de actualidad más impactantes y un análisis entretenido de lo que realmente importa. El programa ideal para empezar el día con energía, bien informado y con la dosis perfecta de picardía que solo Bonchona te ofrece.",
    richText: "Tu mañana ya no será igual. Sintoniza un espacio donde la actualidad se encuentra con el entretenimiento puro. Noticias, tendencias y la mejor compañía para que no te pierdas de nada.",
    price: 350
  },
  {
    id: 'concursos-y-variedades',
    time: "10:00 AM - 12:00 PM",
    title: "Mucha People",
    locutor: "Eduardo Rod y Víctor Matite",
    banner: "/programas/mucha_pipol.png",
    description: "La alegría se apodera de tus mañanas en Mucha People, el corazón de Concursos y Variedades. Eduardo Rod y Víctor Matite transforman tu radio en una fiesta interactiva llena de juegos dinámicos, entrevistas exclusivas con tus artistas favoritos y sorpresas que te mantendrán pegado al dial. Es el espacio donde el protagonista eres tú, con la mejor energía de Valencia de lunes a viernes.",
    richText: "De 10 a 12, vive la experiencia Mucha People. Risas, premios y la conexión total con la gente que hace del centro del país un lugar bonchón.",
    price: 200
  },
  {
    id: 'te-lo-dije',
    time: "01:00 PM - 03:00 PM",
    title: "¡Te lo dije!",
    locutor: "Paola Meza y Richhel Aponte",
    banner: "/programas/te_lo_dije.png",
    description: "¡Te lo dije! es el punto de encuentro donde Paola Meza y Richhel Aponte te ponen al día con todo lo que necesitas saber. Desde los datos curiosos más asombrosos hasta la información deportiva más relevante a nivel regional, nacional e internacional. Un espacio ágil, inteligente y con mucha personalidad que marca la pauta informativa de tus tardes, de lunes a viernes por Bonchona 107.1 FM.",
    richText: "Entérate de todo antes que nadie. Deportes, curiosidades y el análisis fresco que estabas buscando para tus mediodías.",
    price: 200
  },
  {
    id: 'favoritas-107',
    time: "04:00 PM - 06:00 PM",
    title: "Favoritas 107",
    locutor: "Carlos Briceño Jr.",
    banner: "/programas/favoritas.png",
    description: "Favoritas 107 es el resumen musical de mayor impacto en el país, conducido por Carlos Briceño Jr. Sumérgete en un viaje por los éxitos más recientes y lo más sonado en el panorama musical global. Con una selección curada para los oídos más exigentes, este espacio es el refugio perfecto para los amantes del buen ritmo. Disfruta de 4 a 6 de la tarde de la mejor selección musical en un solo lugar, con el sello de calidad Briceño.",
    richText: "El conteo más esperado del día. Los hits que dominan las listas mundiales suenan primero y mejor en tus Favoritas 107.",
    price: 350
  }
];

interface ProgramRow {
  id: string;
  sort_order: number;
  time: string;
  title: string;
  locutor: string;
  banner: string;
  description: string;
  rich_text: string;
  price: number | null;
}

function mapProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    time: row.time,
    title: row.title,
    locutor: row.locutor,
    banner: row.banner,
    description: row.description,
    richText: row.rich_text,
    price: row.price ?? undefined,
  };
}

interface LocalFileDbInfo {
  fs: typeof import('fs');
  filePath: string;
}

// Helper to check runtime & require fs dynamically in Node
async function getLocalFileDb(): Promise<LocalFileDbInfo | null> {
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'local_db.json');
      return { fs, filePath };
    } catch {
      return null;
    }
  }
  return null;
}

// In-Memory mock database fallback for edge runtime when D1 is not bound (e.g. preview)
const memoryStore: { programs?: Program[] } = {};

export async function getPrograms(): Promise<Program[]> {
  const env = getCloudflareEnv();
  if (env?.DB) {
    try {
      const { results } = await env.DB.prepare("SELECT * FROM programs ORDER BY sort_order ASC").all<ProgramRow>();
      if (results && results.length > 0) return results.map(mapProgram);
      // Seed default data if the table is empty
      await savePrograms(DEFAULT_PROGRAMS);
      return DEFAULT_PROGRAMS;
    } catch (e) {
      console.warn("D1 no disponible para programas, usando fallback local:", e);
    }
  }

  // Local File Fallback (Node.js runtime in local dev)
  const localDb = await getLocalFileDb();
  if (localDb) {
    const { fs, filePath } = localDb;
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (fileContent && fileContent.trim()) {
          const db = JSON.parse(fileContent);
          if (db.programs) return db.programs;
        }
      } catch (e) {
        console.error("Error reading/parsing local db file:", e);
      }
    }
    // Seed local file
    try {
      let db: Record<string, unknown> = {};
      if (fs.existsSync(filePath)) {
        try {
          db = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
        } catch {}
      }
      db.programs = DEFAULT_PROGRAMS;
      fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
      console.error("Error writing local db file:", e);
    }
    return DEFAULT_PROGRAMS;
  }

  // Memory Fallback
  if (memoryStore.programs) return memoryStore.programs;
  return DEFAULT_PROGRAMS;
}

export async function savePrograms(programs: Program[]): Promise<boolean> {
  const env = getCloudflareEnv();
  if (env?.DB) {
    try {
      const statements = [
        env.DB.prepare("DELETE FROM programs"),
        ...programs.map((p, i) =>
          env.DB.prepare(
            "INSERT INTO programs (id, sort_order, time, title, locutor, banner, description, rich_text, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          ).bind(p.id, i, p.time, p.title, p.locutor, p.banner, p.description, p.richText, p.price ?? null)
        ),
      ];
      await env.DB.batch(statements);
      return true;
    } catch (e) {
      console.error("Error saving programs to D1:", e);
      return false;
    }
  }

  // Local File Fallback (Node.js runtime in local dev)
  const localDb = await getLocalFileDb();
  if (localDb) {
    const { fs, filePath } = localDb;
    let db: Record<string, unknown> = {};
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content && content.trim()) db = JSON.parse(content);
      } catch {}
    }
    db.programs = programs;
    try {
      fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error("Error writing local db file:", e);
      return false;
    }
  }

  // Memory Fallback
  memoryStore.programs = programs;
  return true;
}
