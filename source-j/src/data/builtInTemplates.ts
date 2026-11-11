import type { Block, Parameter } from "./mockData";

/* ------------------------------------------------------------------ *
 * Built-in template bodies, from Notion
 *
 * Source: Card OS › Cards › "Built in Templates per audience" (one database
 * per audience). Each page there is one template body: its tradecraft, its
 * parameters and its sections. A body is often shared by several audiences
 * (a synced block in Notion), so each body below lists the prototype
 * audiences it serves.
 *
 * Parameter names are the Notion keys recapitalized: `{period_covered}`
 * becomes "Period covered", `{tech_stack}` becomes "Tech stack" (sentence case). In the
 * prompts a parameter is written `{{Name}}`, which the editor shows as a chip.
 * ------------------------------------------------------------------ */

const P = {
  vulnerability: {
    id: "p-cve",
    name: "Vulnerability",
    description: "The vulnerability or vulnerabilities this report is about.",
    type: "Free text",
    optional: false,
    suggestions: true,
    topic: true,
  },
  techStack: {
    id: "p-tech",
    name: "Tech stack",
    description: "The tech stack to assess this report against.",
    type: "Org Profile",
    itemType: "List",
    optional: true,
    suggestions: true,
  },
  periodCovered: {
    id: "p-period",
    name: "Period covered",
    description: "The date range this briefing covers.",
    type: "Date",
    optional: false,
    suggestions: true,
    topic: true,
  },
  briefingFocus: {
    id: "p-briefing-focus",
    question: "What should this briefing focus on?",
    name: "Briefing focus",
    description:
      "To focus the brief on mentions of campaigns, threat actors, or industries you’re actively tracking.",
    type: "Free text",
    optional: true,
    suggestions: true,
  },
  subject: {
    id: "p-subject",
    question: "What is this report about?",
    name: "Subject",
    description: "The event, entity, or topic this report is about.",
    type: "Free text",
    optional: false,
    suggestions: true,
    topic: true,
  },
  relevance: {
    id: "p-relevance",
    question: "Why is this relevant to your organization?",
    name: "Relevance",
    description: "Why is this relevant to the organization?",
    type: "Free text",
    optional: true,
    suggestions: true,
  },
  eventName: {
    id: "p-event-name",
    question: "Which breach or incident does this report cover?",
    name: "Event name",
    description: "The name of the breach or incident this report covers.",
    type: "Free text",
    optional: false,
    suggestions: true,
    topic: true,
  },
  affectedEntity: {
    id: "p-affected-entity",
    question: "What was compromised?",
    name: "Affected entity",
    description: "The compromised package, vendor product, or hardware component.",
    type: "Free text",
    optional: false,
    suggestions: true,
  },
  vendor: {
    id: "p-vendor",
    question: "Which vendor was breached?",
    name: "Vendor",
    description: "The breached vendor or vendors this report covers.",
    type: "Free text",
    optional: false,
    suggestions: true,
    topic: true,
  },
  huntSubject: {
    id: "p-hunt-subject",
    question: "What are you hunting for?",
    name: "Hunt subject",
    description: "The threat actor, technique, or hypothesis being hunted.",
    type: "Free text",
    optional: false,
    suggestions: true,
    topic: true,
  },
  huntRationale: {
    id: "p-hunt-rationale",
    question: "Why are you running this hunt?",
    name: "Hunt rationale",
    description: "The reason for the hunt and the decision it informs.",
    type: "Free text",
    optional: false,
    suggestions: true,
  },
  emulationSubject: {
    id: "p-emulation-subject",
    question: "What should this emulation replicate?",
    name: "Emulation subject",
    description: "The threat actor, scenario, or technique chain being emulated.",
    type: "Free text",
    optional: false,
    suggestions: true,
    topic: true,
  },
  target: {
    id: "p-target",
    question: "Which company is the acquisition target?",
    name: "Target",
    description: "The acquisition target being profiled.",
    type: "Free text",
    optional: false,
    suggestions: true,
    topic: true,
  },
  dealContext: {
    id: "p-deal-context",
    question: "What is the context of this deal?",
    name: "Deal context",
    description: "The deal stage, rationale, or terms shaping this diligence.",
    type: "Free text",
    optional: true,
    suggestions: true,
  },
} satisfies Record<string, Parameter>;

