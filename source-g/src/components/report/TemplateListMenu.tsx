import { useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/primitives";
import { useStore } from "../../state/store";
import { AUDIENCE_MENU_LABEL, type Template } from "../../data/mockData";

/**
 * "TemplateList": the agent's Create Report menu.
 *
 * The first view searches template names, recommends the templates used
 * most recently, and lists the template groups (Feedly, Custom, Legacy).
 * A group opens in place, with a back header. Each template is one row
 * however many audiences it serves; a template with several asks for the
 * audience once the report opens.
 */

type View = { kind: "home" } | { kind: "feedly" } | { kind: "custom" } | { kind: "legacy" };

const VIEW_TITLE: Record<Exclude<View["kind"], "home">, string> = {
  feedly: "Feedly templates",
  custom: "Custom templates",
  legacy: "Legacy templates",
};

/** One template by name, with every audience it is written for. */
interface Group {
  name: string;
  icon: Template["icon"];
  templates: Template[];
  lastUsed: number;
}

function groupsOf(list: Template[]): Group[] {
  const byName = new Map<string, Group>();
  for (const t of list) {
    const g = byName.get(t.name);
    if (g) {
      g.templates.push(t);
      g.lastUsed = Math.min(g.lastUsed, t.lastUsed);
    } else byName.set(t.name, { name: t.name, icon: t.icon, templates: [t], lastUsed: t.lastUsed });
  }
  return [...byName.values()];
}

const label = (a: string) => AUDIENCE_MENU_LABEL[a] ?? a;

/* Kept out of Recommended; still listed under Custom templates. */
const NOT_RECOMMENDED = ["Vulnerability Advisory (Matt)"];

/** "CISO, Detection Engineering, +2": the audiences, two at most. */
const audienceList = (g: Group) => {
  const names = g.templates.map((t) => label(t.audience));
  return names.length > 2 ? `${names.slice(0, 2).join(", ")}, +${names.length - 2}` : names.join(", ");
};

/** "4 audiences", or the one audience by name. */
const audienceCount = (g: Group) =>
  g.templates.length === 1 ? label(g.templates[0].audience) : `${g.templates.length} audiences`;

export function TemplateListMenu({
  anchorRef,
  onClose,
  onPick,
  align = "end",
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  /** The template, and whether the report should ask which audience it is for. */
  onPick: (templateId: string, askAudience: boolean) => void;
  align?: "start" | "end";
}) {
  const { templates, openTemplateEditor, toast } = useStore();
  const [view, setView] = useState<View>({ kind: "home" });
  const [query, setQuery] = useState("");

  const usable = useMemo(() => templates.filter((t) => !t.legacy), [templates]);
  const all = useMemo(() => groupsOf(usable), [usable]);
  const recommended = useMemo(
    () =>
      [...all]
        .filter((g) => !NOT_RECOMMENDED.includes(g.name))
        .sort((a, b) => a.lastUsed - b.lastUsed)
        .slice(0, 5),
    [all]
  );
  const byKind = (k: "feedly" | "custom") =>
    groupsOf(usable.filter((t) => t.kind === k)).sort((a, b) => a.name.localeCompare(b.name));
  const legacy = useMemo(() => templates.filter((t) => t.legacy), [templates]);

  const pick = (g: Group) => {
    onClose();
    onPick(g.templates[0].id, g.templates.length > 1);
  };

  const row = (g: Group, sub: string) => (
    <button key={g.name} className="tl-item" onClick={() => pick(g)}>
      <span className="tl-icon">
        <Icon name={g.icon} size={20} />
      </span>
      <span className="tl-text">
        <span className="tl-name truncate">{g.name}</span>
        <span className="tl-sub truncate">{sub}</span>
      </span>
    </button>
  );

  const q = query.trim().toLowerCase();
  const results = q ? all.filter((g) => g.name.toLowerCase().includes(q)) : [];

  return (
    <Popover anchorRef={anchorRef} onClose={onClose} align={align} width={300} className="menu tl">
      {view.kind === "home" ? (
        <>
          <input
            className="tl-search"
            placeholder="Search template names"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          {q ? (
            <div className="tl-sec">
              {results.length ? (
                results.map((g) => row(g, audienceList(g)))
              ) : (
                <div className="tl-empty">No templates match &ldquo;{query.trim()}&rdquo;</div>
              )}
            </div>
          ) : (
            <>
              <div className="tl-sec">
                <div className="tl-label">Recommended templates</div>
                {recommended.map((g) => row(g, audienceList(g)))}
              </div>
              <div className="tl-sec">
                <div className="tl-label">All templates</div>
                {(["feedly", "custom", "legacy"] as const).map((k) => (
                  <button key={k} className="tl-group" onClick={() => setView({ kind: k })}>
                    <span className="truncate">{VIEW_TITLE[k]}</span>
                    <Icon name="chevron-right" size={20} />
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <button className="tl-back" onClick={() => setView({ kind: "home" })}>
            <Icon name="chevron-left" size={20} />
            <span>{VIEW_TITLE[view.kind]}</span>
          </button>
          <div className="tl-sec tl-scroll">
            {view.kind === "legacy" ? (
              legacy.length ? (
                legacy.map((t) => (
                  <button
                    key={t.id}
                    className="tl-item"
                    onClick={() => {
                      onClose();
                      openTemplateEditor(t.id);
                      toast("Upgrade this legacy template to use it in a report");
                    }}
                  >
                    <span className="tl-icon">
                      <Icon name={t.icon} size={20} />
                    </span>
                    <span className="tl-text">
                      <span className="tl-name truncate">{t.name}</span>
                      <span className="tl-sub">Upgrade to use it</span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="tl-empty">No legacy templates.</div>
              )
            ) : (
              (() => {
                const list = byKind(view.kind);
                return list.length ? (
                  list.map((g) => row(g, audienceCount(g)))
                ) : (
                  <div className="tl-empty">No {view.kind} templates yet.</div>
                );
              })()
            )}
          </div>
        </>
      )}
    </Popover>
  );
}
