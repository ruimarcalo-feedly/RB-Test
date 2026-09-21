import type { IconName } from "../ui/Icon";
import {
  ARTICLES,
  FETCHED_SOURCES,
  INSIGHT_CARDS,
  TIME_INTERVAL,
  type FetchedSource,
  type Template,
} from "../../data/mockData";

/**
 * The Ask AI script for each create-report entry point.
 *
 * Figma: "1 - Selected Articles path", "2 - No context path",
 * "3 - Broad context path", "4 - Insight Card path", plus the
 * "Source Collection Logic" diagram that explains why they differ.
 *
 * Every path runs the same four steps —
 *   0 entry point · 1 gather context and sources · 2 fill in parameters ·
 *   4 report generation
 * — and they differ only in step 1:
 *
 *   articles  context attached, so no source search, but we still ask what else
 *             the reader can tell us
 *   insight   context attached via an internal prompt, which stands in for the
 *             question, so this is the one path that asks nothing
 *   none      subject question, then a full Threat Graph search
 *   broad     subject question (to focus the search) plus the carried context
 *
 * Whatever context a path carries is no longer a bubble of its own in the
 * conversation: it rides on top of the first question, in the card's own
 * attachment strip (Figma annotation on `MessageBoxPanelContainer`: "Any
 * context is shown in the attachmentbox, above elicitation").
 */

export type { CreatePath, CreateContext } from "../../data/context";
import type { CreateContext } from "../../data/context";

/**
 * A piece of carried context as it appears in the first question's attachment
 * strip — Figma `ContextCard`: a 130px card with a favicon, the title on one
 * line, and the source and age beneath it. A context that is a place rather
 * than an article (an agent, a board, a feed) carries only the title.
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
  /** A step that is still happening — the ones that wait on an answer. */
  running?: boolean;
}

export type Act =
  | { t: "ai"; text: string }
  | { t: "user"; text: string }
  /** Open a status card with the given header. */
  | { t: "status"; text: string; steps?: StatusStep[] }
  /** Append a completed sub-step to the open status card. */
  | { t: "step"; step: StatusStep }
  /** Append a step that stays in progress until the reader answers. */
  | { t: "stepRunning"; step: StatusStep }
  /** Tick the step that was waiting. */
  | { t: "tickStep" }
  /** Mark the run's own line done while its later steps carry on. */
  | { t: "tickHead" }
  /** Collapse the open status card and mark it done. */
  | { t: "statusDone"; text: string }
  | { t: "wait"; ms: number }
  /** Ask what the report is about, then continue the script. */
  | { t: "askSubject" }
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

/**
 * The context cards for an entry point, shown along the top of its first
 * question. The selected-articles path carries one per article; a broad
 * context carries the one place it started from; the insight card path carries
 * its prompt instead, and the no-context path carries nothing at all.
 */
export function contextCards(ctx: CreateContext): ContextCard[] {
  if (ctx.path === "articles")
    return ARTICLES.filter((a) => (ctx.articleIds ?? []).includes(a.id))
      .slice(0, 10)
      .map((a) => ({
        icon: "feed" as IconName,
        title: a.title,
        source: "Massachusetts Data Breach Filings",
        age: a.age,
      }));
  if (ctx.path === "broad")
    return [
      {
        icon: CONTEXT_ICON[ctx.contextKind ?? "agent"],
        title: ctx.contextLabel ?? "Trending High + CVEs",
      },
    ];
  return [];
}

/**
 * The preparation, as one run of work.
 *
 * The card opens as soon as the first message has landed and then carries every
 * step through to the end, including the two that wait on the reader: asking
 * what the report is about, and asking for the template's details. Each of those
 * appears as the step in progress, the matching elicitation opens under it, and
 * answering ticks it off and lets the rest of the run continue.
 */

/**
 * The opening question. Every path asks it except the insight card, whose
 * internal prompt already says what the report is about. Where context is
 * carried it is a follow-up rather than the whole subject, so the wording
 * changes with it — see `subjectQuestion` below.
 */
function subjectStep(): Act[] {
  return [
    /* The template is in hand by the time we start asking, so the run's first
       line is done and the waiting step takes over. */
    { t: "tickHead" },
    {
      t: "stepRunning",
      step: { label: "Paused to ask for more details", doneLabel: "Details gathered" },
    },
    { t: "askSubject" },
    { t: "tickStep" },
  ];
}

