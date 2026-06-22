const DEFAULT_ORIGINS = ['http://localhost:5173'];

export function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  return configured?.length ? [...configured, ...DEFAULT_ORIGINS] : DEFAULT_ORIGINS;
}

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true;

  if (getAllowedOrigins().includes(origin)) return true;

  // Vercel production, preview, and team deployments
  if (origin.startsWith('https://') && origin.endsWith('.vercel.app')) return true;

  return false;
}
