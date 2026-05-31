const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * Monta URL de imagem sempre com a API configurada no app (.env).
 * Aceita caminho relativo (/storage/...) ou URL antiga com outro IP/host.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/storage/')) {
    return `${API_URL}${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/storage/')) {
        return `${API_URL}${parsed.pathname}`;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_URL}${path}`;
}
