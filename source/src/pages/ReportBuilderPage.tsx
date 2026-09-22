import { useMemo, useRef, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Button, Modal, Popover, TagInput, Select, Field } from "../components/ui/primitives";
import { TemplateCard } from "../components/templates/TemplateCard";
import { TemplateLibrary } from "../components/templates/TemplateLibrary";
import { useStore } from "../state/store";
import { COMPANIES, LANGUAGES } from "../data/mockData";

type AudienceFilter = string; // "Last used" | audience name
type TypeFilter =
  | "Feedly & Custom"
  | "All types"
  | "Feedly templates"
  | "Custom templates";

export function ReportBuilderPage() {
  const {
    templates,
    reports,
    audiences,
    duplicateTemplate,
    openTemplateEditor,
    openReportEditor,
    settings,
    setSettings,
    toast,
  } = useStore();

  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("CISO");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All types");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({
    key: "createdOn",
    dir: -1,
  });

  const audRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const [audMenu, setAudMenu] = useState(false);
  const [typeMenu, setTypeMenu] = useState(false);
  /* The previous-reports list has its own filter, beside its search. */
  const reportTypeRef = useRef<HTMLButtonElement>(null);
  const [reportTypeMenu, setReportTypeMenu] = useState(false);
  const [reportType, setReportType] = useState("All types");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const visibleTemplates = useMemo(() => {
    let list = [...templates];
    if (audienceFilter !== "Last used") {
      list = list.filter((t) => t.audience === audienceFilter);
    } else {
      list.sort((a, b) => (a.lastUsed < 0 ? -1 : a.lastUsed) - (b.lastUsed < 0 ? -1 : b.lastUsed));
    }
    if (typeFilter === "Feedly templates") list = list.filter((t) => t.kind === "feedly");
    if (typeFilter === "Custom templates") list = list.filter((t) => t.kind === "custom");
    return list;
  }, [templates, audienceFilter, typeFilter]);

  /* The filter offers the templates the list actually contains. */
  const reportTemplates = useMemo(
    () => [...new Set(reports.map((r) => r.templateName))].sort(),
    [reports]
  );

  const visibleReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reports.filter(
      (r) =>
        (reportType === "All types" || r.templateName === reportType) &&
        (!q ||
          r.headline.toLowerCase().includes(q) ||
          r.templateName.toLowerCase().includes(q) ||
          r.createdBy.toLowerCase().includes(q))
    );
    const key = sort.key as "headline" | "templateName" | "createdBy" | "createdOn";
    return [...list].sort((a, b) => {
      if (key === "createdOn") {
        return (
          (new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime()) * sort.dir
        );
      }
      return a[key].localeCompare(b[key]) * sort.dir;
    });
  }, [reports, search, sort, reportType]);

  const scrollBy = (dx: number) => scrollerRef.current?.scrollBy({ left: dx });

  const sortBtn = (label: string, key: string) => (
    <button
      onClick={() =>
        setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
      }
    >
      {label}
      <Icon
        name={sort.key === key && sort.dir === -1 ? "arrow-down" : "arrow-up"}
        size={13}
        style={{ color: sort.key === key ? "var(--content-bold)" : "var(--content-light)" }}
      />
    </button>
  );

  return (
    <div className="page rb-page wide">
      <div className="page-head">
        <h1 className="t-h1" style={{ margin: 0 }}>
          Report Builder
        </h1>
        <div className="row" style={{ gap: 8 }}>
          <Button icon="gear" title="Report Builder settings" onClick={() => setSettingsOpen(true)} />
          <Button icon="tradecraft" onClick={() => setLibraryOpen(true)}>
            Manage templates
          </Button>
        </div>
      </div>

      {/* ---------------- Carousel ---------------- */}
      <div className="section-head">
        <div className="row" style={{ gap: 12 }}>
          <span className="section-title">Create report</span>
        </div>
      </div>
      <div className="filter-row" style={{ marginBottom: 16 }}>
        <button ref={audRef} className="select sm" style={{ width: 150, justifyContent: "space-between" }} onClick={() => setAudMenu((o) => !o)}>
          <span className="truncate">{audienceFilter}</span>
          <span className="chev">
            <Icon name="chevron-down" size={16} />
          </span>
        </button>
        <button ref={typeRef} className="select sm" style={{ justifyContent: "space-between" }} onClick={() => setTypeMenu((o) => !o)}>
          <span>{typeFilter}</span>
          <span className="chev">
            <Icon name="chevron-down" size={16} />
          </span>
        </button>
        <span className="spacer" />
        <Button size="sm" icon="chevron-left" title="Previous" onClick={() => scrollBy(-544)} />
        <Button size="sm" icon="chevron-right" title="Next" onClick={() => scrollBy(544)} />
      </div>

      {audMenu && (
        <Popover anchorRef={audRef} onClose={() => setAudMenu(false)} width={200}>
          <button
            className="menu-item"
            onClick={() => {
              setAudienceFilter("Last used");
              setAudMenu(false);
            }}
          >
            <span className="mi-icon">
              <Icon name="history" size={18} />
            </span>
            Last used templates
          </button>
          <div className="menu-sep" />
          <div className="menu-label">Select audience</div>
          {audiences
            .filter((a) => a !== "Custom audience")
            .map((a) => (
              <button
                key={a}
                className="menu-item"
                style={a === audienceFilter ? { background: "var(--bg-light)" } : undefined}
                onClick={() => {
                  setAudienceFilter(a);
                  setAudMenu(false);
                }}
              >
                {a}
              </button>
            ))}
        </Popover>
      )}
      {typeMenu && (
        <Popover anchorRef={typeRef} onClose={() => setTypeMenu(false)} width={186}>
          {(["Feedly & Custom", "All types", "Feedly templates", "Custom templates"] as const).map(
            (v) => (
              <button
                key={v}
                className="menu-item"
                onClick={() => {
                  setTypeFilter(v as TypeFilter);
                  setTypeMenu(false);
                }}
              >
                {v}
              </button>
            )
          )}
        </Popover>
      )}

      <div className="carousel" ref={scrollerRef} style={{ marginBottom: 32 }}>
        {visibleTemplates.length === 0 && (
          <div className="empty">No templates match this filter.</div>
        )}
        {visibleTemplates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onOpen={() => openReportEditor(t.id, { path: "none" })}
            onCreateReport={() =>
              openReportEditor(t.id, { path: "none" })
            }
            onEdit={() => openTemplateEditor(t.id)}
            onDuplicate={() => {
              const copy = duplicateTemplate(t.id);
              toast(`${copy.name} created`);
            }}
          />
        ))}
      </div>

      {/* ---------------- Previous reports ---------------- */}
      <div className="reports-block">
      <div className="section-head">
        <span className="section-title">View previous reports</span>
      </div>
      {/* Figma: the search and its filters sit under the heading rather than
          out to its right, so the whole block reads top to bottom. */}
      <div className="filter-row" style={{ gap: 8, marginBottom: 16 }}>
        <div className="search">
          <Icon name="search" size={20} style={{ color: "var(--content-light)" }} />
          <input
            placeholder="Search report names"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          ref={reportTypeRef}
          className="select sm"
          style={{ justifyContent: "space-between" }}
          onClick={() => setReportTypeMenu((o) => !o)}
        >
          <span>{reportType}</span>
          <span className="chev">
            <Icon name="chevron-down" size={16} />
          </span>
        </button>
      </div>
      {reportTypeMenu && (
        <Popover anchorRef={reportTypeRef} onClose={() => setReportTypeMenu(false)} width={200}>
          {["All types", ...reportTemplates].map((v) => (
            <button
              key={v}
              className="menu-item"
              style={v === reportType ? { background: "var(--bg-light)" } : undefined}
              onClick={() => {
                setReportType(v);
                setReportTypeMenu(false);
              }}
            >
              {v}
            </button>
          ))}
        </Popover>
      )}

      <table className="rtable">
        <thead>
          <tr>
            <th style={{ width: "44%" }}>{sortBtn("Headline", "headline")}</th>
            <th style={{ width: "17%" }}>Template</th>
            <th style={{ width: "12%" }}>Audience</th>
            <th style={{ width: "12%" }}>{sortBtn("Created by", "createdBy")}</th>
            <th style={{ width: "11%" }}>{sortBtn("Created on", "createdOn")}</th>
            <th style={{ width: 60 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {visibleReports.map((r) => (
            <ReportRow key={r.id} id={r.id} />
          ))}
          {visibleReports.length === 0 && (
            <tr>
              <td colSpan={6} className="muted" style={{ padding: 24 }}>
                No reports match “{search}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {libraryOpen && <TemplateLibrary onClose={() => setLibraryOpen(false)} />}

      {settingsOpen && (
        <Modal
          title="Report Builder settings"
          width={420}
          onClose={() => setSettingsOpen(false)}
          footer={
            <>
              <Button onClick={() => setSettingsOpen(false)}>Dismiss</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSettingsOpen(false);
                  toast("Settings saved");
                }}
              >
                Save changes
              </Button>
            </>
          }
        >
          <Field
            label="Language"
            help="If multiple languages are chosen, you will have the chance to choose which to use when generating the report."
          >
            <TagInput
              icon="text"
              tags={settings.languages}
              options={LANGUAGES}
              onAdd={(t) => setSettings({ ...settings, languages: [...settings.languages, t] })}
              onRemove={(t) =>
                setSettings({
                  ...settings,
                  languages: settings.languages.filter((l) => l !== t),
                })
              }
            />
          </Field>
          <Field
            label="Default company info"
            help="If multiple companies are chosen, you will have the chance to choose which to use when generating the report."
          >
            <Select
              block
              placeholder="No default set"
              value={settings.defaultCompany || undefined}
              options={COMPANIES}
              onChange={(v) => setSettings({ ...settings, defaultCompany: v })}
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}

function ReportRow({ id }: { id: string }) {
  const { reports, openReport } = useStore();
  const r = reports.find((x) => x.id === id)!;
  const moreRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);

  return (
    <tr>
      <td>
        {/* Opens the Report Builder editor for this report, in its done state. */}
        <button className="headline" onClick={() => openReport(r.id)}>
          {/* The same mark the Report Builder carries in the left nav. */}
          <Icon name="wand" size={20} style={{ color: "var(--content-medium)" }} />
          <span>{r.headline}</span>
        </button>
      </td>
      <td>{r.templateName}</td>
      <td>
        <span className="badge">
          <Icon name="audience" size={16} />
          {r.templateAudience}
        </span>
      </td>
      <td>{r.createdBy}</td>
      <td>{r.createdOn}</td>
      <td>
        <button
          ref={moreRef}
          className="btn ghost icon sm"
          onClick={() => setMenu((m) => !m)}
          title="More"
        >
          <Icon name="ellipsis" size={16} />
        </button>
        {menu && (
          <Popover anchorRef={moreRef} onClose={() => setMenu(false)} align="end" width={190}>
            <button className="menu-item" onClick={() => setMenu(false)}>
              <span className="mi-icon">
                <Icon name="export" size={18} />
              </span>
              Export
            </button>
            <button className="menu-item" onClick={() => setMenu(false)}>
              <span className="mi-icon">
                <Icon name="duplicate" size={18} />
              </span>
              Duplicate report
            </button>
            <button className="menu-item danger" onClick={() => setMenu(false)}>
              <span className="mi-icon">
                <Icon name="trash" size={18} />
              </span>
              Delete report
            </button>
          </Popover>
        )}
      </td>
    </tr>
  );
}
