import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { Button, Popover, Select, layerStack } from "../ui/primitives";
import { ColorField } from "../ui/ColorField";
import {
  BRAND_FONTS,
  MAX_ASSETS,
  brandSwatches,
  type Brand,
  type BrandAsset,
  type BrandSwatches,
  type TypeKey,
} from "../../data/brand";
import { brandThemes, defaultTheme } from "../../data/theme";
import { ThemePanel } from "../themes/ThemePanel";

/**
 * Figma "Table + Popout preview": the brand editor.
 *
 * Every setting is a row in a table, so the panel reads as four short lists
 * rather than a wall of fields: what each style is, what it is set to, nothing
 * else. The thing a hex cannot tell you — what it actually looks like — is not
 * crammed in beside the controls; it arrives on hover, as a card outside the
 * panel pointing at the row the cursor is on.
 *
 * Version E (Brand Themes): every color is decided here, once. The palette
 * (Primary, Secondary, Tertiary, Background, then any more) sits above the
 * type styles, and the type styles, divider and table only pick from it. A
 * report theme is layout only: header, footer, margins and background.
 */

type SectionId = "typography" | "structures" | "imagery" | "dataviz";

/** Where the preview card is, and which one it is. */
interface Peeked {
  section: SectionId;
  /** Viewport y of the hovered row's centre — the card points here. */
  y: number;
  /** Common Imagery previews the asset under the cursor, not the table. */
  asset?: BrandAsset;
  /** The row itself, so the card can follow it when the panel scrolls. */
  el: HTMLElement;
}

/* Version E (Nov 4): the same rows, names and order as the report's Styles tab. */
const TYPE_ROWS: { key: TypeKey | "tableHeader"; label: string; help: string }[] = [
  { key: "h1", label: "Heading 1", help: "The font applied to all H1 content" },
  { key: "h2", label: "Heading 2", help: "The font applied to all H2 content" },
  { key: "h3", label: "Heading 3", help: "The font applied to all H3 content" },
  { key: "h4", label: "Heading 4", help: "The font applied to all H4 content" },
  { key: "paragraph", label: "Paragraph", help: "The font applied to all paragraph content" },
  { key: "tableHeader", label: "Table header", help: "The text in a table's header row. Set in the Paragraph font" },
  { key: "caption", label: "Caption", help: "The font applied to all Caption content" },
];

const today = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** The palette as pickable rows: each color with its role's name. */
type PaletteItem = { c: string; label: string };
function paletteOf(sw: BrandSwatches): PaletteItem[] {
  return [
    { c: sw.primary, label: "Primary" },
    { c: sw.secondary, label: "Secondary" },
    { c: sw.tertiary, label: "Tertiary" },
    { c: sw.background, label: "Background" },
    ...sw.more.map((c, i) => ({ c, label: `Color ${i + 5}` })),
  ];
}

