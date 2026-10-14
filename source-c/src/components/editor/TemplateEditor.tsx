import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Field, Popover, TagInput, MenuItem, layerStack } from "../ui/primitives";
import { ParameterDialog } from "./ParameterDialog";
import { AudienceDialog } from "./AudienceDialog";
import { GenerateWithPromptDialog } from "./GenerateWithPromptDialog";
import { BlockNoteCanvas, type DocInsert } from "./BlockNoteCanvas";
import { DesignPanel } from "./DesignPanel";
import { PageBandEditor } from "./PageBandEditor";
import { useStore } from "../../state/store";
import { AUDIENCE_CONTENT, type Block, type Parameter } from "../../data/mockData";
import { VARIANT } from "../../variant";

/**
 * How parameters are organised, by prototype version (Figma "Topic 2 -
 * Parameter editing"):
 *   B — Option A: one flat list, and a template needs at least one parameter.
 *   C — Option B: topic parameters apart from general ones, and a template
 *       needs at least one topic parameter.
 */
const GROUPED_PARAMS = VARIANT === "C";

/** Whether a parameter's chip appears anywhere in the template. */
const usesParam = (blocks: Block[], name: string) =>
  blocks.some((b) => b.prompts.some((p) => p.includes(`{{${name}}}`)));
import { EMPTY_BAND, bandVars, brandVars, type PageBand } from "../../data/brand";
import {
  BUILDING_BLOCKS,
  dragLabel,
  isAssetLabel,
  readAssetDrag,
  readBlockDrag,
} from "../../data/buildingBlocks";

type Tab = "context" | "parameters" | "design";

/** Which building blocks the document body will take, by lowercased label. */
const DOC_DROPPABLE = new Set(
  BUILDING_BLOCKS.filter((b) => b.doc).map((b) => b.label.toLowerCase())
);