export const TECH_STACK_PARAM: Parameter = P.techStack;
export const CVE_PARAM: Parameter = P.vulnerability;
export const PERIOD_PARAM: Parameter = P.periodCovered;

export interface TemplateBody {
  /** Prototype audiences this body serves. */
  audiences: string[];
  tradecrafts: string[];
  parameters: Parameter[];
  blocks: Block[];
}

let n = 0;
/** A section: its heading and the prompts under it. */
const s = (heading: string, ...prompts: string[]): Block => ({
  id: `nb${++n}`,
  heading,
  prompts,
});

const IEEE = s("References", "Use IEEE citation format.");

/* ---------------- Executive Memo ---------------- */

const EXECUTIVE_MEMO: TemplateBody[] = [
  {
    audiences: ["CISO", "Executive Leadership"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.subject, P.relevance],
    blocks: [
      s(
        "Executive Summary",
        "Open with 1 sentence BLUF: {{Subject}} What has happened and what it means for us. The following sentence should be the so-what, which of the four dimensions this lands in — financial, operational, regulatory, or reputational — and why. If the source does not name our business lines, sector, or geography, this sentence instead states that scope plainly and stops there. Next sentence where the situation currently stands (emerging, ongoing, resolved) and what leadership is being asked to decide or oversee."
      ),
      s(
        "Situation Summary",
        "Provide a brief, high-level synthesis of the curated articles in 2-3 sentences. Do NOT summarize each article individually. Instead, weave the key facts and developments into a unified narrative that tells the full story of the situation.",
        "• Keep each sentence concise",
        "• Focus on {{Subject}}: what happened, who is involved, and what the current trajectory looks like",
        "• Use plain language and avoid acronyms unless defined"
      ),
      s(
        "Analyst Commentary",
        "Use ICD 203 to represent the analyst's perspective on why {{Subject}} is relevant to the specific organization, as per {{Relevance}} if any is mentioned. Write this to reflect the analyst's voice in 2-3 sentences only. Write your claims if you can back them up with evidence from the articles and cite it.",
        "Only if mentioned, focus on:",
        "• The direct or indirect relevance of this situation to the organization's industry, geography, technology stack, or threat profile",
        "• Any elevated risk this situation introduces for the organization",
        "• Key unknowns or uncertainties that leadership should be aware of",
        "• Avoid restating facts already covered in the Situation Summary; this section should add interpretive value",
        "If there is insufficient information to draw meaningful organizational relevance, clearly state that and explain what additional information would be needed."
      ),
      s(
        "Strategic Recommendations",
        "Provide 1-3 specific, actionable strategic recommendations for the CISO to present or act upon in 1 concise sentence each. These must be:",
        "• Directly tied to the threat described in the articles",
        '• Concrete and time-bound where possible (e.g., "within 72 hours", "before next maintenance window")',
        "• Framed in terms of business decision-making, not technical execution",
        'NEVER provide generic advice such as "patch your systems" or "train your employees" without specific context. If the articles do not provide enough information to support a strong recommendation, acknowledge the gap and recommend obtaining further intelligence before acting.'
      ),
      IEEE,
    ],
  },
];

/* ---------------- Vulnerability Advisory ---------------- */

