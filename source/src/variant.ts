/**
 * Two parallel versions of the prototype share one address: A, the locked
 * baseline, and B, where new changes go. Each is its own build, told which it
 * is through VITE_VARIANT. The org switcher in the left nav moves between them.
 */
export type Variant = "A" | "B";

export const VARIANT: Variant = import.meta.env.VITE_VARIANT === "B" ? "B" : "A";

export function switchVariant(v: Variant) {
  if (v === VARIANT) return;
  /* A host page that holds both builds (the single-file artifact) provides
     its own switch. On the hosted site, B lives in a "b" folder beside A. */
  const host = window as unknown as { __rbSwitchVariant?: (v: Variant) => void };
  if (host.__rbSwitchVariant) {
    host.__rbSwitchVariant(v);
    return;
  }
  window.location.href = v === "B" ? "b/" : "../";
}
