/**
 * Generates a unique identifier.
 * Uses crypto.randomUUID() if available (secure contexts like localhost/HTTPS).
 * Falls back to a Math.random() based generator for insecure contexts (like accessing via IP over HTTP).
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for non-secure contexts (IP access over HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};









