/**
 * No handlers. The contract-first `/users` seam lived here until the backend
 * shipped the real roster; every route this app calls is now real, and tests
 * register what they need per-case with `server.use(...)`.
 *
 * `mocks/server.ts` stays because the whole test suite starts MSW through it.
 */
export const handlers = [];