const VULNERABILITY_ADVISORY: TemplateBody[] = [
  {
    audiences: ["CISO"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.vulnerability, P.techStack],
    blocks: [
      s(
        "Executive Summary",
        'The BLUF opening. Tells the reader in 2–4 sentences. the bottom-line answer to "what is this {{Vulnerability}}, when was the disclosure made, how severe, what should I do, when the patches (if any) were released" Do not include any CVE numbers and version numbers in this section. Explain what the affected product does and what the vulnerability lets an attacker do with it.'
      ),
      s(
        "Impact Assessment",
        "What this {{Vulnerability}}, could mean for the organization receiving the report. Potential business and operational consequences, regulatory framing where applicable, asset exposure where applicable.",
        'Impact Assessment describes potential exposure based on CVE details and the relationship to our tech stack — not confirmed exposure. Identify which asset classes are affected by the CVE, and reference {{Tech stack}} only when there is a direct relationship. Close this section with an exposure verdict that answers "so what." Cite every claim in this section. Avoid assumptions; if one is necessary, label it explicitly and justify it in one sentence or less with citations.'
      ),
      s(
        "Recommendations",
        'Extract all recommendations (and their handoff owner) from the articles. For each, give priority (critical/high/medium/low), timeframe (e.g. "within 24 hours"), action, and owner (VulnMgmt/IT/SecOps/Application Owners).',
        'Use only what the articles state and cite every recommendation. Omit any field that isn\'t supported, including the owner if none is named. Format as Owner: action text, e.g. "VulnMgmt: confirm patch deployment status across affected asset inventory and update exposure status".'
      ),
    ],
  },
  {
    audiences: ["Vuln Management", "SOC/IR", "Detection Engineering", "IT Operations"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.vulnerability, P.techStack],
    blocks: [
      s(
        "Executive Summary",
        'The BLUF opening. Tells the reader the bottom-line answer to "what is {{Vulnerability}}, how severe, what should I do" in 2–4 sentences. Reads as a standalone takeaway for readers who go no further. Explain what the affected product does and what the vulnerability lets an attacker do with it.'
      ),
      s(
        "CVE Analysis",
        "The structured detail table on {{Vulnerability}}. Identifier, severity scores, affected products with version ranges, exploitation status, exploit maturity (including any public PoC or weaponized exploit detail), patch availability, zero-day window.",
        "Every CVE requires a cited patch urgency tier label based on a specific four-tier structured decision matrix (Critical, High, Medium, Low) unless overridden by another prompt."
      ),
      s(
        "Technical Details",
        "Plain-language explanation of how the vulnerability works at a technical level — attack vector, exploitation mechanism, privileges required, user interaction required, references to MITRE ATT&CK techniques where the vulnerability appears in attack chains. Every critical patch entry must be written with at least one immediate, actionable interim mitigation."
      ),
      s(
        "Impact Assessment",
        "What {{Vulnerability}} could mean for the organization receiving the report. Potential operational consequences, regulatory framing where applicable, asset exposure where applicable.",
        "Impact Assessment is potential exposure based on {{Vulnerability}} details and the tech stack relationship, not confirmed exposure. Identify which asset classes are affected by the CVE and reference {{Tech stack}} when there is a direct relationship."
      ),
      s(
        "Recommendations",
        'Extract all recommendations (and their handoff owner) from the articles. For each, give priority (critical/high/medium/low), timeframe (e.g. "within 24 hours"), action, and owner (Vulnerability Management/IT/SecOps/Application Owners). Use only what the articles state and cite every recommendation. Do not write anything you can\'t trace to an article. Omit any field that isn\'t supported, including the owner if none is named. If there are no recommendations, say so. Format as Owner: action text, e.g. "Vulnerability Management: confirm patch deployment status across affected asset inventory and update exposure status".'
      ),
      IEEE,
    ],
  },
];

/* ---------------- Flash Report ---------------- */

const FLASH_SUMMARY = s(
  "Executive Summary",
  "Write a concise, high-level executive summary of {{Subject}} in 3–4 sentences. Focus on what happened, why it matters to us and the current state of the situation."
);
const FLASH_TECHNICAL = s(
  "Technical Details",
  "How the event unfolded technically, based on what's been publicly disclosed. Attack vector, TTPs, observed indicators. Structured by kill chain phase as subsections when timeline data supports the reconstruction; single-paragraph descriptive when sparse."
);

