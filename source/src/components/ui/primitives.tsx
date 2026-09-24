import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";

/**
 * Overlays are rendered into `document.body` rather than where they are
 * written.
 *
 * A modal or a menu is on top of the whole window, but it is written wherever
 * it is triggered from — and a `z-index` only counts against its own stacking
 * context. The background-image dialog is opened from inside a header band,
 * which is a positioned, z-indexed element, so its scrim could only ever dim
 * what was inside that band: the other band, the toolbars and the labels
 * carried on over the top of it. Moving overlays to the body puts them in the
 * root context, where their z-index means what it says.
 */
const overlayRoot = () => document.body;

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */

export function Button({
  children,
  icon,
  iconRight,
  variant = "default",
  size = "md",
  onClick,
  disabled,
  title,
  style,
  active,
}: {
  children?: ReactNode;
  icon?: IconName;
  iconRight?: IconName;
  variant?:
    | "default"
    | "primary"
    | "danger"
    | "ghost"
    | "link"
    | "danger-link"
    | "outline-danger";
  size?: "md" | "sm";
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
  active?: boolean;
}) {
  const cls = [
    "btn",
    variant !== "default" ? variant : "",
    size === "sm" ? "sm" : "",
    !children ? "icon" : "",
    active ? "open" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} title={title} style={style}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Badge
 * ------------------------------------------------------------------ */

export function Badge({
  children,
  quiet,
  style,
}: {
  children: ReactNode;
  quiet?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span className={quiet ? "badge quiet" : "badge"} style={style}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Layer stack — lets full-screen editors know a popover/modal is open
 * so Escape dismisses the topmost layer first.
 * ------------------------------------------------------------------ */

export const layerStack = { count: 0 };

/* ------------------------------------------------------------------ *
 * Popover — anchored floating layer used by menus and pickers
 * ------------------------------------------------------------------ */

export function Popover({
  anchorRef,
  onClose,
  children,
  align = "start",
  offset = 6,
  width,
  className = "menu",
  matchAnchorWidth,
  placement = "bottom",
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  align?: "start" | "end";
  offset?: number;
  width?: number;
  className?: string;
  matchAnchorWidth?: boolean;
  /** Which side of the anchor to prefer. Either way it flips when it runs out of room. */
  placement?: "bottom" | "top";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const a = anchorRef.current;
    const el = ref.current;
    if (!a || !el) return;
    const r = a.getBoundingClientRect();
    const w = matchAnchorWidth ? r.width : width ?? el.offsetWidth;
    let left = align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const h = el.offsetHeight;
    const below = r.bottom + offset;
    const above = r.top - offset - h;
    let top = placement === "top" ? above : below;
    /* Flip to the other side rather than hang off the edge of the window. */
    if (placement === "top" && top < 8) top = below;
    if (placement === "bottom" && top + h > window.innerHeight - 8) top = Math.max(8, above);
    setPos({ left, top, width: matchAnchorWidth ? r.width : width, opacity: 1 });
  }, [anchorRef, align, offset, width, matchAnchorWidth, placement]);

  useEffect(() => {
    layerStack.count += 1;
    return () => {
      layerStack.count -= 1;
    };
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        ref.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div ref={ref} className={className} style={{ position: "fixed", ...pos }}>
      {children}
    </div>,
    overlayRoot()
  );
}

/* ------------------------------------------------------------------ *
 * Tip — a short label that names a control on hover or focus
 * ------------------------------------------------------------------ */

/**
 * For controls that are only a glyph, such as the building-block tiles.
 *
 * It is portalled to the body, so it is never clipped by a scrolling panel,
 * and it waits a beat before showing so a cursor passing over a grid does not
 * flash a label on every tile. It goes away the moment the control is pressed
 * or dragged, so it never sits over the thing being dragged.
 */
export function Tip({
  label,
  children,
  placement = "top",
}: {
  label: string;
  children: ReactNode;
  placement?: "top" | "bottom";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ left: r.left + r.width / 2, top: placement === "top" ? r.top : r.bottom });
    }, 250);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      ref={ref}
      className="tip-anchor"
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onPointerDown={hide}
      onDragStart={hide}
    >
      {children}
      {pos &&
        createPortal(
          <div
            className={`tooltip ${placement}`}
            role="tooltip"
            style={{ left: pos.left, top: pos.top }}
          >
            {label}
          </div>,
          overlayRoot()
        )}
    </span>
  );
}

