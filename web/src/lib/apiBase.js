// Production talks to the bounded agent service. Vite development stays same-origin
// so its proxy can reach the configured local service without browser CORS friction.
export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE || '')
