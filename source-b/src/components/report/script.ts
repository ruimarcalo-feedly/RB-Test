import type { IconName } from "../ui/Icon";
import {
  ARTICLES,
  AUDIENCE_MENU_LABEL,
  INSIGHT_CARDS,
  type FetchedSource,
  type Template,
} from "../../data/mockData";

/**
 * The Ask AI script for each create-report entry point.
 *
 * Figma "[2.1 Parameter Revision": five paths — selected articles, Intel Agent
 * selection, no context, broad context and insight card — that all run the
 * same steps:
 *
 *   0 entry point · 1 gather audience · 2 fill in parameters ·
 *   3 further details (always appended) · 4 report generation
 *
 * What differs is what the entry point carries. It rides on the opening
 * message as attachments, and it is what the parameter suggestions are drawn
 * from: CVEs picked in an agent or opened in an insight card arrive already
 * ticked, CVEs found in articles or in an agent's table are offered, and with
 * no context at all the CVE is typed in.
 */

export type { CreatePath, CreateContext } from "../../data/context";
import type { CreateContext } from "../../data/context";

/**
 * A piece of carried context — Figma `ContextCard`: a 130px card with an icon,
 * the title on one line, and the source and age beneath it. A context that is
 * a place or an entity (an agent, a CVE) carries only the title.
 */
export interface ContextCard {
  icon: IconName;
  title: string;
  source?: string;
  age?: string;
}

export interface StatusStep {
  label: string;
  /** What the step is called once it is ticked, where that differs. */
  doneLabel?: string;
  /** A date range chip, as under "Determining time interval". */
  interval?: { from: string; to: string };
  /** Articles found, as under "Searching for relevant articles…". */
  sources?: FetchedSource[];
  /** A step that is still happening. */
  running?: boolean;
}

export type Act =
  | { t: "ai"; text: string }
  | { t: "user"; text: string; cards?: ContextCard[] }
  /** Ask who the report is for, then continue the script. */
  | { t: "askAudience" }
  /** Hand over to the parameter questions. */
  | { t: "ask" }
  /** Everything is answered — write the report. */
  | { t: "generate" };

/* ------------------------------------------------------------------ */

const CONTEXT_ICON: Record<NonNullable<CreateContext["contextKind"]>, IconName> = {
  agent: "bug",
  board: "star",
  folder: "list",
  feed: "feed",
};

/** What the entry point carried, as the attachments on the opening message. */
export function contextCards(ctx: CreateContext): ContextCard[] {
  switch (ctx.path) {
    case "articles":
      return ARTICLES.filter((a) => (ctx.articleIds ?? []).includes(a.id))
        .slice(0, 10)
        .map((a) => ({
          icon: "feed" as IconName,
          title: a.title,
          source: "Massachusetts Data Breach Filings",
          age: a.age,
        }));
    case "selection":
      return (ctx.cveIds ?? []).map((cve) => ({ icon: "bug" as IconName, title: cve }));
    case "insight": {
      const card = INSIGHT_CARDS.find((c) => c.id === ctx.insightId) ?? INSIGHT_CARDS[0];
      return [{ icon: "bug", title: card.cve }];
    }
    case "broad":
      return [
        {
          icon: CONTEXT_ICON[ctx.contextKind ?? "agent"],
          title: ctx.contextLabel ?? "Trending High + CVEs",
        },
      ];
    case "none":
      return [];
  }
}

/**
 * The vulnerabilities to offer for a Vulnerability Advisory, from whatever the
 * entry point carried (Figma "Elicitation Variants", Open context input type).
 * An explicit pick, rows selected in an Intel Agent or the insight card that
 * was open, arrives pre-selected; past four of them the card switches to a
 * MultiSearchSelect. Suggestions inferred from articles or an agent's table
 * are offered unticked, and with no context the answer is typed in.
 */
export function cveSuggestions(
  ctx: CreateContext
): { options: string[]; ticked: string[] } | null {
  switch (ctx.path) {
    case "selection": {
      const picked = ctx.cveIds ?? [];
      return { options: picked, ticked: picked };
    }
    case "insight": {
      const card = INSIGHT_CARDS.find((c) => c.id === ctx.insightId) ?? INSIGHT_CARDS[0];
      return { options: [card.cve], ticked: [card.cve] };
    }
    case "articles":
      /* Figma annotation: "CVE suggestions are pulled from the attached
         articles in the context." */
      return {
        options: ["CVE-2021-44228", "CVE-2014-0160", "CVE-2023-34362", "CVE-2017-0144"],
        ticked: [],
      };
    case "broad":
      /* Figma annotation: "CVE suggestions are pulled from the attached info
         regarding the top CVEs on the table." */
      return { options: INSIGHT_CARDS.slice(0, 4).map((c) => c.cve), ticked: [] };
    case "none":
      return null;
  }
}

/** "an Executive Memo", "an M&A Cyber Due Diligence", "a Flash Report". */
const article = (name: string) => (/^[aeiou]/i.test(name) || /^m&a/i.test(name) ? "an" : "a");

export function buildScript(
  ctx: CreateContext,
  template: Template,
  askAudience: boolean,
  /** No parameters to fill in: the flow only asks what the report is about. */
  parameterless = false
): Act[] {
  const cards = contextCards(ctx);
  /* Figma "Create Report Flow": the opening message names the template and,
     when it has one, its audience, both in bold. What the entry point carried
     follows in a message of its own. */
  const audienceLabel = AUDIENCE_MENU_LABEL[template.audience] ?? template.audience;
  const opening: Act[] = [
    {
      t: "user",
      text:
        template.audience && !askAudience
          ? `Create a report using the **${template.name}** template for **${audienceLabel}** Audience.`
          : `Create a report using the **${template.name}** template.`,
    },
    ...(cards.length ? ([{ t: "user", text: "Include the following:", cards }] as Act[]) : []),
  ];
  return [
    ...opening,
    ...(askAudience
      ? ([
          { t: "ai", text: `I can help putting together ${article(template.name)} ${template.name} report.` },
          { t: "ai", text: "Let\u2019s start by selecting an audience." },
          { t: "askAudience" },
        ] as Act[])
      : parameterless
        ? ([
            {
              t: "ai",
              text: "For this report, I first need to understand better what you\u2019re looking for this report to be about.",
            },
          ] as Act[])
        : ([
            {
              t: "ai",
              text: `I can help putting together ${article(template.name)} ${template.name} report. I just need to ask you a few questions.`,
            },
          ] as Act[])),
    { t: "ask" },
    { t: "generate" },
  ];
}

/**
 * The opening question for the templates that don't have a subject parameter
 * of their own yet. The Vulnerability Advisory asks for its CVE ID instead.
 */
export function subjectQuestion() {
  return {
    id: "q-subject",
    label: "Question",
    title: "What is this report about?",
    help: "Tell us as much as you can about what you\u2019re looking to report on, to make sure we make it as focused as possible.",
    type: "text" as const,
    required: true,
  };
}

/** Figma STEP 3: "Further details question is always appended". */
export function furtherDetailsQuestion() {
  return {
    id: "q-further",
    label: "Question",
    title: "Do you have any further instructions?",
    help: "This can help us tailor your report further",
    type: "text" as const,
    placeholder: "Write in your answer here",
    required: false,
  };
}
