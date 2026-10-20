import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { Button, Select, layerStack } from "../ui/primitives";
import { ColorField } from "../ui/ColorField";
import {
  BRAND_FONTS,
  MAX_ASSETS,
  type Brand,
  type BrandAsset,
  type TypeKey,
} from "../../data/brand";

/**
 * Figma "Table + Popout preview": the brand editor.
 *
 * Every setting is a row in a table, so the panel reads as four short lists
 * rather than a wall of fields: what each style is, what it is set to, nothing
 * else. The thing a hex cannot tell you — what it actually looks like — is not
 * crammed in beside the controls; it arrives on hover, as a card outside the
 * panel pointing at the row the cursor is on.
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

const TYPE_ROWS: { key: TypeKey; label: string; help: string }[] = [
  { key: "h1", label: "Header 1", help: "The font applied to all H1 content" },
  { key: "h2", label: "Header 2", help: "The font applied to all H2 content" },
  { key: "h3", label: "Header 3", help: "The font applied to all H3 content" },
  { key: "h4", label: "Header 4", help: "The font applied to all H4 content" },
  { key: "paragraph", label: "Paragraph", help: "The font applied to all paragraph content" },
  { key: "caption", label: "Caption", help: "The font applied to all Caption content" },
];

const today = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function BrandPeek({
  brand,
  onClose,
  onSave,
}: {
  brand: Brand;
  onClose: () => void;
  onSave: (b: Brand) => void;
}) {
  const [draft, setDraft] = useState<Brand>(brand);
  const [peeked, setPeeked] = useState<Peeked | null>(null);
  /* The font under the cursor in an open font menu, applied everywhere the
     committed one would be until it is chosen or the menu is left. */
  const [tryFont, setTryFont] = useState<{ key: TypeKey; font: string } | null>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const assetInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(brand);

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
              <div className="t-body3 muted">Brand</div>
              <h2 className="t-h2" style={{ margin: "2px 0 0" }}>
                {draft.name}
              </h2>
            </div>
            <button className="btn ghost icon" title="More">
              <Icon name="ellipsis" size={18} />
            </button>
          </div>

          {/* ---------------- Typography ---------------- */}
          <Section
            title="Typography"
            blurb="Styles that will affect the typography of exported products, such as Automated Newsletters and Report Builder."
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 615 },
                { key: "font", label: "Font", width: 178 },
                { key: "color", label: "Color", width: 151 },
              ]}
              rows={TYPE_ROWS}
              sortValue={(r, key) =>
                key === "font" ? draft.fonts[r.key] : key === "color" ? draft.colors[r.key] : r.label
              }
              rowKey={(r) => r.key}
              onRowEnter={peek("typography")}
              cells={(r) => [
                <NameCell key="n" label={r.label} help={r.help} />,
                <Select
                  key="f"
                  block
                  value={shown.fonts[r.key]}
                  options={BRAND_FONTS}
                  onChange={font(r.key)}
                  onPreview={(v) => setTryFont(v ? { key: r.key, font: v } : null)}
                />,
                <ColorField key="c" value={draft.colors[r.key]} onChange={color(r.key)} />,
              ]}
            />
          </Section>

          {/* ---------------- Content structures ---------------- */}
          <Section
            title="Content structures"
            blurb="Styles that affect layout structures on exported products such as Automated Newsletters and Report Builder."
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 793 },
                { key: "color", label: "Color", width: 151 },
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
                <ColorField
                  key="c"
                  value={draft.structure[r.key]}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, structure: { ...d.structure, [r.key]: v } }))
                  }
                />,
              ]}
            />
          </Section>

          {/* ---------------- Common Imagery ---------------- */}
          <Section
            title="Common Imagery"
            blurb={`Assets commonly used in your branded exported products. You can upload up to ${MAX_ASSETS} assets.`}
          >
            <SettingsTable
              cols={[
                { key: "name", label: "Name", width: 732 },
                { key: "uploaded", label: "Upload date", width: 130 },
                { key: "actions", label: "Actions", width: 82 },
              ]}
              rows={draft.assets}
              sortValue={(a, key) => (key === "uploaded" ? a.uploaded : a.name)}
              rowKey={(a) => a.id}
              onRowEnter={(e, a) => peek("imagery", a)(e)}
              lead={
                <tr className="bt-add">
                  <td colSpan={3}>
                    <button
                      className="add-row"
                      disabled={draft.assets.length >= MAX_ASSETS}
                      onClick={() => assetInput.current?.click()}
                    >
                      <Icon name="plus" size={18} />
                      {draft.assets.length >= MAX_ASSETS
                        ? `${MAX_ASSETS} of ${MAX_ASSETS} uploaded`
                        : "Add item"}
                    </button>
                  </td>
                </tr>
              }
              cells={(a) => [
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

          {/* ---------------- Data visualizations ---------------- */}
          <Section
            title="Data visualizations"
            blurb="Styles that affect layout structures on exported products such as Automated Newsletters and Report Builder."
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
        </div>

        <div className="peek-foot">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!dirty} onClick={() => onSave(draft)}>
            Save changes
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

function Section({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <section className="brand-section">
      <h3 className="t-h3" style={{ margin: 0 }}>
        {title}
      </h3>
      <p className="t-body3 muted" style={{ margin: "4px 0 12px" }}>
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
