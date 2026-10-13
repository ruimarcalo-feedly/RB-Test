import { ORG_ITEMS, TECH_STACK_OPTIONS } from "./mockData";

/**
 * Parameter suggestions.
 *
 * Source collection logic (Figma): for every path we send the article titles
 * (10 max), the template name, the template description and the Org Profile
 * items off to build parameter suggestions. This is the deterministic stand-in:
 * the option list for an Org Profile parameter is drawn from the Org Profile,
 * then ranked against the signals the entry point carried, so a strong context
 * surfaces the relevant options first and marks them as suggested.
 */

export interface Signals {
  /** Titles of the articles feeding the report (capped at 10, as in the spec). */
  articleTitles: string[];
  templateName: string;
  templateDescription: string;
  /** What the user said the report is about, when we had to ask. */
  subject?: string;
  /** The broad-context source (agent, board, folder, AI feed). */
  contextLabel?: string;
}

export interface SuggestedOption {
  label: string;
  /** True when the signals point at this option. */
  suggested: boolean;
  /** Why it was suggested — surfaced as a tooltip. */
  because?: string;
}

/** Keywords that map a signal onto a tech-stack bucket. */
const STACK_KEYWORDS: Record<string, string[]> = {
  "Cloud & Infrastructure": [
    "cloud", "aws", "azure", "gcp", "s3", "vpn", "fortios", "fortinet",
    "appliance", "edge", "network", "server", "windows", "identity", "okta",
  ],
  "Containers & Orchestration": ["container", "kubernetes", "k8s", "docker", "helm", "image"],
  "CI/CD & Developer Tooling": [
    "ci/cd", "cicd", "pipeline", "npm", "package", "dependency", "supply chain",
    "github", "build", "artifact", "registry",
  ],
  "Application & Runtime Stack": [
    "wordpress", "php", "java", "runtime", "application", "web", "cms", "api",
    "sql", "injection", "rce", "plugin", "breach", "portal",
  ],
};

const norm = (s: string) => s.toLowerCase();

function signalText(s: Signals): string {
  return norm(
    [
      ...s.articleTitles.slice(0, 10),
      s.templateName,
      s.templateDescription,
      s.subject ?? "",
      s.contextLabel ?? "",
    ].join(" • ")
  );
}

/** The Org Profile list an Org Profile parameter draws its options from. */
function orgProfileOptions(paramName: string): string[] | null {
  const item = ORG_ITEMS.find(
    (i) => i.type === "List" && norm(i.name) === norm(paramName)
  );
  if (!item?.values) return null;
  return item.values
    .split(",")
    .map((v) => v.trim().replace(/…$/, ""))
    .filter(Boolean);
}

/**
 * Options for one Org Profile parameter, ranked with the suggested ones first.
 */
export function suggestOptions(paramName: string, signals: Signals): SuggestedOption[] {
  const text = signalText(signals);

  // "Tech stack" is bucketed rather than listed item by item, matching the design.
  const base =
    norm(paramName) === "tech stack"
      ? TECH_STACK_OPTIONS
      : orgProfileOptions(paramName) ?? TECH_STACK_OPTIONS;

  const scored = base.map((label) => {
    const keywords = STACK_KEYWORDS[label] ?? [norm(label)];
    const hit = keywords.find((k) => text.includes(k));
    return {
      label,
      suggested: Boolean(hit),
      because: hit ? `Matched “${hit}” in the sources for this report` : undefined,
      score: hit ? keywords.length - keywords.indexOf(hit) : -1,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ label, suggested, because }) => ({ label, suggested, because }));
}

/**
 * Where the suggestions came from, shown under the question.
 *
 * Figma shows "Suggestions are taken from the Org Profile". When the entry
 * point carried sources and they actually moved a suggestion, we say so —
 * that is the whole point of sending the article titles along.
 */
export function suggestionSource(signals: Signals, options?: SuggestedOption[]): string {
  const base = "Suggestions are taken from the Org Profile";
  const matched = options?.some((o) => o.suggested);
  if (matched && signals.articleTitles.length) {
    const n = signals.articleTitles.length;
    return `${base} and the ${n} source${n === 1 ? "" : "s"} for this report`;
  }
  return base;
}
