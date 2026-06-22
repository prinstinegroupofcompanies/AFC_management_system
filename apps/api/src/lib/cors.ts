const DEFAULT_ORIGINS = ['http://localhost:5173'];

export function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  return configured?.length ? configured : DEFAULT_ORIGINS;
}

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}
