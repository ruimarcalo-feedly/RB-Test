import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { Button, MenuItem, Modal, Popover } from "../ui/primitives";
import { BrandPeek } from "../org/BrandPeek";
import { NewBrandDialog } from "../org/NewBrandDialog";
import { BandThumb, ThemePreview } from "./Themes";
import { ThemeNameDialog } from "./ThemesMenu";
import { useStore } from "../../state/store";
import {
  ACME_BRAND,
  FEEDLY_BRAND,
  brandPalettes,
  extractedBrand,
  type Brand,
  type BrandPalettes,
  type TypeKey,
} from "../../data/brand";
import { THEME_MARGINS, TYPE_LABELS, themeFromBrand, type ReportTheme } from "../../data/theme";

/* ------------------------------------------------------------------ *
 * Version F (Separate Themes), Nov 5 — the report editor's Themes tab
 *
 * Four separate things: the brand (its colors as primary, secondary and
 * neutral lists, its type, assets and visualization colors), the template
 * (the prompt), the report, and the theme. A theme applies a brand to a
 * report: which brand, which of its colors go on which text and structure,
 * the page background, the header, the footer and the margins.
 *
 * The tab lists the themes. Opening one applies it to the report and zooms
 * the tab into editing it; changes wait for "Save changes" (or are dismissed)
 * and the tab goes back to the list. Changes made on the report itself stay
 * on the report.
 * ------------------------------------------------------------------ */

export type ThemeEdit = { draft: ReportTheme; original: ReportTheme | null };

const ACME_PALETTES: BrandPalettes = {
  primary: ["#C62828"],
  secondary: ["#7A161C", "#F7E1E1"],
  neutral: ["#2B2B2B", "#6B6B6B", "#D9D9D9", "#F5F5F5", "#FFFFFF"],
};

