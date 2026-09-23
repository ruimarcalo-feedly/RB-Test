import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon, Spinner, type IconName } from "../ui/Icon";
import { Button, Field, Select, Popover, MenuItem } from "../ui/primitives";
import { useStore, nextId } from "../../state/store";
import { PromptText } from "../editor/PromptText";
import {
  buildScript,
  contextCards,
  subjectQuestion,
  type Act,
  type ContextCard,
  type CreateContext,
  type StatusStep,
} from "./script";
import { suggestOptions, suggestionSource, type Signals, type SuggestedOption } from "../../data/suggestions";
import { EMPTY_BAND, bandVars, brandVars, type Brand } from "../../data/brand";
import { PageBandEditor } from "../editor/PageBandEditor";
import { ReportDocument } from "./ReportDocument";
import { VULN_ADVISORY_DOC, proseDoc, type DocNode } from "../../data/reportDoc";
import {
  ARTICLES,
  COMPANIES,
  REPORT_META,
  FETCHED_SOURCES,
  GENERATED_TITLE,
  INSIGHT_CARDS,
  LANGUAGES,
  REPORT_BODIES,
  TECH_STACK_VALUES,
  THREAT_GRAPH_SOURCES,
  type SourceItem,
  type Template,
} from "../../data/mockData";

type Tab = "ask" | "sources" | "details";

/** script → questions → generating → done, matching steps 1–4 in the Figma flows. */
type Phase = "script" | "questions" | "generating" | "done";

interface ChatEntry {
  id: string;
  kind: "ai" | "user" | "status";
  text?: string;
  /** Status cards only. */
  state?: "running" | "ok";
  steps?: StatusStep[];
  expanded?: boolean;
  /** Rebuilt transcripts mount all at once, so they skip the entry animation. */
  instant?: boolean;
  /** The answers, posted as one message once the run is done. */
  pairs?: { q: string; a: string }[];
  /** The run's own line is done while its later steps carry on. */
  headDone?: boolean;
}

interface Question {
  id: string;
  label: string;
  /** Icon in the tag; parameters use the `{ }` braces. */
  icon?: IconName;
  /** The parameter's description, shown when the tag is hovered. */
  tagHelp?: string;
  title: string;
  help?: string;
  /** options = multi-select, radio = single-select (the extra steps), text = free. */
  type: "options" | "radio" | "text";
  options?: SuggestedOption[];
  /** The "Other (use @ …)" row — the language step doesn't offer one. */
  allowOther?: boolean;
  required?: boolean;
}

