import { AUDIENCE_MENU_ORDER, type Template } from "./mockData";

/**
 * A "family" is one template as a person thinks of it — Vulnerability Advisory —
 * rather than one of its per-audience pairings. The Select Template list and
 * the Report Builder's "All Audiences" view show families; picking an audience
 * then lands on the pairing that serves it.
 */

/** One entry per template name, in alphabetical order, customs beside their base. */
export function templateFamilies(templates: Template[]): Template[] {
  const seen = new Set<string>();
  const firsts = templates.filter((t) => !seen.has(t.name) && (seen.add(t.name), true));
  const base = (t: Template) => t.name.replace(/\s*\([^)]*\)\s*$/, "");
  return [...firsts].sort((a, b) => {
    const byBase = base(a).localeCompare(base(b));
    if (byBase) return byBase;
    if (a.kind !== b.kind) return a.kind === "feedly" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** The audiences a template is compatible with, in the order menus list them. */
export function audiencesFor(templates: Template[], name: string): string[] {
  const list = [...new Set(templates.filter((t) => t.name === name).map((t) => t.audience))].filter(
    Boolean
  );
  const rank = (a: string) => {
    const i = AUDIENCE_MENU_ORDER.indexOf(a);
    return i < 0 ? 99 : i;
  };
  return list.sort((a, b) => rank(a) - rank(b));
}

/** The pairing of a template with one audience. */
export function pairingFor(templates: Template[], name: string, audience: string) {
  return templates.find((t) => t.name === name && t.audience === audience);
}

/** Templates whose report subject is a CVE — the flows that ask for a CVE ID. */
export const isVulnAdvisory = (t: Template) => /^Vulnerability Advisory\b/.test(t.name);
