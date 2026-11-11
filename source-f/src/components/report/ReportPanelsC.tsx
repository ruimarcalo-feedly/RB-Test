import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Field, Popover, MenuItem, Select, Tip } from "../ui/primitives";
import { BrandPicker } from "../org/BrandPicker";
import { DateRangeField, MultiSearchSelect } from "./ElicitInputs";
import { BandCard, type ReportBand } from "./BandObjects";
import { BandBuilder, usePickerMode } from "./BandPickers";
import { BUILDING_BLOCKS, setAssetDrag, setBlockDrag } from "../../data/buildingBlocks";
import {
  COMPANIES,
  LANGUAGES,
  ORG_PROFILE_LIST_ITEMS,
  type SourceItem,
  type Template,
} from "../../data/mockData";
import { MAX_ASSETS, type Brand, type BrandAsset } from "../../data/brand";
import { BrandPeek } from "../org/BrandPeek";
import { createPortal } from "react-dom";
import { nextId, useStore } from "../../state/store";
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
}: {
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
  onSave,
  onRename,
  onChangeBand,
  applyToTemplate,
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
  onSave: (k: BandKind) => void;
  onRename: (k: BandKind) => void;
  onChangeBand: (k: BandKind) => void;
}) {
  const { updateBrand, toast } = useStore();
  const [pickerMode] = usePickerMode();
  const brand = brands.find((b) => b.id === brandId);
  const upload = useRef<HTMLInputElement>(null);
  const [stylesOpen, setStylesOpen] = useState(false);
  /** "Create brand" in the box's empty state opens the same New Brand dialog. */
  const [createLocal, setCreateLocal] = useState(0);
  const edit = (patch: Partial<Brand>) => brand && updateBrand(brand.id, patch);
  const addAsset = (f: File | undefined) => {
    if (!f || !brand) return;
    const r = new FileReader();
    r.onload = () => {
      const asset: BrandAsset = {
        id: nextId("asset"),
        name: f.name.replace(/\.[^.]+$/, ""),
        src: String(r.result),
        uploaded: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      };
      edit({ assets: [...brand.assets, asset] });
      toast(`\u201c${asset.name}\u201d added to ${brand.name}`);
    };
    r.readAsDataURL(f);
  };
  const card = (k: BandKind, rb: ReportBand) => (
    <div className="bs-sec">
      <div className="field-label" style={{ marginBottom: 8 }}>
        {k === "header" ? "Header" : "Footer"}
      </div>
      {/* Version F, Builder: the options compose the band; the card only
          appears once there is something on it to save. */}
      {!(pickerMode === "builder" && !rb.saved && rb.empty) && (
        <BandCard
          rb={rb}
          brand={brand}
          selected={activeBand === k}
          onSelect={() => onSelectBand(k)}
          onSave={() => onSave(k)}
          onRename={() => onRename(k)}
          onChange={() => onChangeBand(k)}
        />
      )}
      {pickerMode === "builder" && <BandBuilder rb={rb} brand={brand} />}
      {pickerMode === "builder" && rb.library.length > 0 && (
        <button className="bp-build-link" onClick={() => onChangeBand(k)}>
          Use a saved {k}
        </button>
      )}
    </div>
  );
  return (
    <div className="side-scroll details-panel design-c">
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

      {/* Version C (Figma "Rebound"): one box per brand. The picker is the
          box's header row and governs everything under it: typography,
          assets, and the header and footer styles. With no brand the box is
          greyed out behind a call to action. */}
      <div className={`brand-scope ${brand ? "" : "off"} ${brands.length ? "" : "no-brands"}`}>
        {/* Only when no brand exists at all. With at least one brand, a report
            without one shows "Select brand" and the sections stay disabled
            until a brand is picked. */}
        {brands.length === 0 && (
          <div className="bs-cta">
            <Icon name="brand" size={24} />
            <div className="bs-cta-title">Create your brand</div>
            <div className="bs-cta-text">
              Keep your images and styles in one brand and apply them to every report.
            </div>
            <Button size="sm" variant="primary" onClick={() => setCreateLocal((n) => n + 1)}>
              Create brand
            </Button>
          </div>
        )}
        <div className="bs-head">
          <BrandPicker
            brands={brands}
            brandId={brandId}
            onPick={setBrandId}
            textEdit
            disabled={brands.length === 0}
            createRequest={(createRequest ?? 0) + createLocal}
            onCreated={onBrandCreated}
          />
        </div>

        <div className="bscope-body">

          {/* Typography and colors live in the brand's full editor (the Org
              Profile panel), so here they are a summary that opens it. */}
          <div className="bs-sec">
            <div className="field-label" style={{ marginBottom: 8 }}>
              Typography styles
            </div>
            <div className="type-summary">
              <span
                className="type-sample"
                style={
                  brand
                    ? { fontFamily: `${brand.fonts.h1}, var(--font-sans)`, color: brand.colors.h1 }
                    : undefined
                }
              >
                Aa
              </span>
              <span className="type-meta">
                {brand && <span className="truncate">{brand.font}</span>}
                <span className="type-swatches" aria-hidden="true">
                  {(["h1", "h2", "h3", "h4", "paragraph", "caption"] as const).map((k) => (
                    <span key={k} style={brand ? { background: brand.colors[k] } : undefined} />
                  ))}
                </span>
              </span>
              <Button size="sm" disabled={!brand} onClick={() => setStylesOpen(true)}>
                Edit
              </Button>
            </div>
          </div>

          <div className="bs-sec">
            <div className="field-label">Images</div>
            <div className="field-help" style={{ margin: "0 0 10px" }}>
              The logo, background images and any other artwork. Drag one onto the page or a header
              slot.
            </div>
            <div className="block-grid">
              {brand?.assets.map((a) => (
                <Tip key={`asset-${brand.id}-${a.id}`} label={a.name}>
                  <button
                    className={`block-tile asset ${a.id === "logo" ? "logo" : "art"}`}
                    aria-label={a.name}
                    draggable
                    onDragStart={(e) => setAssetDrag(e.dataTransfer, a.id)}
                  >
                    <img src={a.src} alt="" draggable={false} />
                  </button>
                </Tip>
              ))}
              <Tip
                label={
                  !brand
                    ? "Pick a brand to add images"
                    : brand.assets.length >= MAX_ASSETS
                      ? `${brand.name} has ${MAX_ASSETS} of ${MAX_ASSETS} images`
                      : `Add an image to ${brand.name}`
                }
              >
                <button
                  className="block-tile add-asset"
                  aria-label="Add image"
                  disabled={!brand || brand.assets.length >= MAX_ASSETS}
                  onClick={() => upload.current?.click()}
                >
                  <Icon name="plus" size={24} />
                </button>
              </Tip>
              <input
                ref={upload}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml"
                hidden
                onChange={(e) => {
                  addAsset(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {card("header", header)}
          {card("footer", footer)}

        </div>

        {/* Report editor only: a footer segment of the box that makes this
            brand (with the header and footer styles in use) the template's. */}
        {applyToTemplate && brand && (
          <div className={`bs-foot ${applyToTemplate.applied ? "on" : ""}`}>
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
      {stylesOpen &&
        brand &&
        createPortal(
          <BrandPeek
            brand={brand}
            onClose={() => setStylesOpen(false)}
            onSave={(b) => {
              updateBrand(b.id, b);
              setStylesOpen(false);
              toast("Brand styles were successfully saved");
            }}
          />,
          document.body
        )}
    </div>
  );
}
