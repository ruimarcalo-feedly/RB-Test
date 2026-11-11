import { useMemo, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/primitives";

/* ------------------------------------------------------------------ *
 * MultiSearchSelect
 *
 * Figma `MultiSearchSelect` (Elicitation Variants, Report Builder Details):
 * a field that holds several picks. Closed, it shows the picks either as
 * removable chips above the placeholder, or as one summary line ("A, B, +8")
 * when there are many of them. Open, a popover under the field holds the
 * picks as chips beside a search box, a "N of M selected" count, and the
 * items still to pick.
 * ------------------------------------------------------------------ */

export function MultiSearchSelect({
  value,
  options,
  onChange,
  placeholder = "Search",
  summary = false,
  compact = false,
  editable = false,
}: {
  value: string[];
  options: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  /** Show the picks as one summary line rather than as chips. */
  summary?: boolean;
  /** The small inline version, as on the "Other item" row. */
  compact?: boolean;
  /** Rows carry a pencil, as in the report's Details tab. */
  editable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const all = useMemo(() => [...new Set([...options, ...value])], [options, value]);
  const remaining = all.filter(
    (o) => !value.includes(o) && o.toLowerCase().includes(query.trim().toLowerCase())
  );

  const remove = (o: string) => onChange(value.filter((x) => x !== o));
  const add = (o: string) => onChange([...value, o]);

  const summaryText =
    value.length > 2 ? `${value.slice(0, 2).join(",")}, +${value.length - 2}` : value.join(", ");

  return (
    <>
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={`mss ${compact ? "compact" : ""} ${open ? "open" : ""}`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
      >
        <div className="mss-body">
          {value.length === 0 ? (
            <span className="mss-placeholder">{placeholder}</span>
          ) : summary || compact ? (
            <span className="mss-summary truncate">{summaryText}</span>
          ) : (
            <>
              <div className="mss-chips">
                {value.map((o) => (
                  <span className="mss-chip" key={o}>
                    {o}
                    <button
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(o);
                      }}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <span className="mss-placeholder">{placeholder}</span>
            </>
          )}
        </div>
        <Icon name="chevron-down" size={compact ? 14 : 16} style={{ color: "var(--content-medium)" }} />
      </div>
      {open && (
        <Popover
          anchorRef={ref}
          onClose={() => {
            setOpen(false);
            setQuery("");
          }}
          matchAnchorWidth={!compact}
          width={compact ? 300 : undefined}
          className="menu mss-pop"
        >
          <div className="mss-search">
            {value.map((o) => (
              <span className="mss-chip" key={o}>
                {o}
                <button title="Remove" onClick={() => remove(o)}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
            <input
              autoFocus
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mss-count">
            <Icon name="info" size={14} />
            {value.length} of {all.length} selected
          </div>
          <div className="mss-list">
            {remaining.length === 0 ? (
              <div className="mss-empty">No results</div>
            ) : (
              remaining.map((o) => (
                <button key={o} className="mss-item" onClick={() => add(o)}>
                  {editable && <span className="mss-box" />}
                  <span className="grow">{o}</span>
                  {editable && <Icon name="pencil" size={15} style={{ color: "var(--content-medium)" }} />}
                </button>
              ))
            )}
          </div>
        </Popover>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Date range
 *
 * Figma "Date Range" input type: a field with a calendar mark. A suggestion
 * fills it with the best preset for the situation ("Last 7 days"); without
 * one it reads "Pick a date range". Opening it lists the presets, and
 * "Custom range" opens a two-month calendar to pick a start and an end.
 * ------------------------------------------------------------------ */

const PRESETS = ["Today", "Last 7 days", "Last 30 days", "Custom range"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

const fmt = (d: Date) => `${SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

export function DateRangeField({
  value,
  onChange,
  placeholder = "Pick a date range",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [calendar, setCalendar] = useState(false);
  /* The left-hand month of the two shown. June 2026, as in the design. */
  const [month, setMonth] = useState(new Date(2026, 5, 1));
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  const pickDay = (d: Date) => {
    if (!start || end) {
      setStart(d);
      setEnd(null);
      return;
    }
    const [a, b] = d < start ? [d, start] : [start, d];
    setStart(a);
    setEnd(b);
    onChange(`${fmt(a)} → ${fmt(b)}`);
    window.setTimeout(() => setCalendar(false), 180);
  };

  const monthGrid = (first: Date, side: "left" | "right") => {
    const y = first.getFullYear();
    const m = first.getMonth();
    const lead = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    /* The month before shows its last day in grey on the left calendar only,
       as in the design. */
    for (let i = 0; i < lead; i++) cells.push(side === "left" && i === lead - 1 ? new Date(y, m, 0) : null);
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
    const inRange = (d: Date) =>
      start && end ? d >= start && d <= end : start ? d.getTime() === start.getTime() : false;
    return (
      <div className="cal-month">
        <div className="cal-head">
          {side === "left" ? (
            <button className="cal-nav" onClick={() => setMonth(new Date(y, m - 1, 1))} title="Previous month">
              <Icon name="chevron-left" size={16} />
            </button>
          ) : (
            <span className="cal-nav-space" />
          )}
          <span className="cal-title">
            {MONTHS[m]} {y}
          </span>
          {side === "right" ? (
            <button className="cal-nav" onClick={() => setMonth(new Date(y, m, 1))} title="Next month">
              <Icon name="chevron-right" size={16} />
            </button>
          ) : (
            <span className="cal-nav-space" />
          )}
        </div>
        <div className="cal-grid">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span className="cal-dow" key={i}>
              {d}
            </span>
          ))}
          {cells.map((d, i) =>
            d ? (
              <button
                key={i}
                className={`cal-day ${d.getMonth() !== m ? "out" : ""} ${inRange(d) ? "in" : ""} ${
                  (start && d.getTime() === start.getTime()) || (end && d.getTime() === end.getTime())
                    ? "edge"
                    : ""
                }`}
                onClick={() => pickDay(d)}
              >
                {d.getDate()}
              </button>
            ) : (
              <span key={i} />
            )
          )}
        </div>
      </div>
    );
  };

  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return (
    <>
      <button ref={ref} className="date-field" onClick={() => setMenu(true)}>
        <span className={value ? "truncate" : "placeholder truncate"}>{value || placeholder}</span>
        <Icon name="calendar" size={16} style={{ color: "var(--content-medium)" }} />
      </button>
      {menu && (
        <Popover anchorRef={ref} onClose={() => setMenu(false)} matchAnchorWidth>
          {PRESETS.map((p) => (
            <button
              key={p}
              className="menu-item"
              onClick={() => {
                setMenu(false);
                if (p === "Custom range") {
                  setStart(null);
                  setEnd(null);
                  setCalendar(true);
                } else onChange(p);
              }}
            >
              {p}
            </button>
          ))}
        </Popover>
      )}
      {calendar && (
        <Popover anchorRef={ref} onClose={() => setCalendar(false)} width={540} className="menu cal-pop">
          <div className="cal-wrap">
            {monthGrid(month, "left")}
            <div className="cal-rule" />
            <div className="cal-right">
              {monthGrid(next, "right")}
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}
