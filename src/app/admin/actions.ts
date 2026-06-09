'use server';

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { savePrograms, saveRotativeRates, Program, RotativeRate } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// Safe helper to obtain Cloudflare env binding
function getCloudflareEnv() {
  try {
    const context = getCloudflareContext();
    return context?.env;
  } catch {
    return null;
  }
}

// Session verification helper for server actions
async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "authenticated";
}

export async function loginAdminAction(password: string) {
  const env = getCloudflareEnv();
  const correctPassword = env?.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "BonchonaAdmin2026";
  
  if (password === correctPassword) {
    const cookieStore = await cookies();
    cookieStore.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: true,
      path: "/admin",
      maxAge: 60 * 60 * 24 // 24 hours
    });
    return { success: true };
  }
  
  return { success: false, error: "Contraseña incorrecta." };
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return { success: true };
}

export async function checkAdminSessionAction() {
  return await verifySession();
}

export async function saveProgramsAction(programs: Program[]) {
  // Security check: Block unauthorized database updates
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) {
    console.warn("Block unauthorized saveProgramsAction call");
    return false;
  }

  const ok = await savePrograms(programs);
  if (ok) {
    revalidatePath("/");
    revalidatePath("/famoso");
  }
  return ok;
}

export async function saveRatesAction(rates: RotativeRate[]) {
  // Security check: Block unauthorized database updates
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) {
    console.warn("Block unauthorized saveRatesAction call");
    return false;
  }

  const ok = await saveRotativeRates(rates);
  if (ok) {
    revalidatePath("/famoso");
  }
  return ok;
}

export async function uploadPrerollAction(formData: FormData) {
  // Security check: Block unauthorized file uploads
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) {
    console.warn("Block unauthorized uploadPrerollAction call");
    return { success: false, error: "Acceso no autorizado." };
  }

  try {
    const file = formData.get("preroll") as File;
    if (!file || file.size === 0) return { success: false, error: "No se seleccionó ningún archivo." };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to Cloudflare R2 in production
    const env = getCloudflareEnv();
    if (env?.PREROLL_BUCKET) {
      await env.PREROLL_BUCKET.put("preroll.mp3", buffer, {
        httpMetadata: { contentType: "audio/mpeg" }
      });
      return { success: true };
    }

    // Save to local file in local development (Node runtime)
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.join(process.cwd(), 'public', 'local-preroll.mp3');
        fs.writeFileSync(localPath, buffer);
        console.log("Saved local preroll fallback to:", localPath);
        return { success: true, localDev: true };
      } catch (e) {
        console.error("Local file save error:", e);
      }
    }
    
    return { success: true, warning: "Guardado en modo simulación (R2 no disponible)" };
  } catch (e: unknown) {
    console.error("Upload error:", e);
    const errorMsg = e instanceof Error ? e.message : "Error al subir el archivo.";
    return { success: false, error: errorMsg };
  }
}