const FLASH_REPORT: TemplateBody[] = [
  {
    audiences: ["CISO"],
    tradecrafts: ["Writing Style Rules"],
    parameters: [P.subject, P.techStack],
    blocks: [
      FLASH_SUMMARY,
      s(
        "Impact Assessment",
        "Write 1 paragraph representing the analyst's perspective on why this situation is relevant to the specific organization.",
        "Focus on:",
        "• The direct relevance of this situation to the organization's industry, geography, {{Tech stack}}, or threat profile, if any.",
        "• Any elevated risk this situation introduces for the organization",
        "• Key unknowns or uncertainties that leadership should be aware of",
        "• Avoid restating facts already covered in the Executive Summary; this section should add interpretive value",
        "If there is insufficient information to draw meaningful organizational relevance, clearly state that and explain what additional information would be needed."
      ),
      s(
        "Recommendations",
        "Provide 1-3 specific, actionable strategic recommendations to present or act upon in 1 concise sentence each. These must be:",
        "• Directly tied to the threat described in the articles",
        '• Concrete and time-bound where possible (e.g., "within 72 hours", "before next maintenance window")',
        "• Framed in terms of business decision-making, not technical execution"
      ),
      IEEE,
    ],
  },
  {
    audiences: ["SOC/IR"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.subject],
    blocks: [FLASH_SUMMARY, FLASH_TECHNICAL, IEEE],
  },
  {
    audiences: ["Red Team"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.subject],
    blocks: [
      FLASH_SUMMARY,
      FLASH_TECHNICAL,
      s(
        "Recommendations",
        'Extract all recommendations (and their handoff owner) from the articles. For each, give priority (critical/high/medium/low), timeframe (e.g. "within 24 hours"), action, and owner (VulnMgmt/IT/SecOps/Application Owners). Use only what the articles state and cite every recommendation. Do not write anything you can\'t trace to an article. Omit any field that isn\'t supported, including the owner if none is named. If there are no recommendations, say so. Format as Owner: action text, e.g. "VulnMgmt: confirm patch deployment status across affected asset inventory and update exposure status".'
      ),
      IEEE,
    ],
  },
  {
    audiences: ["Detection Engineering"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.subject],
    blocks: [
      FLASH_SUMMARY,
      FLASH_TECHNICAL,
      s(
        "Detection Rules",
        "Reference every TTP with at least one ready-to-deploy or near-ready detection rule."
      ),
      IEEE,
    ],
  },
];

/* ---------------- Periodic Threat Briefing ---------------- */

const PTB_HEAD: Block[] = [
  s("", "Dates Covered: {{Period covered}}"),
  s(
    "Executive Summary",
    "A 2–4 sentence overview of the most significant threats, incidents, and vulnerabilities. Include ONLY items with an occurrence date between {{Period covered}}. Lead with impact, not mechanism. Prioritize activity relevant to {{Briefing focus}}, if any. Reads as a standalone takeaway for senior stakeholders who may not read the full report. Do NOT close with a call-to-action or recommendation unless one is explicitly stated in a source and cited. Do NOT cite a statistic whose measurement window is wider than the reporting period."
  ),
  s(
    "Key Threats & Active Campaigns",
    "Cover only events published AND occurring within {{Period covered}}. If the event date falls outside {{Period covered}}, do not include it.",
    "Each event entry is 1–3 sentences. The first sentence must include: what happened AND the date it was disclosed. Next sentences cover: who or what is targeted, who is responsible (if attributed), and what tools or malware are involved. Introduce every named campaign, group, or advisory before it is referenced."
  ),
  s(
    "Vulnerabilities & Exploits",
    "Newly disclosed or actively exploited vulnerabilities mentioned in the period. Each entry covers the CVE identifier, affected product, severity, exploitation status, and a one-line impact. Prioritizes actively exploited or critical-rated CVEs. The section is omitted entirely if no vulnerabilities are reported in the period."
  ),
];
const PTB_MITIGATION =
  "Specific, actionable remediation and mitigation steps tied directly to the threats, vulnerabilities, or TTPs covered in this period's report. References specific CVEs, actor names, or malware families from the top threats section. Acceptable to be empty with the note \"No specific mitigation guidance identified in this period's reporting\" rather than filled with unhelpful content.";

const PERIODIC_THREAT_BRIEFING: TemplateBody[] = [
  {
    audiences: ["CISO", "Vuln Management"],
    tradecrafts: ["Writing Style Rules"],
    parameters: [P.periodCovered, P.briefingFocus],
    blocks: [...PTB_HEAD, IEEE],
  },
  {
    audiences: ["SOC/IR", "TPRM", "Risk Management"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.periodCovered, P.briefingFocus],
    blocks: [
      ...PTB_HEAD,
      s(
        "Indicators of Compromise",
        'All IOCs aggregated from the period\'s articles, organized by indicator type and structured in a table with columns: type, value, context, current status (ACTIVE / INACTIVE / UNKNOWN). Defang network indicators in published reports: domain[.]com, http[:]//, IP[.]address. If absent, state "No IOCs were identified in this reporting period". If list has more than 20 IOCs, included it as appendix instead.'
      ),
      s("Mitigation & Response", PTB_MITIGATION),
      IEEE,
    ],
  },
  {
    audiences: ["Threat Hunting"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.periodCovered, P.briefingFocus],
    blocks: [
      ...PTB_HEAD,
      s(
        "Hunting Package",
        "If mentioned in the articles, extract threat hunt the package from what the articles report:",
        "• hypothesis: the adversary behavior to hunt for (from the article's TTPs)",
        "• data_sources: logs/telemetry where this behavior would show up",
        "• detection_logic: queries or pseudo-logic to find it (Sigma/KQL/SPL/etc.)",
        "• indicators: any IOCs mentioned (hashes, IPs, domains, filenames)",
        "• expected_results / follow_up: what a hit looks like and what to do",
        "Only use behavior and indicators stated in the article. If the article has no hunting package, reply: “No hunt package could be derived.”"
      ),
      s(
        "Mitigation & Response",
        PTB_MITIGATION,
        "CONTAIN / BLOCK → SOC",
        "DETECT → Detection Engineering",
        "HUNT → Threat Hunting",
        "PATCH / HARDEN → VulnMgmt / IT",
        "MONITOR → SOC or Detection Engineering"
      ),
      IEEE,
    ],
  },
];

