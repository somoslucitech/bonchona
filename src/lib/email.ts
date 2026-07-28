import { getCloudflareEnv } from "./cf-env";
import type { UserRole } from "./users";

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  role: UserRole
): Promise<{ ok: boolean; error?: string }> {
  const env = getCloudflareEnv();
  const apiKey = env?.RESEND_API_KEY || process.env.RESEND_API_KEY;
  const from = env?.EMAIL_FROM || process.env.EMAIL_FROM || "Bonchona Radio <no-reply@bonchonaradio.com>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada; no se pudo enviar el email de invitación.");
    return { ok: false, error: "Servicio de email no configurado (falta RESEND_API_KEY)." };
  }

  const roleLabel = role === "owner" ? "Administrador" : "Editor";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Invitación al Panel Control de Radio Bonchona",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color:#E84B32;">Panel Control &middot; Radio Bonchona</h2>
            <p>Te han invitado a colaborar en el panel de administración de Radio Bonchona 107.1 con el rol de <strong>${roleLabel}</strong>.</p>
            <p>Para activar tu cuenta, inicia sesión con tu cuenta de Google asociada a este correo:</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background:#E84B32; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Aceptar invitación</a>
            </p>
            <p style="color:#888; font-size:12px;">Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend error:", res.status, body);
      return { ok: false, error: "El servicio de email rechazó el envío." };
    }
    return { ok: true };
  } catch (e) {
    console.error("Error enviando email de invitación:", e);
    return { ok: false, error: "Error de red al enviar el email." };
  }
}
