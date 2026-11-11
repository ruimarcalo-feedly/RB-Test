import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { MenuItem, Popover } from "../ui/primitives";
import { slotImage, type Brand, type PageBand } from "../../data/brand";
import type { BandKind } from "../../data/bandObjects";

/* ------------------------------------------------------------------ *
 * Version G — Feedly's own header and footer layouts
 *
 * Nobody builds a header here. Feedly ships a set of layouts, drawn from
 * the running headers and footers in real intelligence reports (Amtrak,
 * BlueVoyant, the FBI's PINs, TVA, INTSUM, Maryland ISAC, U//FOUO
 * bulletins, Specsavers, Intuitive, E.ON, Miele…), and each is drawn with
 * whatever brand is applied: its logos, hero and footer images, colours and
 * type. The only things to change in place are a label's words and the
 * TLP level on a badge.
 * ------------------------------------------------------------------ */

export const TLP_LEVELS = ["TLP:CLEAR", "TLP:GREEN", "TLP:AMBER", "TLP:AMBER+STRICT", "TLP:RED"];
/** FIRST's TLP 2.0 colours: the level's colour on black. */
const TLP_INK: Record<string, string> = {
  "TLP:CLEAR": "#FFFFFF",
  "TLP:GREEN": "#33FF00",
  "TLP:AMBER": "#FFC000",
  "TLP:AMBER+STRICT": "#FFC000",
  "TLP:RED": "#FF2B2B",
};

interface Ctx {
  kind: BandKind;
  brand?: Brand;
  edit: boolean;
  texts: Record<string, string>;
  tlp: string;
  setText: (k: string, v: string) => void;
  setTlp: (v: string) => void;
}

export interface Layout {
  id: string;
  kind: BandKind;
  name: string;
  /** The reports it was drawn from. */
  from: string;
  height: number;
  /** Which brand images it needs to look right. */
  needs?: ("hero" | "footer" | "logoLight")[];
  render: (c: Ctx) => ReactNode;
}

/* ---------------- The pieces a layout is made of ---------------- */