/** The steps for an entry point that already carries its sources. */
function prepSteps(): Act[] {
  return [
    { t: "step", step: { label: "Fetching Org Profile list" } },
    { t: "wait", ms: 900 },
    { t: "step", step: { label: "Preparing template parameters" } },
    { t: "wait", ms: 700 },
  ];
}

/** The Threat Graph search, used when we have to go and find the sources. */
function searchSteps(withinContext?: string): Act[] {
  return [
    { t: "step", step: { label: "Fetching Org Profile list" } },
    { t: "wait", ms: 700 },
    { t: "step", step: { label: "Determining time interval", interval: TIME_INTERVAL } },
    { t: "wait", ms: 900 },
    {
      t: "step",
      step: {
        label: withinContext
          ? `Searching ${withinContext} for relevant articles and threat intelligence reports`
          : "Searching for relevant articles and threat intelligence reports",
        sources: FETCHED_SOURCES.slice(0, 3),
      },
    },
    { t: "wait", ms: 800 },
    { t: "step", step: { label: "Preparing template parameters" } },
    { t: "wait", ms: 700 },
  ];
}

/** The last waiting step, then the run finishes and the writing starts. */
function paramSteps(): Act[] {
  return [
    { t: "tickHead" },
    { t: "stepRunning", step: { label: "Paused to fill in parameters" } },
    { t: "ask" },
    { t: "tickStep" },
    { t: "wait", ms: 500 },
    { t: "statusDone", text: "Template ready to fill in" },
    { t: "generate" },
  ];
}

/** "an Executive Memo", "an M&A Cyber Due Diligence", "a Flash Report". */
const article = (name: string) => (/^[aeiou]/i.test(name) || /^m&a/i.test(name) ? "an" : "a");

const needsLine = (t: Template) =>
  `I'll put together ${article(t.name)} ${t.name} report for the ${
    t.audience || "selected"
  } audience. I'll need a few details from you as I go.`;

/** The run's first line — the template itself being fetched. */
const RUN = "Gathering template";

/* ------------------------------------------------------------------ */

export function buildScript(ctx: CreateContext, template: Template): Act[] {
  switch (ctx.path) {
    /* The article selection IS the source set, so there is nothing to search
       for — but the selection says what the report draws on rather than what it
       is for, so we still ask what else the reader can tell us, with the
       articles themselves attached to the question. */
    case "articles":
      return [
        { t: "ai", text: needsLine(template) },
        { t: "status", text: RUN },
        { t: "wait", ms: 500 },
        ...subjectStep(),
        ...prepSteps(),
        ...paramSteps(),
      ];

    /* An internal prompt stands in for the subject question, and the insight
       card supplies the context. */
    case "insight": {
      const card = INSIGHT_CARDS.find((c) => c.id === ctx.insightId) ?? INSIGHT_CARDS[0];
      return [
        { t: "user", text: `Make a report about ${card.cve}` },
        { t: "ai", text: needsLine(template) },
        { t: "status", text: RUN },
        { t: "wait", ms: 700 },
        ...prepSteps(),
        ...paramSteps(),
      ];
    }

    /* Nothing carried, so the run opens by asking what the report is about and
       then goes looking for the sources. */
    case "none":
      return [
        { t: "ai", text: needsLine(template) },
        { t: "status", text: RUN },
        { t: "wait", ms: 500 },
        ...subjectStep(),
        ...searchSteps(),
        ...paramSteps(),
      ];

    /* The context is too broad on its own, so we still ask what to focus on,
       and then search inside that context. */
    case "broad":
      return [
        { t: "ai", text: needsLine(template) },
        { t: "status", text: RUN },
        { t: "wait", ms: 500 },
        ...subjectStep(),
        ...searchSteps(ctx.contextLabel ?? "Trending High + CVEs"),
        ...paramSteps(),
      ];
  }
}

/**
 * The opening question. It is the same question either way, but where the entry
 * point already handed us something to work from it reads as a follow-up to
 * that rather than as the whole subject.
 */
export function subjectQuestion(hasContext: boolean) {
  return {
    id: "q-subject",
    label: "Question",
    title: hasContext
      ? "What else can you tell us about this report?"
      : "What is this report about?",
    help: "Tell us as much as you can about what you're looking to report on, to make sure we make it as focused as possible.",
    type: "text" as const,
    required: true,
  };
}