/* ---------------- Supply Chain Attack ---------------- */

const SCA_RECOMMENDATIONS = s(
  "Recommendations",
  "Scan all articles for any actionable recommendations. Write all recommendations from the articles. If there are explicit recommendations about version verification, credential rotation, or dependency audit, flag them and map to the responsible team.",
  "• Identifying compromised versions, deployment inventory, build pipelines → Version Verification → Platform / DevOps / SRE",
  "• Rotating credentials, tokens, secrets, certificates → Credential Rotation → SecOps / IAM / PKI",
  "• SBOM audits, dependency pinning, supply chain controls, maintainer trust → Dependency Audit → Security Engineering / Platform",
  'If no actionable recommendations appear in the articles, note explicitly: "No actionable recommendations identified in coverage at this time."'
);
const SCA_IMPACT = s(
  "Impact Assessment",
  "Potential contamination exposure framing. What this {{Event name}} could mean for us based on what's publicly known and the {{Tech stack}} inventory. Open with CIA Triad framing, version contamination scope, credential blast radius, downstream customer impact potential.",
  "Note: Impact Assessment is potential exposure, not confirmed. You should identify which versions of the dependency contain malicious code, but cannot determine which specific versions we've deployed where. Exposure determination is not your investigation."
);
const ICD206_REFS = s("References", "Use ICD 206 citation format.");

const SUPPLY_CHAIN_ATTACK: TemplateBody[] = [
  {
    audiences: ["CISO"],
    tradecrafts: ["ICD 203", "ICD 206", "Writing Style Rules"],
    parameters: [P.eventName, { ...P.affectedEntity, optional: true }, P.techStack],
    blocks: [
      s(
        "Executive Summary",
        "BLUF opening. Open by naming what was compromised and how {{Affected entity}} is implicated in {{Event name}}. What happened, our potential exposure based on the {{Tech stack}}, what we recommend. 3–5 sentences."
      ),
      s(
        "Background",
        "Explaining what the {{Affected entity}} is (publicly known package / vendor profile, popularity, typical use cases, maintainer history), flag if it's in the {{Tech stack}}."
      ),
      SCA_IMPACT,
      SCA_RECOMMENDATIONS,
      ICD206_REFS,
    ],
  },
  {
    audiences: ["Vuln Management", "SOC/IR", "IT Operations"],
    tradecrafts: ["ICD 203", "ICD 206", "Writing Style Rules"],
    parameters: [P.eventName, P.affectedEntity, P.techStack],
    blocks: [
      s(
        "Executive Summary",
        "BLUF opening. Open by naming what was compromised and how {{Affected entity}} is implicated in {{Event name}}. What happened, our potential exposure based on the {{Tech stack}}, what we recommend. 3–5 sentences. Standalone takeaway."
      ),
      s(
        "Background",
        "Explaining what the {{Affected entity}} is (publicly known package / vendor profile, popularity, typical use cases, maintainer history), flag if it's in the {{Tech stack}}, and give vulnerability context if vuln-driven."
      ),
      s(
        "Technical Details",
        "How the compromise was carried out technically, including reverse-engineering of the malicious package or component. Attack vector, payload behavior, persistence mechanisms, exfiltration paths."
      ),
      SCA_IMPACT,
      SCA_RECOMMENDATIONS,
      ICD206_REFS,
    ],
  },
];

/* ---------------- Third-Party Vendor Breach ---------------- */