export function MenuItem({
  children,
  icon,
  onClick,
  tone,
}: {
  children: ReactNode;
  icon?: IconName;
  onClick?: () => void;
  tone?: "danger" | "accent";
}) {
  return (
    <button className={`menu-item ${tone ?? ""}`} onClick={onClick}>
      {icon && (
        <span className="mi-icon">
          <Icon name={icon} size={18} />
        </span>
      )}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 500,
  className,
  bare,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  className?: string;
  bare?: boolean;
}) {
  useEffect(() => {
    layerStack.count += 1;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      layerStack.count -= 1;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal ${className ?? ""}`}
        style={bare ? undefined : { width, maxWidth: "94vw" }}
      >
        {bare ? (
          children
        ) : (
          <>
            <div className="modal-head">
              <div className="modal-title">{title}</div>
            </div>
            <button className="btn ghost icon modal-close" onClick={onClose} title="Close">
              <Icon name="close" size={20} />
            </button>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </>
        )}
      </div>
    </div>,
    overlayRoot()
  );
}

/* ------------------------------------------------------------------ *
 * Fields
 * ------------------------------------------------------------------ */

export function Field({
  label,
  required,
  help,
  info,
  children,
  footNote,
  footNoteSize,
}: {
  label: string;
  required?: boolean;
  help?: string;
  /** Puts the design's info glyph beside the label, carrying this as its tip. */
  info?: string;
  children: ReactNode;
  footNote?: string;
  /** "md" is body copy, for counts and sentences that read as content. */
  footNoteSize?: "sm" | "md";
}) {
  return (
    <div className="field">
      <div className="field-label">
        {label}
        {info && (
          <span className="field-info" title={info}>
            <Icon name="info" size={20} />
          </span>
        )}
        {required && <span className="req">Required</span>}
      </div>
      {help && <div className="field-help" style={{ margin: "0 0 8px" }}>{help}</div>}
      {children}
      {footNote && (
        <div className={`field-help ${footNoteSize === "md" ? "md" : ""}`}>{footNote}</div>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={`checkbox ${disabled ? "disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Select — a button that opens a list popover
 * ------------------------------------------------------------------ */

export function Select({
  value,
  placeholder,
  options,
  onChange,
  block,
  icon,
  width,
  disabled,
  renderOption,
  onPreview,
}: {
  value?: string;
  placeholder?: string;
  options: string[];
  onChange: (v: string) => void;
  block?: boolean;
  icon?: IconName;
  width?: number;
  disabled?: boolean;
  renderOption?: (o: string) => ReactNode;
  /**
   * Called with the option under the cursor, and with null when the cursor
   * leaves the menu. A select whose options are worth seeing applied — a
   * typeface, say — can show each one as it is hovered and put the committed
   * value back if none is chosen.
   */
  onPreview?: (v: string | null) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={ref}
        className={`select ${block ? "block" : ""}`}
        style={width ? { width } : undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className="row" style={{ gap: 6, minWidth: 0 }}>
          {icon && <Icon name={icon} size={16} style={{ color: "var(--content-medium)" }} />}
          <span className={value ? "truncate" : "placeholder truncate"}>
            {value || placeholder}
          </span>
        </span>
        <span className="chev">
          <Icon name="chevron-down" size={16} />
        </span>
      </button>
      {open && (
        <Popover
          anchorRef={ref}
          onClose={() => {
            setOpen(false);
            onPreview?.(null);
          }}
          matchAnchorWidth={block}
          width={block ? undefined : 200}
        >
          {/* Leaving the menu drops the preview; leaving one option for the
              next does not, which is why this sits on the list. */}
          <div onMouseLeave={() => onPreview?.(null)}>
            {options.map((o) => (
              <button
                key={o}
                className="menu-item"
                onMouseEnter={() => onPreview?.(o)}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {renderOption ? renderOption(o) : o}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Tag input (tradecrafts / languages)
 * ------------------------------------------------------------------ */

export function TagInput({
  tags,
  onRemove,
  onAdd,
  options,
  placeholder = "Search",
  readOnly,
  icon = "tradecraft",
  addLabel,
  onAddNew,
  pickerLabel = "Select tradecrafts",
}: {
  tags: string[];
  onRemove?: (t: string) => void;
  onAdd?: (t: string) => void;
  options?: string[];
  /** Shown only while nothing is chosen, the way an empty field reads. */
  placeholder?: string;
  readOnly?: boolean;
  icon?: IconName;
  addLabel?: string;
  onAddNew?: () => void;
  /** The heading over the list of things left to add. */
  pickerLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const remaining = (options ?? []).filter((o) => !tags.includes(o));
  return (
    <>
      <div
        ref={wrapRef}
        className={`taginput ${readOnly ? "readonly" : ""}`}
        onClick={() => !readOnly && setOpen(true)}
      >
        {tags.map((t) => (
          <span className="tag" key={t}>
            <Icon name={icon} size={13} style={{ color: "var(--content-medium)" }} />
            {t}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.(t);
                }}
                title="Remove"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && <input placeholder={tags.length ? "" : placeholder} readOnly />}
      </div>
      {open && !readOnly && (
        <Popover
          anchorRef={wrapRef}
          onClose={() => setOpen(false)}
          className="picker"
          width={332}
        >
          <div className="picker-label">{pickerLabel}</div>
          <div className="picker-list">
            {remaining.length === 0 && (
              <div className="picker-label" style={{ padding: "8px 14px 14px" }}>
                Nothing left to add
              </div>
            )}
            {remaining.map((o) => (
              <button
                key={o}
                className="picker-item"
                onClick={() => {
                  onAdd?.(o);
                  setOpen(false);
                }}
              >
                <Icon name={icon} size={18} />
                {o}
                <span className="pi-edit">
                  <Icon name="pencil" size={15} />
                </span>
              </button>
            ))}
          </div>
          {addLabel && (
            <div className="picker-foot">
              <button
                className="menu-item accent"
                onClick={() => {
                  setOpen(false);
                  onAddNew?.();
                }}
              >
                <span className="mi-icon">
                  <Icon name="plus" size={18} />
                </span>
                {addLabel}
              </button>
            </div>
          )}
        </Popover>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Toasts
 * ------------------------------------------------------------------ */

export function ToastLayer({
  toasts,
  onDismiss,
}: {
  toasts: { id: number; text: string }[];
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="toast-layer">
      <div className="col" style={{ gap: 8, alignItems: "center" }}>
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <Icon name="check" size={16} />
            <span>{t.text}</span>
            <button className="tclose" onClick={() => onDismiss(t.id)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
