// Isomorphic: built in the browser when the owner taps "Compartir".

type InviteMessageInput = {
  /** Formatted code, as shown on screen ("ABCDE-FGHJK"). */
  code: string;
  /** The app's origin. */
  appUrl: string;
};

/**
 * Text for the share sheet. The code travels as plain text, never inside the
 * URL: it is a bearer credential, and URLs end up in browser histories and
 * server logs (ADR-043, decision 034).
 */
export function buildInviteMessage({
  code,
  appUrl,
}: InviteMessageInput): string {
  return `Únete a nuestra familia en Métricas Bebé: entra en ${appUrl} con tu email, pulsa «Tengo un código» y escribe ${code}. Caduca en 24 horas.`;
}
