'use server';

import { getSession } from "@/lib/auth";
import {
  listDemos, updateDemoStatus, deleteDemo,
  type DemoStatus,
} from "@/lib/demos";

export async function listDemosAction(filters: { status?: DemoStatus | "all"; page?: number }) {
  const session = await getSession();
  if (!session) return null;
  return listDemos(filters);
}

export async function setDemoStatusAction(id: string, status: DemoStatus, notes?: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };
  const ok = await updateDemoStatus(id, status, notes);
  return ok ? { success: true } : { success: false, error: "No se pudo actualizar." };
}

export async function deleteDemoAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };
  const ok = await deleteDemo(id);
  return ok ? { success: true } : { success: false, error: "No se pudo eliminar." };
}
