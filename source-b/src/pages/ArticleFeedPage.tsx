import { useRef, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/primitives";
import { CreateReportMenu } from "../components/report/CreateReportMenu";
import { useStore } from "../state/store";
import { ARTICLES, FEED_NAME } from "../data/mockData";

/**
 * Entry point for the "Selected Articles" create-report path.
 * Figma: 1 — "Selected Articles" path, Select 1.
 */
export function ArticleFeedPage() {
  const { selectedArticles, toggleArticle, openReportEditor } = useStore();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);

  /* Nothing selected means the report covers the feed itself rather than a
     hand-picked set — the "broad context" path in the Source Collection Logic. */
  const anySelected = selectedArticles.length > 0;

  return (
    <div className="page" style={{ paddingTop: 28 }}>
      <div className="page-head" style={{ alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="t-h1" style={{ margin: 0, fontSize: 22, lineHeight: "28px" }}>
            {FEED_NAME}
          </h1>
          <div className="t-body3 muted" style={{ marginTop: 6 }}>
            {anySelected
              ? `${selectedArticles.length} article${
                  selectedArticles.length === 1 ? "" : "s"
                } selected`
              : "Nothing selected — a report will cover the whole feed"}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button icon="check" title="Mark all as read" variant="ghost" />
          <Button icon="star" title="Prioritise" variant="ghost" />
          <Button icon="wand" title="Summarise" variant="ghost" />
          <button ref={btnRef} className="btn" onClick={() => setMenu((m) => !m)}>
            <Icon name="wand" size={16} />
            Create Report
          </button>
          <Button icon="sparkle">Analyse</Button>
          <Button icon="ellipsis" variant="ghost" title="More" />
        </div>
      </div>

      {menu && (
        <CreateReportMenu
          anchorRef={btnRef}
          onClose={() => setMenu(false)}
          onPick={(id) =>
            openReportEditor(
              id,
              anySelected
                ? { path: "articles", articleIds: selectedArticles }
                : { path: "broad", contextLabel: FEED_NAME, contextKind: "feed" }
            )
          }
        />
      )}

      {ARTICLES.map((a) => {
        const selected = selectedArticles.includes(a.id);
        return (
          <div key={a.id} className={`feed-item ${selected ? "selected" : ""}`}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                paddingTop: 2,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleArticle(a.id)}
                style={{
                  appearance: "none",
                  width: 18,
                  height: 18,
                  border: "1.5px solid var(--border-medium)",
                  borderRadius: 4,
                  background: selected ? "var(--bg-accent)" : "#fff",
                  borderColor: selected ? "var(--bg-accent)" : "var(--border-medium)",
                  backgroundImage: selected
                    ? "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'><path d='m5 12.8 4.6 4.4L19 6.5'/></svg>\")"
                    : undefined,
                  backgroundSize: "13px",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  cursor: "pointer",
                }}
              />
            </label>
            <div className="feed-thumb" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="feed-title">{a.title}</div>
              {a.trend && (
                <div
                  className="row"
                  style={{ gap: 6, marginTop: 4, color: "var(--bg-accent)", fontSize: 13 }}
                >
                  <Icon name="landscape" size={14} />
                  <span>{a.trend}</span>
                  <span className="muted">• {a.age}</span>
                </div>
              )}
              {!a.trend && (
                <div className="t-body3 muted" style={{ marginTop: 4 }}>
                  {a.age}
                </div>
              )}
              <div className="feed-snippet">{a.snippet}</div>
              <div className="feed-also">Also in {a.also}</div>
            </div>
            <div className="row" style={{ gap: 2, alignSelf: "flex-start" }}>
              <Button icon="bookmark" variant="ghost" size="sm" title="Read later" />
              <Button icon="star" variant="ghost" size="sm" title="Prioritise" />
              <Button icon="arrow-down" variant="ghost" size="sm" title="Mute" />
              <Button icon="check" variant="ghost" size="sm" title="Mark as read" />
              <Button icon="wand" variant="ghost" size="sm" title="Summarise" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
