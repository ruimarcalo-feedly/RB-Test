import type { IconName } from "../components/ui/Icon";
import { BRANDED_FOOTER, BRANDED_HEADER, FEEDLY_BRAND, type PageBand } from "./brand";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type TemplateKind = "feedly" | "custom";

export interface Block {
  id: string;
  heading: string;
  /** Prompt paragraphs. `{{Param name}}` renders as a parameter chip. */
  prompts: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  kind: TemplateKind;
  audience: string;
  /** Order in "Last used" sorting — lower is more recent. */
  lastUsed: number;
  tradecrafts: string[];
  contextDescription: string;
  /** The report title rendered at the top of the template canvas. */
  reportTitle?: string;
  parameters: Parameter[];
  blocks: Block[];
  /** Feedly built-ins carry a longer read-only description. */
  builtinNote?: string;
  /**
   * Design tab: the Org Profile brand this template is written in, and the
   * header and footer bands its pages carry. A template with no brand falls
   * back to the app's own styling, which is what an unbranded one looks like.
   */
  brandId?: string;
  header?: PageBand;
  footer?: PageBand;
}

export interface Parameter {
  id: string;
  name: string;
  description: string;
  type: "Org Profile" | "Free text" | "Date";
  optional: boolean;
}

import type { CreateContext } from "./context";
export type { CreateContext } from "./context";

export interface Report {
  id: string;
  headline: string;
  templateName: string;
  templateAudience: string;
  createdBy: string;
  createdOn: string;
  status?: "generating";
  /**
   * Everything needed to reopen the report in the editor: where it was created
   * from, what it was reporting on, and how its parameters were answered.
   */
  origin?: CreateContext;
  subject?: string;
  answers?: Record<string, string>;
  language?: string;
  company?: string;
}

export type OrgItemType =
  | "List"
  | "Tradecraft"
  | "Audience"
  | "Brand"
  | "Company info"
  | "Text content"
  | "Vendor list";

export interface OrgItem {
  id: string;
  name: string;
  values?: string;
  type: OrgItemType;
  content?: string;
  referencedIn: string[];
  extraRefs?: number;
  createdBy: string;
  createdOn: string;
  icon: IconName;
}

export interface Article {
  id: string;
  title: string;
  source?: string;
  trend?: string;
  age: string;
  snippet: string;
  also: string;
}

export interface SourceItem {
  id: string;
  title: string;
  kind: "article" | "cve" | "entity";
  source?: string;
  age?: string;
  tags?: string[];
  cvss?: string;
  cvssHigh?: boolean;
  exploit?: boolean;
  checked: boolean;
}

/* ------------------------------------------------------------------ *
 * Reference data
 * ------------------------------------------------------------------ */

export const AUDIENCES = [
  "CISO",
  "Custom audience",
  "Detection Engineering",
  "Executive Leadership",
  "IT Operations",
  "M&A",
  "Red Team",
  "Risk Management",
  "SOC/IR",
  "TPRM",
  "Threat Hunting",
  "Vuln Management",
];

/**
 * The order the Create Report dropdown lists audiences in — Figma
 * "dropdown" (2578:97968), which is a curated order rather than the
 * alphabetical one the Org Profile uses. Audiences the user adds later fall
 * in after these.
 */
export const AUDIENCE_MENU_ORDER = [
  "CISO",
  "Custom audience",
  "SOC/IR",
  "Vuln Management",
  "Red Team",
  "Threat Hunting",
  "Detection Engineering",
  "Risk Management",
  "TPRM",
  "IT Operations",
  "Executive Leadership",
  "M&A",
];

export const TRADECRAFTS = [
  "ICD 203",
  "ICD 206",
  "Chicago Manual Style",
  "Analytic Tools",
  "Writing Style Rules",
];

export const AUDIENCE_CONTENT: Record<string, string> = {
  CISO: `You are writing a CISO/CIO report. Answer one question throughout: what is the risk, who owns it, and what does leadership need to decide?
1/ Recommendations as a structured list, not prose. 2/ Provide strategic recommendations, not technical remediation steps, with action owners
- NEVER INCLUDE: ATT&CK T-numbers, IOC tables, CVE analysis, attack-chain mechanics, malware behaviour, scope notes, intel gaps, hunt/emulation steps, product versions.
3/ Use plain language, no jargon, and frame everything in business risk terms.
4/ Do NOT add any sense of urgency nor give opinions.
5/ Frame threats as risk to revenue, reputation, regulatory posture, or operational continuity.`,
  "SOC/IR": `You are writing for a SOC / incident response audience. Lead with what to do in the next 24 hours.
1/ Include detection opportunities, log sources and IOC tables where available.
2/ Reference MITRE ATT&CK technique IDs inline.
3/ Keep the executive framing to two sentences maximum.`,
};

const LOREM_PROMPT =
  "Describe what this section should contain. Say what to cover, how long it should be, and what to leave out. Nothing you write here appears in the report itself, only the content it produces.";

const VULN_BLOCKS: Block[] = [
  {
    id: "b1",
    heading: "Executive Summary",
    prompts: [
      'The BLUF opening. Tells the reader the bottom-line answer to "what is this vulnerability or vulnerabilities, when was the disclosure made, how severe, what should I do, when the patches (if any) were released" in 2–4 sentences. Do not include any CVE numbers and version numbers in this section.',
    ],
  },
  {
    id: "b2",
    heading: "CVE Analysis",
    prompts: [
      "The structured detail table on the CVE itself. Identifier, severity scores, affected products with version ranges, exploitation status, exploit maturity (including any public PoC or weaponized exploit detail), patch availability, zero-day window.",
      "Every CVE requires a patch urgency tier label based on a specific four-tier structured decision matrix (Critical, High, Medium, Low) unless overridden by an organizational profile.",
    ],
  },
  {
    id: "b3",
    heading: "Technical Details",
    prompts: [
      "Plain-language explanation of how the vulnerability works at a technical level — attack vector, exploitation mechanism, privileges required, user interaction required, references to MITRE ATT&CK techniques where the vulnerability appears in attack chains. Every critical patch entry must be written with at least one immediate, actionable interim mitigation.",
    ],
  },
  {
    id: "b4",
    heading: "Impact Assessment",
    prompts: [
      "What this CVE could mean for the organization receiving the report. Potential operational consequences, regulatory framing where applicable, asset exposure where applicable.",
      "Impact Assessment is potential exposure based on CVE detail and the tech stack relationship — not confirmed exposure. Identify which asset classes are affected by the CVE and reference {{Tech stack}} when there is a direct relationship.",
    ],
  },
  {
    id: "b5",
    heading: "Recommendations",
    prompts: [
      "Extract all recommendations (and their handoff owner) from the articles. For each, give the action, the owner, and the deadline implied by the patch urgency tier.",
    ],
  },
];

