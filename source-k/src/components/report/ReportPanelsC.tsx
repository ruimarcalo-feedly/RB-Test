import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Field, Popover, MenuItem, Select, Tip } from "../ui/primitives";
import { DateRangeField, MultiSearchSelect } from "./ElicitInputs";
import { type ReportBand } from "./BandObjects";
import { BrandDesign } from "./BrandDesign";
import { BUILDING_BLOCKS, setBlockDrag } from "../../data/buildingBlocks";
import {
  COMPANIES,
  LANGUAGES,
  ORG_PROFILE_LIST_ITEMS,
  type SourceItem,
  type Template,
} from "../../data/mockData";
import type { Brand } from "../../data/brand";
import type { BandKind } from "../../data/bandObjects";

/* ------------------------------------------------------------------ *
 * Version C — the report's Context tab
 *
 * Figma "Beginner's Flow" 2: Sources and Details become one tab. Parameters
 * read as a short summary (chip and value) with "Edit parameters" to change
 * them; the sources are one list to tick in and out; then the language and the
 * Company Overview. Every change here asks for a regeneration.
 * ------------------------------------------------------------------ */

export interface Attachment {
  title: string;
  sub: string;
}

export function ContextPanel({
  parameters,
  labelFor,
  answers,
  setAnswer,
  sources,
  setSources,
  attachments,
  language,
  setLanguage,
  company,
  setCompany,
  lead,
}: {
  /** Version F: shown first in the tab (the building blocks). */
  lead?: React.ReactNode;
  parameters: Template["parameters"];
  labelFor: (id: string) => string | undefined;
  answers: Record<string, string>;
  setAnswer: (id: string, v: string) => void;
  sources: SourceItem[];
  setSources: (s: SourceItem[]) => void;
  attachments: Attachment[];
  language: string;
  setLanguage: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const split = (v?: string) =>
    (v ?? "")
      .split(/,\s*/)
      .map((x) => x.trim())
      .filter((x) => x && x !== "Skipped");
  const summary = (v?: string) => {
    const items = split(v);
    if (!items.length) return "Not set";
    return items.length > 2 ? `${items.slice(0, 2).join(", ")}, +${items.length - 2}` : items.join(", ");
  };

  return (
    <div className="side-scroll details-panel ctx-panel">
      {lead}
      {parameters.length > 0 && (
        <>
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
                  {labelFor(p.id) ?? p.name}
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
                  {labelFor(p.id) ?? p.name}
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
          <div className="details-rule" />
        </>
      )}

      <div className="field-label">Sources</div>
      <div className="field-help" style={{ marginBottom: 10 }}>
        Based on your parameter and context, we&rsquo;ve identified the most relevant sources in our
        Threat Graph.
      </div>
      <div className="ctx-sources">
        {attachments.map((a) => (
          <div className="ctx-src" key={`att-${a.title}`}>
            <input type="checkbox" className="src-check" checked readOnly />
            <div className="src-body">
              <div className="src-title" title={a.title}>
                {a.title}
              </div>
              <div className="src-meta">
                <span className="src-favicon" />
                <span>{a.sub}</span>
              </div>
            </div>
          </div>
        ))}
        {sources.map((s) => (
          <div className="ctx-src" key={s.id}>
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
                    <span>{s.source ?? "Source name"}</span>
                    {s.age && <span>• {s.age}</span>}
                  </>
                ) : (
                  <>
                    <Icon name={s.kind === "cve" ? "bug" : "malware"} size={14} />
                    <span>{s.cvss ?? s.tags?.join(" • ")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button ref={addRef} className="btn" onClick={() => setMenu(true)} style={{ marginTop: 10 }}>
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

      <div className="details-rule" />

      <Field
        label="Language"
        help="The language this report was written on. To change the language you need to regenerate the report."
      >
        <Select block value={language} options={LANGUAGES} onChange={setLanguage} />
      </Field>
      <Field
        label="Company Overview"
        help={"Your organization’s details, sector and profile, used to assess your specific exposure. Changing Company Overview will require regeneration."}
      >
        <Select block value={company} options={COMPANIES} onChange={setCompany} />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Version C — the report's Design tab
 *
 * Figma "Beginner's Flow" 3–8: building blocks to drag onto the page, the
 * brand's styles, and the report's header and footer as cards. A card shows
 * the band in small, its name, "Unsaved changes" once it has been edited, and
 * a menu to save it as an object, rename it or swap it for a saved one.
 * ------------------------------------------------------------------ */

export function ReportDesignPanel({
  brands,
  brandId,
  setBrandId,
  createRequest,
  onBrandCreated,
  header,
  footer,
  activeBand,
  onSelectBand,
  applyToTemplate,
  brandOverride,
  readOnly,
  onBrandChange,
  brandDirty,
  onSaveBrand,
  onDiscardBrand,
}: {
  /** Report editor only: puts this brand (and its header and footer) on the template. */
  applyToTemplate?: { templateName: string; applied: boolean; onToggle: (on: boolean) => void };
  brands: Brand[];
  brandId?: string;
  setBrandId: (id: string | undefined) => void;
  createRequest?: number;
  onBrandCreated?: () => void;
  header: ReportBand;
  footer: ReportBand;
  activeBand: BandKind | null;
  onSelectBand: (k: BandKind) => void;
  onSave?: (k: BandKind) => void;
  onRename?: (k: BandKind) => void;
  onChangeBand?: (k: BandKind) => void;
  /** Version C (Nov 2): the brand with its unsaved changes. */
  brandOverride?: Brand;
  /** A report: the brand is shown, not changed. */
  readOnly?: boolean;
  onBrandChange?: (patch: Partial<Brand>) => void;
  brandDirty?: boolean;
  onSaveBrand?: () => void;
  onDiscardBrand?: () => void;
}) {
  const brand = brandOverride ?? brands.find((b) => b.id === brandId);
  return (
    <div className="side-scroll details-panel design-c bd-panel">
      <div className="field-label" style={{ marginBottom: 10 }}>
        Building blocks
      </div>
      <div className="block-grid">
        {BUILDING_BLOCKS.map((b) => (
          <Tip key={b.label} label={b.label}>
            <button
              className="block-tile"
              aria-label={b.label}
              draggable
              onDragStart={(e) => setBlockDrag(e.dataTransfer, b.label)}
            >
              <Icon name={b.icon} size={28} />
            </button>
          </Tip>
        ))}
      </div>

      <div className="details-rule" />

      <BrandDesign
        brands={brands}
        brandId={brandId}
        setBrandId={setBrandId}
        createRequest={createRequest}
        onBrandCreated={onBrandCreated}
        brand={brand}
        readOnly={readOnly}
        onChange={onBrandChange}
        header={header}
        footer={footer}
        activeBand={activeBand}
        onSelectBand={onSelectBand}
        dirty={brandDirty}
        onSave={onSaveBrand}
        onDiscard={onDiscardBrand}
      />

      {/* Report editor only: makes this brand the template's. */}
      {applyToTemplate && brand && (
        <div className="bd-apply">
          {applyToTemplate.applied ? (
            <span className="bs-foot-state">Template default</span>
          ) : (
            <Button
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => applyToTemplate.onToggle(true)}
            >
              Set as template default
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