export function BrandPeek({
  brand,
  onClose,
  onSave,
  creating,
  autofill,
  fresh,
}: {
  brand: Brand;
  onClose: () => void;
  onSave: (b: Brand) => void;
  /** A brand-new brand: the name is editable and saving creates it. */
  creating?: boolean;
  /**
   * Prototype shortcut (Version C): clicking into a part of a new brand fills
   * that part in from this brand, as if it were being set up by hand. The
   * Common Imagery "Add item" adds its logo only.
   */
  autofill?: Brand;
  /** Just created: open already filled in, so saving is available straight away. */
  fresh?: boolean;
}) {
  const [draft, setDraft] = useState<Brand>(() => ({ ...brand, themes: brandThemes(brand) }));
  const sw = brandSwatches(draft);
  const palette = paletteOf(sw);
  /* Changing a palette color moves every style that used it along with it,
     so a style keeps its role rather than an old hex. */
  const setPaletteColor = (old: string, next: BrandSwatches) =>
    setDraft((d) => {
      const nu = (x: string) => (x.toUpperCase() === old.toUpperCase() ? newColor(old, next, sw) : x);
      const colors = Object.fromEntries(Object.entries(d.colors).map(([k, v]) => [k, nu(v)])) as unknown as Brand["colors"];
      return {
        ...d,
        swatches: next,
        palette: undefined,
        colors,
        structure: { dividers: nu(d.structure.dividers), table: nu(d.structure.table) },
      };
    });
  const logoInput = useRef<HTMLInputElement>(null);
  const logo = draft.assets.find((a) => a.id === "logo");
  /** Which parts have been filled in already, so each fills once. */
  const filled = useRef<Set<string>>(new Set());
  const fill = (part: "name" | "typography" | "structures" | "dataviz") => () => {
    if (!autofill || filled.current.has(part)) return;
    filled.current.add(part);
    setDraft((d) =>
      part === "name"
        ? { ...d, name: autofill.name }
        : part === "typography"
          ? { ...d, font: autofill.font, fonts: { ...autofill.fonts }, colors: { ...autofill.colors }, tlp: { ...autofill.tlp } }
          : part === "structures"
            ? { ...d, structure: { ...autofill.structure } }
            : { ...d, viz: [...autofill.viz] }
    );
  };
  const addLogo = () => {
    const logo = autofill?.assets.find((a) => a.id === "logo");
    if (!logo) return false;
    if (draft.assets.some((a) => a.id === "logo")) return false;
    setDraft((d) => ({ ...d, assets: [...d.assets, { ...logo, uploaded: today() }] }));
    return true;
  };
  const [peeked, setPeeked] = useState<Peeked | null>(null);
  /** The panel's sections, one tab each, with what only Report Builder uses
      in a tab of its own. */
  const [tab, setTab] = useState<"typography" | "assets" | "viz" | "layout">("typography");
  const defLayout = defaultTheme(draft);
  /* The font under the cursor in an open font menu, applied everywhere the
     committed one would be until it is chosen or the menu is left. */
  const [tryFont, setTryFont] = useState<{ key: TypeKey; font: string } | null>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const assetInput = useRef<HTMLInputElement>(null);
  /* Header and footer styles save on their own, so they are not part of the
     panel's draft. */
  const styling = (b: Brand) => {
    const { bands: _b, primary: _p, ...rest } = b;
    void _b;
    void _p;
    return rest;
  };
  const dirty = JSON.stringify(styling(draft)) !== JSON.stringify(styling(brand));
  const canSave = creating ? draft.name.trim().length > 0 : fresh || dirty;

  /* Escape closes it, like every other layer — but only when it is the
     top one, so a menu open inside it takes the key first. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layerStack.count === 0) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const color = (k: keyof Brand["colors"]) => (v: string) =>
    setDraft((d) => ({ ...d, colors: { ...d.colors, [k]: v } }));
  const font = (k: TypeKey) => (v: string) =>
    setDraft((d) => ({ ...d, fonts: { ...d.fonts, [k]: v } }));

  /** The draft as it would be with the hovered font applied. */
  const shown: Brand = tryFont
    ? { ...draft, fonts: { ...draft.fonts, [tryFont.key]: tryFont.font } }
    : draft;

  /** The row under the cursor is what the card points at. */
  const peek = (section: SectionId, asset?: BrandAsset) => (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    setPeeked({ section, y: r.top + r.height / 2, asset, el });
  };

  /**
   * What takes the card away is the cursor leaving the tables — but not while
   * the row is still being worked on. A colour picker is an operating-system
   * window and a font menu is a layer above the panel, so in both cases the
   * cursor has to leave the row to use the control it just opened. Losing the
   * preview at exactly that moment would take it away for the one gesture it
   * exists for, so a focused control or an open menu keeps it.
   */
  useEffect(() => {
    if (!peeked) return;
    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(".bt")) return;
      if (layerStack.count > 0) return;
      const table = peeked.el.closest("table");
      const active = document.activeElement;
      if (table && active && table.contains(active)) return;
      setPeeked(null);
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [peeked]);

  /* Scrolling the panel with the cursor still on a row moves the row, so the
     card follows it rather than being left pointing at nothing. */
  const follow = () =>
    setPeeked((p) => {
      if (!p) return p;
      const r = p.el.getBoundingClientRect();
      return { ...p, y: r.top + r.height / 2 };
    });

  const addAssets = (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_ASSETS - draft.assets.length;
    Array.from(files)
      .slice(0, room)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () =>
          setDraft((d) =>
            d.assets.length >= MAX_ASSETS
              ? d
              : {
                  ...d,
                  assets: [
                    ...d.assets,
                    {
                      id: `a${Date.now()}${d.assets.length}`,
                      name: file.name.replace(/\.[^.]+$/, ""),
                      src: String(reader.result),
                      uploaded: today(),
                    },
                  ],
                }
          );
        reader.readAsDataURL(file);
      });
  };

  return (
    <div className="peek-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="peek brand-peek" ref={peekRef}>
        <button className="btn ghost icon sm peek-close" onClick={onClose} title="Close">
          <Icon name="close" size={18} />
        </button>

        <div className="peek-scroll" onScroll={follow}>
          <div className="peek-title">
            <div>
              <div className="t-body3 muted">{creating ? "New brand styles" : "Brand styles"}</div>
              {creating ? (
                <input
                  className="brand-name-input t-h2"
                  value={draft.name}
                  placeholder="Brand name"
                  autoFocus={!autofill}
                  onPointerDown={fill("name")}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              ) : (
                <h2 className="t-h2" style={{ margin: "2px 0 0" }}>
                  {draft.name}
                </h2>
              )}
            </div>
            <button className="btn ghost icon" title="More">
              <Icon name="ellipsis" size={18} />
            </button>
          </div>

          <div className="tabs brand-tabs" role="tablist">
            {(
              [
                ["typography", "Colors and typography"],
                ["assets", "Assets"],
                ["viz", "Visualizations"],
                ["layout", "Layout"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={`tab ${tab === id ? "active" : ""}`}
                onClick={() => {
                  setPeeked(null);
                  setTab(id);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ---------------- Typography ---------------- */}
          {tab === "typography" && (
          <>
          <Section
            title="Colors"
            blurb="The brand's palette. Every color in the brand's styles and report layouts comes from here."
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 711 },
                { key: "color", label: "Color", width: 151 },
                { key: "actions", label: "Actions", width: 82 },
              ]}
              rows={palette.map((p, i) => ({ ...p, i }))}
              sortValue={(r, key) => (key === "color" ? r.c : r.label)}
              rowKey={(r) => String(r.i)}
              onRowEnter={peek("typography")}
              lead={undefined}
              cells={(r) => [
                <NameCell
                  key="n"
                  label={r.label}
                  help={
                    r.i === 0
                      ? "The brand's main color"
                      : r.i === 3
                        ? "The color behind the content"
                        : r.i < 3
                          ? "A supporting color"
                          : "An extra color"
                  }
                />,
                <ColorField
                  key="c"
                  value={r.c}
                  onChange={(v) => {
                    const keys = ["primary", "secondary", "tertiary", "background"] as const;
                    const next: BrandSwatches =
                      r.i < 4
                        ? { ...sw, [keys[r.i]]: v }
                        : { ...sw, more: sw.more.map((x, j) => (j === r.i - 4 ? v : x)) };
                    setPaletteColor(r.c, next);
                  }}
                />,
                r.i >= 4 ? (
                  <button
                    key="x"
                    className="btn ghost icon sm"
                    title={`Remove ${r.label}`}
                    onClick={() =>
                      setDraft((d) => ({ ...d, swatches: { ...sw, more: sw.more.filter((_, j) => j !== r.i - 4) } }))
                    }
                  >
                    <Icon name="trash" size={18} />
                  </button>
                ) : (
                  <span key="x" />
                ),
              ]}
            />
            <button
              className="add-row"
              style={{ marginTop: 4 }}
              onClick={() => setDraft((d) => ({ ...d, swatches: { ...sw, more: [...sw.more, "#BDBDBD"] } }))}
            >
              <Icon name="plus" size={18} />
              Add color
            </button>
          </Section>
          <Section
            title="Text styles"
            onFill={fill("typography")}
            blurb="Styles that will affect the typography of exported products, such as Automated Newsletters and Report Builder. Colors come from the palette above."
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 536 },
                { key: "font", label: "Font", width: 178 },
                { key: "color", label: "Color", width: 230 },
              ]}
              rows={TYPE_ROWS}
              sortValue={(r, key) =>
                key === "font"
                  ? draft.fonts[r.key === "tableHeader" ? "paragraph" : r.key]
                  : key === "color"
                    ? draft.colors[r.key] ?? draft.colors.paragraph
                    : r.label
              }
              rowKey={(r) => r.key}
              onRowEnter={peek("typography")}
              cells={(r) => [
                <NameCell key="n" label={r.label} help={r.help} />,
                <Select
                  key="f"
                  block
                  value={shown.fonts[r.key === "tableHeader" ? "paragraph" : r.key]}
                  options={BRAND_FONTS}
                  disabled={r.key === "tableHeader"}
                  onChange={(v) => {
                    if (r.key !== "tableHeader") font(r.key)(v);
                  }}
                  onPreview={(v) => {
                    if (r.key !== "tableHeader") setTryFont(v ? { key: r.key, font: v } : null);
                  }}
                />,
                <PaletteField
                  key="c"
                  value={draft.colors[r.key] ?? draft.colors.paragraph}
                  palette={palette}
                  label={`${r.label} color`}
                  onChange={color(r.key)}
                />,
              ]}
            />
          </Section>
          <Section
            onFill={fill("structures")}
            title="Dividers and tables"
            blurb="Colors for the dividers and tables in a report. Colors come from the palette above."
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 744 },
                { key: "color", label: "Color", width: 200 },
              ]}
              rows={
                [
                  {
                    key: "dividers",
                    label: "Divider",
                    help: "The color of the line separating between paragraphs or other content blocks",
                  },
                  {
                    key: "table",
                    label: "Table",
                    help: "The background and border color of tables",
                  },
                ] as const
              }
              sortValue={(r, key) => (key === "color" ? draft.structure[r.key] : r.label)}
              rowKey={(r) => r.key}
              onRowEnter={peek("structures")}
              cells={(r) => [
                <NameCell key="n" label={r.label} help={r.help} />,
                <PaletteField
                  key="c"
                  value={draft.structure[r.key]}
                  palette={palette}
                  label={`${r.label} color`}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, structure: { ...d.structure, [r.key]: v } }))
                  }
                />,
              ]}
            />
          </Section>
          </>
          )}

          {/* ---------------- Assets ---------------- */}
          {tab === "assets" && (
          <Section
            blurb={`Images commonly used in your branded exported products. You can upload up to ${MAX_ASSETS} images.`}
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 732 },
                { key: "uploaded", label: "Upload date", width: 130 },
                { key: "actions", label: "Actions", width: 82 },
              ]}
              rows={[...draft.assets].sort((a, b) => (a.id === "logo" ? -1 : b.id === "logo" ? 1 : 0))}
              sortValue={(a, key) => (key === "uploaded" ? a.uploaded : a.name)}
              rowKey={(a) => a.id}
              onRowEnter={(e, a) => peek("imagery", a)(e)}
              lead={
                <tr className="bt-add">
                  <td colSpan={3}>
                    <button
                      className="add-row"
                      disabled={draft.assets.length >= MAX_ASSETS}
                      onClick={() => {
                        if (!addLogo()) assetInput.current?.click();
                      }}
                    >
                      <Icon name="plus" size={18} />
                      {draft.assets.length >= MAX_ASSETS
                        ? `${MAX_ASSETS} of ${MAX_ASSETS} uploaded`
                        : "Add item"}
                    </button>
                  </td>
                </tr>
              }
              cells={(a) => a.id === "logo" ? [
                <div key="n" className="asset-name">
                  <span className="asset-thumb">
                    <img src={a.src} alt="" />
                  </span>
                  <NameCell label="Logo" help="Shown wherever a layout places the Logo object" />
                </div>,
                <span key="d" className="t-body3 muted">
                  {a.uploaded}
                </span>,
                <button
                  key="x"
                  className="btn ghost icon sm"
                  title="Replace the logo"
                  onClick={() => logoInput.current?.click()}
                >
                  <Icon name="upload" size={18} />
                </button>,
              ] : [
                <div key="n" className="asset-name">
                  <span className="asset-thumb">
                    <img src={a.src} alt="" />
                  </span>
                  <input
                    className="cell-input"
                    style={{ maxWidth: 260 }}
                    value={a.name}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        assets: d.assets.map((x) =>
                          x.id === a.id ? { ...x, name: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </div>,
                <span key="d" className="t-body3 muted">
                  {a.uploaded}
                </span>,
                <button
                  key="x"
                  className="btn ghost icon sm"
                  title={`Remove ${a.name}`}
                  onClick={() =>
                    setDraft((d) => ({ ...d, assets: d.assets.filter((x) => x.id !== a.id) }))
                  }
                >
                  <Icon name="trash" size={18} />
                </button>,
              ]}
            />
            {!logo && (
              <button className="add-row" style={{ marginTop: 4 }} onClick={() => logoInput.current?.click()}>
                <Icon name="plus" size={18} />
                Add logo
              </button>
            )}
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const r = new FileReader();
                r.onload = () =>
                  setDraft((d) => ({
                    ...d,
                    assets: [
                      { id: "logo", name: "Logo", src: String(r.result), uploaded: today() },
                      ...d.assets.filter((x) => x.id !== "logo"),
                    ],
                  }));
                r.readAsDataURL(f);
              }}
            />
            <input
              ref={assetInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addAssets(e.target.files);
                e.target.value = "";
              }}
            />
          </Section>

          )}

          {/* ---------------- Visualizations ---------------- */}
          {tab === "viz" && (
          <Section
            onFill={fill("dataviz")}
            blurb="Colors used in charts and other data visualizations in exported products, such as Automated Newsletters and Report Builder."
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 793 },
                { key: "color", label: "Color", width: 151 },
              ]}
              rows={draft.viz.map((value, i) => ({ i, value }))}
              sortValue={(r, key) => (key === "color" ? r.value : `Viz color ${r.i + 1}`)}
              rowKey={(r) => String(r.i)}
              onRowEnter={peek("dataviz")}
              cells={(r) => [
                <NameCell key="n" label={`Viz color ${r.i + 1}`} />,
                <ColorField
                  key="c"
                  value={r.value}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, viz: d.viz.map((x, j) => (j === r.i ? v : x)) }))
                  }
                />,
              ]}
            />
          </Section>
          )}

          {/* ---------------- Layout (Version E, Nov 4) ---------------- */}
          {/* The same controls as the Layout section of a report's Styles tab,
              for the layout every report in this brand starts with. */}
          {tab === "layout" && (
          <Section blurb="Every report in this brand starts with this layout. The header and footer are changed on a report, from its Styles tab.">
            <div className="peek-layout">
              <ThemePanel
                brand={draft}
                layouts={draft.themes ?? []}
                layout={defLayout}
                edited={false}
                onPick={() => {}}
                onNew={() => {}}
                setMargin={(px) =>
                  setDraft((d) => {
                    const id = defaultTheme(d)?.id;
                    return { ...d, themes: brandThemes(d).map((t) => (t.id === id ? { ...t, margin: px } : t)) };
                  })
                }
                activeBand={null}
                onPickBand={() => {}}
              />
            </div>
          </Section>
          )}
        </div>

        <div className="peek-foot">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canSave} onClick={() => onSave(styling(draft) as Brand)}>
            {creating ? "Create brand" : "Save changes"}
          </Button>
        </div>
      </div>

      {peeked && (
        <ReferencePopover
          peeked={peeked}
          brand={shown}
          rightOf={peekRef.current?.getBoundingClientRect().left ?? 0}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section and table
 * ------------------------------------------------------------------ */

function Section({
  title,
  blurb,
  children,
  onFill,
}: {
  /** Left out when the section is the whole tab, which already names it. */
  title?: string;
  blurb: string;
  children: ReactNode;
  onFill?: () => void;
}) {
  return (
    <section className="brand-section" onPointerDownCapture={onFill}>
      {title && (
        <h3 className="t-h3" style={{ margin: 0 }}>
          {title}
        </h3>
      )}
      <p className="t-body3 muted" style={{ margin: title ? "4px 0 12px" : "0 0 12px" }}>
        {blurb}
      </p>
      {children}
    </section>
  );
}

function NameCell({ label, help }: { label: string; help?: string }) {
  return (
    <div className="cell-name">
      <div className="cn-label">{label}</div>
      {help && <div className="cn-help">{help}</div>}
    </div>
  );
}

interface Col {
  key: string;
  label: string;
  width: number;
}

/**
 * Figma's table: a sortable heading row, then one row per setting. The whole
 * row is the hover target, because the preview is about the row rather than
 * about whichever control the cursor happens to be over.
 */
function SettingsTable<T>({
  cols,
  rows,
  rowKey,
  cells,
  sortValue,
  onRowEnter,
  lead,
}: {
  cols: Col[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  cells: (row: T) => ReactNode[];
  sortValue: (row: T, key: string) => string;
  onRowEnter: (e: React.MouseEvent<HTMLElement>, row: T) => void;
  lead?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const ordered = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort(
      (a, b) => sortValue(a, sort.key).localeCompare(sortValue(b, sort.key)) * sort.dir
    );
    /* sortValue closes over the draft, so it is deliberately not a dependency:
       re-sorting while a colour is being typed would move the row out from
       under the cursor. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  /* Clicking a heading cycles ascending, descending, and back to the order the
     settings are written in — which is the order that means something. */
  const toggle = (key: string) =>
    setSort((s) =>
      !s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null
    );

  return (
    <table className="bt">
      <colgroup>
        {cols.map((c) => (
          <col key={c.key} style={{ width: c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.key}>
              <button
                className={`th-sort ${sort?.key === c.key ? "on" : ""}`}
                onClick={() => toggle(c.key)}
              >
                {c.label}
                <Icon
                  name={!sort || sort.key !== c.key ? "sort" : sort.dir === 1 ? "arrow-up" : "arrow-down"}
                  size={14}
                />
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lead}
        {ordered.map((row) => (
          <tr key={rowKey(row)} onMouseEnter={(e) => onRowEnter(e, row)}>
            {cells(row).map((cell, i) => (
              <td key={cols[i].key}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ *
 * The preview card
 * ------------------------------------------------------------------ */

/**
 * Figma "ReferencePopover": the card that shows what the row's setting does.
 * It sits outside the panel, on the overlay, and its pointer lines up with the
 * row under the cursor — so the sample and the setting read as one thing even
 * though they are 300px apart.
 */
function ReferencePopover({
  peeked,
  brand,
  rightOf,
}: {
  peeked: Peeked;
  brand: Brand;
  rightOf: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; pointer: number } | null>(null);

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    const top = Math.min(Math.max(peeked.y - h / 2, 16), window.innerHeight - h - 16);
    setPos({ top, pointer: peeked.y - top });
  }, [peeked.y, peeked.section, peeked.asset]);

  const width = 323;
  const left = Math.max(16, rightOf - width - 17);

  return createPortal(
    <div
      ref={ref}
      className="ref-pop"
      style={{ left, top: pos?.top ?? peeked.y, visibility: pos ? "visible" : "hidden" }}
    >
      <PreviewBody peeked={peeked} brand={brand} />
      <span className="ref-pointer" style={{ top: pos?.pointer ?? 0 }} />
    </div>,
    document.body
  );
}

function PreviewBody({ peeked, brand }: { peeked: Peeked; brand: Brand }) {
  const f = (k: TypeKey) => ({
    fontFamily: `${brand.fonts[k]}, var(--font-sans)`,
    color: brand.colors[k],
  });

  if (peeked.section === "typography") {
    return (
      <div className="rp-type">
        <div className="rp-h1" style={f("h1")}>
          Header 1
        </div>
        <div className="rp-h2" style={f("h2")}>
          Header 2
        </div>
        <div className="rp-h3" style={f("h3")}>
          Header 3
        </div>
        <div className="rp-h4" style={f("h4")}>
          Header 4
        </div>
        <div className="rp-p" style={f("paragraph")}>
          Paragraph (newsletter or report text)
        </div>
        <div className="rp-p" style={f("caption")}>
          Caption (TLP Rating, Date, other metadata)
        </div>
      </div>
    );
  }

  if (peeked.section === "structures") {
    return (
      <div className="rp-type">
        <div className="rp-h3" style={f("h3")}>
          Affected products
        </div>
        <div className="rp-p" style={f("paragraph")}>
          The paragraph above the rule.
        </div>
        <div className="rp-rule" style={{ background: brand.structure.dividers }} />
        <table className="rp-table" style={{ borderColor: brand.structure.dividers }}>
          <tbody>
            <tr style={{ background: brand.structure.table }}>
              <td style={{ ...f("paragraph"), fontWeight: 600 }}>Product</td>
              <td style={{ ...f("paragraph"), fontWeight: 600 }}>Status</td>
            </tr>
            <tr>
              <td style={f("paragraph")}>Exchange</td>
              <td style={f("paragraph")}>Patched</td>
            </tr>
            <tr>
              <td style={f("paragraph")}>Outlook</td>
              <td style={f("paragraph")}>Exposed</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (peeked.section === "imagery") {
    return (
      <div className="rp-asset">
        <div className="rp-asset-box">
          {peeked.asset ? <img src={peeked.asset.src} alt="" /> : null}
        </div>
        <div className="rp-p" style={{ color: "var(--content-medium)", marginTop: 12 }}>
          {peeked.asset?.name}
        </div>
      </div>
    );
  }

  return <VizPreview brand={brand} />;
}

/** Figma shows a donut of trending CVEs; the ring is drawn from the viz colours. */
const VIZ_ROWS = [
  { label: "CVE-2026-72898 Metabase", value: 22 },
  { label: "CVE-2026-69836 Microsoft", value: 19 },
  { label: "CVE-2026-77537 UniFi Protect", value: 17 },
  { label: "CVE-2026-21962 Oracle EBS", value: 15 },
  { label: "CVE-2026-58231 SAP Commerce", value: 14 },
  { label: "CVE-2026-31910 Fortinet", value: 13 },
];

function VizPreview({ brand }: { brand: Brand }) {
  const total = VIZ_ROWS.reduce((a, r) => a + r.value, 0);
  let acc = 0;
  const stops = VIZ_ROWS.map((r, i) => {
    const from = (acc / total) * 360;
    acc += r.value;
    const to = (acc / total) * 360;
    return `${brand.viz[i % brand.viz.length]} ${from}deg ${to}deg`;
  }).join(", ");

  return (
    <div>
      <div
        className="rp-p"
        style={{ color: brand.colors.caption, marginBottom: 12, fontFamily: brand.fonts.caption }}
      >
        Trending CVEs by CVSS score
      </div>
      <div className="viz-row">
        <div className="donut" style={{ background: `conic-gradient(${stops})` }} />
        <ul className="viz-legend">
          {VIZ_ROWS.map((r, i) => (
            <li key={r.label}>
              <span className="dot" style={{ background: brand.viz[i % brand.viz.length] }} />
              <span className="truncate">{r.label}</span>
              <b>{r.value}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The palette color that replaces `old` once `next` is the palette. */
function newColor(old: string, next: BrandSwatches, prev: BrandSwatches): string {
  const keys = ["primary", "secondary", "tertiary", "background"] as const;
  for (const k of keys) if (prev[k].toUpperCase() === old.toUpperCase()) return next[k];
  const i = prev.more.findIndex((x) => x.toUpperCase() === old.toUpperCase());
  return i >= 0 && next.more[i] ? next.more[i] : old;
}

/**
 * A color that can only be one of the brand's palette colors: the well shows
 * the swatch and the role's name, and opens the palette to pick from.
 */
function PaletteField({
  value,
  palette,
  label,
  onChange,
}: {
  value: string;
  palette: PaletteItem[];
  label: string;
  onChange: (c: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const match = palette.find((p) => p.c.toUpperCase() === value.toUpperCase());
  return (
    <>
      <button ref={ref} className="color-well pf-well" aria-label={label} onClick={() => setOpen((o) => !o)}>
        <span className="color-swatch" style={{ background: value }} />
        <span className="pf-text">{match ? match.label : value.toUpperCase()}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} align="end" width={220} className="menu pf-menu">
          {palette.map((p) => (
            <button
              key={p.label}
              className="pf-opt"
              onClick={() => {
                onChange(p.c);
                setOpen(false);
              }}
            >
              <span className="pf-dot" style={{ background: p.c }} />
              <span className="pf-name">{p.label}</span>
              <span className="pf-hex">{p.c.toUpperCase()}</span>
              {match?.label === p.label && <Icon name="check" size={14} />}
            </button>
          ))}
        </Popover>
      )}
    </>
  );
}
