const DEFAULT_ORIGINS = ['http://localhost:5173'];

export function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  return configured?.length ? [...configured, ...DEFAULT_ORIGINS] : DEFAULT_ORIGINS;
}

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true;

  if (getAllowedOrigins().includes(origin)) return true;

  // Vercel production and preview deployments
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;

  return false;
}
