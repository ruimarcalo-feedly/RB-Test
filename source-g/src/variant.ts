/**
 * Parallel versions of the prototype share one address: A, the locked
 * baseline, and the alternatives B to F. Each is its own build, told which it
 * is through VITE_VARIANT. The org switcher in the left nav moves between them.
 */
export type Variant = "A" | "B" | "C" | "G" | "I" | "K" | "L" | "M";

/* A is retired: still the default build, no longer in the menu. */
export const VARIANTS: Variant[] = ["B", "C", "G", "I", "K", "L", "M"];

/** What each version is called in the org menu. Shown as A to D in menu
    order; the build letters (B, C, G, I) and folders stay as they were. */
export const VARIANT_LABEL: Record<Variant, string> = {
  A: "A: Parameters V0",
  B: "A: Parameters V2",
  C: "B: Brand contains all",
  G: "C: Header/Footer separate inline",
  I: "D: Separate Header/Footer Editor",
  K: "E: Brand Themes",
  L: "F: Separate Themes",
  M: "G: Styles everywhere",
};

const env = import.meta.env.VITE_VARIANT;
export const VARIANT: Variant =
  env === "B" || env === "C" || env === "G" || env === "I" || env === "K" || env === "L" || env === "M" ? env : "A";

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
