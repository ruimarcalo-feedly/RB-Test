import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { CreateReportMenu } from "./CreateReportMenu";
import { ARTICLES, FEED_NAME } from "../../data/mockData";

/**
 * Figma V2 "ASK AI Entry points": the Ask AI side panel on a feed.
 *
 * Asking it for a report about the feed offers Report Builder instead of a
 * plain chat answer ("Would you like to use Report Builder?"). Any other
 * question gets a normal answer, which carries a "Create Report" action of
 * its own. Both lead to the same audience → template menu (no "Last used",
 * no legacy group), then into the report editor with the feed as context.
 */

const SUGGESTIONS = [
  "What novel TTPs and IoCs are being leveraged in these attacks?",
  "Generate a report tied to the attack chain for these attacks.",
  "What type of data was exposed by this breach, and who might be impacted?",
  "What technologies were exploited in these attacks?",
];

const DEFAULT_PROMPT = "Can you write a report about these articles?";

const isReportAsk = (q: string) => /\breport\b/i.test(q);

type Turn =
  | { role: "user"; text: string }
  | { role: "offer"; skipped?: boolean }
  | { role: "answer"; question: string }
  | { role: "typing" };

function ThumbIcon({ down }: { down?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={down ? { transform: "rotate(180deg)" } : undefined}
      aria-hidden="true"
    >
      <path d="M7 10v11H4V10h3Zm0 0 4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 21H7" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function AskAIPanel({
  articleIds,
  onClose,
  onPick,
}: {
  /** Ticked articles; none means the whole feed. */
  articleIds: string[];
  onClose: () => void;
  /** A template was picked from the menu. */
  onPick: (templateId: string) => void;
}) {
  const [draft, setDraft] = useState(DEFAULT_PROMPT);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [menuFrom, setMenuFrom] = useState<HTMLElement | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const chatting = turns.length > 0;
  const context = articleIds.length
    ? ARTICLES.filter((a) => articleIds.includes(a.id))
    : ARTICLES.slice(0, 4);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setDraft("");
    setTurns((t) => [...t, { role: "user", text: q }, { role: "typing" }]);
    window.setTimeout(() => {
      setTurns((t) => [
        ...t.filter((x) => x.role !== "typing"),
        isReportAsk(q) ? { role: "offer" } : { role: "answer", question: q },
      ]);
    }, 900);
  };

  /* Skipping Report Builder answers in the chat instead. */
  const skip = (i: number) => {
    const q = [...turns.slice(0, i)].reverse().find((x) => x.role === "user");
    setTurns((t) => [
      ...t.map((x, j) => (j === i ? { role: "offer" as const, skipped: true } : x)),
      { role: "typing" },
    ]);
    window.setTimeout(() => {
      setTurns((t) => [
        ...t.filter((x) => x.role !== "typing"),
        { role: "answer", question: q && q.role === "user" ? q.text : "" },
      ]);
    }, 900);
  };

  const openMenu = (el: HTMLElement) => {
    anchor.current = el;
    setMenuFrom(el);
  };

  const reset = () => {
    setTurns([]);
    setDraft(DEFAULT_PROMPT);
  };

  const composer = (
    <div className="ask-composer">
      {!chatting && (
        <span className="ask-ctx-chip">
          <span className="ask-feed-dot" />
          <span className="truncate">{articleIds.length ? `${articleIds.length} articles` : FEED_NAME}</span>
        </span>
      )}
      <textarea
        rows={2}
        value={draft}
        placeholder="Ask anything"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(draft);
          }
        }}
      />
      <div className="ask-composer-foot">
        <button className="btn ghost icon sm" title="Add context">
          <Icon name="plus" size={16} />
        </button>
        <button
          className="ask-send"
          title="Send"
          disabled={!draft.trim()}
          onClick={() => send(draft)}
        >
          <Icon name="arrow-up" size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <aside className="ask-panel">
      <div className="ask-head">
        {chatting && (
          <button className="btn ghost icon sm" title="Back" onClick={reset}>
            <Icon name="chevron-left" size={18} />
          </button>
        )}
        <span className="ask-title">{chatting ? "Article report generation" : "Ask AI"}</span>
        <span className="spacer" />
        {chatting ? (
          <button className="btn ghost icon sm" title="New chat" onClick={reset}>
            <Icon name="plus" size={18} />
          </button>
        ) : (
          <>
            <button className="btn ghost icon sm" title="History">
              <Icon name="history" size={18} />
            </button>
            <button className="btn ghost icon sm" title="Help">
              <Icon name="info" size={18} />
            </button>
          </>
        )}
        <button className="btn ghost icon sm" title="Close" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </div>

      {!chatting ? (
        <div className="ask-body">
          {composer}
          <div className="ask-sugg-title">Suggestions</div>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="ask-sugg" onClick={() => send(s)}>
              <span>{s}</span>
              <Icon name="ellipsis" size={16} style={{ color: "var(--content-medium)" }} />
            </button>
          ))}
          <button className="btn sm" style={{ marginTop: 4, alignSelf: "flex-start" }}>
            Explore more prompts
          </button>
        </div>
      ) : (
        <>
          <div className="ask-body chat" ref={bodyRef}>
            <div className="ask-ctx-row">
              {context.map((a) => (
                <div key={a.id} className="ask-ctx-card">
                  <span className="ask-src-dot" />
                  <span className="ask-ctx-text">
                    <span className="truncate">{a.trend ?? a.title}</span>
                    <span className="light">
                      {a.title} • {a.age}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {turns.map((t, i) => {
              if (t.role === "user")
                return (
                  <div key={i} className="ask-user">
                    {t.text}
                  </div>
                );
              if (t.role === "typing")
                return (
                  <div key={i} className="ask-typing" aria-label="Thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                );
              if (t.role === "offer")
                return (
                  <div key={i} className="ask-ai">
                    <p>
                      Sure I can do that. With Report Builder, we can make a more tailored and
                      branded report using powerful templates.
                    </p>
                    {t.skipped ? null : (
                      <>
                        <p>Would you like to use Report Builder?</p>
                        <div className="row" style={{ gap: 8 }}>
                          <button
                            className="btn primary"
                            onClick={(e) => openMenu(e.currentTarget)}
                          >
                            <Icon name="wand" size={16} />
                            Use Report Builder
                          </button>
                          <button className="btn" onClick={() => skip(i)}>
                            Skip Report Builder
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              return (
                <div key={i} className="ask-ai">
                  <h3>What these filings show</h3>
                  <p>
                    The latest filings in {FEED_NAME} point to the same pattern: attackers are
                    getting in through third-party and vendor access, then exfiltrating customer
                    records before encrypting systems. Insurance and financial services
                    organizations make up most of the recent reports.
                  </p>
                  <h3>Who is affected</h3>
                  <p>
                    Most filings report names, Social Security numbers and account details. The
                    number of residents affected per filing is small, but the same vendor appears
                    behind several of them, which suggests one upstream compromise.
                  </p>
                  <p>Organizations in these sectors are advised to:</p>
                  <ul>
                    <li>Review which vendors hold customer records, and how they reach them</li>
                    <li>Enforce multi-factor authentication on vendor and remote access</li>
                    <li>Monitor for bulk exports of customer data</li>
                    <li>Prepare breach notification steps before they are needed</li>
                  </ul>
                  <div className="ask-answer-foot">
                    <button className="btn ghost icon sm" title="Copy">
                      <CopyIcon />
                    </button>
                    <button className="btn ghost icon sm" title="Good answer">
                      <ThumbIcon />
                    </button>
                    <button className="btn ghost icon sm" title="Bad answer">
                      <ThumbIcon down />
                    </button>
                    <button className="btn ghost sm ask-sources">
                      <span className="ask-src-dot" />
                      <span className="ask-src-dot alt" />
                      Sources
                    </button>
                    <span className="spacer" />
                    <button className="btn sm" onClick={(e) => openMenu(e.currentTarget)}>
                      <Icon name="wand" size={14} />
                      Create Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="ask-foot">{composer}</div>
        </>
      )}

      {menuFrom && (
        <CreateReportMenu
          anchorRef={anchor}
          showRecent={false}
          showLegacy={false}
          align="start"
          onClose={() => setMenuFrom(null)}
          onPick={onPick}
        />
      )}
    </aside>
  );
}
