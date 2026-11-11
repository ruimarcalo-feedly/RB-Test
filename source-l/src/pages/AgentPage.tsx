import { useRef, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/primitives";
import { CreateReportMenu } from "../components/report/CreateReportMenu";
import { TemplateListMenu } from "../components/report/TemplateListMenu";
import alertsIcon from "../assets/agent/alerts.svg";
import apiIcon from "../assets/agent/api.svg";
import shareIcon from "../assets/agent/share.svg";
import { useStore } from "../state/store";
import { AGENT, INSIGHT_CARDS, type InsightCard } from "../data/mockData";

/**
 * Intel Agent view — the entry point for the broad-context path (the
 * "Create Report" button in the header), the selection path (rows ticked in
 * the table, then "Create report" on the selection bar) and, by opening a
 * row, the insight-card path.
 * Figma: "3 - Broad context path" → Entry - Outside Report Builder,
 * and "4 - Insight Card path" → Insight 1.
 */
export function AgentPage() {
  const { openReportEditor } = useStore();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<InsightCard | null>(null);
  /* Figma V2 "With context": ticking rows puts a select-all box and
     "(N items selected)" beside the table's title, and the header's Create
     Report carries the ticked CVEs. */
  const [picked, setPicked] = useState<string[]>([]);
  const togglePick = (cve: string) =>
    setPicked((p) => (p.includes(cve) ? p.filter((x) => x !== cve) : [...p, cve]));

  return (
    <>
      <div className="agent-head">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="agent-title">{AGENT.name}</span>
          <span className="agent-live">
            <span className="live-dot" />
            {AGENT.monitoring}
          </span>
        </div>
        <span className="spacer" />
        {/* Figma "PanelHeader" (4510:205274): alerts, API and share as quiet
            icons, Create Report as a tertiary icon-only button, then Analyze,
            Save changes (nothing to save yet) and more. */}
        <div className="row agent-actions" style={{ gap: 8 }}>
          <button className="btn ghost icon agent-ico" title="Alerts">
            <img src={alertsIcon} alt="" width={20} height={20} />
          </button>
          <button className="btn ghost icon agent-ico" title="API">
            <img src={apiIcon} alt="" width={20} height={20} />
          </button>
          <button className="btn ghost icon agent-ico" title="Share">
            <img src={shareIcon} alt="" width={20} height={20} />
          </button>
          <button
            ref={btnRef}
            className={`btn ghost icon agent-ico ${menu ? "on" : ""}`}
            onClick={() => setMenu((m) => !m)}
            title="Create Report"
            aria-label="Create Report"
          >
            <Icon name="wand" size={20} />
          </button>
          <Button icon="sparkle">Analyze</Button>
          <Button variant="primary" disabled>
            Save changes
          </Button>
          <Button icon="ellipsis" variant="ghost" title="More" />
        </div>
      </div>

      {/* Audience first, then that audience's templates. */}
      {menu && (
        <TemplateListMenu
          anchorRef={btnRef}
          onClose={() => setMenu(false)}
          onPick={(id, askAudience) =>
            /* With rows ticked, the report is about those rows. A template
               written for several audiences asks which one in the report. */
            openReportEditor(id, {
              ...(picked.length
                ? { path: "selection" as const, cveIds: picked }
                : { path: "broad" as const, contextKind: "agent" as const, contextLabel: AGENT.view }),
              askAudience,
            })
          }
        />
      )}

      <div className="page wide" style={{ paddingTop: 24 }}>
        <div className="field-label">Filters</div>
        <div className="org-note" style={{ margin: "6px 0 12px" }}>
          <Icon name="info" size={15} />
          {AGENT.savedViews}
        </div>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          {AGENT.filters.map((f) => (
            <span className="select" key={f}>
              <Icon name="calendar" size={14} style={{ color: "var(--content-medium)" }} />
              {f}
              <span className="chev">
                <Icon name="chevron-down" size={14} />
              </span>
            </span>
          ))}
          <span className="t-body3" style={{ color: "var(--bg-accent)" }}>
            + AND
          </span>
        </div>

        <div className="section-head" style={{ marginTop: 26 }}>
          <span className="row" style={{ gap: 8 }}>
            {picked.length > 0 && (
              <input
                type="checkbox"
                className={`src-check ${picked.length < INSIGHT_CARDS.length ? "mixed" : ""}`}
                aria-label="Select all"
                checked={picked.length === INSIGHT_CARDS.length}
                ref={(el) => {
                  if (el) el.indeterminate = picked.length > 0 && picked.length < INSIGHT_CARDS.length;
                }}
                onChange={() =>
                  setPicked(
                    picked.length === INSIGHT_CARDS.length ? [] : INSIGHT_CARDS.map((c) => c.cve)
                  )
                }
              />
            )}
            <span className="section-title">Vulnerabilities</span>
            {picked.length > 0 && (
              <span className="t-body2 light">
                ({picked.length} item{picked.length === 1 ? "" : "s"} selected)
              </span>
            )}
          </span>
          <Button size="sm">Edit Columns</Button>
        </div>

        <table className="rtable">
          <thead>
            <tr>
              <th style={{ width: 36 }} />
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 120 }}>Date Published</th>
              <th style={{ width: "24%" }}>CVE ID</th>
              <th>What? So What? Now What?</th>
              <th style={{ width: "24%" }}>Latest Activity</th>
            </tr>
          </thead>
          <tbody>
            {INSIGHT_CARDS.map((c) => (
              <tr key={c.id} className={picked.includes(c.cve) ? "picked" : undefined}>
                <td>
                  <input
                    type="checkbox"
                    className="src-check"
                    aria-label={`Select ${c.cve}`}
                    checked={picked.includes(c.cve)}
                    onChange={() => togglePick(c.cve)}
                  />
                </td>
                <td>
                  <span className={`status-pill ${c.status === "New" ? "new" : "updated"}`}>
                    {c.status}
                  </span>
                </td>
                <td>{c.published}</td>
                <td>
                  <button className="headline" onClick={() => setOpen(c)}>
                    <Icon name="bug" size={16} style={{ color: "var(--content-medium)", marginTop: 2 }} />
                    <span>
                      <span className="linkish">{c.cve}</span>
                      <span className="sub" style={{ display: "block" }}>
                        {c.summary}
                      </span>
                    </span>
                  </button>
                </td>
                <td>
                  <ul className="mini-list">
                    {c.what.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul className="mini-list">
                    {c.latestActivity.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn ghost" style={{ marginTop: 12 }}>
          <Icon name="arrow-down" size={16} />
          Load More
        </button>
      </div>

      {open && <InsightPanel card={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */

function InsightPanel({ card, onClose }: { card: InsightCard; onClose: () => void }) {
  const { openReportEditor } = useStore();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);

  const angle = -90 + (card.cvss / 10) * 180;

  return (
    <div className="insight-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="insight-panel">
        <div className="insight-top">
          <button className="btn ghost icon sm" onClick={onClose} title="Close">
            <Icon name="close" size={16} />
          </button>
          <span className="spacer" />
          <Button icon="ai" variant="ghost" title="Ask AI" />
          <Button icon="star" variant="ghost" title="Prioritize" />
          <button ref={btnRef} className="btn" onClick={() => setMenu((m) => !m)}>
            <Icon name="wand" size={16} />
            Create Report
          </button>
          <Button variant="primary" icon="sparkle">
            Analyze
          </Button>
        </div>

        {menu && (
          <CreateReportMenu
            anchorRef={btnRef}
            onClose={() => setMenu(false)}
            onPick={(id) => {
              onClose();
              openReportEditor(id, { path: "insight", insightId: card.id });
            }}
          />
        )}

        <div className="insight-body">
          <div className="insight-header">
            <div style={{ minWidth: 0 }}>
              <div className="insight-tags">
                {card.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <h1 className="insight-cve">{card.cve}</h1>
              <a className="linkish t-body2" href="#euvd" onClick={(e) => e.preventDefault()}>
                {card.euvd}
              </a>
              <div className="t-body2" style={{ marginTop: 8 }}>
                {card.weakness}
                {card.extraWeaknesses > 0 && ` + ${card.extraWeaknesses} more`}
              </div>
              <a className="linkish t-body2" href="#more" onClick={(e) => e.preventDefault()}>
                See more
              </a>
              <div className="t-body3 light" style={{ marginTop: 10 }}>
                Published: {card.published} / Updated: {card.updated}
              </div>
            </div>

            <div className="cvss-gauge">
              <svg viewBox="0 0 200 110" width="200" height="110" aria-hidden="true">
                <defs>
                  <linearGradient id="cvssGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f5c518" />
                    <stop offset="55%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#e5342a" />
                  </linearGradient>
                </defs>
                <path
                  d="M14 100a86 86 0 0 1 172 0"
                  fill="none"
                  stroke="url(#cvssGrad)"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                <g transform={`rotate(${angle} 100 100)`}>
                  <path d="M100 100 L100 34" stroke="#f7f7f7" strokeWidth="7" strokeLinecap="round" />
                  <circle cx="100" cy="100" r="9" fill="#f7f7f7" />
                  <circle cx="100" cy="100" r="4" fill="#bfbfbf" />
                </g>
              </svg>
              <div className="cvss-scale">
                <span>0</span>
                <div>
                  <div className="cvss-value">CVSS {card.cvss}</div>
                  <div className="t-body3 light">No EPSS yet</div>
                  <div className="cvss-sev">{card.severity}</div>
                </div>
                <span>10</span>
              </div>
              <span className="select" style={{ marginTop: 6 }}>
                CVSS v3.0
                <span className="chev">
                  <Icon name="chevron-down" size={14} />
                </span>
              </span>
            </div>
          </div>

          <Section title="Summary">
            <p>{card.summary}</p>
          </Section>
          <Section title="Impact">
            <p>{card.impact}</p>
          </Section>
          <Section title="Exploitation">
            <p>{card.exploitation}</p>
          </Section>
          <Section title="Patch">
            <p>{card.patch}</p>
          </Section>
          <Section title="Mitigation">
            <ol className="mitigation">
              {card.mitigation.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </Section>
          <div className="t-body3 light" style={{ marginTop: 12 }}>
            {card.vector}
          </div>

          <div className="timeline-head">
            <span className="t-body2">Timeline</span>
            <span className="timeline-rule" />
            <span className="timeline-pill">HIGHLIGHT EVENTS</span>
          </div>
          <ol className="timeline">
            {card.timeline.map((t) => (
              <li key={t.label}>
                <span className="tl-dot" />
                <div>
                  <div className="t-body2-bold">{t.label}</div>
                  <div className="t-body2">{t.text}</div>
                  <div className="t-body3 light" style={{ marginTop: 2 }}>
                    {t.date}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="insight-section">
      <div className="t-body2-bold">{title}</div>
      {children}
    </div>
  );
}
