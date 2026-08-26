import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/mocks/server";

// jsdom ships no SubtleCrypto, which lib/gravatar.ts needs to hash an address.
// Guarded, so it is a no-op anywhere `subtle` already exists.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// Radix's Select drives itself with Pointer Events and pointer capture, none of
// which jsdom implements — without these stubs the listbox never opens and the
// component is untestable. Harmless everywhere else.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
Element.prototype.scrollIntoView = () => {};

// Every route is real now, so the shared server starts with no handlers and each
// test registers the ones it needs.
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