/** A label whose words can be changed in place (and nothing else). */
function L({ c, k, d, className = "" }: { c: Ctx; k: string; d: string; className?: string }) {
  const v = c.texts[k] ?? d;
  if (!c.edit) return <span className={className}>{v}</span>;
  return (
    <span
      key={v}
      className={`lo-edit ${className}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      title="Click to edit"
      onBlur={(e) => {
        const t = e.currentTarget.innerText.trim();
        c.setText(k, t || d);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.innerText = v;
          e.currentTarget.blur();
        }
        e.stopPropagation();
      }}
    >
      {v}
    </span>
  );
}

/** A TLP badge; clicking it picks another level. */
function Tlp({ c, size = "md" }: { c: Ctx; size?: "sm" | "md" }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const badge = (
    <span className={`lo-tlp ${size}`} style={{ color: TLP_INK[c.tlp] ?? "#FFC000" }}>
      {c.tlp}
    </span>
  );
  if (!c.edit) return badge;
  return (
    <>
      <button
        ref={ref}
        className="lo-tlp-btn"
        title="Change TLP level"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {badge}
      </button>
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={190}>
          {TLP_LEVELS.map((t) => (
            <MenuItem
              key={t}
              onClick={() => {
                c.setTlp(t);
                setOpen(false);
              }}
            >
              <span className="lo-tlp sm" style={{ color: TLP_INK[t] }}>
                {t}
              </span>
              {c.tlp === t && <Icon name="check" size={14} />}
            </MenuItem>
          ))}
        </Popover>
      )}
    </>
  );
}

/** The brand's logo for a light or a dark background. */
function Logo({ c, light, mono, h = 28 }: { c: Ctx; light?: boolean; mono?: boolean; h?: number }) {
  const dark = slotImage(c.brand, "logoDark");
  const lite = slotImage(c.brand, "logoLight");
  const src = light ? lite ?? dark : dark;
  /* No logo in the brand: the layout simply goes without one. */
  if (!src) return null;
  return (
    <img
      className="lo-logo"
      src={src}
      alt=""
      draggable={false}
      style={{
        height: h,
        /* No light logo: the dark one drawn white stands in for it. */
        filter: mono || (light && !lite) ? "brightness(0) invert(1)" : undefined,
      }}
    />
  );
}

/* The document runs on without pages until it is exported, so the number is
   a placeholder for whichever page it lands on. */
const Page = () => <span className="lo-page">Page #</span>;

const img = (c: Ctx, slot: "hero" | "footer"): CSSProperties => {
  const src = slotImage(c.brand, slot) ?? (slot === "footer" ? slotImage(c.brand, "hero") : undefined);
  return src ? { backgroundImage: `url("${src}")` } : {};
};

export const LAYOUTS: Layout[] = [
  /* ---------------- Headers ---------------- */

  {
    /* The cover artwork with the logo on it, as Feedly's own templates ship. */
    id: "h-feedly-cover",
    kind: "header",
    name: "Cover artwork",
    from: "Feedly's own templates",
    height: 120,
    needs: ["hero"],
    render: (c) => (
      <div className="lo-cover" style={img(c, "hero")}>
        <Logo c={c} h={36} />
      </div>
    ),
  },
  {
    id: "h-hero",
    kind: "header",
    name: "Hero banner",
    from: "TVA, E.ON, Amtrak cover",
    height: 136,
    needs: ["hero", "logoLight"],
    render: (c) => (
      <div className="lo-hero" style={img(c, "hero")}>
        <span className="lo-hero-shade" />
        <Logo c={c} light h={32} />
      </div>
    ),
  },
  {
    id: "h-title-banner",
    kind: "header",
    name: "Title banner",
    from: "FBI Private Industry Notification",
    height: 112,
    needs: ["logoLight"],
    render: (c) => (
      <div className="lo-banner lo-fill-dark">
        <Logo c={c} light h={34} />
        <span className="lo-banner-text">
          <L c={c} k="title" d="Threat Intelligence Report" className="lo-banner-title" />
          <L c={c} k="kicker" d="FEEDLY THREAT INTELLIGENCE" className="lo-banner-kicker" />
        </span>
        <span className="lo-banner-tlp">
          <Tlp c={c} size="sm" />
        </span>
      </div>
    ),
  },
  {
    id: "h-color-band",
    kind: "header",
    name: "Color band",
    from: "Miele, Cisco",
    height: 72,
    needs: ["logoLight"],
    render: (c) => (
      <div className="lo-row center lo-fill-accent">
        {/* All white: the logo's own colour would vanish into the band. */}
        <Logo c={c} light mono h={30} />
      </div>
    ),
  },
  {
    id: "h-logo-masthead",
    kind: "header",
    name: "Logo masthead",
    from: "Maryland ISAC, City of Austin",
    height: 72,
    render: (c) => (
      <div className="lo-row between lo-accent-below">
        <Logo c={c} h={30} />
        <L c={c} k="kicker" d="THREAT BULLETIN" className="lo-kicker" />
      </div>
    ),
  },

  /* ---------------- Footers ---------------- */

  {
    id: "f-strip",
    kind: "footer",
    name: "Footer strip",
    from: "Amtrak",
    height: 84,
    needs: ["footer", "logoLight"],
    render: (c) => (
      <div className="lo-strip-wrap">
        <div className="lo-row between lo-strip-top">
          <L c={c} k="fmarking" d="PRIVATE" className="lo-marking" />
          <Page />
        </div>
        <div className="lo-strip" style={img(c, "footer")}>
          <Logo c={c} light h={18} />
        </div>
      </div>
    ),
  },
  {
    id: "f-logo-notice",
    kind: "footer",
    name: "Logo, notice and page",
    from: "Intuitive",
    height: 56,
    render: (c) => (
      <div className="lo-row three">
        <Logo c={c} h={18} />
        <L c={c} k="notice" d="For internal use only. Not for external distribution." className="lo-notice" />
        <span className="lo-end">
          <Page />
        </span>
      </div>
    ),
  },
  {
    id: "f-disclaimer",
    kind: "footer",
    name: "Disclaimer and page",
    from: "Amtrak, Health-ISAC",
    height: 76,
    render: (c) => (
      <div className="lo-stack">
        <L
          c={c}
          k="disclaimer"
          d="This report may contain sensitive information. For internal use only."
          className="lo-disclaimer"
        />
        <L c={c} k="contact" d="Contact the Threat Intelligence team at cti@feedly.com" className="lo-small" />
        <Page />
      </div>
    ),
  },
  {
    id: "f-marking-page",
    kind: "footer",
    name: "Marking and page",
    from: "U//FOUO bulletins",
    height: 56,
    render: (c) => (
      <div className="lo-row three lo-rule-above">
        <span />
        <L c={c} k="fmarking" d="PRIVATE" className="lo-marking wide" />
        <span className="lo-end">
          <Page />
        </span>
      </div>
    ),
  },
];

export const layoutsFor = (k: BandKind) => LAYOUTS.filter((l) => l.kind === k);
export const findLayout = (k: BandKind, id?: string | null) =>
  id ? LAYOUTS.find((l) => l.kind === k && l.id === id) : undefined;

/** A band set to a layout (or cleared), keeping the words typed so far. */
export function withLayout(band: PageBand, k: BandKind, id: string | null): PageBand {
  const l = findLayout(k, id);
  return {
    left: null,
    middle: null,
    right: null,
    scope: band.scope,
    background: "transparent",
    image: null,
    texts: band.texts,
    tlp: band.tlp,
    layout: l?.id,
    height: l?.height,
  };
}

/* ---------------- Drawing a layout ---------------- */

const vars = (brand?: Brand): CSSProperties =>
  ({
    "--lo-accent": brand?.colors.h2 ?? "#757575",
    "--lo-ink": brand?.colors.h1 ?? "#333333",
    "--lo-muted": brand?.colors.caption ?? "#757575",
  }) as CSSProperties;

/** The band's layout, drawn with the brand. */
export function LayoutView({
  kind,
  band,
  brand,
  edit,
  onChange,
}: {
  kind: BandKind;
  band: PageBand;
  brand?: Brand;
  edit?: boolean;
  onChange?: (b: PageBand) => void;
}) {
  const l = findLayout(kind, band.layout);
  if (!l) return null;
  const c: Ctx = {
    kind,
    brand,
    edit: Boolean(edit && onChange),
    texts: band.texts ?? {},
    tlp: band.tlp ?? "TLP:AMBER",
    setText: (k, v) => onChange?.({ ...band, texts: { ...(band.texts ?? {}), [k]: v } }),
    setTlp: (v) => onChange?.({ ...band, tlp: v }),
  };
  return (
    <div className={`lo lo-${l.id} ${kind}`} style={{ ...vars(brand), height: l.height }}>
      {l.render(c)}
    </div>
  );
}

/** A small picture of a layout on a bit of page, for galleries and rows. */
export function LayoutThumb({
  kind,
  band,
  brand,
  width,
  lines = true,
}: {
  kind: BandKind;
  band: PageBand;
  brand?: Brand;
  /** A fixed width, or leave it out to fill the space it sits in. */
  width?: number;
  lines?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(width ?? 0);
  useLayoutEffect(() => {
    if (width !== undefined || !box.current) return;
    const el = box.current.parentElement;
    if (!el) return;
    const fit = () => setMeasured(el.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const w = width ?? measured;
  const W = 640;
  const s = w / W;
  const l = findLayout(kind, band.layout);
  const h = l?.height ?? 40;
  const body = lines ? 56 : 0;
  return (
    <div ref={box} className={`lo-thumb ${kind}`} style={{ width: width ?? "100%", height: (h + body) * s }}>
      <div className="lo-thumb-page" style={{ width: W, height: h + body, transform: `scale(${s})` }}>
        {kind === "footer" && lines && <ThumbLines />}
        {l ? <LayoutView kind={kind} band={band} brand={brand} /> : <div className="lo-none" style={{ height: h }} />}
        {kind === "header" && lines && <ThumbLines />}
      </div>
    </div>
  );
}

const ThumbLines = () => (
  <div className="lo-thumb-lines" aria-hidden="true">
    <span style={{ width: "42%" }} />
    <span style={{ width: "88%" }} />
    <span style={{ width: "76%" }} />
  </div>
);

/* ---------------- The gallery ---------------- */

/** How far the gallery reaches past each side of the page. */
const GAL_BLEED = 40;

/** Follows the band (and the page it sits on) as the canvas scrolls. */
function useRects(k: BandKind) {
  const [r, setR] = useState<{ band: DOMRect; page: DOMRect } | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const all = Array.from(document.querySelectorAll<HTMLElement>(`.band-wrap.${k}`));
      const el = all.find((e) => !e.closest(".lo-thumb, .modal, .lo-gallery"));
      const page = el?.parentElement;
      if (el && page) {
        const b = el.getBoundingClientRect();
        const p = page.getBoundingClientRect();
        setR((o) =>
          o && o.band.top === b.top && o.band.height === b.height && o.page.left === p.left && o.page.width === p.width
            ? o
            : { band: b, page: p }
        );
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [k]);
  return r;
}

export interface LayoutPicking {
  kind: BandKind;
  layoutId: string | null;
  band: PageBand;
  preview: (id: string | null) => void;
  setLayout: (id: string | null) => void;
  setScope: (s: "cover" | "all") => void;
}

/**
 * A strip of layouts under the header (above the footer). Hovering one puts
 * it on the page; clicking keeps it; moving off or Escape puts back what
 * was there.
 */
export function LayoutGallery({
  rb,
  brand,
  onClose,
}: {
  rb: LayoutPicking;
  brand?: Brand;
  onClose: () => void;
}) {
  const k = rb.kind;
  const rects = useRects(k);
  const rbRef = useRef(rb);
  rbRef.current = rb;
  const list = layoutsFor(k);
  const scroller = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (box.current) setH(box.current.offsetHeight);
  });

  /* Whatever was being previewed goes back when the gallery closes. */
  useEffect(() => () => rbRef.current.preview(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      rbRef.current.preview(null);
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  /* Open on the layout in use. */
  useLayoutEffect(() => {
    const on = scroller.current?.querySelector<HTMLElement>(".lo-card.on");
    on?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  if (!rects) return null;
  /* Wider than the page on both sides, and held still: it sits past the
     tallest layout, so previewing a taller or shorter one never moves it. */
  const room = Math.max(0, Math.min(GAL_BLEED, window.innerWidth - rects.page.right - 8));
  const width = rects.page.width + 2 * room;
  const left = rects.page.left - room;
  const tallest = Math.max(...list.map((l) => l.height));
  const style: CSSProperties =
    k === "header"
      ? { left, width, top: Math.min(rects.band.top + tallest + 12, window.innerHeight - h - 8) }
      : { left, width, top: Math.max(8, rects.band.bottom - tallest - 12 - h) };
  const scroll = (d: number) => scroller.current?.scrollBy({ left: d * 480, behavior: "smooth" });
  const card = (id: string | null, name: string, from?: string) => {
    const b = { ...rb.band, layout: id ?? undefined };
    return (
      <button
        key={id ?? "none"}
        title={from ? `Based on ${from}` : undefined}
        className={`lo-card ${rb.layoutId === id ? "on" : ""}`}
        onMouseEnter={() => rb.preview(id ?? "")}
        onFocus={() => rb.preview(id ?? "")}
        onClick={() => {
          rb.setLayout(id);
          onClose();
        }}
      >
        <span className="lo-card-pic">
          {id ? (
            <LayoutThumb kind={k} band={b} brand={brand} width={208} />
          ) : (
            <span className="lo-card-none">No {k}</span>
          )}
        </span>
        <span className="lo-card-name">
          {name}
          {rb.layoutId === id && <Icon name="check" size={14} />}
        </span>
      </button>
    );
  };
  return createPortal(
    <div ref={box} className={`lo-gallery ${k}`} style={style} onMouseLeave={() => rb.preview(null)}>
      <div className="lo-gal-head">
        <span className="lo-gal-title">{k === "header" ? "Header" : "Footer"} layouts</span>
        <span className="lo-gal-hint">Hover to preview on the page, click to use</span>
        <span className="lo-gal-nav">
          <button className="btn ghost icon sm" title="Scroll left" onClick={() => scroll(-1)}>
            <Icon name="chevron-left" size={16} />
          </button>
          <button className="btn ghost icon sm" title="Scroll right" onClick={() => scroll(1)}>
            <Icon name="chevron-right" size={16} />
          </button>
          <button
            className="btn ghost icon sm"
            title="Close"
            onClick={() => {
              rb.preview(null);
              onClose();
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </span>
      </div>
      <div ref={scroller} className="lo-gal-list">
        {card(null, `No ${k}`)}
        {list.map((l) => card(l.id, l.name, l.from))}
      </div>
    </div>,
    document.body
  );
}

/* ---------------- The alternative: a Headers / Footers panel ---------------- */

/**
 * "Change" in the Design tab opens a second panel beside the sidebar, with
 * every layout as a card in a column. It slides open and pushes the page
 * across; hovering a card previews it on the page, clicking keeps it.
 */
export function LayoutDrawer({
  rb,
  brand,
  onClose,
}: {
  rb: LayoutPicking;
  brand?: Brand;
  onClose: () => void;
}) {
  const k = rb.kind;
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const rbRef = useRef(rb);
  rbRef.current = rb;
  useLayoutEffect(() => {
    setHost(document.querySelector<HTMLElement>(".editor-body"));
  }, []);
  /* Slide open on the next frame, so the width has something to ease from. */
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => () => rbRef.current.preview(null), []);
  const close = () => {
    rbRef.current.preview(null);
    setOpen(false);
    window.setTimeout(onClose, 260);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!host) return null;
  const items: { id: string | null; name: string }[] = [
    { id: null, name: `No ${k}` },
    ...layoutsFor(k).map((l) => ({ id: l.id, name: l.name })),
  ];
  return createPortal(
    <aside className={`lo-drawer ${open ? "open" : ""}`} aria-label={k === "header" ? "Headers" : "Footers"}>
      <div className="lo-drawer-in">
        <div className="lo-drawer-head">
          <span className="lo-drawer-title">{k === "header" ? "Headers" : "Footers"}</span>
          <button className="btn ghost icon sm" title="Close" onClick={close}>
            <Icon name="close" size={16} />
          </button>
        </div>
        {/* Which pages the band runs on. */}
        <div className="lo-scope">
          <span className="lo-scope-label">Show on</span>
          <span className="lo-scope-seg" role="radiogroup">
            {(["cover", "all"] as const).map((v) => (
              <button
                key={v}
                role="radio"
                aria-checked={rb.band.scope === v}
                className={`lo-scope-opt ${rb.band.scope === v ? "on" : ""}`}
                onClick={() => rb.setScope(v)}
              >
                {v === "cover" ? "Cover only" : "All pages"}
              </button>
            ))}
          </span>
        </div>
        <div className="lo-drawer-list" onMouseLeave={() => rb.preview(null)}>
          {items.map((it) => {
            const on = rb.layoutId === it.id;
            return (
              <button
                key={it.id ?? "none"}
                className={`lo-dcard ${on ? "on" : ""}`}
                onMouseEnter={() => rb.preview(it.id ?? "")}
                onFocus={() => rb.preview(it.id ?? "")}
                onClick={() => rb.setLayout(it.id)}
              >
                <span className="lo-dcard-pic">
                  {it.id ? (
                    <LayoutThumb kind={k} band={{ ...rb.band, layout: it.id }} brand={brand} />
                  ) : (
                    <span className="lo-card-none">No {k}</span>
                  )}
                </span>
                <span className="lo-card-name">
                  {it.name}
                  {on && <Icon name="check" size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>,
    host
  );
}