const THIRD_PARTY_VENDOR_BREACH: TemplateBody[] = [
  {
    audiences: ["CISO", "TPRM"],
    tradecrafts: ["ICD 203", "ICD 206", "Writing Style Rules"],
    parameters: [P.vendor],
    blocks: [
      s(
        "Executive Summary",
        'BLUF opening. Lead with "{{Vendor}} was breached". What happened, our potential exposure, what we recommend. 2-3 sentences.'
      ),
      s(
        "Background",
        "{{Vendor}} context based. Who the vendor is, the documented fact that we use them (skip if this is not mentioned), prior security posture or breach history (if mentioned, otherwise omit entirely), vulnerability context (if mentioned, otherwise omit). Do not speculate on contract terms, data shared, or specific systems integrated. 3-4 sentences, 1 paragraph."
      ),
      s(
        "Impact Assessment",
        "Potential exposure framing. What this breach could mean for us based on what's publicly known. Use CIA Triad framing, regulatory exposure potential, customer notification triggers. Limit each impact to short 1 paragraph"
      ),
      s(
        "Recommendations",
        "Scan all articles for any actionable recommendations. List and cite all recommendations from the articles. If there are recommendations about vendor coordination, asset identification or customer notification, flag them explicitly.",
        "• Vendor engagement, scope confirmation, remediation steps → Vendor Coordination",
        "• Auditing integrations, reviewing shared data, rotating credentials, revoking access → Asset Identification",
        "• Notification obligations, affected data types, regulatory thresholds → Customer Notification",
        'If no actionable recommendations appear in the source material, note explicitly: "No actionable recommendations identified in the sources at this time."'
      ),
      s("References", "Use ICD 206 for citation instructions"),
    ],
  },
];

/* ---------------- Threat Hunting Report ---------------- */

const THREAT_HUNTING_REPORT: TemplateBody[] = [
  {
    audiences: ["SOC/IR", "Threat Hunting"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.huntSubject, P.huntRationale],
    blocks: [
      s(
        "Hunt Overview",
        "The BLUF for the hunt. States what is being hunted and why according to {{Hunt rationale}}, the intelligence basis, and the bottom-line scope. Self-contained enough that a part-time hunter understands the hunt's purpose without external context."
      ),
      s(
        "Threat Context",
        "Analyze the {{Hunt subject}}. Write a short 3-4 sentence intelligence backstory that grounds the hunt. Describe the entity, why it is relevant to us, use the articles to as references and cite every claim.",
        "If the {{Hunt subject}} is a hypothesis, use ICD 203 and Analysis of Competing Hypothesis method to explain the reasoning chain that motivated the hypothesis."
      ),
      s(
        "Hunt Hypotheses",
        "The report's core. Convert every referenced TTP into a self-contained, testable hunt hypothesis using the following format: IF [adversary behaviour/artefact] THEN [observable indicator/anomaly] SHOULD APPEAR IN [generic data source] COUNTER: [benign explanation to rule out].",
        "• In each, include procedure-level behavioral detail, a baseline expectation, at least one ready-to-run hunt artefact (query/rule), and a counter-hypothesis (a hunt without a counter is just an alert).",
        "• For LOTL techniques, give the procedural distinction between legitimate and malicious use across command-line arguments (benign vs. malicious side-by-side), parent process, child processes, file/registry/network side effects, and timing/frequency — otherwise the hunt drowns in false positives.",
        "• Each hypothesis must stand alone and be runnable independently of the others."
      ),
      s(
        "Hunt Execution Notes",
        "Practical guidance for running the hunt — suggested sequence, prioritisation, the telemetry gaps that would block or weaken it, the measurable outcomes to track, and an honest statement of what CTI cannot determine. Written once for the hunt as a whole, so a part-time hunter has a clear execution path. Includes handoff cues for findings that exceed the hunt's scope.",
        "Note on telemetry gaps and coverage: these are industry-norm observations, not assessments of the org's actual setup. Flag what is commonly under-collected or under-detected (e.g. ScriptBlockLogging often disabled; LOTL persistence often unmonitored without scheduled-task logging) — it does not claim to know this org's logs, coverage map, or detection inventory. The hunter reconciles against the live environment."
      ),
      s(
        "Technical Details",
        "Include a list of TTPs, Threat Hunting Rules and IOCs. For each list read the following instructions:",
        "• TTPs: Extract the TTP sub-technique IDs and procedural facts from the articles (T1053.005, not bare T1053). For each hypothesis, provide: exact command-line arguments and switches; specific file paths, registry keys, scheduled-task names; parent / child process relationships; network behaviours (destination patterns, protocols, port behaviours); file modifications (extensions, naming patterns, permissions, ADS streams); registry side effects (specific keys, value names, value types).",
        "• Threat Hunting Rules: Extract the rules from the articles. Choose format by hunt context, then apply Org Profile override. Each rule must key on relationships and sequences between actions, not on any single IP, domain, or hash, so it still fires after the adversary re-tools. This applies to YARA too: match on structural/behavioral traits, not a specific sample's bytes, or the rule degrades into a glorified hash. Process / network / auth / log telemetry → SIEM query language (default KQL; override to SPL / EQL / YARA-L per Org Profile SIEM preference). File / memory / binary → YARA rule with a metadata block. Cross-platform sharing → Sigma rule (converts to native SIEM via sigmac / uncoder.io).",
        "• IOCs: Present in a table present as artifacts used to prioritize and corroborate hits from the hunting rules. State plainly that IOCs rotate and that absence of a match is not an all-clear. Where possible, flag which artifacts age fastest. Each claim should be cited from a source."
      ),
      IEEE,
    ],
  },
];

