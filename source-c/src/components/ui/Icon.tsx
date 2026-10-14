import type { CSSProperties } from "react";
import { GLYPHS } from "./glyphs";

/**
 * Feedly icon set.
 *
 * Every glyph is the real SVG exported from the Report Builder 2.0 Figma file
 * (see `glyphs.ts`). `IconName` is the name this app uses for a role; `GLYPH_FOR`
 * maps that role onto the Figma glyph, so a role can be repointed at a different
 * glyph without touching call sites.
 *
 * Two glyphs are drawn here rather than exported: `feed` (an image fill in Figma)
 * and `spinner` (not a Figma component — it only exists as an animated state).
 */
export type IconName =
  | "plus"
  | "ai"
  | "rss"
  | "research"
  | "wand"
  | "today"
  | "landscape"
  | "newsletter"
  | "shield"
  | "api"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "gear"
  | "ellipsis"
  | "close"
  | "check"
  | "check-circle"
  | "doc"
  | "audience"
  | "tradecraft"
  | "bug"
  | "flash"
  | "calendar"
  | "shield-doc"
  | "shield-lightning"
  | "user-sparkles"
  | "mask"
  | "swords"
  | "broken-shield"
  | "link"
  | "details"
  | "history"
  | "export"
  | "upload"
  | "pencil"
  | "trash"
  | "duplicate"
  | "grip"
  | "info"
  | "image"
  | "heading"
  | "paragraph"
  | "summary"
  | "actor"
  | "brand"
  | "building"
  | "list"
  | "text"
  | "vendor"
  | "braces"
  | "target"
  | "arrow-up"
  | "arrow-down"
  | "arrow-up-right"
  | "sort"
  | "stop"
  | "star"
  | "bookmark"
  | "search"
  | "sparkle"
  | "spinner"
  | "collapse"
  | "malware"
  | "logo"
  | "feed"
  /* The document's building blocks — Figma "Building blocks" in the Design tab,
     and the same set the header/footer slot menu offers. */
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "divider"
  | "code"
  | "table"
  | "callout"
  | "tlp-badge"
  | "page-count";

interface GlyphRef {
  /** Key into GLYPHS. */
  g: string;
  /** Degrees of rotation applied to the exported glyph. */
  rotate?: number;
}

const GLYPH_FOR: Record<IconName, GlyphRef> = {
  plus: { g: "plus" },
  ai: { g: "ai-box" },
  rss: { g: "rss" },
  research: { g: "magnifying-glass" },
  wand: { g: "pen-sparkle" },
  today: { g: "feedly" },
  landscape: { g: "shield-lightning" },
  newsletter: { g: "paperplane" },
  shield: { g: "shield-user" },
  api: { g: "plug" },
  "chevron-down": { g: "chevron-down" },
  "chevron-up": { g: "chevron-up" },
  "chevron-left": { g: "chevron-left" },
  "chevron-right": { g: "chevron-right" },
  gear: { g: "gear" },
  ellipsis: { g: "ellipsis" },
  close: { g: "cross" },
  check: { g: "check" },
  "check-circle": { g: "check" },
  doc: { g: "page" },
  audience: { g: "people" },
  tradecraft: { g: "tradecraft" },
  bug: { g: "bug" },
  flash: { g: "lightning" },
  calendar: { g: "calendar" },
  "shield-doc": { g: "shield-user" },
  "shield-lightning": { g: "shield-lightning" },
  "user-sparkles": { g: "user-sparkles" },
  mask: { g: "mask" },
  swords: { g: "swords" },
  "broken-shield": { g: "broken-shield" },
  link: { g: "link" },
  details: { g: "wrench-screwdriver" },
  history: { g: "history" },
  export: { g: "arrow-down-bracket" },
  upload: { g: "arrow-up-bracket" },
  pencil: { g: "pencil" },
  trash: { g: "trash" },
  duplicate: { g: "duplicate" },
  grip: { g: "drag" },
  info: { g: "info-in-circle" },
  image: { g: "image" },
  heading: { g: "heading-2" },
  paragraph: { g: "paragraph" },
  summary: { g: "check-lines" },
  actor: { g: "lines-magnifying-glass" },
  brand: { g: "palette" },
  building: { g: "company-info" },
  list: { g: "enclosed-list" },
  text: { g: "file-md" },
  vendor: { g: "buildings-lines" },
  braces: { g: "brackets" },
  target: { g: "crosshairs" },
  "arrow-up": { g: "arrow-up" },
  "arrow-down": { g: "arrow-up", rotate: 180 },
  "arrow-up-right": { g: "arrow-up-right" },
  sort: { g: "arrow-up" },
  stop: { g: "stop" },
  star: { g: "star" },
  bookmark: { g: "star" },
  search: { g: "magnifying-glass" },
  sparkle: { g: "sparkles" },
  spinner: { g: "__spinner" },
  collapse: { g: "sidebar" },
  malware: { g: "malware" },
  logo: { g: "logos" },
  h1: { g: "heading-1" },
  h2: { g: "heading-2" },
  h3: { g: "heading-3" },
  h4: { g: "heading-4" },
  divider: { g: "rectangle-line-rectangle" },
  code: { g: "codeblock" },
  table: { g: "table" },
  callout: { g: "lines-in-square" },
  "tlp-badge": { g: "tag-horizontal" },
  "page-count": { g: "hashtag" },
  feed: { g: "__feed" },
};

/** Glyphs that do not exist as exportable Figma vectors. */
const DRAWN: Record<string, { vb: string; d: string }> = {
  __feed: {
    vb: "0 0 20 20",
    d: '<circle cx="10" cy="10" r="7.4" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="10" cy="10" r="2.6" fill="currentColor"/>',
  },
  __spinner: {
    vb: "0 0 24 24",
    d: '<path d="M12 4.2a7.8 7.8 0 1 0 7.8 7.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  },
};

export function Icon({
  name,
  size = 20,
  style,
  className,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const ref = GLYPH_FOR[name];
  const glyph = DRAWN[ref.g] ?? GLYPHS[ref.g];
  if (!glyph) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={glyph.vb}
      fill="none"
      style={{
        display: "block",
        flex: "0 0 auto",
        transform: ref.rotate ? `rotate(${ref.rotate}deg)` : undefined,
        ...style,
      }}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: glyph.d }}
    />
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block", flex: "0 0 auto", animation: "spin 0.9s linear infinite" }}
      aria-hidden="true"
    >
      <path
        d="M12 4.2a7.8 7.8 0 1 0 7.8 7.8"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}
