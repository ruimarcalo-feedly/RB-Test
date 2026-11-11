/**
 * Parallel versions of the prototype share one address: A, the locked
 * baseline, and the alternatives B to F. Each is its own build, told which it
 * is through VITE_VARIANT. The org switcher in the left nav moves between them.
 */
export type Variant = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export const VARIANTS: Variant[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

/** What each version is called in the org menu. */
export const VARIANT_LABEL: Record<Variant, string> = {
  A: "A: Parameters V0",
  B: "B: Parameters V2",
  C: "C: Headers & footers as objects",
  D: "D: Elicitation waiting states",
  E: "E: New audience + elicitation rethink",
  F: "F: Header & footer pickers",
  G: "G: Feedly header & footer layouts",
  H: "H: Brand owns header & footer",
  I: "I: Header & footer style library",
};

const env = import.meta.env.VITE_VARIANT;
export const VARIANT: Variant =
  env === "B" || env === "C" || env === "D" || env === "E" || env === "F" || env === "G" || env === "H" || env === "I" ? env : "A";

export function switchVariant(v: Variant) {
  if (v === VARIANT) return;
  /* A host page that holds every build (the single-file artifact) provides
     its own switch. On the hosted site, B to F live in folders beside A. */
  const host = window as unknown as { __rbSwitchVariant?: (v: Variant) => void };
  if (host.__rbSwitchVariant) {
    host.__rbSwitchVariant(v);
    return;
  }
  const root = VARIANT === "A" ? "" : "../";
  window.location.href = v === "A" ? root || "./" : `${root}${v.toLowerCase()}/`;
}
