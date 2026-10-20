/**
 * Parallel versions of the prototype share one address: A, the locked
 * baseline, and the alternatives B, C and D. Each is its own build, told which it
 * is through VITE_VARIANT. The org switcher in the left nav moves between them.
 */
export type Variant = "A" | "B" | "C" | "D";

export const VARIANTS: Variant[] = ["A", "B", "C", "D"];

/** What each version is called in the org menu. */
export const VARIANT_LABEL: Record<Variant, string> = {
  A: "A: Parameters V0",
  B: "B: Parameters V2",
  C: "C: New audience + elicitation rethink",
  D: "D: Elicitation waiting states",
};

const env = import.meta.env.VITE_VARIANT;
export const VARIANT: Variant = env === "B" || env === "C" || env === "D" ? env : "A";

export function switchVariant(v: Variant) {
  if (v === VARIANT) return;
  /* A host page that holds every build (the single-file artifact) provides
     its own switch. On the hosted site, B, C and D live in folders beside A. */
  const host = window as unknown as { __rbSwitchVariant?: (v: Variant) => void };
  if (host.__rbSwitchVariant) {
    host.__rbSwitchVariant(v);
    return;
  }
  const root = VARIANT === "A" ? "" : "../";
  window.location.href = v === "A" ? root || "./" : `${root}${v.toLowerCase()}/`;
}