const memoBlocks = (topic: string): Block[] => [
  {
    id: "b1",
    heading: "Executive Summary",
    prompts: [
      `A three-sentence bottom line for a non-technical reader covering ${topic}. No jargon, no vendor names, no CVE identifiers.`,
    ],
  },
  {
    id: "b2",
    heading: "What Happened",
    prompts: [
      "A factual narrative of the event in chronological order. Keep to one paragraph and cite the source articles inline.",
    ],
  },
  {
    id: "b3",
    heading: "Business Impact",
    prompts: [
      "Frame the exposure in terms of revenue, reputation, regulatory posture and operational continuity. Reference {{Tech stack}} only where a direct relationship exists.",
    ],
  },
  {
    id: "b4",
    heading: "Recommended Decisions",
    prompts: [
      "A structured list of decisions leadership needs to make, each with an owner. Strategic only — no remediation steps.",
    ],
  },
];

export const TECH_STACK_PARAM: Parameter = {
  id: "p-tech",
  name: "Tech stack",
  description:
    "Set of technologies used to build and run a specific application or platform",
  type: "Org Profile",
  optional: true,
};

export const CVE_PARAM: Parameter = {
  id: "p-cve",
  name: "CVE ID",
  description: "The CVE identifier, or list of coordinated CVEs, the report covers",
  type: "Free text",
  optional: false,
};

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Templates
 *
 * The nine built-in templates and their audience pairings are taken verbatim
 * from the "Audience/Template combinations" table in the Figma file
 * (section "Template cards"): 27 template–audience pairings across 9 templates
 * and 11 audiences. Every pairing is its own TemplateCardSet in the design, so
 * every pairing is its own card here. Titles, descriptions and type icons are
 * the ones on the cards themselves.
 * ------------------------------------------------------------------ */

interface BuiltIn {
  name: string;
  description: string;
  icon: IconName;
  contextDescription: string;
  tradecrafts: string[];
  parameters: Parameter[];
  blocks: Block[];
  audiences: string[];
}