/* ---------------- Adversary Emulation ---------------- */

const AE_REFS = s(
  "References",
  "Citation list of sources used to build the emulation plan. Use IEEE citation format."
);
const AE_OVERVIEW = s(
  "Emulation Overview",
  "The BLUF for the {{Emulation subject}}. States who or what is being emulated, the intelligence basis, the engagement objective, and the scope."
);
const AE_PROFILE = s(
  "Adversary Profile",
  "The intelligence backstory grounding the emulation. Depending on the {{Emulation subject}} the adversary profile should mention:",
  "• The actor's profile, target preferences, and signature behaviors, or",
  "• the threat archetype being modeled and who exemplifies it, or",
  "• where the technique chain sits in adversary tradecraft."
);

const ADVERSARY_EMULATION: TemplateBody[] = [
  {
    audiences: ["Red Team"],
    tradecrafts: ["Writing Style Rules"],
    parameters: [P.emulationSubject],
    blocks: [
      AE_OVERVIEW,
      AE_PROFILE,
      s(
        "Attack Flow",
        "The full kill chain framing of the emulation, expressed as a sequenced TTP chain. For complex multi-stage emulations with branching or conditional execution, expressed as a MITRE Attack Flow (the formal machine-readable representation). For simple linear chains, the standard kill-chain phase progression suffices. This section gives the operator the overall map before drilling into per-step procedures."
      ),
      s(
        "Emulation Steps",
        "The core of the report. Each step in the attack chain is rendered with procedure-level execution detail, preconditions, adversary tools, and a specific Atomic Red Team validation script reference. Defensive evasion techniques are flagged separately per step. This is the definitive technical section the operator executes against to replicate the threat.",
        "The closing fields aggregate the operational footprint and threat intelligence boundaries — summarizing the critical Indicators of Compromise (IOCs) generated by the operation and providing an honest statement of what Cyber Threat Intelligence (CTI) cannot determine about the organization's specific environment."
      ),
      AE_REFS,
    ],
  },
  {
    audiences: ["Detection Engineering"],
    tradecrafts: ["ICD 203", "Writing Style Rules"],
    parameters: [P.emulationSubject],
    blocks: [
      AE_OVERVIEW,
      AE_PROFILE,
      s(
        "Attack Flow",
        "This section gives the operator the overall map before drilling into per-step procedures. The full kill chain framing of the emulation, expressed as a sequenced TTP chain. For complex multi-stage emulations with branching or conditional execution, expressed as a MITRE Attack Flow. For simple linear chains, the standard kill-chain phase progression suffices."
      ),
      s(
        "Emulation Steps",
        "Each step in the attack chain rendered with procedure-level execution detail, preconditions, adversary tools, a specific Atomic Red Team validation script reference, and expected detection per step. Evasion considerations are flagged separately per step. This is the section the operator executes against. The closing fields aggregate the purple-team layer across all steps — which steps warrant purple-team validation (industry-norm flagging only), the IOC validation signals the blue team should watch for, and an honest statement of what CTI cannot determine about the org's environment."
      ),
      AE_REFS,
    ],
  },
];