export function ReportEditor({ context, templateId }: { context: CreateContext; templateId: string }) {
  const { templates, reports, closeOverlay, addReport, toast, settings, openTemplateEditor, brands } =
    useStore();
  const template = templates.find((t) => t.id === templateId)!;

  /**
   * Set when the editor was opened from the "View previous reports" table.
   * The report already exists, so the flow is not re-run — its finished
   * transcript is rebuilt and the editor opens in its done state.
   */
  const saved = context.savedReportId
    ? reports.find((r) => r.id === context.savedReportId)
    : undefined;

  const [tab, setTab] = useState<Tab>("ask");
  const [phase, setPhase] = useState<Phase>(saved ? "done" : "script");
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {});
  const [subject, setSubject] = useState(saved?.subject ?? "");
  const [composer, setComposer] = useState("");
  const [applying, setApplying] = useState(false);
  const [language, setLanguage] = useState(
    saved?.language ?? settings.languages[0] ?? "English (US)"
  );
  const [company, setCompany] = useState(
    saved?.company || settings.companies[0] || COMPANIES[0]
  );
  const [title, setTitle] = useState(saved?.headline ?? "New report");
  /* The report inherits the template's brand and can be moved onto another one
     here without going back to the template — the styling is a property of
     this report from the moment it is written. */
  const [brandId, setBrandId] = useState<string | undefined>(template.brandId);
  /** Sources / Details edits that need a regeneration before they take effect. */
  const [dirty, setDirty] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  /**
   * The template sheet can be pushed down to the bottom edge and pulled back.
   * It starts collapsed and rises on its own once the flow starts working, so
   * opening the editor doesn't land with the template already in the way.
   */
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Once the reader has moved the sheet themselves, we stop moving it for them. */
  const sheetTouched = useRef(false);
  const sheetRaised = useRef(false);
  const exportRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const insight = context.insightId
    ? INSIGHT_CARDS.find((c) => c.id === context.insightId)
    : undefined;

  /* ---------------- sources this report is working from ---------------- */

  const attachedArticles = useMemo(
    () => ARTICLES.filter((a) => (context.articleIds ?? []).includes(a.id)),
    [context.articleIds]
  );

  /** Threat Graph list: the selected/fetched sources, then the graph's own hits. */
  const [sources, setSources] = useState<SourceItem[]>(() => {
    const carried: SourceItem[] =
      context.path === "articles"
        ? attachedArticles.map((a) => ({
            id: `src-${a.id}`,
            title: a.title,
            kind: "article",
            source: "Massachusetts Data Breach Filings",
            age: a.age,
            tags: ["Selected by you"],
            checked: true,
          }))
        : context.path === "insight" && insight
          ? [
              {
                id: `src-${insight.id}`,
                title: insight.cve,
                kind: "cve",
                tags: [insight.weakness],
                cvss: `CVSS ${insight.cvss}`,
                cvssHigh: insight.cvss >= 8,
                exploit: insight.tags.includes("EXPLOIT"),
                checked: true,
              },
            ]
          : [];
    return [...carried, ...THREAT_GRAPH_SOURCES];
  });

  /**
   * The generated report's headline. Nothing in a written report is composed
   * from what the user typed on the way in: every path produces the one
   * finished document the Figma frames show, under its title.
   */
  const reportTitle = saved ? saved.headline : GENERATED_TITLE;

  /** Signals sent off to build the parameter suggestions. */
  const signals: Signals = useMemo(
    () => ({
      articleTitles:
        context.path === "articles"
          ? attachedArticles.map((a) => a.title)
          : context.path === "insight" && insight
            ? [insight.cve]
            : FETCHED_SOURCES.slice(0, 3).map((s) => s.title),
      templateName: template.name,
      templateDescription: template.description,
      // The insight card's own summary rides along as the subject — it is what
      // the internal "Create a report about {entity}" prompt carries.
      subject: subject || (insight ? `${insight.cve} — ${insight.summary}` : undefined),
      contextLabel: context.contextLabel,
    }),
    [context, attachedArticles, insight, template, subject]
  );

  /**
   * Step 2: one card per template parameter. The opening question is step 1 and
   * is deliberately not part of this pager — the Figma frames show "1 of 2" for
   * a template with one parameter on every path.
   */
  const questions = useMemo<Question[]>(() => {
    const qs: Question[] = template.parameters.map((p) => {
      const options = p.type === "Org Profile" ? suggestOptions(p.name, signals) : undefined;
      return {
        id: p.id,
        label: p.name === "Tech stack" ? "Tech stacks" : p.name,
        tagHelp: p.description,
        title:
          p.name === "Tech stack"
            ? "What's in your tech stack?"
            : `What should we use for ${p.name}?`,
        help: options ? suggestionSource(signals, options) : undefined,
        type: p.type === "Org Profile" ? ("options" as const) : ("text" as const),
        options,
        required: !p.optional,
      };
    });
    /* Figma "Create Report Flow - EXTRA steps" and "Report Builder settings":
       each of the three settings says the same thing — "we will ask which to
       use when generating a report" — so a step appears only when the setting
       actually leaves a choice open. One value each, and the flow asks nothing. */
    if (settings.languages.length > 1) {
      qs.push({
        id: "q-language",
        label: "Language",
        icon: "text",
        title: "What language should this report be in?",
        help: "Options are coming from your Report Builder settings",
        type: "radio",
        allowOther: false,
        options: [...settings.languages, "Something else"].map((l) => ({
          label: l,
          suggested: false,
        })),
      });
    }
    if (settings.companies.length !== 1) {
      qs.push({
        id: "q-company",
        label: "Company Overview",
        icon: "building",
        title: "What company is this report for?",
        help: settings.companies.length
          ? "Options are coming from your Report Builder settings"
          : "Suggestions are coming from your Org Profile",
        type: "radio",
        options: (settings.companies.length ? settings.companies : COMPANIES).map((c) => ({
          label: c,
          suggested: false,
        })),
      });
    }
    if (settings.brands.length > 1) {
      qs.push({
        id: "q-brand",
        label: "Brand",
        icon: "brand",
        title: "Which brand should this report use?",
        help: "Options are coming from your Report Builder settings",
        type: "radio",
        allowOther: false,
        options: settings.brands.map((b) => ({ label: b, suggested: false })),
      });
    }

    return qs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    template,
    signals.articleTitles.join("|"),
    subject,
    settings.languages,
    settings.companies,
    settings.brands,
  ]);

  /* ---------------- the script runner ---------------- */

  const script = useMemo(() => buildScript(context, template), [context, template]);
  /* Whatever the entry point carried, shown along the top of the first question
     rather than as a bubble of its own. */
  const cards = useMemo(() => contextCards(context), [context]);
  const subjectQ = useMemo(() => subjectQuestion(cards.length > 0), [cards.length]);
  const cursor = useRef(0);
  const [awaitingSubject, setAwaitingSubject] = useState(false);

  const push = (e: Omit<ChatEntry, "id">) => setChat((c) => [...c, { id: nextId("c"), ...e }]);

  const patchLastStatus = (fn: (e: ChatEntry) => ChatEntry) =>
    setChat((c) => {
      const i = [...c].reverse().findIndex((e) => e.kind === "status" && e.state === "running");
      if (i < 0) return c;
      const idx = c.length - 1 - i;
      return c.map((e, j) => (j === idx ? fn(e) : e));
    });

  /** A beat between one message landing and the next one starting. */
  const BEAT = 420;

  const after = (ms: number) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const run = () => {
    while (cursor.current < script.length) {
      const act: Act = script[cursor.current];
      cursor.current += 1;
      /* Everything in the conversation lands one thing at a time — including
         the elicitation card, which only opens once the message before it has
         arrived. A script step that already carries its own wait keeps it. */
      const pace = () => {
        if (script[cursor.current]?.t !== "wait") {
          after(BEAT);
          return true;
        }
        return false;
      };
      switch (act.t) {
        case "ai":
          push({ kind: "ai", text: act.text });
          if (pace()) return;
          break;
        case "user":
          push({ kind: "user", text: act.text });
          if (pace()) return;
          break;
        case "status":
          push({ kind: "status", text: act.text, state: "running", steps: act.steps ?? [], expanded: true });
          /* The first piece of work the AI does is preparing this template, so
             that is the moment the sheet rises into view. */
          if (!sheetRaised.current && !sheetTouched.current) {
            sheetRaised.current = true;
            setSheetOpen(true);
          }
          if (pace()) return;
          break;
        case "step":
          patchLastStatus((e) => ({ ...e, steps: [...(e.steps ?? []), act.step] }));
          break;
        case "stepRunning":
          patchLastStatus((e) => ({
            ...e,
            steps: [...(e.steps ?? []), { ...act.step, running: true }],
          }));
          if (pace()) return;
          break;
        case "tickHead":
          patchLastStatus((e) => ({ ...e, headDone: true }));
          break;
        case "tickStep":
          /* A step that was waiting on an answer is named for the wait
             ("Paused to ask for more details"); once it has one it is named for
             what it got ("Details gathered"). */
          patchLastStatus((e) => ({
            ...e,
            steps: (e.steps ?? []).map((st) =>
              st.running ? { ...st, running: false, label: st.doneLabel ?? st.label } : st
            ),
          }));
          break;
        case "statusDone":
          patchLastStatus((e) => ({ ...e, text: act.text, state: "ok", expanded: false }));
          break;
        case "wait":
          after(act.ms);
          return;
        case "askSubject":
          setAwaitingSubject(true);
          setPhase("questions");
          return;
        case "ask":
          setPhase("questions");
          return;
        case "generate":
          startGenerating();
          return;
      }
    }
  };

  /**
   * A finished report's conversation, rebuilt from the script its entry point
   * would have run plus the answers it was created with — the transcript the
   * Figma "Report Builder - Ask AI" frames show for a completed report.
   */
  const transcript = (): ChatEntry[] => {
    const out: ChatEntry[] = [];
    const add = (e: Omit<ChatEntry, "id">) =>
      out.push({ id: nextId("c"), instant: true, ...e });
    const lastStatus = () => [...out].reverse().find((e) => e.kind === "status");
    for (const act of script) {
      switch (act.t) {
        case "ai":
          add({ kind: "ai", text: act.text });
          break;
        case "user":
          add({ kind: "user", text: act.text });
          break;
        case "status":
          add({
            kind: "status",
            text: act.text,
            state: "ok",
            steps: act.steps ?? [],
            expanded: false,
            headDone: true,
          });
          break;
        case "step":
        /* In a finished report every step is done, including the two that
           waited on an answer. */
        case "stepRunning": {
          const e = lastStatus();
          if (e)
            e.steps = [
              ...(e.steps ?? []),
              { ...act.step, label: act.step.doneLabel ?? act.step.label },
            ];
          break;
        }
        case "statusDone": {
          const e = lastStatus();
          if (e) e.text = act.text;
          break;
        }
        case "askSubject":
          /* Nothing is posted as the questions are answered — they all go up
             together at the end, so the subject rides in that block rather
             than as a bubble of its own. */
          break;
        default:
          break;
      }
    }
    add({ kind: "user", pairs: answerPairs() });
    add({
      kind: "ai",
      text: "Perfect! I've got everything I need, and I will now start generating the report. I'll ping you when I'm done.",
    });
    add({ kind: "status", text: "Report successfully completed", state: "ok", steps: [], expanded: false });
    return out;
  };

  useEffect(() => {
    if (saved) setChat(transcript());
    else run();
    return () => timers.current.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, qIndex, phase, awaitingSubject]);

  /* ---------------- answering ---------------- */

  const answerSubject = (value: string) => {
    setSubject(value);
    setAwaitingSubject(false);
    setPhase("script");
    after(BEAT);
  };

  const current = questions[qIndex];
  const showSubject = awaitingSubject && phase === "questions";
  const showQuestion = !awaitingSubject && phase === "questions" && Boolean(current);
  /** Answers by parameter name, so the sheet can show them in the prompts. */
  const paramValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of template.parameters) {
      const v = answers[p.id];
      if (v) out[p.name] = v;
    }
    return out;
  }, [template.parameters, answers]);

  /** The parameter the open question is about, marked out in the template sheet. */
  const activeParam = showQuestion
    ? template.parameters.find((p) => p.id === current.id)?.name
    : undefined;

  const answerCurrent = (value: string) => {
    const q = questions[qIndex];
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (q.id === "q-language" && value && value !== "Something else") setLanguage(value);
    if (q.id === "q-company" && value) setCompany(value);
    /* The brand answer is the report's brand, so the page restyles as soon as
       the question is answered rather than only once the report is written. */
    if (q.id === "q-brand" && value) {
      const picked = brands.find((b) => b.name === value);
      if (picked) setBrandId(picked.id);
    }

    /* Nothing is posted while the run is going — the answers go up together
       once it finishes, so the conversation isn't interleaved with the card. */
    setPhase("script");
    timers.current.push(
      window.setTimeout(() => {
        if (qIndex + 1 < questions.length) {
          setQIndex((i) => i + 1);
          setPhase("questions");
        } else {
          /* The run picks up where it left off: tick the step, finish the card,
             then write the report. */
          setQIndex(questions.length);
          after(BEAT);
        }
      }, BEAT * 0.7)
    );
  };

  /** Every question the reader answered, in the order they were asked. */
  const answerPairs = (a: Record<string, string> = answers, subj = subject) => {
    const out: { q: string; a: string }[] = [];
    if (subj.trim()) out.push({ q: subjectQ.title, a: subj.trim() });
    for (const q of questions) {
      out.push({
        q: q.title,
        a: a[q.id] || "Skip",
      });
    }
    return out;
  };

  const startGenerating = () => {
    setQIndex(questions.length);
    push({ kind: "user", pairs: answerPairs() });
    push({
      kind: "ai",
      text: "Perfect! I've got everything I need, and I will now start generating the report. I'll ping you when I'm done.",
    });
    push({ kind: "status", text: "Generating new report", state: "running", steps: [], expanded: false });
    setPhase("generating");
    const t = window.setTimeout(() => {
      setTitle(reportTitle);
      setPhase("done");
      patchLastStatus((e) => ({ ...e, text: "Report successfully completed", state: "ok" }));
      toast("Report was successfully completed");
      addReport({
        id: nextId("r"),
        headline: reportTitle,
        templateName: template.name,
        templateAudience: template.audience || "CISO",
        createdBy: "Rui Marçalo",
        createdOn: "Sep 1, 2026",
        // Kept so the row in "View previous reports" can reopen this report.
        origin: { ...context, savedReportId: undefined },
        subject,
        answers,
        language,
        company,
      });
    }, 2600);
    timers.current.push(t);
  };

  const sendComposer = () => {
    if (!composer.trim() || phase !== "done" || applying) return;
    push({ kind: "user", text: composer.trim() });
    setComposer("");
    setApplying(true);
    push({ kind: "status", text: "Applying changes to report", state: "running", steps: [], expanded: false });
    const t = window.setTimeout(() => {
      setApplying(false);
      patchLastStatus((e) => ({ ...e, text: "Changes applied", state: "ok" }));
      toast("Report was successfully updated");
    }, 2200);
    timers.current.push(t);
  };

  /* ---------------- Sources / Details regeneration ---------------- *
   * Figma "Report Builder - Sources" and "- Details": changing a source, the
   * language or the Company Overview reveals Cancel / Regenerate, and regenerating
   * puts the document back into its skeleton state while it is rebuilt. */

  const applied = useRef({ sources, language, company });

  const cancelChanges = () => {
    setSources(applied.current.sources);
    setLanguage(applied.current.language);
    setCompany(applied.current.company);
    setDirty(false);
  };

  const regenerate = () => {
    if (regenerating) return;
    setRegenerating(true);
    const next = { sources, language, company };
    const t = window.setTimeout(() => {
      applied.current = next;
      setRegenerating(false);
      setDirty(false);
      toast("Report was successfully regenerated");
    }, 2400);
    timers.current.push(t);
  };

  const toggleStatus = (id: string) =>
    setChat((c) => c.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)));

  /* ---------------- render ---------------- */

  const generated = phase === "done";

  return (
    <div className="editor">
      <div className="editor-top">
        <Button onClick={closeOverlay}>Close</Button>
        <div className="editor-title">
          <span className="truncate">{title}</span>
          {!generated && title === "New report" && (
            <span className="kind">
              {template.kind === "custom" ? "Custom Template" : "Built-in template"}
            </span>
          )}
        </div>
        <span className="spacer" />
        {generated ? (
          <>
            <span className="t-body3 light">Edited just now</span>
            <Button icon="history" title="Version history" />
            <button
              ref={exportRef}
              className="btn primary"
              onClick={() => setExportMenu((o) => !o)}
            >
              <Icon name="export" size={16} />
              Export
            </button>
            {exportMenu && (
              <Popover anchorRef={exportRef} onClose={() => setExportMenu(false)} align="end" width={228}>
                <MenuItem
                  icon="doc"
                  onClick={() => {
                    setExportMenu(false);
                    toast("Exporting as PDF");
                  }}
                >
                  Export as PDF
                </MenuItem>
                <MenuItem
                  icon="doc"
                  onClick={() => {
                    setExportMenu(false);
                    toast("Exporting as DOC");
                  }}
                >
                  Export as DOC
                </MenuItem>
                <MenuItem
                  icon="text"
                  onClick={() => {
                    setExportMenu(false);
                    toast("Copied .MD to clipboard");
                  }}
                >
                  Copy .MD to clipboard
                </MenuItem>
              </Popover>
            )}
          </>
        ) : phase === "generating" ? (
          <>
            <Button icon="history" title="Version history" />
            <Button icon="export" disabled>
              Export
            </Button>
          </>
        ) : (
          <>
            <span className="t-body3 light">Edited just now</span>
            <Button icon="ellipsis" title="More" />
            <Button variant="primary">Save</Button>
          </>
        )}
      </div>

      <div className="editor-body">
        <aside className="editor-side wide">
          <div className="tabs left">
            <button className={`tab ${tab === "ask" ? "active" : ""}`} onClick={() => setTab("ask")}>
              <Icon name="sparkle" size={16} />
              Ask AI
            </button>
            {/* Nothing to look at in either until the report exists. */}
            <button
              className={`tab ${tab === "sources" ? "active" : ""}`}
              onClick={() => setTab("sources")}
              disabled={!generated}
              title={generated ? undefined : "Available once the report is written"}
            >
              <Icon name="link" size={16} />
              Sources
            </button>
            <button
              className={`tab ${tab === "details" ? "active" : ""}`}
              onClick={() => setTab("details")}
              disabled={!generated}
              title={generated ? undefined : "Available once the report is written"}
            >
              <Icon name="details" size={16} />
              Details
            </button>
          </div>

          {tab === "ask" && (
            <>
              <div className="side-scroll" ref={scrollRef}>
                <div className="chat">
                  {chat.map((e) => (
                    <ChatBubble key={e.id} entry={e} onToggle={() => toggleStatus(e.id)} />
                  ))}
                </div>
              </div>

              {/* The elicitation card and the composer share this slot; the card
                  takes the composer's place while a question is open. */}
              <div className="composer-slot">
                {showSubject ? (
                  <ElicitationCard
                    key="subject"
                    q={subjectQ}
                    index={0}
                    pager={false}
                    cards={cards}
                    onBack={() => {}}
                    onNext={answerSubject}
                    /* The parameter questions come after it, so the opening
                       question always continues rather than finishing. */
                    isLast={false}
                  />
                ) : showQuestion ? (
                  <ElicitationCard
                    key={current.id}
                    q={current}
                    index={qIndex}
                    onBack={() => setQIndex((i) => Math.max(0, i - 1))}
                    onNext={answerCurrent}
                    isLast={qIndex === questions.length - 1}
                  />
                ) : (
                  <div className={`composer ${generated ? "" : "busy"}`}>
                    <textarea
                      placeholder={
                        generated ? "Write here any changes you\u2019d like to make" : "Thinking..."
                      }
                      value={composer}
                      disabled={!generated}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendComposer();
                        }
                      }}
                    />
                    <div className="composer-foot">
                      <button className="composer-plus" title="Attach">
                        <Icon name="plus" size={16} />
                      </button>
                      {generated && !applying ? (
                        <button className="send" onClick={sendComposer} title="Send">
                          <Icon name="arrow-up" size={16} />
                        </button>
                      ) : (
                        /* While the AI is working the control is the stop mark on
                           its own, with no button behind it. */
                        <span className="composer-stop" aria-hidden>
                          <Icon name="stop" size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "sources" && (
            <SourcesPanel
              sources={sources}
              setSources={(next) => {
                setSources(next);
                if (generated) setDirty(true);
              }}
              context={context}
              attachedArticles={attachedArticles}
              insightLabel={insight?.cve}
            />
          )}

          {tab === "details" && (
            <DetailsPanel
              templateName={`${template.name} - ${template.audience}`}
              answers={answers}
              questions={questions}
              language={language}
              setLanguage={(v) => {
                setLanguage(v);
                if (generated) setDirty(true);
              }}
              company={company}
              setCompany={(v) => {
                setCompany(v);
                if (generated) setDirty(true);
              }}
              brands={brands}
              brandId={brandId}
              setBrandId={setBrandId}
              onOpenTemplate={() => openTemplateEditor(template.id)}
            />
          )}

          {/* Figma: source / language / company changes need a regeneration. */}
          {generated && dirty && (tab === "sources" || tab === "details") && (
            <div className="side-foot">
              <Button onClick={cancelChanges} disabled={regenerating}>
                Cancel
              </Button>
              {regenerating ? (
                <Button disabled>
                  <Spinner size={14} />
                  Regenerating...
                </Button>
              ) : (
                <Button variant="primary" onClick={regenerate}>
                  Regenerate
                </Button>
              )}
            </div>
          )}
        </aside>

        <div className="editor-canvas-wrap">
          <div className="editor-canvas">
            <ReportCanvas
              phase={regenerating ? "generating" : phase}
              title={reportTitle}
              template={template}
              brand={brands.find((b) => b.id === brandId)}
            />
          </div>

          {/* The template sheet sits over the page until the report is written. */}
          {!generated && !regenerating && phase !== "generating" && (
            <TemplatePreview
              template={template}
              activeParam={activeParam}
              values={paramValues}
              open={sheetOpen}
              onToggle={() => {
                sheetTouched.current = true;
                setSheetOpen((o) => !o);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chat entries
 * ------------------------------------------------------------------ */

function ChatBubble({ entry, onToggle }: { entry: ChatEntry; onToggle: () => void }) {
  /* Each thing lands with the same short rise; a rebuilt transcript skips it. */
  const anim = entry.instant ? "" : " chat-in";

  if (entry.kind === "ai") return <div className={`chat-ai${anim}`}>{entry.text}</div>;
  if (entry.kind === "user")
    return entry.pairs ? (
      <div className={`chat-user answers${anim}`}>
        {entry.pairs.map((pair, i) => (
          <div className="qa" key={i}>
            <b>{pair.q}</b>
            {pair.a}
          </div>
        ))}
      </div>
    ) : (
      <div className={`chat-user${anim}`}>{entry.text}</div>
    );
  const running = entry.state === "running";
  const hasSteps = (entry.steps?.length ?? 0) > 0;
  return (
    <div className={`status-card${anim}`}>
      <button className="status-head" onClick={onToggle} disabled={!hasSteps}>
        {running && !entry.headDone ? (
          <Spinner size={16} />
        ) : (
          <Icon name="check" size={16} style={{ color: "var(--content-bold)" }} />
        )}
        <span className="grow">{entry.text}</span>
        {hasSteps && (
          <Icon
            name={entry.expanded ? "chevron-up" : "chevron-down"}
            size={16}
            style={{ color: "var(--content-medium)" }}
          />
        )}
      </button>
      {entry.expanded && hasSteps && (
        <div className="status-steps">
          {entry.steps?.map((s, i) => (
            <div className={`status-step ${s.running ? "running" : ""}`} key={`${s.label}-${i}`}>
              <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                {/* A step that is waiting on an answer keeps spinning. */}
                {s.running ? (
                  <span style={{ marginTop: 2, display: "inline-flex" }}>
                    <Spinner size={15} />
                  </span>
                ) : (
                  <Icon name="check" size={15} style={{ marginTop: 2 }} />
                )}
                <span>{s.label}</span>
              </div>
              {s.interval && (
                <span className="interval-chip">
                  <Icon name="calendar" size={13} />
                  {s.interval.from} <span aria-hidden>→</span> {s.interval.to}
                </span>
              )}
              {s.sources && (
                <div className="found-sources">
                  {s.sources.map((f) => (
                    <div className="found-source" key={f.id}>
                      <span className="fs-dot" style={{ background: f.hue }} />
                      <span className="fs-title">{f.title}</span>
                      <span className="fs-src">{f.source}</span>
                      <span className="fs-age">• {f.age}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Elicitation card
 * ------------------------------------------------------------------ */

function ElicitationCard({
  q,
  index,
  onBack,
  onNext,
  isLast,
  pager = true,
  cards,
}: {
  q: Question;
  index: number;
  onBack: () => void;
  onNext: (v: string) => void;
  isLast: boolean;
  /** A standalone question carries no counter and nothing to go back to. */
  pager?: boolean;
  /** Context carried by the entry point, shown along the top of the card. */
  cards?: ContextCard[];
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  /* Figma "Elicitation interactions": the Other row turns into an input, and
     what is typed becomes a checked option of its own. */
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setPicked([]);
    setText("");
    setOtherOpen(false);
    setOther("");
  }, [q.id]);

  const multi = q.type === "options";
  const single = q.type === "radio";
  const chosen = [...picked, ...(other.trim() ? [other.trim()] : [])];
  const value = multi || single ? chosen.join(", ") : text.trim();
  const canContinue = q.required ? value.length > 0 : true;
  const isQuestionLabel = q.label === "Question";

  const toggle = (label: string, on: boolean) => {
    if (single) {
      setPicked(on ? [label] : []);
      setOther("");
      setOtherOpen(false);
      return;
    }
    setPicked((p) => (on ? [...p, label] : p.filter((x) => x !== label)));
  };

  return (
    <div className="elicit">
      {/* Figma `ContextCarousel`: whatever the entry point carried sits on top of
          the question rather than in the conversation, so what the answer is
          being added to is in front of the reader while they write it. It
          scrolls sideways when there is more than fits, under a fade. */}
      {cards && cards.length > 0 && (
        <div className="ctx-carousel">
          {cards.map((c) => (
            <div className="ctx-card" key={c.title}>
              <Icon name={c.icon} size={16} style={{ color: "var(--content-medium)" }} />
              <div className="ctx-body">
                <span className="ctx-title">{c.title}</span>
                {c.source && (
                  <span className="ctx-sub">
                    <span className="ctx-src">{c.source}</span>
                    {c.age && (
                      <>
                        <span className="ctx-dot">•</span>
                        <span className="ctx-age">{c.age}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="ctx-fade" aria-hidden />
        </div>
      )}
      <div className="elicit-head">
        <div className="elicit-top">
          <span
            className={isQuestionLabel ? "elicit-tag question" : "elicit-tag"}
            title={q.tagHelp}
          >
            {!isQuestionLabel && <Icon name={q.icon ?? "braces"} size={16} />}
            {q.label}
          </span>
          <span className="elicit-req">{q.required ? "Required" : "Optional"}</span>
        </div>
        <div className="elicit-label">
          <div className="elicit-q">{q.title}</div>
          {q.help && <div className="elicit-help">{q.help}</div>}
        </div>
      </div>

      {multi || single ? (
        <div className="elicit-opts">
          {q.options?.map((o) => {
            const values = TECH_STACK_VALUES[o.label];
            return (
              <div
                className="opt-row"
                key={o.label}
                onMouseEnter={() => setHovered(o.label)}
                onMouseLeave={() => setHovered((h) => (h === o.label ? null : h))}
              >
                <label className={`checkbox ${single ? "radio" : ""}`}>
                  <input
                    type={single ? "radio" : "checkbox"}
                    name={`q-${q.id}`}
                    checked={picked.includes(o.label)}
                    onChange={(e) => toggle(o.label, e.target.checked)}
                  />
                  <span>{o.label}</span>
                </label>
                {o.suggested && (
                  <span className="suggested" title={o.because}>
                    Suggested
                  </span>
                )}
                {/* Hovering an option shows the Org Profile entries behind it. */}
                {hovered === o.label && values && (
                  <div className="opt-card">
                    <div className="t-body3 muted" style={{ marginBottom: 6 }}>
                      Org Profile
                    </div>
                    <div className="t-body3" style={{ marginBottom: 8 }}>
                      {values.join(", ")}
                    </div>
                    <Button size="sm">View List</Button>
                  </div>
                )}
              </div>
            );
          })}

          {q.allowOther === false ? null : otherOpen || other ? (
            <div className="opt-row other">
              <label className={`checkbox ${single ? "radio" : ""}`}>
                <input
                  type={single ? "radio" : "checkbox"}
                  checked={Boolean(other.trim())}
                  readOnly
                />
              </label>
              <input
                className="other-input"
                autoFocus
                placeholder="Typing in alternative"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                onBlur={() => !other.trim() && setOtherOpen(false)}
              />
            </div>
          ) : (
            <button
              className={`opt-other ${single ? "radio" : ""}`}
              onClick={() => setOtherOpen(true)}
            >
              <span className="opt-other-box" />
              <span>Other (use @ to access Org Profile items)</span>
            </button>
          )}
        </div>
      ) : (
        <textarea
          className="textarea elicit-text"
          rows={3}
          placeholder="Write in your answer here"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      <div className="elicit-foot">
        <div className="elicit-nav">
          {pager && (
            <Button disabled={index === 0} onClick={onBack}>
              Back
            </Button>
          )}
          <Button variant="primary" disabled={!canContinue} onClick={() => onNext(value)}>
            {isLast ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sources
 * ------------------------------------------------------------------ */

function SourcesPanel({
  sources,
  setSources,
  context,
  attachedArticles,
  insightLabel,
}: {
  sources: SourceItem[];
  setSources: (s: SourceItem[]) => void;
  context: CreateContext;
  attachedArticles: { id: string; title: string; age: string }[];
  insightLabel?: string;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);

  const attachments =
    context.path === "articles"
      ? attachedArticles.map((a) => ({ icon: "feed" as const, title: a.title, sub: `Selected article • ${a.age}` }))
      : context.path === "insight" && insightLabel
        ? [{ icon: "bug" as const, title: insightLabel, sub: "Insight card" }]
        : context.path === "broad" && context.contextLabel
          ? [{ icon: "bug" as const, title: context.contextLabel, sub: "Intel Agent" }]
          : [];

  return (
    <div className="side-scroll">
      <div className="field-label">Attachments</div>
      <div className="field-help" style={{ marginBottom: 10 }}>
        Add specific articles or PDFs to enrich the report with any specific sources.
      </div>
      {attachments.length > 0 && (
        <div className="attach-list">
          {attachments.map((a) => (
            <div className="attach-row" key={a.title}>
              <Icon name={a.icon} size={16} style={{ color: "var(--content-medium)" }} />
              <span className="truncate" style={{ flex: 1, minWidth: 0 }}>
                {a.title}
              </span>
              <span className="t-body3 light">{a.sub}</span>
            </div>
          ))}
        </div>
      )}
      <button ref={addRef} className="btn" onClick={() => setMenu(true)}>
        <Icon name="plus" size={16} />
        Add article link or PDF
      </button>
      {menu && (
        <Popover anchorRef={addRef} onClose={() => setMenu(false)} width={210}>
          <MenuItem icon="link" onClick={() => setMenu(false)}>
            Paste an article link
          </MenuItem>
          <MenuItem icon="doc" onClick={() => setMenu(false)}>
            Upload a PDF
          </MenuItem>
        </Popover>
      )}

      <div className="field-label" style={{ marginTop: 26 }}>
        Threat Graph
      </div>
      <div className="field-help" style={{ marginBottom: 12 }}>
        Based on your prompt and context, we've identified the most relevant sources in our Threat
        Graph.
      </div>
      <div className="t-body3 muted" style={{ marginBottom: 4 }}>
        {sources.length} Sources
      </div>
      {sources.map((s) => (
        <div className="src-item" key={s.id}>
          <input
            type="checkbox"
            className="src-check"
            checked={s.checked}
            onChange={() =>
              setSources(sources.map((x) => (x.id === s.id ? { ...x, checked: !x.checked } : x)))
            }
          />
          <div className="src-body">
            <div className="src-title" title={s.title}>
              {s.title}
            </div>
            <div className="src-meta">
              {s.kind === "article" ? (
                <>
                  <span className="src-favicon" />
                  <span>{s.source}</span>
                  {s.age && <span>• {s.age}</span>}
                </>
              ) : (
                <>
                  {s.kind === "entity" && <Icon name="malware" size={14} />}
                  <span>{s.tags?.join(" • ")}</span>
                </>
              )}
            </div>
            {s.kind === "article" && s.tags && (
              <div className="src-meta">
                <Icon name="star" size={13} />
                {s.tags.join(", ")}
              </div>
            )}
            {s.cvss && (
              <div className="src-meta">
                <Icon name="bug" size={13} />
                <span className={s.cvssHigh ? "cvss high" : "cvss"}>{s.cvss}</span>
                <span>• CWE-693 • Patch</span>
                {s.exploit && <span className="exploit">• Exploit</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Details
 * ------------------------------------------------------------------ */

function DetailsPanel({
  templateName,
  answers,
  questions,
  language,
  setLanguage,
  company,
  setCompany,
  brands,
  brandId,
  setBrandId,
  onOpenTemplate,
}: {
  templateName: string;
  answers: Record<string, string>;
  questions: Question[];
  language: string;
  setLanguage: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  brands: Brand[];
  brandId?: string;
  setBrandId: (id: string | undefined) => void;
  onOpenTemplate: () => void;
}) {
  const answered = questions.filter((q) => answers[q.id]);

  return (
    <div className="side-scroll">
      <div className="field-label">Template</div>
      <div className="field-help" style={{ marginBottom: 8 }}>
        The template used to create this report.
      </div>
      <div className="row" style={{ gap: 8 }}>
        <div className="select block" style={{ flex: 1, color: "var(--content-light)" }}>
          <span className="truncate">{templateName}</span>
          <span className="chev">
            <Icon name="chevron-down" size={16} />
          </span>
        </div>
        <Button icon="arrow-up-right" title="Open template" onClick={onOpenTemplate} />
      </div>

      {/* Figma "Report Builder Editor 1": what the template handed this report —
          its parameters and its brand — is boxed together, because both are the
          template's contribution and both can still be changed here. */}
      <div className="detail-card">
        {answered.length > 0 && (
          <>
            <div className="field-label" style={{ marginBottom: 10 }}>
              Parameters
            </div>
            {answered.map((q) => (
              <div key={q.id} style={{ marginBottom: 14 }}>
                <span className="elicit-tag" style={{ marginBottom: 4 }}>
                  <Icon name="braces" size={14} />
                  {q.label}
                </span>
                <div className="t-body2" style={{ marginTop: 4 }}>
                  {answers[q.id]}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="field-label">Brand</div>
        <div className="field-help" style={{ margin: "4px 0 8px" }}>
          The brand style applied to your report. Brands are saved in the Org Profile.
        </div>
        <Select
          block
          icon="brand"
          value={brands.find((b) => b.id === brandId)?.name}
          placeholder="No brand"
          options={["No brand", ...brands.map((b) => b.name)]}
          onChange={(name) =>
            setBrandId(name === "No brand" ? undefined : brands.find((b) => b.name === name)?.id)
          }
        />
      </div>

      <div style={{ height: 1, background: "var(--border-lightest)", margin: "22px 0" }} />

      <Field
        label="Language"
        help="The language this report was written on. Changing languages will require regeneration."
      >
        <Select block value={language} options={LANGUAGES} onChange={setLanguage} />
      </Field>
      <Field
        label="Company Overview"
        help="Your organization's details, sector and profile — used to assess your specific exposure. Changing the Company Overview will require regeneration."
      >
        <Select block value={company} options={COMPANIES} onChange={setCompany} />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Report canvas
 * ------------------------------------------------------------------ */

function ReportCanvas({
  phase,
  title,
  template,
  brand,
}: {
  phase: Phase;
  title: string;
  template: Template;
  brand?: Brand;
}) {
  const generated = phase === "done";
  const generating = phase === "generating";
  /* The bands are the template's, carried into every report it writes. Here
     they are not editable — the report shows what the template set.

     They arrive with the finished report rather than with the skeleton: a cover
     banner and a wordmark over a page of grey bars reads as a broken document,
     and the branding is part of the result, not part of the waiting. */
  const header = generated ? (template.header ?? EMPTY_BAND) : EMPTY_BAND;
  const footer = generated ? (template.footer ?? EMPTY_BAND) : EMPTY_BAND;

  return (
    /* Figma: the document sits in a page inset 32px from the canvas, and the
       skeleton is there from the moment the editor opens. */
    <div className="report-page" style={{ ...brandVars(brand), ...bandVars(header, footer, brand) }}>
      <PageBandEditor kind="header" band={header} brand={brand} mode="plain" onChange={() => {}} />
      {generated ? (
        <ReportBody title={title} template={template} />
      ) : (
        <SkeletonReport streaming={generating} title={title} template={template} />
      )}

      <PageBandEditor kind="footer" band={footer} brand={brand} mode="plain" onChange={() => {}} />
    </div>
  );
}

/**
 * The template as it will be filled in — Figma's `TemplatePreview`, 720 wide and
 * centred over the page, with each block's prompt shown as written.
 *
 * It behaves as a sheet: it runs from near the top of the canvas to the bottom
 * edge of the screen, and `Hide` drops it out of the way, leaving its header
 * pinned to the bottom until `Show` pulls it back up.
 */
function TemplatePreview({
  template,
  activeParam,
  values,
  open,
  onToggle,
}: {
  template: Template;
  /** Marked out in the prompts, and scrolled to when it is asked about. */
  activeParam?: string;
  /** Answers so far, shown in place of the parameter they fill. */
  values?: Record<string, string>;
  open: boolean;
  onToggle: () => void;
}) {
  /* How far down the sheet drops when hidden: everything but its header. */
  const headRef = useRef<HTMLDivElement>(null);
  const [headH, setHeadH] = useState(57);
  useEffect(() => {
    if (headRef.current) setHeadH(headRef.current.offsetHeight);
  }, [template.name, template.audience]);

  /**
   * When the whole template already fits, there is nothing to scroll and no way
   * to tell the sheet would scroll if it had to. So a scroll gesture pulls the
   * template down a little and it settles back into place.
   */
  const bodyRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);
  const [pull, setPull] = useState(0);
  const settle = useRef<number | undefined>(undefined);

  useEffect(() => {
    const body = bodyRef.current;
    const inner = innerRef.current;
    if (!body || !inner) return;
    const measure = () => setFits(inner.offsetHeight <= body.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [template.id, open]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  /* Bring the parameter being asked about into view, if it is not already. */
  useEffect(() => {
    if (!activeParam || !open) return;
    const body = bodyRef.current;
    const chip = body?.querySelector<HTMLElement>(".param-chip.on");
    if (!body || !chip) return;
    const b = body.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    if (c.top >= b.top + 12 && c.bottom <= b.bottom - 12) return;
    const delta = c.top - b.top - (b.height - c.height) / 2;
    body.scrollTo({ top: body.scrollTop + delta, behavior: "smooth" });
  }, [activeParam, open]);

  const springBack = (delta: number) => {
    if (!fits || delta <= 0) return;
    setPull(28);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => setPull(0), 260);
  };

  return (
    <div
      className={`template-preview ${open ? "open" : "hidden"}`}
      style={{ "--tp-head": `${headH}px` } as CSSProperties}
    >
      <div className="tp-head" ref={headRef}>
        <span>Template:</span>
        <span className="tp-name">{template.name}</span>
        {template.audience && <span className="badge">{template.audience}</span>}
        <span className="spacer" />
        <button className="btn ghost sm" onClick={onToggle}>
          <Icon name={open ? "chevron-down" : "chevron-up"} size={14} />
          {open ? "Hide" : "Show"}
        </button>
      </div>
      <div
        className="tp-body"
        ref={bodyRef}
        onWheel={(e) => springBack(e.deltaY)}
        onTouchMove={() => springBack(1)}
      >
        <div
          className="tp-inner"
          ref={innerRef}
          style={pull ? ({ transform: `translateY(${pull}px)` } as CSSProperties) : undefined}
        >
          <h1>Report title</h1>
          {template.blocks.map((b) => (
            <div className="tp-block" key={b.id}>
              <h2>{b.heading}</h2>
              {b.prompts.map((prompt, i) => (
                <div className="tp-prompt" key={i}>
                  <PromptText text={prompt} highlight={activeParam} values={values} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Widths (as a share of the 784-wide content column) taken from the Figma skeleton. */
const SKELETON_GROUPS: { head: string; lines: string[] }[] = [
  { head: "47%", lines: ["22%", "22%"] },
  { head: "47%", lines: ["85%", "82%", "78%", "85%", "70%"] },
  { head: "37%", lines: ["69%", "66%", "62%", "69%", "56%"] },
  { head: "47%", lines: ["85%", "82%", "78%", "85%", "70%"] },
  { head: "23%", lines: ["100%", "96%", "92%", "99%", "84%"] },
  { head: "33%", lines: ["78%", "75%", "71%", "78%", "64%"] },
  { head: "47%", lines: ["85%", "82%", "78%", "85%", "70%"] },
];

function SkeletonReport({
  streaming,
  title,
  template,
}: {
  streaming: boolean;
  title: string;
  template: Template;
}) {
  /* While the report is being written, the part that exists is real and the
     rest is still skeleton — Figma's "Generating new report" frame. */
  const written = streaming ? 2 : 0;
  return (
    <>
      {streaming && (
        <ReportBody title={title} template={template} sections={1} />
      )}
      <div className="skeleton-doc">
        {SKELETON_GROUPS.slice(written).map((g, i) => (
          <div className="skeleton-group" key={i}>
            <div className="skeleton head" style={{ width: g.head }} />
            {g.lines.map((w, j) => (
              <div className="skeleton" key={j} style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function ReportBody({
  title,
  template,
  sections,
}: {
  title: string;
  template: Template;
  /** Render only the first n sections, while the rest is still being written. */
  sections?: number;
}) {
  /* Fixed, exactly as the Figma frames carry it — the date does not follow the
     clock and the distribution line does not follow the template. */
  const meta = REPORT_META;

  /* The Vulnerability Advisory is the worked example the Figma frames carry —
     tables, steps and citations. Everything else renders its prose body
     through the same document. */
  const nodes = useMemo(() => {
    const body = REPORT_BODIES[template.name];
    const all = body ? proseDoc(body) : VULN_ADVISORY_DOC;
    if (!sections) return all;
    /* Cut at the nth heading, so a half-written report stops on a section. */
    let seen = 0;
    const out: DocNode[] = [];
    for (const n of all) {
      if (n.k === "h2") {
        seen += 1;
        if (seen > sections) break;
      }
      out.push(n);
    }
    return out;
  }, [template.name, sections]);

  return (
    <div className="report-doc">
      <ReportDocument
        key={`${template.id}-${sections ?? "all"}`}
        title={title}
        meta={meta}
        nodes={nodes}
        editable={!sections}
      />
    </div>
  );
}
