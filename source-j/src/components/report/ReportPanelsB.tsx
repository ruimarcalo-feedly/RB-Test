import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Field, MenuItem, Popover, Select } from "../ui/primitives";
import { BrandPicker } from "../org/BrandPicker";
import { DateRangeField, MultiSearchSelect } from "./ElicitInputs";
import type { CreateContext } from "./script";
import type { Brand } from "../../data/brand";
import {
  COMPANIES,
  LANGUAGES,
  ORG_PROFILE_LIST_ITEMS,
  type SourceItem,
  type Template,
} from "../../data/mockData";

/* Version I: the report editor's Sources and Details tabs, as in Version B. */

/* ------------------------------------------------------------------ *
 * Sources
 * ------------------------------------------------------------------ */

export function SourcesPanel({
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
        : context.path === "selection"
          ? (context.cveIds ?? []).map((c) => ({ icon: "bug" as const, title: c, sub: "Selected in Intel Agent" }))
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

export function DetailsPanel({
  templateName,
  answers,
  questions,
  parameters,
  setAnswer,
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
  questions: { id: string; label: string }[];
  parameters: Template["parameters"];
  setAnswer: (id: string, v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  brands: Brand[];
  brandId?: string;
  setBrandId: (id: string | undefined) => void;
  onOpenTemplate: () => void;
}) {
  const split = (v?: string) =>
    (v ?? "")
      .split(/,\s*/)
      .map((x) => x.trim())
      .filter((x) => x && x !== "Skipped");
  const label = (id: string) => questions.find((q) => q.id === id)?.label;
  const [editing, setEditing] = useState(false);
  const summary = (v?: string) => {
    const items = split(v);
    if (!items.length) return "Not set";
    return items.length > 2 ? `${items.slice(0, 2).join(", ")}, +${items.length - 2}` : items.join(", ");
  };

  return (
    <div className="side-scroll details-panel">
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

      {/* Figma "Report Builder - Details": every parameter the report was
          written with, each in the control its input type uses, so it can be
          changed and the report regenerated. */}
      {/* Version I: Version C's parameters, collapsed to a summary until
          "Edit parameters" opens them. */}
      {parameters.length > 0 && (
        <>
          <div className="details-rule" />
          <div className="field-label">Parameters</div>
          <div className="field-help" style={{ marginBottom: 10 }}>
            Prompt variables included in the template. To change a parameter entry you need to
            regenerate the report.
          </div>
          {parameters.map((p) =>
            editing ? (
              <div key={p.id} className="details-param">
                <span className="elicit-tag" style={{ marginBottom: 6 }}>
                  <Icon name="braces" size={14} />
                  {label(p.id) ?? p.name}
                </span>
                {p.type === "Org Profile" ? (
                  <MultiSearchSelect
                    summary
                    editable
                    value={split(answers[p.id])}
                    options={ORG_PROFILE_LIST_ITEMS}
                    onChange={(v) => setAnswer(p.id, v.join(", "))}
                    placeholder="Search Org Profile"
                  />
                ) : p.type === "Date" ? (
                  <DateRangeField value={answers[p.id] ?? ""} onChange={(v) => setAnswer(p.id, v)} />
                ) : (
                  <textarea
                    className="textarea"
                    rows={2}
                    value={answers[p.id] ?? ""}
                    onChange={(e) => setAnswer(p.id, e.target.value)}
                  />
                )}
              </div>
            ) : (
              <div key={p.id} className="ctx-param">
                <span className="param-badge">
                  <Icon name="braces" size={14} />
                  {label(p.id) ?? p.name}
                </span>
                <span className={`ctx-param-value truncate ${answers[p.id] ? "" : "light"}`}>
                  {summary(answers[p.id])}
                </span>
              </div>
            )
          )}
          <Button icon={editing ? "check" : "braces"} onClick={() => setEditing((e) => !e)} style={{ marginTop: 4 }}>
            {editing ? "Done" : "Edit parameters"}
          </Button>
        </>
      )}

      <div className="details-rule" />

      <Field
        label="Language"
        help="The language this report was written on. To change the language you need to regenerate the report."
      >
        <Select block value={language} options={LANGUAGES} onChange={setLanguage} />
      </Field>
      <Field
        label="Company Overview"
        help={"Your organization\u2019s details, sector and profile, used to assess your specific exposure. Changing Company Overview will require regeneration."}
      >
        <Select block value={company} options={COMPANIES} onChange={setCompany} />
      </Field>
      <Field
        label="Brand"
        help="The brand style applied to your report. Brands are saved in the Org Profile."
      >
        <BrandPicker brands={brands} brandId={brandId} onPick={setBrandId} />
      </Field>
    </div>
  );
}

