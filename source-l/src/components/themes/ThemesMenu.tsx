import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, MenuItem, Modal, Popover } from "../ui/primitives";
import type { Brand } from "../../data/brand";
import type { ReportTheme } from "../../data/theme";
import { ThemePreview } from "./Themes";

/* ------------------------------------------------------------------ *
 * Version F (Separate Themes) — the Themes dropdown
 *
 * Figma "ReportLeftPanel" (4510:198913). One card per theme: its thumbnail
 * (half header, half background with text), the brand it saves as a badge,
 * and its name with a "···" menu. The theme on the report shows "Changed"
 * once its layout (header, footer, margins) has been changed here; changes
 * to the brand don't count, they flow into the theme on their own. "Add new
 * theme" saves what is on the page as a new theme.
 * ------------------------------------------------------------------ */

export interface ThemeEntry {
  theme: ReportTheme;
  brand: Brand;
}

export function ThemesMenu({
  anchorRef,
  entries,
  current,
  changed,
  canDelete,
  onApply,
  onPush,
  onReset,
  onRename,
  onDelete,
  onAdd,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  entries: ThemeEntry[];
  /** The theme on the report, by brand and id. */
  current?: { brandId?: string; id: string };
  /** The report's layout differs from the current theme's. */
  changed: boolean;
  canDelete: (e: ThemeEntry) => boolean;
  onApply: (e: ThemeEntry) => void;
  onPush: () => void;
  onReset: () => void;
  onRename: (e: ThemeEntry) => void;
  onDelete: (e: ThemeEntry) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  /* A card's own menu sits over this one; while it is open, a click in it
     must not count as a click outside the dropdown. */
  const sub = useRef(false);
  const isCurrent = (e: ThemeEntry) => current?.id === e.theme.id && current?.brandId === e.brand.id;

  return (
    <Popover
      anchorRef={anchorRef}
      onClose={() => !sub.current && onClose()}
      align="end"
      width={300}
      className="menu thm-menu"
    >
      <div className="thm-head">
        <div className="thm-title">Select theme</div>
        <div className="thm-help">
          A theme is a collection of brand, layout and other visual options applied to a report.
        </div>
      </div>
      <div className="thm-list">
        {entries.map((e) => (
          <ThemeMenuCard
            key={`${e.brand.id}/${e.theme.id}`}
            entry={e}
            on={isCurrent(e)}
            changed={isCurrent(e) && changed}
            deletable={canDelete(e)}
            subRef={sub}
            onApply={() => onApply(e)}
            onPush={onPush}
            onReset={onReset}
            onRename={() => onRename(e)}
            onDelete={() => onDelete(e)}
          />
        ))}
      </div>
      <button className="thm-add" onClick={onAdd}>
        <Icon name="plus" size={16} />
        Save as new theme
      </button>
    </Popover>
  );
}

function ThemeMenuCard({
  entry,
  on,
  changed,
  deletable,
  subRef,
  onApply,
  onPush,
  onReset,
  onRename,
  onDelete,
}: {
  entry: ThemeEntry;
  on: boolean;
  changed: boolean;
  deletable: boolean;
  subRef: React.MutableRefObject<boolean>;
  onApply: () => void;
  onPush: () => void;
  onReset: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const more = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const open = (v: boolean) => {
    subRef.current = v;
    setMenu(v);
  };
  const act = (f: () => void) => () => {
    open(false);
    f();
  };
  const { theme, brand } = entry;
  return (
    <div className={`thm-card ${on ? "on" : ""}`}>
      <button className="thm-pv" onClick={onApply} title={on ? undefined : `Use ${theme.name}`}>
        <ThemePreview theme={theme} brand={brand} h={200} />
        <span className="thm-badge">
          <Icon name="brand" size={20} />
          <span className="truncate">{brand.name}</span>
        </span>
      </button>
      <div className="thm-foot">
        <span className="thm-name truncate">{theme.name}</span>
        {changed && <span className="thm-changed">Changed</span>}
        <button ref={more} className="btn ghost icon sm thm-more" title="More" onClick={() => open(!menu)}>
          <Icon name="ellipsis" size={20} />
        </button>
      </div>
      {menu && (
        <Popover anchorRef={more} onClose={() => open(false)} align="end" width={210}>
          {/* Nov 4: only offered once the theme has changed on this report. */}
          {changed && (
            <>
              <MenuItem onClick={act(onPush)}>Push changes to style</MenuItem>
              <MenuItem onClick={act(onReset)}>Reset to theme</MenuItem>
            </>
          )}
          <MenuItem onClick={act(onRename)}>Rename theme</MenuItem>
          <MenuItem onClick={act(onDelete)} disabled={!deletable}>
            Delete theme
          </MenuItem>
        </Popover>
      )}
    </div>
  );
}

/** Naming a theme: a new one from the page, or renaming a saved one. */
export function ThemeNameDialog({
  title,
  name,
  action,
  onSave,
  onClose,
}: {
  title: string;
  name: string;
  action: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(name);
  const ok = v.trim().length > 0;
  return (
    <Modal
      title={title}
      onClose={onClose}
      width={420}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={() => onSave(v.trim())}>
            {action}
          </Button>
        </>
      }
    >
      <label className="field-label" htmlFor="theme-name" style={{ display: "block", marginBottom: 8 }}>
        Theme name
      </label>
      <input
        id="theme-name"
        className="input"
        style={{ width: "100%" }}
        value={v}
        autoFocus
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ok && onSave(v.trim())}
      />
    </Modal>
  );
}