/* ---------------- M&A Cyber Due Diligence ---------------- */

const MA_DUE_DILIGENCE: TemplateBody[] = [
  {
    audiences: ["M&A"],
    tradecrafts: ["ICD 203", "ICD 206", "Writing Style Rules"],
    parameters: [P.target, P.dealContext],
    blocks: [
      s(
        "Deal-Team Summary",
        "The BLUF for the deal team and investment committee. Explain {{Target}} cyber risk posture in a sentence or two, the most material findings, and the deal implication (does anything here affect valuation, deal terms, or warrant a deeper inside-out phase). Written so the investment committee can read only this section and the security reader continues. Explicitly label it as an outside-in, pre-deal snapshot."
      ),
      s(
        "Target Profile & Threat Exposure",
        "Who is {{Target}} from a threat perspective: publicly known business profile, sector and geography, the threat actors and campaign types that target their profile, and whether the target's sector / footprint makes it a higher-interest target. Frames the threat environment the acquirer would be inheriting."
      ),
      s(
        "External Posture Findings",
        "Provide {{Target}} profile organized in these categories: attack surface, breach history, credential / infostealer exposure, dark-web signals, impersonation, technology footprint. Each finding carries a confidence rating (ICD 203) and an explicit note on what it does and does not prove. Collection is passive and external only. Frame every finding as a signal. Do NOT overstate a signal as a confirmed breach or confirmed compromise."
      ),
      s(
        "Acquisition Risk Implications",
        "Explain what the external findings could mean for the deal across valuation, integration, inherited liability, and post-close exposure. Translate posture findings into deal-relevant consequences for corporate development. Frame these as potential implications. If provided, use the following context to frame this section: {{Deal context}}",
        "Note: this section frames deal risks based on outside-in evidence. It does not quantify remediation costs, establish inherited legal liability, or assess the deal's financial impact. Those assessments require inside-out diligence and input from counsel and finance. Flag each gap that only inside-out diligence can close as a known unknown, and pair it with the diligence action needed to close it."
      ),
      s(
        "Recommended Diligence Actions",
        "Scan all articles for the diligence actions. Write and cite each action and map it to the responsible deal-team owner. If there are actions about inside-out diligence scope, deal-term protection, integration planning, or escalation, flag them explicitly.",
        "• Post-LOI technical diligence, questionnaires, scoped assessments → Inside-Out Diligence Scope → Corp Dev / Acquiring CISO",
        "• Reps & warranties, escrow / holdback, indemnity, conditions precedent → Deal-Term Protection → Deal Counsel (framed as considerations for counsel, not legal advice)",
        "• Day-1 connection risk, combined attack surface, integration sequencing → Integration Planning → Acquiring CISO",
        "• Findings that warrant pausing before proceeding → Escalation Before Proceed → Investment Committee",
        'Frame as deal-process actions only. Never operational security tasks against the target, which the acquirer has no pre-close authorization to perform. Inputs and questions, never a proceed / walk / price verdict. If no actionable diligence items appear in the articles, note explicitly: "No actionable diligence items identified in open source coverage at this time."'
      ),
      s("References", "Use ICD 206 for citation instructions."),
    ],
  },
];

/** Every built-in template's bodies, by the template's name in the prototype. */
export const TEMPLATE_BODIES: Record<string, TemplateBody[]> = {
  "Executive Memo": EXECUTIVE_MEMO,
  "Vulnerability Advisory": VULNERABILITY_ADVISORY,
  "Flash Report": FLASH_REPORT,
  "Periodic Threat Briefing": PERIODIC_THREAT_BRIEFING,
  "Supply Chain Attack": SUPPLY_CHAIN_ATTACK,
  "Third-Party Vendor Breach": THIRD_PARTY_VENDOR_BREACH,
  "Threat Hunting Report": THREAT_HUNTING_REPORT,
  "Adversary Emulation": ADVERSARY_EMULATION,
  "M&A Cyber Due Diligence": MA_DUE_DILIGENCE,
};

/** The body a template uses for one audience: its own if Notion has one,
 *  otherwise the template's first. */
export function bodyFor(template: string, audience: string): TemplateBody {
  const bodies = TEMPLATE_BODIES[template];
  return bodies.find((b) => b.audiences.includes(audience)) ?? bodies[0];
}