export function TemplateEditor({ templateId, isNew }: { templateId: string; isNew: boolean }) {
  const {
    templates,
    updateTemplate,
    duplicateTemplate,
    openTemplateEditor,
    openReportEditor,
    closeOverlay,
    audiences,
    addAudience,
    audienceContent,
    setAudienceContent,
    tradecrafts,
    addTradecraft,
    brands,
    updateBrand,
    toast,
  } = useStore();

  const template = templates.find((t) => t.id === templateId);
  const [tab, setTab] = useState<Tab>("context");
  /* Which band is being worked on. Clicking one anywhere in the editor marks
     it and opens the Design tab; leaving that tab clears it. */
  const [activeBand, setActiveBand] = useState<"header" | "footer" | null>(null);
  const goTab = (t: Tab) => {
    setTab(t);
    if (t !== "design") setActiveBand(null);
  };
  const activate = (which: "header" | "footer") => {
    setActiveBand(which);
    setTab("design");
  };
  const [dirty, setDirty] = useState(false);
  /* Validation messages only show once an upgrade has been attempted. */
  const [showErrors, setShowErrors] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [genOpen, setGenOpen] = useState(isNew);
  const [generating, setGenerating] = useState(false);
  const [paramDialog, setParamDialog] = useState<
    | null
    | { mode: "add"; seedName?: string; topic?: boolean; insert?: (name: string) => void }
    | { mode: "edit"; param: Parameter }
  >(null);
  const [audienceDialog, setAudienceDialog] = useState<null | {
    mode: "add" | "edit";
    name?: string;
  }>(null);
  const [tradecraftDialog, setTradecraftDialog] = useState(false);
  const [audPickerOpen, setAudPickerOpen] = useState(false);
  const audAnchor = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  /* Whether a dragged block is over the document, and the handle the canvas
     gives us for putting one in. */
  const [docDrop, setDocDrop] = useState(false);
  const insertBlock = useRef<((what: DocInsert, clientY: number) => boolean) | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || layerStack.count > 0) return;
      /* A selected band takes the first Escape, so the key walks back out of
         the band before it closes the whole editor. */
      if (activeBand) {
        setActiveBand(null);
        return;
      }
      closeOverlay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeOverlay, genOpen, paramDialog, audienceDialog, activeBand]);

  /* Clicking anywhere that is not the band or its toolbar drops the selection,
     the way clicking off an object on a canvas does. Menus and dialogs opened
     from the toolbar live outside the band in the DOM, so a click inside one
     of those keeps the band selected. */
  useEffect(() => {
    if (!activeBand) return;
    const onDown = (e: PointerEvent) => {
      if (layerStack.count > 0) return;
      const target = e.target as Element | null;
      if (!target || !target.closest) return;
      if (target.closest(".band-wrap") || target.closest(".band-toolbar")) return;
      if (target.closest(".scrim, .modal")) return;
      setActiveBand(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [activeBand]);

  if (!template) return null;
  const readOnly = template.kind === "feedly";
  const brand = brands.find((b) => b.id === template.brandId);
  const header: PageBand = template.header ?? EMPTY_BAND;
  const footer: PageBand = template.footer ?? EMPTY_BAND;
  /* The Design tab is where the bands are built; the other tabs only let you
     find them. A built-in template is never editable, so its bands stay in the
     hover state wherever you are. */
  const bandMode = tab === "design" && !readOnly ? "edit" : "hint";

  const patch = (p: Parameters<typeof updateTemplate>[1]) => {
    updateTemplate(template.id, p);
    if (!readOnly) setDirty(true);
  };

  /* Version B — Figma "Promoting template updating": a legacy template has to
     be upgraded before it can be used. Saving it is the upgrade, and it only
     goes through once the description, audience and a parameter are in. */
  const upgrading = VARIANT === "B" && Boolean(template.legacy);
  /* Version C — "Promoting legacy compatibility": nothing is required of a
     legacy template, so it can be used as it is. */
  const relaxed = VARIANT === "C" && Boolean(template.legacy);
  const missingDescription = !template.contextDescription.trim();
  const missingAudience = !template.audience;

  /* The parameter rule for this version, shown in the Parameters tab and
     holding Save back until it is met. */
  const paramsMissing =
    !readOnly &&
    (GROUPED_PARAMS
      ? !template.parameters.some((p) => p.topic)
      : template.parameters.length === 0);

  const upgrade = () => {
    if (missingDescription || missingAudience || paramsMissing) {
      setShowErrors(true);
      if (!missingDescription && !missingAudience && paramsMissing) setTab("parameters");
      else setTab("context");
      toast("Fill in the required fields to upgrade this template");
      return;
    }
    updateTemplate(template.id, {
      legacy: false,
      description: template.contextDescription,
    });
    setShowErrors(false);
    setDirty(false);
    setSavedOnce(true);
    toast("Template upgraded to the new template structure");
  };

  const save = () => {
    setDirty(false);
    setSavedOnce(true);
    toast("Changes were successfully saved");
  };

  const removeParamEverywhere = (name: string) => {
    patch({
      parameters: template.parameters.filter((p) => p.name !== name),
      blocks: template.blocks.map((b) => ({
        ...b,
        prompts: b.prompts.map((p) => p.replaceAll(`{{${name}}}`, name)),
      })),
    });
  };

  return (
    <div className="editor">
      {/* ---------------- Top bar ---------------- */}
      <div className="editor-top">
        <Button onClick={closeOverlay}>Close</Button>
        <div className="editor-title">
          <span className="truncate">{template.name}</span>
          <span className="kind">
            {readOnly ? "Feedly Template" : upgrading ? "Legacy Template" : "Custom Template"}
          </span>
        </div>
        <span className="spacer" />
        {readOnly ? (
          <>
            <Button>Send us feedback</Button>
            <Button
              variant="primary"
              icon="duplicate"
              onClick={() => {
                const copy = duplicateTemplate(template.id);
                openTemplateEditor(copy.id);
                toast(`${copy.name} created`);
              }}
            >
              Duplicate and edit
            </Button>
          </>
        ) : (
          <>
            {(dirty || savedOnce) && (
              <span className="t-body3 light" style={{ marginRight: 4 }}>
                Edited just now
              </span>
            )}
            {savedOnce && !dirty && (
              <Button icon="history" title="Version history" />
            )}
            <button
              ref={moreRef}
              className="btn ghost icon"
              title="More"
              onClick={() => setMoreOpen((o) => !o)}
            >
              <Icon name="ellipsis" size={16} />
            </button>
            {upgrading ? (
              /* Saving a legacy template is the upgrade, so Save is always
                 there to press; what is still missing shows when it is. */
              <Button variant="primary" onClick={upgrade}>
                Save
              </Button>
            ) : (
            <Button
              variant={dirty && !paramsMissing ? "primary" : "default"}
              disabled={!dirty || paramsMissing}
              title={paramsMissing ? "Add a parameter before saving" : undefined}
              onClick={save}
            >
              Save
            </Button>
            )}
          </>
        )}
      </div>

      {upgrading && (
        <div className="legacy-banner">
          <Icon name="info" size={18} />
          <span>
            <b>This is a legacy template. </b>
            Please fill in required fields and save the template to upgrade it to our new
            template structure.
          </span>
        </div>
      )}

      {moreOpen && (
        <Popover anchorRef={moreRef} onClose={() => setMoreOpen(false)} align="end" width={210}>
          {/* "Create report" from the template editor is one of the two
              no-context entry points in the source collection logic. */}
          <MenuItem
            icon="wand"
            onClick={() => {
              setMoreOpen(false);
              openReportEditor(template.id, { path: "none" });
            }}
          >
            Create report
          </MenuItem>
          <div className="menu-sep" />
          <MenuItem
            icon="duplicate"
            onClick={() => {
              setMoreOpen(false);
              const copy = duplicateTemplate(template.id);
              openTemplateEditor(copy.id);
              toast(`${copy.name} created`);
            }}
          >
            Duplicate template
          </MenuItem>
          <MenuItem icon="history" onClick={() => setMoreOpen(false)}>
            Version history
          </MenuItem>
          <MenuItem
            icon="trash"
            tone="danger"
            onClick={() => {
              setMoreOpen(false);
              closeOverlay();
            }}
          >
            Delete template
          </MenuItem>
        </Popover>
      )}

      <div className="editor-body">
        {/* ---------------- Left panel ---------------- */}
        <aside className="editor-side">
          {/* Figma "Tabs - resize": label only, no glyphs. */}
          <div className="tabs">
            <button
              className={`tab ${tab === "context" ? "active" : ""}`}
              onClick={() => goTab("context")}
            >
              Context
            </button>
            <button
              className={`tab ${tab === "parameters" ? "active" : ""}`}
              onClick={() => goTab("parameters")}
            >
              Parameters
            </button>
            <button
              className={`tab ${tab === "design" ? "active" : ""}`}
              onClick={() => goTab("design")}
            >
              Design
            </button>
          </div>

          <div className="side-scroll">
            {tab === "context" ? (
              <>
                <Field
                  label="Description"
                  required={!relaxed}
                  help="What this template is about, what are the types of things the report should be focusing on."
                  error={
                    upgrading && showErrors && missingDescription
                      ? "Please enter a description"
                      : undefined
                  }
                >
                  <textarea
                    className="textarea"
                    rows={4}
                    disabled={readOnly}
                    value={template.contextDescription}
                    placeholder="e.g. CVE ID or list of coordinated CVEs or other vulnerabilities"
                    onChange={(e) => patch({ contextDescription: e.target.value })}
                  />
                </Field>

                <Field
                  label="Audience"
                  required={!relaxed}
                  help="Who the report is for (CISO, SOC/IR, Board…). Sets the depth, tone, and sections."
                  error={
                    upgrading && showErrors && missingAudience ? "Please enter an Audience" : undefined
                  }
                >
                  <button
                    ref={audAnchor}
                    className="select block"
                    disabled={readOnly}
                    onClick={() => setAudPickerOpen((o) => !o)}
                  >
                    <span className="row" style={{ gap: 6, minWidth: 0 }}>
                      {template.audience && <Icon name="audience" size={16} />}
                      <span className={template.audience ? "truncate" : "placeholder"}>
                        {template.audience || "Select audience"}
                      </span>
                    </span>
                    <span className="chev">
                      <Icon name="chevron-down" size={16} />
                    </span>
                  </button>
                </Field>

                <Field
                  label="Tradecrafts"
                  required={!relaxed}
                  help="The standards it's written to: ICD 203, Chicago style, and your writing rules."
                >
                  <TagInput
                    tags={template.tradecrafts}
                    options={tradecrafts}
                    readOnly={readOnly}
                    addLabel="Add tradecraft"
                    onAddNew={() => setTradecraftDialog(true)}
                    onAdd={(t) => patch({ tradecrafts: [...template.tradecrafts, t] })}
                    onRemove={(t) =>
                      patch({ tradecrafts: template.tradecrafts.filter((x) => x !== t) })
                    }
                  />
                </Field>
              </>
            ) : tab === "parameters" ? (
              <ParametersPanel
                parameters={template.parameters}
                readOnly={readOnly}
                onEdit={(p) => setParamDialog({ mode: "edit", param: p })}
                onAdd={(topic) => setParamDialog({ mode: "add", topic })}
              />
            ) : (
              <DesignPanel
                brands={brands}
                brandId={template.brandId}
                readOnly={readOnly}
                onPickBrand={(id) => patch({ brandId: id })}
                onEditBrand={(p) => template.brandId && updateBrand(template.brandId, p)}
              />
            )}
          </div>
        </aside>

        {/* ---------------- Canvas ---------------- */}
        <div className="editor-canvas tpl-canvas">
          {/* Figma: the banner scrolls with the body and sits 48px above the
              page, rather than being pinned over the canvas. */}
          {readOnly && (
            <div className="info-bar">
              <Icon name="info" size={24} style={{ color: "#2f6fd0" }} />
              <span className="strong">Feedly templates cannot be edited.</span>
              <span className="muted">
                Duplicate it to turn it into a Custom Template you can freely change.
              </span>
            </div>
          )}
          {/* A built-in template is a preview, so every section says so on
              hover rather than only the banner at the top of the page. */}
          <div
            className="canvas-page"
            style={{ ...brandVars(brand), ...bandVars(header, footer, brand) }}
          >
            {/* Figma "Template editor - Heading" / "- Footer": the bands are
                part of the page, above and below the document, and only the
                Design tab puts them into their editing state — elsewhere they
                are simply what the page has at its head and foot. */}
            <PageBandEditor
              kind="header"
              band={header}
              brand={brand}
              mode={bandMode}
              active={activeBand === "header"}
              onActivate={() => activate("header")}
              onChange={(b) => patch({ header: b })}
            />
            {/* The document takes a dragged building block and puts it where
                it was dropped. Furniture blocks are not accepted here — they
                go in a band, and the cursor says so while dragging. */}
            <div
              className={`canvas-doc ${readOnly ? "locked" : ""} ${docDrop ? "drop-over" : ""}`}
              onDragOver={(e) => {
                const label = dragLabel(e.dataTransfer);
                if (readOnly || label === null) return;
                if (label && !DOC_DROPPABLE.has(label) && !isAssetLabel(label)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setDocDrop(true);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDocDrop(false);
              }}
              onDrop={(e) => {
                setDocDrop(false);
                if (readOnly) return;
                /* A brand asset becomes an image of that asset. */
                const assetId = readAssetDrag(e.dataTransfer);
                const asset = assetId ? brand?.assets.find((a) => a.id === assetId) : undefined;
                if (asset) {
                  e.preventDefault();
                  setActiveBand(null);
                  if (insertBlock.current?.({ image: asset.src, name: asset.name }, e.clientY))
                    setDirty(true);
                  return;
                }
                const block = readBlockDrag(e.dataTransfer);
                if (!block?.doc) return;
                e.preventDefault();
                setActiveBand(null);
                if (insertBlock.current?.(block.label, e.clientY)) setDirty(true);
              }}
            >
              {generating ? (
                <SkeletonDoc />
              ) : (
                <BlockNoteCanvas
                  key={template.id}
                  insertRef={insertBlock}
                  title={template.reportTitle ?? "Report title"}
                  blocks={template.blocks}
                  readOnly={readOnly}
                  parameters={template.parameters}
                  onChange={({ title, blocks }) => {
                    /* Taking a parameter's chip out of the template takes the
                       parameter with it, which is how the last one can go. */
                    const kept = template.parameters.filter(
                      (p) => !(usesParam(template.blocks, p.name) && !usesParam(blocks, p.name))
                    );
                    patch({
                      reportTitle: title,
                      blocks,
                      ...(kept.length !== template.parameters.length ? { parameters: kept } : {}),
                    });
                  }}
                />
              )}
            </div>
            <PageBandEditor
              kind="footer"
              band={footer}
              brand={brand}
              mode={bandMode}
              active={activeBand === "footer"}
              onActivate={() => activate("footer")}
              onChange={(b) => patch({ footer: b })}
            />
          </div>
        </div>
      </div>

      {/* ---------------- Audience picker ---------------- */}
      {audPickerOpen && (
        <Popover
          anchorRef={audAnchor}
          onClose={() => setAudPickerOpen(false)}
          className="picker"
          width={331}
        >
          <div className="picker-label">Select an audience</div>
          <div className="picker-list">
            {audiences.map((a) => (
              <button
                key={a}
                className="picker-item"
                style={a === template.audience ? { background: "var(--bg-light)" } : undefined}
                onClick={() => {
                  patch({ audience: a });
                  setAudPickerOpen(false);
                }}
              >
                <Icon name="audience" size={18} />
                {a}
                <span
                  className="pi-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAudPickerOpen(false);
                    setAudienceDialog({ mode: "edit", name: a });
                  }}
                  title="Edit audience"
                >
                  <Icon name="pencil" size={15} />
                </span>
              </button>
            ))}
          </div>
          <div className="picker-foot">
            <button
              className="menu-item accent"
              onClick={() => {
                setAudPickerOpen(false);
                setAudienceDialog({ mode: "add" });
              }}
            >
              <span className="mi-icon">
                <Icon name="plus" size={18} />
              </span>
              Add Audience
            </button>
          </div>
        </Popover>
      )}

      {/* ---------------- Dialogs ---------------- */}
      {paramDialog?.mode === "add" && (
        <ParameterDialog
          mode="add"
          initial={{ name: paramDialog.seedName, topic: paramDialog.topic }}
          onClose={() => setParamDialog(null)}
          onSave={(p) => {
            patch({ parameters: [...template.parameters, p] });
            paramDialog.insert?.(p.name);
            setParamDialog(null);
            toast(`Parameter “${p.name}” added`);
          }}
        />
      )}
      {paramDialog?.mode === "edit" && (
        <ParameterDialog
          mode="edit"
          initial={paramDialog.param}
          onClose={() => setParamDialog(null)}
          onDelete={() => {
            removeParamEverywhere(paramDialog.param.name);
            setParamDialog(null);
            toast("Parameter deleted");
          }}
          onSave={(p) => {
            patch({
              parameters: template.parameters.map((x) => (x.id === p.id ? p : x)),
              blocks: template.blocks.map((b) => ({
                ...b,
                prompts: b.prompts.map((s) =>
                  s.replaceAll(`{{${paramDialog.param.name}}}`, `{{${p.name}}}`)
                ),
              })),
            });
            setParamDialog(null);
          }}
        />
      )}
      {audienceDialog && (
        <AudienceDialog
          mode={audienceDialog.mode}
          name={audienceDialog.name}
          content={
            audienceDialog.name
              ? audienceContent[audienceDialog.name] ?? ""
              : ""
          }
          canRevert={
            !!audienceDialog.name &&
            audienceContent[audienceDialog.name] !== AUDIENCE_CONTENT[audienceDialog.name] &&
            AUDIENCE_CONTENT[audienceDialog.name] !== undefined
          }
          onRevert={() => {
            if (audienceDialog.name)
              setAudienceContent(
                audienceDialog.name,
                AUDIENCE_CONTENT[audienceDialog.name] ?? ""
              );
            setAudienceDialog(null);
            toast("Audience reverted to default");
          }}
          onClose={() => setAudienceDialog(null)}
          onSave={(name, content) => {
            if (audienceDialog.mode === "add") {
              addAudience(name);
              patch({ audience: name });
              toast(`Audience “${name}” added`);
            } else {
              setAudienceContent(name || audienceDialog.name!, content);
              toast("Audience updated");
            }
            if (audienceDialog.mode === "edit" && audienceDialog.name)
              setAudienceContent(audienceDialog.name, content);
            setAudienceDialog(null);
          }}
        />
      )}
      {tradecraftDialog && (
        <AudienceDialog
          mode="add"
          itemLabel="Tradecraft"
          namePlaceholder="e.g. ICD 203"
          contentPlaceholder="The analytic standard or writing rules this tradecraft enforces."
          onClose={() => setTradecraftDialog(false)}
          onSave={(name) => {
            addTradecraft(name);
            patch({ tradecrafts: [...template.tradecrafts, name] });
            setTradecraftDialog(false);
            toast(`Tradecraft “${name}” added`);
          }}
        />
      )}

      {genOpen && (
        <GenerateWithPromptDialog
          onClose={() => setGenOpen(false)}
          onSkip={() => setGenOpen(false)}
          onGenerate={() => {
            setGenOpen(false);
            setGenerating(true);
            window.setTimeout(() => {
              setGenerating(false);
              /* Whatever was typed, the draft that comes back is the
                 Vulnerability Advisory — the one template written out in full
                 here, so the generated result is a real document to work on
                 rather than a plausible-looking stub. */
              const source =
                templates.find((t) => t.name === "Vulnerability Advisory") ??
                templates.find((t) => /vulnerability advisory/i.test(t.name));
              if (!source) return;
              updateTemplate(template.id, {
                name: "Vulnerability Advisory",
                description: source.description,
                icon: source.icon,
                audience: source.audience,
                tradecrafts: [...source.tradecrafts],
                contextDescription: source.contextDescription,
                reportTitle: source.reportTitle,
                blocks: source.blocks.map((b) => ({ ...b, prompts: [...b.prompts] })),
                parameters: source.parameters.map((p) => ({ ...p })),
              });
              setDirty(true);
              toast("Template successfully generated");
            }, 2200);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Parameters tab
 * ------------------------------------------------------------------ */

function ParametersPanel({
  parameters,
  readOnly,
  onEdit,
  onAdd,
}: {
  parameters: Parameter[];
  readOnly: boolean;
  onEdit: (p: Parameter) => void;
  /** `topic` is set when adding from the Topic parameters group. */
  onAdd: (topic?: boolean) => void;
}) {
  const row = (p: Parameter) => (
    <button key={p.id} className="param-row" onClick={() => onEdit(p)}>
      <span className="param-badge">
        <Icon name="braces" size={16} />
        {p.name}
      </span>
      <span className="popt">{p.optional ? "Optional" : "Required"}</span>
      <span className="spacer" />
      <Icon name="target" size={16} style={{ color: "var(--content-light)" }} />
    </button>
  );
  const warn = (text: string) => (
    <div className="param-warn">
      <Icon name="info" size={18} />
      {text}
    </div>
  );
  const topics = parameters.filter((p) => p.topic);
  const general = parameters.filter((p) => !p.topic);

  return (
    <div className="side-section">
      <p className="t-body2 muted" style={{ marginTop: 0 }}>
        Some details change every time you create a report: which vendors, which time range.
        Parameters are how you fill them in.
      </p>
      <p className="t-body2 muted">Type {"{brackets}"} in your template to add one.</p>

      {GROUPED_PARAMS ? (
        /* Option B: the topic sits in a group of its own, so it can't get lost
           among the rest. */
        <>
          <div className="param-group-head">
            <span>Topic parameters</span>
            <Button size="sm" icon="plus" onClick={() => onAdd(true)}>
              Add
            </Button>
          </div>
          {topics.length
            ? topics.map(row)
            : !readOnly && warn("At least one topic parameter is required")}
          <div className="param-group-rule" />
          <div className="param-group-head">
            <span>General parameters</span>
            <Button size="sm" icon="plus" onClick={() => onAdd(false)}>
              Add
            </Button>
          </div>
          {general.length ? (
            general.map(row)
          ) : (
            <div className="param-empty">This template has no general parameters yet</div>
          )}
        </>
      ) : (
        /* Option A: one list, all on the same level. */
        <>
          {parameters.map(row)}
          {parameters.length === 0 && !readOnly && warn("Templates require at least one parameter")}
          <Button icon="plus" onClick={() => onAdd()} style={{ marginTop: 8 }}>
            Add parameter
          </Button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Loading state
 * ------------------------------------------------------------------ */

function SkeletonDoc() {
  return (
    <div>
      <div className="skeleton" style={{ height: 34, width: "60%", marginBottom: 40 }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i}>
          <div className="skeleton" style={{ height: 16, width: "42%", margin: "28px 0 14px" }} />
          <div className="skeleton" style={{ width: "100%" }} />
          <div className="skeleton" style={{ width: "96%" }} />
          <div className="skeleton" style={{ width: "90%" }} />
          <div className="skeleton" style={{ width: "99%" }} />
          <div className="skeleton" style={{ width: "86%" }} />
        </div>
      ))}
    </div>
  );
}