const BUILT_INS: BuiltIn[] = [
  {
    name: "Executive Memo",
    description:
      "Translates a macro threat development into enterprise risk terms for non-technical board and C-suite leaders.",
    icon: "user-sparkles",
    contextDescription:
      "An Executive Memo translates a macro threat development into enterprise risk terms. The unit of analysis is the decision the board needs to make, not the threat itself.",
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [TECH_STACK_PARAM],
    blocks: memoBlocks("a macro threat development"),
    audiences: ["CISO", "Executive Leadership"],
  },
  {
    name: "Vulnerability Advisory",
    description:
      "Communicates a specific vulnerability, or a coordinated group of related CVEs, and what to do about it.",
    icon: "bug",
    contextDescription:
      "A Vulnerability Advisory is a focused report communicating a specific vulnerability (or set of related vulnerabilities) and what to do about it. The unit of analysis is the CVE (or grouped CVEs in a coordinated disclosure).",
    tradecrafts: ["ICD 203", "Chicago Manual Style", "Writing Style Rules"],
    parameters: [TECH_STACK_PARAM],
    blocks: VULN_BLOCKS,
    audiences: [
      "CISO",
      "Detection Engineering",
      "IT Operations",
      "SOC/IR",
      "Vuln Management",
    ],
  },
  {
    name: "Flash Report",
    description:
      "Covers an external cyber event affecting a peer organization or our sector, to assess our own exposure.",
    icon: "flash",
    contextDescription:
      "A Flash Report covers a single external cyber event affecting a peer organization or our sector. The unit of analysis is our own exposure to the same event.",
    tradecrafts: ["ICD 203"],
    parameters: [TECH_STACK_PARAM],
    blocks: memoBlocks("an external cyber event affecting a peer organization"),
    audiences: ["CISO", "Detection Engineering", "Red Team", "SOC/IR"],
  },
  {
    name: "Periodic Threat Briefing",
    description:
      "A recurring daily, weekly, monthly, or quarterly digest of notable threat activity from the period covered.",
    icon: "calendar",
    contextDescription:
      "A recurring digest of notable threat activity from the period covered. The unit of analysis is the period, not any single event.",
    tradecrafts: ["ICD 203", "Chicago Manual Style"],
    parameters: [],
    blocks: memoBlocks("notable threat activity in the period"),
    audiences: [
      "CISO",
      "Risk Management",
      "SOC/IR",
      "Threat Hunting",
      "TPRM",
      "Vuln Management",
    ],
  },
  {
    name: "Supply Chain Attack",
    description:
      "Covers a compromised dependency in our stack to determine contamination scope and trigger response.",
    icon: "shield-lightning",
    contextDescription:
      "Covers a compromised dependency in our stack. The unit of analysis is the contamination scope across our estate.",
    tradecrafts: ["ICD 203"],
    parameters: [TECH_STACK_PARAM],
    blocks: memoBlocks("a compromised dependency in our stack"),
    audiences: ["CISO", "IT Operations", "SOC/IR", "Vuln Management"],
  },
  {
    name: "Third-Party Vendor Breach",
    description:
      "Covers a breach involving a vendor we use, to determine our indirect exposure and trigger response.",
    icon: "shield-doc",
    contextDescription:
      "Covers a breach involving a vendor we use. The unit of analysis is our indirect exposure through the vendor relationship.",
    tradecrafts: ["ICD 203", "ICD 206"],
    parameters: [TECH_STACK_PARAM],
    blocks: memoBlocks("a breach at a third-party vendor"),
    audiences: ["CISO", "TPRM"],
  },
  {
    name: "Threat Hunting Report",
    description: "Ready-to-execute hunt hypotheses for proactively finding adversary presence.",
    icon: "swords",
    contextDescription:
      "Ready-to-execute hunt hypotheses. The unit of analysis is the hypothesis, each with a data source and a query.",
    tradecrafts: ["ICD 206", "Analytic Tools"],
    parameters: [],
    blocks: memoBlocks("adversary presence in our environment"),
    audiences: ["SOC/IR", "Threat Hunting"],
  },
  {
    name: "Adversary Emulation",
    description:
      "A procedure-level package for red teams to emulate a threat actor and surface detection gaps.",
    icon: "mask",
    contextDescription:
      "A procedure-level emulation package. The unit of analysis is the ATT&CK procedure, mapped to a detection.",
    tradecrafts: ["ICD 206"],
    parameters: [],
    blocks: memoBlocks("a threat actor's tradecraft"),
    audiences: ["Detection Engineering", "Red Team"],
  },
  {
    name: "M&A Cyber Due Diligence",
    description: "Covers cyber risk profile of an acquisition target.",
    icon: "broken-shield",
    contextDescription:
      "Assesses the security posture of an acquisition target. The unit of analysis is the transaction risk.",
    tradecrafts: ["ICD 203"],
    parameters: [],
    blocks: memoBlocks("the security posture of an acquisition target"),
    audiences: ["M&A"],
  },
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let order = 2;

/** Card order inside each audience, as laid out in the Figma library grid. */
export const BUILT_IN_ORDER = [
  "Executive Memo",
  "Flash Report",
  "Periodic Threat Briefing",
  "Supply Chain Attack",
  "Third-Party Vendor Breach",
  "Vulnerability Advisory",
  "Threat Hunting Report",
  "Adversary Emulation",
  "M&A Cyber Due Diligence",
];

const BUILT_IN_TEMPLATES: Template[] = [...BUILT_INS]
  .sort((a, b) => BUILT_IN_ORDER.indexOf(a.name) - BUILT_IN_ORDER.indexOf(b.name))
  .flatMap((b) =>
  b.audiences.map((audience) => ({
    id: `t-${slug(b.name)}-${slug(audience)}`,
    name: b.name,
    description: b.description,
    icon: b.icon,
    kind: "feedly" as const,
    audience,
    lastUsed: order++,
    tradecrafts: [...b.tradecrafts],
    contextDescription: b.contextDescription,
    builtinNote: b.contextDescription,
    parameters: b.parameters.map((p) => ({ ...p })),
    blocks: b.blocks.map((x) => ({ ...x, prompts: [...x.prompts] })),
  }))
);


/** The two custom templates the Figma screens show alongside the built-ins. */
const CUSTOM_TEMPLATES: Template[] = [
  {
    id: "t-exec-memo-matt",
    name: "Executive Memo (Matt)",
    description:
      "Translates a macro threat development into enterprise risk terms for non-technical board and C-suite leaders.",
    icon: "wand",
    kind: "custom",
    audience: "CISO",
    lastUsed: 0,
    tradecrafts: ["ICD 203", "Chicago Manual Style", "Writing Style Rules"],
    contextDescription:
      "Matt's variant of the Executive Memo. Same structure, tighter word budget, always closes on a single recommended decision.",
    parameters: [TECH_STACK_PARAM],
    blocks: memoBlocks("a macro threat development"),
  },
  {
    id: "t-vuln-matt",
    name: "Vulnerability Advisory (Matt)",
    description:
      "Communicates a specific vulnerability, or a coordinated group of related CVEs, and what to do about it.",
    icon: "bug",
    kind: "custom",
    audience: "Vuln Management",
    lastUsed: 1,
    tradecrafts: ["ICD 203", "Chicago Manual Style", "Writing Style Rules"],
    contextDescription:
      "Matt's Vulnerability Advisory — adds a patch-urgency matrix and always references the tech stack.",
    parameters: [TECH_STACK_PARAM],
    blocks: VULN_BLOCKS.map((b) => ({ ...b, prompts: [...b.prompts] })),
  },
];

/**
 * Card order follows the Figma carousel and library grid: the built-in
 * Executive Memo first, then its custom variant, then the rest of the built-ins.
 */
/**
 * Custom templates start on the Feedly brand, since a brand is the
 * organisation's and a template someone made here inherits it. The Feedly
 * built-ins carry none: they are the product's own templates and have to render
 * in the product's own styling, not in any one customer's.
 *
 * Every one ships in the Feedly brand, with the furniture that brand implies:
 * the cover artwork and wordmark in the header, and the confidentiality note,
 * TLP badge and page number in the footer. Both bands reference the brand's
 * assets rather than copies of them, so swapping a template's brand swaps its
 * cover and logo too.
 */
export const TEMPLATES: Template[] = [
  BUILT_IN_TEMPLATES[0],
  CUSTOM_TEMPLATES[0],
  ...BUILT_IN_TEMPLATES.slice(1),
  CUSTOM_TEMPLATES[1],
].map((t) => ({
  ...t,
  brandId: FEEDLY_BRAND.id,
  header: BRANDED_HEADER,
  footer: BRANDED_FOOTER,
}));

export const BLANK_BLOCKS: Block[] = [
  { id: "nb1", heading: "Name your first section here", prompts: [LOREM_PROMPT] },
];

/* ------------------------------------------------------------------ *
 * Previous reports
 * ------------------------------------------------------------------ */

export const REPORTS: Report[] = [
  {
    id: "r1",
    headline: "Q3 2026 Cyber Risk Briefing for the Board",
    templateName: "Executive Memo",
    templateAudience: "Executive Leadership",
    createdBy: "Sarah Chen",
    createdOn: "Jul 20, 2026",
    origin: { path: "broad", contextKind: "agent", contextLabel: "Trending High + CVEs" },
    subject: "Our overall cyber risk position for the quarter",
    answers: { "p-tech": "Cloud & Infrastructure, CI/CD & Developer Tooling" },
  },
  {
    id: "r2",
    headline: "Critical Ivanti Connect Secure RCE — Patch Advisory (CVE-2026-1234)",
    templateName: "Vulnerability Advisory",
    templateAudience: "Executive Leadership",
    createdBy: "Sarah Chen",
    createdOn: "Jul 20, 2026",
    origin: { path: "insight", insightId: "ic4" },
    subject: "CVE-2026-1234 — Ivanti Connect Secure RCE",
    answers: { "p-tech": "Cloud & Infrastructure" },
  },
  {
    id: "r3",
    headline: "Active Exploitation of Fortinet FortiOS Zero-Day (CVE-2026-2091)",
    templateName: "Flash Report",
    templateAudience: "CISO",
    createdBy: "Priya Patel",
    createdOn: "Jul 18, 2026",
    origin: { path: "insight", insightId: "ic4" },
    subject: "CVE-2026-2091 — Fortinet FortiOS zero-day",
    answers: { "p-tech": "Cloud & Infrastructure" },
  },
  {
    id: "r4",
    headline: "Hunting Cobalt Strike Beacons Across Financial Services Networks",
    templateName: "Threat Hunting Report",
    templateAudience: "SOC/IR",
    createdBy: "Jordan Reyes",
    createdOn: "Jul 16, 2026",
    origin: { path: "broad", contextKind: "board", contextLabel: "Financial Services Threats" },
    subject: "Cobalt Strike beacon activity across our financial services estate",
    answers: { "p-tech": "Cloud & Infrastructure" },
  },
  {
    id: "r5",
    headline: "Simulating Scattered Spider TTPs Against Cloud Identity Providers",
    templateName: "Adversary Emulation",
    templateAudience: "Red Team",
    createdBy: "Sarah Chen",
    createdOn: "Jul 14, 2026",
    origin: { path: "broad", contextKind: "agent", contextLabel: "TTPs" },
    subject: "Scattered Spider TTPs against cloud identity providers",
    answers: { "p-tech": "Cloud & Infrastructure" },
  },
  {
    id: "r6",
    headline: "Malicious npm Packages Targeting CI/CD Pipelines",
    templateName: "Supply Chain Attack",
    templateAudience: "Vuln Management",
    createdBy: "Marcus Webb",
    createdOn: "Jul 11, 2026",
    origin: { path: "none" },
    subject: "Malicious npm packages targeting CI/CD pipelines",
    answers: { "p-tech": "CI/CD & Developer Tooling" },
  },
  {
    id: "r7",
    headline: "Okta Sub-Processor Compromise: Third-Party Impact Assessment",
    templateName: "Third-Party Vendor Breach",
    templateAudience: "TPRM",
    createdBy: "Priya Patel",
    createdOn: "Jul 9, 2026",
    origin: { path: "articles", articleIds: ["a1", "a2", "a3"] },
    answers: { "p-tech": "Cloud & Infrastructure" },
  },
  {
    id: "r8",
    headline: "Ransomware Trends Targeting Healthcare — Week of July 20",
    templateName: "Periodic Threat Briefing",
    templateAudience: "SOC/IR",
    createdBy: "Jordan Reyes",
    createdOn: "Jul 6, 2026",
    origin: { path: "broad", contextKind: "feed", contextLabel: "Healthcare Threat Intel" },
    subject: "Ransomware activity against healthcare providers this week",
    answers: { "p-tech": "Application & Runtime Stack" },
  },
  {
    id: "r9",
    headline: "Cyber Due Diligence: Security Posture of Acquisition Target “Project Falcon”",
    templateName: "M&A Cyber Due Diligence",
    templateAudience: "M&A",
    createdBy: "Sarah Chen",
    createdOn: "Jul 3, 2026",
    origin: { path: "none" },
    subject: "Security posture of the Project Falcon acquisition target",
    answers: { "p-tech": "Cloud & Infrastructure" },
  },
  {
    id: "r10",
    headline: "Actively Exploited Chrome Zero-Day (CVE-2026-5678)",
    templateName: "Flash Report",
    templateAudience: "CISO",
    createdBy: "Marcus Webb",
    createdOn: "Jun 30, 2026",
    origin: { path: "insight", insightId: "ic1" },
    subject: "CVE-2026-5678 — actively exploited Chrome zero-day",
    answers: { "p-tech": "Application & Runtime Stack" },
  },
];

/* ------------------------------------------------------------------ *
 * Org profile
 * ------------------------------------------------------------------ */

export const ORG_ITEMS: OrgItem[] = [
  {
    /* The brand the Feedly templates are written in — the one Org Profile item
       that carries styling rather than words. */
    id: "o-brand-feedly",
    name: "Feedly",
    type: "Brand",
    icon: "brand",
    referencedIn: [],
    createdBy: "Rui Marçalo",
    createdOn: "Oct 13, 2026",
  },
  {
    /* A second brand, so a template can be swapped from one to the other. */
    id: "o-brand-acme",
    name: "Acme Inc",
    type: "Brand",
    icon: "brand",
    referencedIn: [],
    createdBy: "Rui Marçalo",
    createdOn: "Sep 21, 2026",
  },
  {
    id: "o1",
    name: "Adversaries",
    values: "APT1, APT3, APT5, APT10, APT12, APT15, APT17…",
    type: "List",
    icon: "list",
    referencedIn: [
      "Cloud providers exploitation",
      "Healthcare threat actors",
      "How much did the cyber-attack cost…",
      "IBM XForce",
    ],
    extraRefs: 9,
    createdBy: "Mathieu Bélignon",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o2",
    name: "Tier 1 Vendors",
    values: "Akamai, Amazon, Apple, ArborNetworks, Atlassian…",
    type: "List",
    icon: "list",
    referencedIn: [],
    createdBy: "Mathieu Bélignon",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o3",
    name: "Tier 2 Vendors",
    values: "Oracle, PaloAltoNetworks, Rapid7, RedHat…",
    type: "List",
    icon: "list",
    referencedIn: [],
    createdBy: "Mathieu Bélignon",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o4",
    name: "Tech Stack",
    values: "macOS, iOS, iPadOS, watchOS, tvOS, visionOS",
    type: "List",
    icon: "list",
    referencedIn: [],
    createdBy: "Mathieu Bélignon",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o5",
    name: "Critical CVEs",
    values: "CVE-2017-0144, CVE-2017-11882, CVE-2018-8174…",
    type: "List",
    icon: "list",
    referencedIn: [],
    createdBy: "Mathieu Bélignon",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o6",
    name: "Writing Style Rules",
    type: "Tradecraft",
    icon: "tradecraft",
    referencedIn: ["Executive Memo", "Flash Report"],
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o7",
    name: "ICD 203",
    type: "Tradecraft",
    icon: "tradecraft",
    referencedIn: [
      "Periodic Threat Briefing",
      "Vulnerability Advisory",
    ],
    extraRefs: 5,
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o8",
    name: "ICD 206",
    type: "Tradecraft",
    icon: "tradecraft",
    referencedIn: ["Flash Report", "Periodic Threat Briefing", "Threat Hunting Report", "Vulnerability Advisory"],
    extraRefs: 5,
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o9",
    name: "Chicago Manual of Style",
    type: "Tradecraft",
    icon: "tradecraft",
    referencedIn: [],
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o10",
    name: "Analytic Tools",
    type: "Tradecraft",
    icon: "tradecraft",
    referencedIn: [],
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o11",
    name: "CISO",
    type: "Audience",
    icon: "audience",
    content: AUDIENCE_CONTENT.CISO,
    referencedIn: [
      "Supply Chain Attack Report",
      "Third-Party Vendor Breach Report",
      "M&A Cyber Due Diligence",
    ],
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o12",
    name: "SOC/IR",
    type: "Audience",
    icon: "audience",
    content: AUDIENCE_CONTENT["SOC/IR"],
    referencedIn: ["Periodic Threat Briefing", "Threat Hunting Report"],
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o13",
    name: "Vuln Management",
    type: "Audience",
    icon: "audience",
    referencedIn: [
      "Adversary Emulation Report",
      "Executive Memo",
    ],
    extraRefs: 2,
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
  {
    id: "o14",
    name: "Red Team",
    type: "Audience",
    icon: "audience",
    referencedIn: ["Adversary Emulation Report"],
    createdBy: "Feedly",
    createdOn: "Oct 13, 2025",
  },
];

export const ORG_ITEM_TYPES: { type: OrgItemType; icon: IconName }[] = [
  { type: "Audience", icon: "audience" },
  { type: "Brand", icon: "brand" },
  { type: "Company info", icon: "building" },
  { type: "List", icon: "list" },
  { type: "Text content", icon: "text" },
  { type: "Tradecraft", icon: "tradecraft" },
  { type: "Vendor list", icon: "vendor" },
];

/* ------------------------------------------------------------------ *
 * Article feed (entry point for the "Selected Articles" path)
 * ------------------------------------------------------------------ */

/** The team feed the selected-articles path starts from. */
export const FEED_NAME = "Massachusetts Data Breach Filings";

export const ARTICLES: Article[] = [
  {
    id: "a1",
    title: "Allstate",
    trend: "Allstate investigates ransomware breach",
    age: "2d",
    snippet:
      "Breach Number 2026- 1413 Date Reported To OCA 24-Aug-26 Reporting Organization Name Reporting Organization Type Insurance Company MA Residents Affected 4 SSN Breached Yes Medical…",
    also: "GlobeNewswire, Insurance Business, +10 feeds",
  },
  {
    id: "a2",
    title: "POLAM Federal Credit Union",
    age: "2d",
    snippet:
      "Breach Number 2026- 1414 Date Reported To OCA 24-Aug-26 Reporting Organization Name Reporting Organization Type Financial Services Company MA Residents Affected 3 SSN Breached Yes…",
    also: "Search Data Security…, Search Data Security…, +2 feeds",
  },
  {
    id: "a3",
    title: "Heart Care Centers of Illinois",
    age: "2d",
    snippet:
      "Breach Number 2026- 1415 Date Reported To OCA 24-Aug-26 Reporting Organization Name Reporting Organization Type Health Care MA Residents Affected 2 SSN Breached Yes Medical Records…",
    also: "Insurance Business, Google News",
  },
  {
    id: "a4",
    title: "Pan American Group LLC",
    age: "2d",
    snippet:
      "Breach Number 2026- 1416 Date Reported To OCA 24-Aug-26 Reporting Organization Name Reporting Organization Type Hospitality Industry MA Residents Affected 10 SSN Breached Yes…",
    also: "BornCity, Google News, +1 feeds",
  },
  {
    id: "a5",
    title: "Southern Illinois University",
    age: "2d",
    snippet:
      "Breach Number 2026- 1402 Date Reported To OCA 21-Aug-26 Reporting Organization Name Reporting Organization Type Educational MA Residents Affected 134 SSN Breached Yes Medical…",
    also: "KBSI FOX23 News Cape…, www.stltoday.com, +4 feeds",
  },
  {
    id: "a6",
    title: "Southfield Rehabilitation Company LLC dba Surgeons Choice Medical Center",
    age: "3d",
    snippet:
      "Breach Number 2026- 1398 Date Reported To OCA 20-Aug-26 Reporting Organization Type Health Care MA Residents Affected 61 SSN Breached Yes Medical Records Breached Yes…",
    also: "Google News, +3 feeds",
  },
];

/* ------------------------------------------------------------------ *
 * Sources panel content
 * ------------------------------------------------------------------ */

export const THREAT_GRAPH_SOURCES: SourceItem[] = [
  {
    id: "s1",
    title: "Hackers with Ties to China Targeting New Vulnera…",
    kind: "article",
    source: "Source name",
    age: "1d",
    tags: ["High Vulnerabilities"],
    checked: true,
  },
  {
    id: "s2",
    title: "Critical Windows Zero-Day Vulnerability Lets Attac…",
    kind: "article",
    source: "Source name",
    age: "1d",
    tags: ["High Vulnerabilities"],
    checked: true,
  },
  {
    id: "s3",
    title: "CVE-2024-21412",
    kind: "cve",
    tags: ["Windows", "Protection Mechanism Failure"],
    cvss: "CVSS 8.1",
    cvssHigh: true,
    exploit: true,
    checked: true,
  },
  {
    id: "s4",
    title: "CVE-2025-21318",
    kind: "cve",
    tags: ["Windows", "Insertion of Sensitive Information into Log File"],
    cvss: "CVSS 5.5",
    checked: true,
  },
  {
    id: "s5",
    title: "CVE-2025-21318",
    kind: "cve",
    tags: ["Windows", "Neutralization of Special Elements used in an SQL Command ('SQL Injection')"],
    cvss: "CVSS 2.2",
    checked: false,
  },
  {
    id: "s6",
    title: "HALFRIG",
    kind: "entity",
    tags: ["Windows", "Alias / Alias"],
    checked: true,
  },
];

/* ------------------------------------------------------------------ *
 * Generated report body (Vulnerability Advisory example)
 * ------------------------------------------------------------------ */

export const GENERATED_TITLE =
  "CVE-2026-63030 & CVE-2026-60137 Vulnerability Advisory";

export const GENERATED_SUMMARY =
  'CVE-2026-63030 and CVE-2026-60137 are two WordPress Core vulnerabilities that chain together into an unauthenticated remote code execution (RCE) path, tracked publicly as "wp2shell." An unauthenticated attacker targeting a default WordPress installation on versions 6.9.0–6.9.4 or 7.0.0–7.0.1 can create an administrator account and execute arbitrary code without any plugin, theme, or credential requirement. [3][8] Cardinal Trust Financial operates a public-facing WordPress site that falls within the affected version range and is directly exposed. Patch to WordPress 6.9.5 or 7.0.2 immediately and audit for post-exploitation artifacts before restoring trust in the environment. [3][10]';

export const CVE_TABLE: { field: string; a: string; b: string }[] = [
  { field: "Identifier", a: "CVE-2026-63030", b: "CVE-2026-60137" },
  {
    field: "Vulnerability Type",
    a: "REST API batch route-confusion → RCE",
    b: "SQL Injection (WP_Query author__not_in)",
  },
  {
    field: "CVSS v3.1 Score",
    a: "7.5 (rated critical in practice) [7]",
    b: "Not separately scored in sources",
  },
  {
    field: "Affected Products",
    a: "WordPress 6.9.0–6.9.4; WordPress 7.0.0–7.0.1 [3][10]",
    b: "WordPress 6.8.0–6.8.5; 6.9.0–6.9.4; 7.0.0–7.0.1 [3][10]",
  },
  {
    field: "Fixed Versions",
    a: "WordPress 6.9.5, 7.0.2 [3][10]",
    b: "WordPress 6.8.6, 6.9.5, 7.0.2 [3][10]",
  },
  {
    field: "Authentication Required",
    a: "None [3][8]",
    b: "None (when chained via CVE-2026-63030) [8]",
  },
  {
    field: "Exploitation Status",
    a: "Actively exploited in the wild [1][3]",
    b: "Actively exploited in the wild [1][3]",
  },
  {
    field: "Exploit Maturity",
    a: "Weaponized — multiple public PoCs on GitHub; purpose-built frameworks observed [2][3][10]",
    b: "Weaponized — SQLi component present in public PoC chains [10]",
  },
];

export const TECH_STACK_OPTIONS = [
  "Cloud & Infrastructure",
  "Containers & Orchestration",
  "CI/CD & Developer Tooling",
  "Application & Runtime Stack",
];

export const LANGUAGES = [
  "English (US)",
  "English (UK)",
  "French",
  "German",
  "Japanese",
  "Portuguese (BR)",
  "Spanish",
];

export const COMPANIES = ["Acme Inc.", "Acme North America", "Cardinal Trust Financial"];

/* ------------------------------------------------------------------ *
 * Create-report entry contexts
 *
 * Source collection logic (Figma, "Source Collection Logic"): the flow changes
 * with the entry point and the context it carries. Selected articles and insight
 * cards carry enough context that we never ask what the report is about; a broad
 * context still needs that question to focus the source search; no context needs
 * both the question and the search.
 * ------------------------------------------------------------------ */

/** An article the Threat Graph search turned up, as listed inside the status card. */
export interface FetchedSource {
  id: string;
  title: string;
  source: string;
  age: string;
  /** Colour of the source's favicon dot. */
  hue: string;
}

export const TIME_INTERVAL = { from: "2026-02-14", to: "2026-03-16" };

export const FETCHED_SOURCES: FetchedSource[] = [
  { id: "f1", title: "Allstate", source: "oc[.]one Main page", age: "1d", hue: "#1f2933" },
  { id: "f2", title: "POLAM", source: "oc[.]one Main page", age: "3d", hue: "#3b5bdb" },
  { id: "f3", title: "Heart Care Centers of Ill…", source: "Source", age: "1d", hue: "#e8590c" },
  { id: "f4", title: "WordPress 6.9.5 security release", source: "wordpress.org", age: "2d", hue: "#2bb24c" },
  { id: "f5", title: "wp2shell exploit chain analysed", source: "The Record", age: "4d", hue: "#7048e8" },
];

/* ------------------------------------------------------------------ *
 * Intel Agent view + insight cards (broad context and insight card entries)
 * ------------------------------------------------------------------ */

export interface InsightCard {
  id: string;
  cve: string;
  euvd: string;
  status: "New" | "Updated";
  published: string;
  updated: string;
  weakness: string;
  extraWeaknesses: number;
  cvss: number;
  severity: "Critical" | "High" | "Medium";
  tags: string[];
  summary: string;
  impact: string;
  exploitation: string;
  patch: string;
  mitigation: string[];
  vector: string;
  what: string[];
  latestActivity: string[];
  timeline: { label: string; text: string; date: string }[];
}

export const AGENT = {
  name: "Vulnerability Agent",
  view: "Trending High + CVEs",
  monitoring: "Real-time monitoring",
  filters: ["Last 7 days", "Trending"],
  savedViews: "Your team is using 2 of 20 saved views",
};

export const INSIGHT_CARDS: InsightCard[] = [
  {
    id: "ic1",
    cve: "CVE-2026-43284",
    euvd: "EUVD-2025-11838",
    status: "New",
    published: "3/14/2026",
    updated: "52d ago",
    weakness: "Improper Access Control (CWE-284)",
    extraWeaknesses: 4,
    cvss: 9.8,
    severity: "Critical",
    tags: ["TRENDING", "EXPLOIT"],
    summary:
      "Out-of-bounds read vulnerability in Windows NTFS file system that allows local privilege escalation",
    impact:
      "An attacker could exploit this vulnerability to gain unauthorized elevated privileges on affected Windows systems. The local attack vector requires user interaction and can potentially compromise the system's confidentiality, integrity, and availability. With a CVSS score of 7.8, this is considered a high-severity vulnerability.",
    exploitation:
      "Multiple proof-of-concept exploits are available on github.com. Its exploitation has been reported by various sources, including theverge.com.",
    patch: "A patch is available from Microsoft, released on 2026-05-13.",
    mitigation: [
      "Apply the Microsoft security update immediately",
      "Prioritize patching for the following affected Windows versions: Windows Server 2012 R2, Windows 10 versions 1507, 1607 and 1809, Windows Server 2008 (SP2 and R2), Windows Server 2012, Windows Server 2016, Windows Server 2019",
      "Implement least privilege principles",
      "Monitor for suspicious local privilege escalation attempts and keep systems updated with the latest security patches",
    ],
    vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    what: [
      "Local privilege escalation in the Windows NTFS driver",
      "Chains with any low-privilege foothold",
      "Public PoCs in circulation",
    ],
    latestActivity: [
      "Added to CISA KEV",
      "Exploitation reported by two vendors",
      "Microsoft revised the advisory",
    ],
    timeline: [
      {
        label: "Vulnerability Discovery",
        text: "The vendor learned about this CVE for the first time",
        date: "2026-01-10",
      },
      {
        label: "Vulnerability Disclosure",
        text: "The CVE was published to the National Vulnerability Database",
        date: "2026-03-14",
      },
      {
        label: "Patch Released",
        text: "Microsoft shipped a fix in the May cumulative update",
        date: "2026-05-13",
      },
    ],
  },
  {
    id: "ic2",
    cve: "CVE-2026-63030",
    euvd: "EUVD-2026-20411",
    status: "Updated",
    published: "7/02/2026",
    updated: "6d ago",
    weakness: "Route confusion in the REST API batch endpoint (CWE-863)",
    extraWeaknesses: 2,
    cvss: 7.5,
    severity: "Critical",
    tags: ["TRENDING", "EXPLOIT"],
    summary:
      "REST API batch route-confusion in WordPress Core that lets an unauthenticated request reach privileged internal handlers",
    impact:
      "Chained with CVE-2026-60137 this produces an unauthenticated remote code execution path, tracked publicly as \"wp2shell\". A default WordPress installation on 6.9.0–6.9.4 or 7.0.0–7.0.1 is exploitable with no plugin, theme or credential requirement.",
    exploitation:
      "Actively exploited in the wild. Multiple public PoCs on GitHub and purpose-built exploitation frameworks have been observed.",
    patch: "Fixed in WordPress 6.9.5 and 7.0.2.",
    mitigation: [
      "Patch to WordPress 6.9.5 or 7.0.2 immediately",
      "Audit for administrator accounts created since the disclosure window",
      "Block /wp-json/batch/v1 at the edge until patched",
    ],
    vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
    what: [
      "Unauthenticated RCE chain in WordPress Core",
      "Public-facing marketing sites are in scope",
      "Weaponized exploit available",
    ],
    latestActivity: [
      "Exploitation confirmed in the wild",
      "WordPress shipped 7.0.2",
      "Added to CISA KEV",
    ],
    timeline: [
      {
        label: "Vulnerability Disclosure",
        text: "Coordinated disclosure alongside CVE-2026-60137",
        date: "2026-07-02",
      },
      {
        label: "Exploitation Observed",
        text: "First in-the-wild exploitation reported",
        date: "2026-07-09",
      },
    ],
  },
  {
    id: "ic3",
    cve: "CVE-2026-60137",
    euvd: "EUVD-2026-20412",
    status: "New",
    published: "7/02/2026",
    updated: "6d ago",
    weakness: "SQL Injection in WP_Query author__not_in (CWE-89)",
    extraWeaknesses: 1,
    cvss: 8.1,
    severity: "High",
    tags: ["EXPLOIT"],
    summary:
      "SQL injection in the WP_Query author__not_in parameter, reachable once the batch endpoint is exposed",
    impact:
      "Allows an attacker to write an administrator account and execute arbitrary code when chained with CVE-2026-63030.",
    exploitation: "Actively exploited as the second stage of the wp2shell chain.",
    patch: "Fixed in WordPress 6.8.6, 6.9.5 and 7.0.2.",
    mitigation: [
      "Patch to a fixed WordPress release",
      "Review database logs for anomalous author queries",
    ],
    vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
    what: [
      "Second stage of the wp2shell chain",
      "Requires the batch endpoint to be reachable",
    ],
    latestActivity: ["Exploitation confirmed", "Patch available"],
    timeline: [
      {
        label: "Vulnerability Disclosure",
        text: "Coordinated disclosure alongside CVE-2026-63030",
        date: "2026-07-02",
      },
    ],
  },
  {
    id: "ic4",
    cve: "CVE-2026-2091",
    euvd: "EUVD-2026-18777",
    status: "New",
    published: "6/18/2026",
    updated: "21d ago",
    weakness: "Out-of-bounds write in FortiOS SSL-VPN (CWE-787)",
    extraWeaknesses: 0,
    cvss: 9.2,
    severity: "Critical",
    tags: ["TRENDING", "EXPLOIT"],
    summary:
      "Pre-authentication out-of-bounds write in the FortiOS SSL-VPN daemon allowing remote code execution",
    impact:
      "An unauthenticated attacker reaching the SSL-VPN portal can execute code as root on the appliance, giving a foothold on the network edge.",
    exploitation: "Exploited as a zero-day before the advisory was published.",
    patch: "Fixed in FortiOS 7.4.5 and 7.2.9.",
    mitigation: [
      "Upgrade FortiOS to a fixed release",
      "Disable the SSL-VPN portal until patched",
      "Hunt for anomalous VPN sessions and rotate credentials",
    ],
    vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    what: [
      "Pre-auth RCE on an internet-facing appliance",
      "Exploited as a zero-day",
    ],
    latestActivity: ["Vendor advisory published", "Added to CISA KEV"],
    timeline: [
      {
        label: "Exploitation Observed",
        text: "Zero-day exploitation reported by incident responders",
        date: "2026-06-11",
      },
      {
        label: "Vulnerability Disclosure",
        text: "Fortinet published the advisory and a fix",
        date: "2026-06-18",
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Report bodies
 *
 * The Figma frames only ever show one finished document — the WordPress
 * vulnerability advisory above. Saved reports in the table were written from
 * other templates, so each template shape gets a short body of its own; `{t}`
 * is replaced with what the report is reporting on.
 * ------------------------------------------------------------------ */

export interface ReportSection {
  heading: string;
  paragraphs: string[];
}

const MEMO: ReportSection[] = [
  {
    heading: "Bottom Line",
    paragraphs: [
      "{t} is a material exposure for us, but a contained one. The affected systems sit behind our perimeter controls, patching is under way, and no customer data has been implicated so far. [2][5]",
      "The decision in front of the board is whether to accelerate the remediation window from 30 days to 10, which would pull roughly two sprints of engineering capacity away from the platform roadmap.",
    ],
  },
  {
    heading: "What Changed",
    paragraphs: [
      "Exploitation moved from proof-of-concept to opportunistic scanning within nine days of disclosure, which is faster than the 21-day median we have used for planning. Two peer organisations in our sector have confirmed intrusions attributed to the same activity. [1][7]",
    ],
  },
  {
    heading: "Recommended Position",
    paragraphs: [
      "Accelerate remediation on internet-facing assets only, hold the standard window for internal systems, and report progress against both at the next board meeting. This keeps the roadmap impact to a single sprint while removing the exposure that attackers are actually reaching. [4]",
    ],
  },
];

const FLASH: ReportSection[] = [
  {
    heading: "What Happened",
    paragraphs: [
      "{t} was reported publicly in the last 24 hours and is being actively exploited. The affected component is in use in our estate, and at least one instance is reachable from the internet. [1][3]",
    ],
  },
  {
    heading: "Our Exposure",
    paragraphs: [
      "Asset inventory shows the affected versions running on production and staging tiers. Staging is not internet-facing. The production instance is behind the WAF, but the published exploit path does not depend on any rule the current policy blocks. [6]",
    ],
  },
  {
    heading: "Immediate Actions",
    paragraphs: [
      "Patch the internet-facing instance today, add detection for the published indicators, and hunt back 14 days for the post-exploitation artefacts described in the vendor advisory. Re-assess once telemetry from the hunt is in. [2][9]",
    ],
  },
];

const HUNT: ReportSection[] = [
  {
    heading: "Hypothesis",
    paragraphs: [
      "If an adversary established a foothold related to {t}, we would expect beaconing on a fixed interval with jitter, short-lived named pipes on the initial host, and credential access attempts against adjacent systems within the first 48 hours. [3]",
    ],
  },
  {
    heading: "Data Sources and Coverage",
    paragraphs: [
      "EDR process and network telemetry covers 94% of the estate; the gap is a set of legacy hosts scheduled for decommissioning. Proxy logs are retained for 30 days, which bounds how far back this hunt can look. [5]",
    ],
  },
  {
    heading: "Findings",
    paragraphs: [
      "No confirmed beaconing matched the hypothesis. Two hosts showed anomalous named-pipe activity that resolved to a legitimate management agent. Detection coverage for the primary technique is now in place, so a repeat of this hunt should be cheaper. [8]",
    ],
  },
];

const SUPPLY: ReportSection[] = [
  {
    heading: "Summary",
    paragraphs: [
      "{t} affects a component in our software supply chain rather than software we wrote. The compromise reached us through a transitive dependency, which means the blast radius follows the build graph rather than the network topology. [1][4]",
    ],
  },
  {
    heading: "Affected Builds",
    paragraphs: [
      "Three services pulled the affected version during the exposure window. Two have been rebuilt from a pinned lockfile; the third is blocked on a maintainer release and is running with the dependency vendored and patched in place. [7]",
    ],
  },
  {
    heading: "Containment and Follow-up",
    paragraphs: [
      "Registry credentials used by the affected pipelines have been rotated, published artefacts from the window have been re-signed, and dependency pinning is now enforced at the CI level rather than by convention. [2][10]",
    ],
  },
];

export const REPORT_BODIES: Record<string, ReportSection[]> = {
  "Executive Memo": MEMO,
  "Flash Report": FLASH,
  "Periodic Threat Briefing": MEMO,
  "Threat Hunting Report": HUNT,
  "Adversary Emulation": HUNT,
  "Supply Chain Attack": SUPPLY,
  "Third-Party Vendor Breach": SUPPLY,
  "M&A Cyber Due Diligence": MEMO,
};

/* ------------------------------------------------------------------ *
 * Org Profile values behind each tech-stack bucket
 *
 * Figma "Elicitation interactions": hovering an option shows the Org Profile
 * entries it stands for, with a "View List" affordance.
 * ------------------------------------------------------------------ */

export const TECH_STACK_VALUES: Record<string, string[]> = {
  "Cloud & Infrastructure": [
    "Amazon Web Services", "Google Cloud Platform", "Cloudflare", "HashiCorp Terraform",
    "HashiCorp Vault", "Ubuntu Server", "Amazon Linux 2023", "VMware ESXi",
  ],
  "Containers & Orchestration": [
    "Kubernetes", "Amazon EKS", "Docker Engine", "Helm", "Argo CD", "Harbor",
  ],
  "CI/CD & Developer Tooling": [
    "GitHub Enterprise", "GitHub Actions", "npm", "Artifactory", "SonarQube", "Renovate",
  ],
  "Application & Runtime Stack": [
    "Node.js", "Java 21", "PostgreSQL", "Redis", "NGINX", "WordPress",
  ],
};

/**
 * Who a finished report is distributed to, by audience — the `Distribution:`
 * line under the report title.
 */
export const DISTRIBUTION: Record<string, string> = {
  CISO: "CISO, Security Leadership, Risk Management",
  "Vuln Management": "Vulnerability Management, SOC, IR, Detection Engineering, IT Ops",
  "SOC/IR": "SOC, Incident Response, Detection Engineering",
  "Detection Engineering": "Detection Engineering, SOC, Threat Hunting",
  "IT Operations": "IT Operations, Platform Engineering, SOC",
  "Red Team": "Red Team, Detection Engineering, SOC",
  "Threat Hunting": "Threat Hunting, SOC, Detection Engineering",
  "Risk Management": "Risk Management, CISO, Audit",
  TPRM: "Third-Party Risk Management, Procurement, CISO",
  "Executive Leadership": "Executive Leadership, Board, CISO",
  "M&A": "Corporate Development, CISO, Legal",
};
