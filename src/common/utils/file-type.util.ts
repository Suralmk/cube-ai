const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/json': 'json',
};

export function getExtensionFromMimeType(mimeType: string): string | undefined {
  return MIME_EXTENSION_MAP[mimeType];
}

export function isAllowedMimeType(
  mimeType: string,
  allowed: string[],
): boolean {
  return allowed.includes(mimeType);
}