const today = () =>
  new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ThemesPanel({
  themes,
  brands,
  currentId,
  edit,
  setDraft,
  onOpen,
  onBack,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onCreateManual,
  onGenerated,
  activeBand,
  onPickBand,
}: {
  themes: ReportTheme[];
  brands: Brand[];
  /** The theme the report uses. */
  currentId?: string;
  edit: ThemeEdit | null;
  setDraft: (f: (t: ReportTheme) => ReportTheme) => void;
  onOpen: (t: ReportTheme) => void;
  onBack: () => void;
  onSave: () => void;
  onRename: (t: ReportTheme, name: string) => void;
  onDuplicate: (t: ReportTheme) => void;
  onDelete: (t: ReportTheme) => void;
  onCreateManual: () => void;
  onGenerated: (brand: Brand, theme: ReportTheme) => void;
  activeBand: "header" | "footer" | null;
  onPickBand: (k: "header" | "footer") => void;
}) {
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<ReportTheme | null>(null);
  const { addBrand, addOrgItem } = useStore();
  const brandOf = (t: ReportTheme) => brands.find((b) => b.id === t.brandId) ?? brands[0];

  if (edit) {
    return <ThemeEditor edit={edit} brands={brands} setDraft={setDraft} onBack={onBack} onSave={onSave} activeBand={activeBand} onPickBand={onPickBand} />;
  }

  return (
    <>
      <div className="side-scroll details-panel thf">
        <div className="thf-intro">
          <div className="thf-title">Themes</div>
          <div className="thf-help">
            A theme is the look of a report: its brand, colors, header, footer and margins. Open one to use it and edit it.
          </div>
        </div>
        <div className="thf-list">
          {themes.map((t) => (
            <ThemeCardF
              key={t.id}
              theme={t}
              brand={brandOf(t)}
              current={t.id === currentId}
              canDelete={themes.length > 1}
              onOpen={() => onOpen(t)}
              onRename={() => setRenaming(t)}
              onDuplicate={() => onDuplicate(t)}
              onDelete={() => onDelete(t)}
            />
          ))}
          <button className="thf-new" onClick={() => setCreating(true)}>
            <Icon name="plus" size={20} />
            <span>Create new theme</span>
          </button>
        </div>
      </div>

      {creating && (
        <NewThemeDialog
          onClose={() => setCreating(false)}
          onManual={() => {
            setCreating(false);
            onCreateManual();
          }}
          onGenerated={() => {
            /* Prototype: what "extracting" a PDF of a report gives back is a
               new brand (Acme's colors, type and assets) and a theme that
               applies it. */
            const stamp = Date.now();
            const b: Brand = { ...ACME_BRAND, id: `brand-${stamp}`, name: "Acme Corp", palettes: ACME_PALETTES };
            addBrand(b);
            addOrgItem({
              id: `o-${stamp}`,
              name: b.name,
              type: "Brand",
              icon: "brand",
              referencedIn: [],
              createdBy: "Rui Marçalo",
              createdOn: today(),
            });
            setCreating(false);
            onGenerated(b, themeFromBrand(b, `theme-${stamp}`, "Acme board report"));
          }}
        />
      )}
      {renaming && (
        <ThemeNameDialog
          title="Rename theme"
          action="Rename"
          name={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={(name) => {
            onRename(renaming, name);
            setRenaming(null);
          }}
        />
      )}
    </>
  );
}

/* ---------------- A theme as a card ---------------- */

function ThemeCardF({
  theme,
  brand,
  current,
  canDelete,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  theme: ReportTheme;
  brand?: Brand;
  current: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const more = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const act = (f: () => void) => () => {
    setMenu(false);
    f();
  };
  return (
    <div className={`thm-card thf-card ${current ? "on" : ""}`}>
      <button className="thm-pv" onClick={onOpen} title={`Edit ${theme.name}`}>
        <ThemePreview theme={theme} brand={brand} h={200} />
        <span className="thm-badge">
          <Icon name="brand" size={20} />
          <span className="truncate">{brand?.name}</span>
        </span>
      </button>
      <div className="thm-foot">
        <span className="thm-name truncate">{theme.name}</span>
        {current && <span className="thf-inuse">In use</span>}
        <button ref={more} className="btn ghost icon sm thm-more" title="More" onClick={() => setMenu((m) => !m)}>
          <Icon name="ellipsis" size={20} />
        </button>
      </div>
      {menu && (
        <Popover anchorRef={more} onClose={() => setMenu(false)} align="end" width={200}>
          <MenuItem onClick={act(onOpen)}>Edit theme</MenuItem>
          <MenuItem onClick={act(onRename)}>Rename</MenuItem>
          <MenuItem onClick={act(onDuplicate)}>Duplicate</MenuItem>
          <MenuItem onClick={act(onDelete)} disabled={!canDelete} tone="danger">
            Delete
          </MenuItem>
        </Popover>
      )}
    </div>
  );
}

/* ---------------- Editing a theme ---------------- */

const STRUCTURE_ROWS: { key: "background" | "divider" | "tableHeaderText" | "tableHeaderBg" | "tableBorder"; label: string }[] = [
  { key: "background", label: "Page background" },
  { key: "divider", label: "Divider" },
  { key: "tableHeaderText", label: "Table header text" },
  { key: "tableHeaderBg", label: "Table header background" },
  { key: "tableBorder", label: "Table border" },
];

function structureValue(t: ReportTheme, k: (typeof STRUCTURE_ROWS)[number]["key"]): string {
  switch (k) {
    case "background":
      return t.background ?? "#FFFFFF";
    case "divider":
      return t.divider;
    case "tableHeaderText":
      return t.tableHeaderText ?? t.type.paragraph.color;
    case "tableHeaderBg":
      return t.tableHeaderBg ?? t.table;
    case "tableBorder":
      return t.tableBorder ?? t.divider;
  }
}

function ThemeEditor({
  edit,
  brands,
  setDraft,
  onBack,
  onSave,
  activeBand,
  onPickBand,
}: {
  edit: ThemeEdit;
  brands: Brand[];
  setDraft: (f: (t: ReportTheme) => ReportTheme) => void;
  onBack: () => void;
  onSave: () => void;
  activeBand: "header" | "footer" | null;
  onPickBand: (k: "header" | "footer") => void;
}) {
  const { updateBrand, addBrand, addOrgItem, toast } = useStore();
  const d = edit.draft;
  const brand = brands.find((b) => b.id === d.brandId) ?? brands[0];
  const dirty = !edit.original || JSON.stringify(edit.original) !== JSON.stringify(d);
  const [peek, setPeek] = useState<{ brand: Brand; fresh: boolean } | null>(null);
  const [newBrand, setNewBrand] = useState(false);
  const margin = d.margin ?? 96;

  return (
    <>
      <div className="side-scroll details-panel thf thf-edit">
        <div className="thf-edit-head">
          <button className="ts-back" onClick={onBack} title={dirty ? "Back (changes are dismissed)" : "Back to themes"}>
            <Icon name="chevron-left" size={16} />
            Back
          </button>
          <span className="thf-edit-title">{edit.original ? "Edit theme" : "New theme"}</span>
        </div>

        <div className="thf-field">
          <div className="thf-label">Name</div>
          <input
            className="input"
            value={d.name}
            aria-label="Theme name"
            onChange={(e) => setDraft((t) => ({ ...t, name: e.target.value }))}
          />
        </div>

        <div className="thf-field">
          <div className="thf-label">Brand</div>
          <BrandCard
            brand={brand}
            brands={brands}
            onPick={(id) => setDraft((t) => ({ ...t, brandId: id }))}
            onEdit={() => brand && setPeek({ brand, fresh: false })}
            onCreate={() => setNewBrand(true)}
          />
        </div>

        <div className="thf-rule" />

        <Fold
          title="Text colors"
          summary={
            <span className="thf-sum-type">
              {TYPE_LABELS.map((r) => (
                <span key={r.key} title={r.label} style={{ color: d.type[r.key].color, fontWeight: r.key.startsWith("h") ? 700 : 400 }}>
                  Aa
                </span>
              ))}
            </span>
          }
        >
          {TYPE_LABELS.map((r) => (
            <div className="thf-row" key={r.key}>
              <span className="thf-row-label" style={{ color: d.type[r.key].color, fontWeight: r.key.startsWith("h") ? 700 : 400 }}>
                {r.label}
              </span>
              <ColorPick
                value={d.type[r.key].color}
                brand={brand}
                label={r.label}
                onPick={(c) =>
                  setDraft((t) => ({ ...t, type: { ...t.type, [r.key]: { ...t.type[r.key as TypeKey], color: c } } }))
                }
              />
            </div>
          ))}
        </Fold>

        <Fold
          title="Tables and structures"
          summary={
            <span className="thf-sum-sw">
              {STRUCTURE_ROWS.map((r) => (
                <span key={r.key} title={r.label} style={{ background: structureValue(d, r.key) }} />
              ))}
            </span>
          }
        >
          {STRUCTURE_ROWS.map((r) => (
            <div className="thf-row" key={r.key}>
              <span className="thf-row-label">{r.label}</span>
              <ColorPick
                value={structureValue(d, r.key)}
                brand={brand}
                label={r.label}
                onPick={(c) =>
                  setDraft((t) =>
                    r.key === "tableHeaderBg"
                      ? { ...t, tableHeaderBg: c, table: c }
                      : r.key === "divider"
                        ? { ...t, divider: c }
                        : { ...t, [r.key]: c }
                  )
                }
              />
            </div>
          ))}
        </Fold>

        <div className="thf-rule" />

        {(["header", "footer"] as const).map((k) => (
          <div className="thf-field" key={k}>
            <div className="thf-label">{k === "header" ? "Header" : "Footer"}</div>
            <BandThumb theme={d} brand={brand} kind={k} active={activeBand === k} onClick={() => onPickBand(k)} />
          </div>
        ))}
        <div className="thf-help">Click the header or footer on the page to change it.</div>

        <div className="thf-field">
          <div className="thf-label">Margins</div>
          <div className="bdf2-toggles" role="radiogroup" aria-label="Margins">
            {THEME_MARGINS.map((m) => (
              <button
                key={m.label}
                role="radio"
                aria-checked={margin === m.px}
                className={margin === m.px ? "on" : ""}
                onClick={() => setDraft((t) => ({ ...t, margin: m.px }))}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dirty && (
        <div className="side-foot thf-foot">
          <span className="thf-changed">{edit.original ? "Unsaved changes" : "New theme"}</span>
          <Button onClick={onBack}>Dismiss</Button>
          <Button variant="primary" onClick={onSave}>
            {edit.original ? "Save changes" : "Create theme"}
          </Button>
        </div>
      )}

      {peek &&
        createPortal(
          <BrandPeek
            brand={peek.brand}
            fresh={peek.fresh}
            onClose={() => setPeek(null)}
            onSave={(b) => {
              updateBrand(b.id, b);
              setPeek(null);
              toast(`${b.name} saved`);
            }}
          />,
          document.body
        )}
      {newBrand && (
        <NewBrandDialog
          autofillName="Acme Corp"
          onClose={() => setNewBrand(false)}
          onCreate={(name, extracted) => {
            const id = `brand-${Date.now()}`;
            const b: Brand = extracted
              ? { ...ACME_BRAND, id, name, palettes: ACME_PALETTES }
              : { ...extractedBrand(name, id), assets: FEEDLY_BRAND.assets };
            addBrand(b);
            addOrgItem({ id: `o-${id}`, name, type: "Brand", icon: "brand", referencedIn: [], createdBy: "Rui Marçalo", createdOn: today() });
            setDraft((t) => ({ ...t, brandId: id }));
            setNewBrand(false);
            setPeek({ brand: b, fresh: true });
          }}
        />
      )}
    </>
  );
}

/* ---------------- The brand, as a card ---------------- */

function BrandCard({
  brand,
  brands,
  onPick,
  onEdit,
  onCreate,
}: {
  brand?: Brand;
  brands: Brand[];
  onPick: (id: string) => void;
  onEdit: () => void;
  onCreate: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pal = brandPalettes(brand);
  const logo = brand?.assets.find((a) => a.id === "logo");
  return (
    <div className="thf-brand">
      <button ref={ref} className="thf-brand-main" onClick={() => setOpen((o) => !o)} aria-haspopup="menu">
        <span className="thf-brand-logo">{logo ? <img src={logo.src} alt="" /> : <Icon name="brand" size={18} />}</span>
        <span className="thf-brand-text">
          <span className="thf-brand-name truncate">{brand?.name ?? "No brand"}</span>
          <span className="thf-brand-sw">
            {[...pal.primary, ...pal.secondary, ...pal.neutral].slice(0, 9).map((c, i) => (
              <span key={i} style={{ background: c }} />
            ))}
          </span>
        </span>
        <Icon name="chevron-down" size={16} />
      </button>
      <Button size="sm" onClick={onEdit} disabled={!brand}>
        Edit
      </Button>
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={260}>
          {brands.map((b) => (
            <MenuItem
              key={b.id}
              icon="brand"
              onClick={() => {
                onPick(b.id);
                setOpen(false);
              }}
            >
              {b.name}
            </MenuItem>
          ))}
          <div className="menu-sep" />
          <MenuItem
            icon="plus"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
          >
            Create new brand
          </MenuItem>
        </Popover>
      )}
    </div>
  );
}

/* ---------------- Small parts ---------------- */

function Fold({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`thf-fold ${open ? "open" : ""}`}>
      <button className="thf-fold-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="thf-fold-title">{title}</span>
        {!open && summary}
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
      </button>
      {open && <div className="thf-fold-body">{children}</div>}
    </div>
  );
}

/** A swatch that opens the brand's colors, grouped as the brand keeps them. */
function ColorPick({
  value,
  brand,
  label,
  onPick,
}: {
  value: string;
  brand?: Brand;
  label: string;
  onPick: (c: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pal = brandPalettes(brand);
  const groups: [string, string[]][] = [
    ["Primary", pal.primary],
    ["Secondary", pal.secondary],
    ["Neutral", pal.neutral],
  ];
  return (
    <>
      <button
        ref={ref}
        className="thf-swatch"
        style={{ background: value }}
        title={`${label}: ${value.toUpperCase()}`}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} align="end" width={236} className="menu thf-pick">
          <div className="thf-pick-title">{label}</div>
          {groups.map(([g, cs]) =>
            cs.length ? (
              <div key={g} className="thf-pick-group">
                <div className="thf-pick-label">{g}</div>
                <div className="thf-pick-row">
                  {cs.map((c, i) => (
                    <button
                      key={`${c}${i}`}
                      className={`thf-swatch ${c.toUpperCase() === value.toUpperCase() ? "on" : ""}`}
                      style={{ background: c }}
                      title={c.toUpperCase()}
                      onClick={() => {
                        onPick(c);
                        setOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null
          )}
        </Popover>
      )}
    </>
  );
}

/* ---------------- Creating a theme ---------------- */

function NewThemeDialog({
  onClose,
  onManual,
  onGenerated,
}: {
  onClose: () => void;
  onManual: () => void;
  onGenerated: () => void;
}) {
  const [file, setFile] = useState<{ name: string; size: string } | null>(null);
  const [phase, setPhase] = useState<"idle" | "working">("idle");
  const [step, setStep] = useState(0);
  const STEPS = ["Reading your report", "Extracting colors, fonts and logo", "Building the header and footer"];
  useEffect(() => {
    if (phase !== "working") return;
    const timers = [
      window.setTimeout(() => setStep(1), 900),
      window.setTimeout(() => setStep(2), 1800),
      window.setTimeout(() => onGenerated(), 2700),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Modal
      title="Create a theme"
      width={500}
      onClose={onClose}
      footer={
        phase === "working" ? undefined : (
          <>
            <Button onClick={onManual}>Create manually</Button>
            <Button variant="primary" disabled={!file} onClick={() => setPhase("working")}>
              Generate theme
            </Button>
          </>
        )
      }
    >
      {phase === "working" ? (
        <div className="thf-gen">
          <span className="thf-spinner" />
          <div className="thf-gen-title">Creating your theme</div>
          <div className="thf-gen-steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`thf-gen-step ${i < step ? "done" : i === step ? "now" : ""}`}>
                <Icon name={i < step ? "check" : "dot"} size={14} />
                {s}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="t-body3 muted" style={{ margin: "0 0 16px" }}>
            Upload a PDF of a report you already make, and we&rsquo;ll pull its brand and layout into a new theme. We&rsquo;ll
            also save the brand to your Org Profile.
          </p>
          {file ? (
            <div className="thf-file">
              <span className="thf-file-icon">PDF</span>
              <span className="thf-file-text">
                <span className="thf-file-name truncate">{file.name}</span>
                <span className="thf-file-size">{file.size}</span>
              </span>
              <button className="btn ghost icon sm" title="Remove" onClick={() => setFile(null)}>
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            <button
              className="dropzone thf-drop"
              onClick={() => setFile({ name: "Acme-Q3-board-report.pdf", size: "2.4 MB" })}
            >
              <Icon name="doc" size={24} style={{ color: "var(--content-light)" }} />
              <span className="t-body3 strong">Upload a PDF to extract your theme</span>
              <span className="t-body3 muted">Drag and drop, or click to choose a file. PDF only, 10 MB max.</span>
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
