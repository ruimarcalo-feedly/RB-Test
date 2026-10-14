export function ReportEditor({ context, templateId }: { context: CreateContext; templateId: string }) {
  const { templates, reports, closeOverlay, addReport, toast, settings, openTemplateEditor, brands } =
    useStore();

  /**
   * Set when the editor was opened from the "View previous reports" table.
   * The report already exists, so the flow is not re-run — its finished
   * transcript is rebuilt and the editor opens in its done state.
   */
  const saved = context.savedReportId
    ? reports.find((r) => r.id === context.savedReportId)
    : undefined;

  /* A template picked without an audience lands on whichever of its pairings
     serves the audience chosen in the conversation, so the template in hand
     can change once, partway through. */
  const [activeId, setActiveId] = useState(templateId);
  const template =
    templates.find((t) => t.id === activeId) ?? templates.find((t) => t.id === templateId)!;
  const audienceOptions = useMemo(
    () => audiencesFor(templates, template.name),
    [templates, template.name]
  );
  /* Figma STEP 1, "Gather audience (which will select the correct template)".
     Skipped when the entry point already carried an audience (a Report Builder
     card under an audience filter) or the template only serves one. */
  const askAudience = !saved && Boolean(context.askAudience) && audienceOptions.length > 1;
  const [audience, setAudience] = useState<string | null>(askAudience ? null : template.audience);
  const audienceKnown = audience !== null;

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
   * On every create-report path it stays collapsed until the reader asks for
   * it: the flow never raises it on its own, so the template is there to look
   * at, not something that lands in the way of the conversation.
   */
  const [sheetOpen, setSheetOpen] = useState(false);
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
    const cveSource = (cve: string): SourceItem => {
      const card = INSIGHT_CARDS.find((c) => c.cve === cve);
      return {
        id: `src-${cve}`,
        title: cve,
        kind: "cve",
        tags: card ? [card.weakness] : [],
        cvss: card ? `CVSS ${card.cvss}` : undefined,
        cvssHigh: card ? card.cvss >= 8 : false,
        exploit: card ? card.tags.includes("EXPLOIT") : false,
        checked: true,
      };
    };
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
          ? [cveSource(insight.cve)]
          : context.path === "selection"
            ? (context.cveIds ?? []).map(cveSource)
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
            : context.path === "selection"
              ? context.cveIds ?? []
              : FETCHED_SOURCES.slice(0, 3).map((s) => s.title),
      templateName: template.name,
      templateDescription: template.description,
      subject: subject || (insight ? `${insight.cve} — ${insight.summary}` : undefined),
      contextLabel: context.contextLabel,
    }),
    [context, attachedArticles, insight, template, subject]
  );

  /**
   * Figma STEPS 2 and 3, one card each, counted "x of y questions": the
   * template's parameters (for the Vulnerability Advisory its CVE ID, which
   * says what the report is about), any of the extra steps the settings leave
   * open, and the further-details question, which always comes last.
   */
  const questions = useMemo<Question[]>(() => {
    const qs: Question[] = [];
    /* Templates without a subject parameter of their own still need to be
       told what the report is about. */
    if (!isVulnAdvisory(template)) qs.push(subjectQuestion());
    for (const p of template.parameters) {
      if (p.name === "CVE ID") {
        const sug = cveSuggestions(context);
        qs.push({
          id: p.id,
          label: "CVE ID",
          tagHelp: p.description,
          title: "What vulnerability/vulnerabilities should this report be about?",
          /* Figma: "With no context, we can't offer suggestions to pick from." */
          help: sug ? "Suggestions are based on your attached context" : undefined,
          type: sug ? "options" : "text",
          options: sug?.options.map((label) => ({ label, suggested: false })),
          ticked: sug?.ticked,
          otherLabel: "Other",
          placeholder: "Type in a CVE-ID or vulnerability name",
          required: !p.optional,
        });
        continue;
      }
      const options = p.type === "Org Profile" ? suggestOptions(p.name, signals) : undefined;
      qs.push({
        id: p.id,
        label: p.name === "Tech stack" ? "Tech Stacks" : p.name,
        tagHelp: p.description,
        title:
          p.name === "Tech stack"
            ? "What’s in your tech stack?"
            : `What should we use for ${p.name}?`,
        help: options ? "Suggestions are taken from the Org Profile" : undefined,
        type: p.type === "Org Profile" ? ("options" as const) : ("text" as const),
        options,
        required: !p.optional,
      });
    }
    /* Figma "Create Report Flow - EXTRA steps": "If present, either of these
       EXTRA steps will appear before the Final Step on any of the flows". Each
       setting only becomes a question when it leaves a choice open. */
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
    qs.push(furtherDetailsQuestion());
    return qs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    template,
    context,
    signals.articleTitles.join("|"),
    settings.languages,
    settings.companies,
    settings.brands,
  ]);

  /** The audience question, with only the audiences this template serves. */
  const audienceQ: Question = useMemo(
    () => ({
      id: "q-audience",
      label: "Audience",
      icon: "audience",
      green: true,
      noTag: true,
      title: "Who are you writing this report for?",
      help: "Audiences are stored in the Org Profile",
      type: "radio",
      allowOther: false,
      required: true,
      options: audienceOptions.map((a) => ({ label: AUDIENCE_MENU_LABEL[a] ?? a, suggested: false })),
    }),
    [audienceOptions]
  );

  /* ---------------- the script runner ---------------- */

  /* Built once, from the template as it was picked: the audience answer
     changes which pairing is in hand, not what was said at the start. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const script = useMemo(() => buildScript(context, template, askAudience), []);
  const cursor = useRef(0);
  const [awaitingAudience, setAwaitingAudience] = useState(false);

  const push = (e: Omit<ChatEntry, "id">) => setChat((c) => [...c, { id: nextId("c"), ...e }]);

  const patchLastStatus = (fn: (e: ChatEntry) => ChatEntry) =>
    setChat((c) => {
      const i = [...c].reverse().findIndex((e) => e.kind === "status");
      if (i < 0) return c;
      const idx = c.length - 1 - i;
      return c.map((e, j) => (j === idx ? fn(e) : e));
    });

  /** A beat between one message landing and the next one starting. */
  const BEAT = 420;

  const after = (ms: number) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  /* Everything in the conversation lands one thing at a time — including the
     elicitation card, which only opens once the message before it has arrived. */
  const run = () => {
    if (cursor.current >= script.length) return;
    const act: Act = script[cursor.current];
    cursor.current += 1;
    switch (act.t) {
      case "ai":
        push({ kind: "ai", text: act.text });
        after(BEAT);
        return;
      case "user":
        push({ kind: "user", text: act.text, cards: act.cards });
        after(BEAT);
        return;
      case "askAudience":
        setAwaitingAudience(true);
        setPhase("questions");
        return;
      case "ask":
        setPhase("questions");
        return;
      case "generate":
        startGenerating();
        return;
    }
  };

  /** The steps the report goes through once every detail is in. */
  const GEN_STEPS: StatusStep[] = [
    { label: "Determining time interval", interval: TIME_INTERVAL },
    {
      label: "Searching for relevant articles and threat intelligence reports",
      sources: FETCHED_SOURCES.slice(0, 3),
    },
  ];

  /**
   * A finished report's conversation, rebuilt from the script its entry point
   * would have run — the transcript a completed report shows when reopened.
   */
  const transcript = (): ChatEntry[] => {
    const out: ChatEntry[] = [];
    const add = (e: Omit<ChatEntry, "id">) =>
      out.push({ id: nextId("c"), instant: true, ...e });
    for (const act of script) {
      if (act.t === "ai") add({ kind: "ai", text: act.text });
      if (act.t === "user") add({ kind: "user", text: act.text, cards: act.cards });
    }
    add({
      kind: "status",
      text: "All details collected",
      state: "ok",
      headDone: true,
      expanded: false,
      steps: [...GEN_STEPS, { label: "Report successfully completed" }],
    });
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
  }, [chat, qIndex, phase, awaitingAudience]);

  /* ---------------- answering ---------------- */

  const answerAudience = (label: string) => {
    const picked = audienceOptions.find((a) => (AUDIENCE_MENU_LABEL[a] ?? a) === label) ?? label;
    const pairing = pairingFor(templates, template.name, picked);
    if (pairing) {
      setActiveId(pairing.id);
      setBrandId(pairing.brandId);
    }
    setAudience(picked);
    setAwaitingAudience(false);
    setPhase("script");
    push({ kind: "user", text: `This report is meant for: ${label}` });
    timers.current.push(
      window.setTimeout(() => {
        push({
          kind: "ai",
          text: "Perfect! For this audience, the template requires you to fill in a few details.",
        });
        after(BEAT);
      }, BEAT)
    );
  };

  const current = questions[qIndex];
  const showAudience = awaitingAudience && phase === "questions";
  const showQuestion = !awaitingAudience && phase === "questions" && Boolean(current);
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
    if (q.id === "q-subject") setSubject(value);
    if (q.id === "q-language" && value && value !== "Something else") setLanguage(value);
    if (q.id === "q-company" && value) setCompany(value);
    /* The brand answer is the report's brand, so the page restyles as soon as
       the question is answered rather than only once the report is written. */
    if (q.id === "q-brand" && value) {
      const picked = brands.find((b) => b.name === value);
      if (picked) setBrandId(picked.id);
    }
    setPhase("script");
    timers.current.push(
      window.setTimeout(() => {
        if (qIndex + 1 < questions.length) {
          setQIndex((i) => i + 1);
          setPhase("questions");
        } else {
          setQIndex(questions.length);
          after(BEAT);
        }
      }, BEAT * 0.7)
    );
  };

  /**
   * Figma STEP 4: the card opens on "All details collected", the time interval
   * and the sources land one after the other, and the report is written.
   */
  /* The report is filed from a timer that was set several renders earlier, so
     it reads the answers as they are by then, not as they were when it was set. */
  const latest = useRef({ answers, template, audience, subject, language, company });
  latest.current = { answers, template, audience, subject, language, company };

  const startGenerating = () => {
    setQIndex(questions.length);
    setPhase("generating");
    push({
      kind: "status",
      text: "All details collected",
      state: "running",
      headDone: true,
      steps: [],
      expanded: true,
    });
    const addStep = (ms: number, step: StatusStep) =>
      timers.current.push(
        window.setTimeout(
          () => patchLastStatus((e) => ({ ...e, steps: [...(e.steps ?? []), step] })),
          ms
        )
      );
    addStep(600, GEN_STEPS[0]);
    addStep(1500, GEN_STEPS[1]);
    addStep(2400, { label: "Generating report...", running: true });
    const t = window.setTimeout(() => {
      setTitle(reportTitle);
      setPhase("done");
      patchLastStatus((e) => ({
        ...e,
        state: "ok",
        steps: (e.steps ?? []).map((st) =>
          st.running ? { ...st, running: false, label: "Report successfully completed" } : st
        ),
      }));
      toast("Report was successfully completed");
      const now = latest.current;
      addReport({
        id: nextId("r"),
        headline: reportTitle,
        templateName: now.template.name,
        templateAudience: now.audience || now.template.audience || "CISO",
        createdBy: "Rui Marçalo",
        createdOn: "Sep 1, 2026",
        // Kept so the row in "View previous reports" can reopen this report.
        origin: { ...context, askAudience: false, savedReportId: undefined },
        subject: now.subject,
        answers: now.answers,
        language: now.language,
        company: now.company,
      });
    }, 5000);
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

