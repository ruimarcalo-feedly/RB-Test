import { useMemo, useRef, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Popover } from "../components/ui/primitives";
import { AudienceDialog } from "../components/editor/AudienceDialog";
import { NewBrandDialog } from "../components/org/NewBrandDialog";
import { BrandPeek } from "../components/org/BrandPeek";
import { useStore, nextId } from "../state/store";
import { blankBrand, extractedBrand } from "../data/brand";
import { AUDIENCE_CONTENT, ORG_ITEM_TYPES, type OrgItem, type OrgItemType } from "../data/mockData";

/**
 * Figma: Org Profile — Editing / Creating new / Tooltips.
 */
export function OrgProfilePage() {
  const {
    orgItems,
    addOrgItem,
    updateOrgItem,
    audienceContent,
    setAudienceContent,
    addAudience,
    brands,
    addBrand,
    updateBrand,
    toast,
  } = useStore();
  const addRef = useRef<HTMLButtonElement>(null);
  const [addMenu, setAddMenu] = useState(false);
  const [dialog, setDialog] = useState<
    null | { mode: "add"; type: OrgItemType } | { mode: "edit"; item: OrgItem }
  >(null);
  /* A brand does not fit the name+content dialog the other item types share —
     it is a set of styles, so it gets its own dialog and its own side peek. */
  const [newBrand, setNewBrand] = useState(false);
  const [brandPeek, setBrandPeek] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: keyof OrgItem | null; dir: 1 | -1 }>({
    key: null,
    dir: 1,
  });

  const items = useMemo(() => {
    if (!sort.key) return orgItems;
    return [...orgItems].sort((a, b) => {
      const av = String(a[sort.key!] ?? "");
      const bv = String(b[sort.key!] ?? "");
      return av.localeCompare(bv) * sort.dir;
    });
  }, [orgItems, sort]);

  const sortBtn = (label: string, key: keyof OrgItem) => (
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
    <div className="page">
      <div className="page-head" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="t-h1" style={{ margin: 0 }}>
            Org Profile
          </h1>
          <p className="t-body2 muted" style={{ margin: "8px 0 0", maxWidth: 560 }}>
            Capture your organization details so you can reference them in Ask AI, AI Feeds, and Intel
            Agents so results are grounded in context.
          </p>
        </div>
        <button ref={addRef} className="btn primary" onClick={() => setAddMenu((o) => !o)}>
          <Icon name="plus" size={16} />
          Add Item
        </button>
      </div>

      <div className="org-note">
        <Icon name="info" size={15} />
        Your team is using {orgItems.length} of 100 items.
      </div>

      {addMenu && (
        <Popover anchorRef={addRef} onClose={() => setAddMenu(false)} align="end" width={168}>
          {ORG_ITEM_TYPES.map((t) => (
            <button
              key={t.type}
              className="menu-item"
              onClick={() => {
                setAddMenu(false);
                if (t.type === "Brand") setNewBrand(true);
                else setDialog({ mode: "add", type: t.type });
              }}
            >
              <span className="mi-icon">
                <Icon name={t.icon} size={18} />
              </span>
              {t.type}
            </button>
          ))}
        </Popover>
      )}

      <table className="rtable">
        <thead>
          <tr>
            <th style={{ width: "36%" }}>{sortBtn("Name", "name")}</th>
            <th style={{ width: "12%" }}>Type</th>
            <th style={{ width: "26%" }}>{sortBtn("Referenced in", "type")}</th>
            <th style={{ width: "14%" }}>{sortBtn("Created by", "createdBy")}</th>
            <th style={{ width: "12%" }}>Created on</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>
                <div className="item-name">
                  <Icon
                    name={it.icon}
                    size={18}
                    style={{ color: "var(--content-medium)", marginTop: 1 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <button
                      /* A brand opens its own panel rather than navigating,
                         so it reads as a name, not as a link. */
                      className={`nm ${it.type === "Audience" ? "linkish" : ""}`}
                      style={{ border: 0, background: "transparent", padding: 0, font: "inherit" }}
                      onClick={() => {
                        if (it.type === "Audience") setDialog({ mode: "edit", item: it });
                        if (it.type === "Brand") {
                          const b = brands.find((x) => x.name === it.name);
                          if (b) setBrandPeek(b.id);
                        }
                      }}
                    >
                      {it.name}
                    </button>
                    {it.values && <div className="vals">{it.values}</div>}
                  </div>
                </div>
              </td>
              <td>
                <span className="badge">{it.type}</span>
              </td>
              <td>
                {it.referencedIn.length === 0 ? (
                  <span className="muted">-</span>
                ) : (
                  <>
                    {it.referencedIn.map((r) => (
                      <div className="reflink" key={r}>
                        <Icon name="wand" size={14} style={{ color: "var(--content-medium)" }} />
                        <span className="linkish truncate">{r}</span>
                      </div>
                    ))}
                    {it.extraRefs ? (
                      <div className="reflink linkish" style={{ marginTop: 2 }}>
                        +{it.extraRefs} more
                      </div>
                    ) : null}
                  </>
                )}
              </td>
              <td>{it.createdBy}</td>
              <td>{it.createdOn}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {dialog?.mode === "add" && (
        <AudienceDialog
          mode="add"
          itemLabel={dialog.type}
          namePlaceholder={dialog.type === "Audience" ? "e.g. CISO" : `e.g. ${dialog.type}`}
          onClose={() => setDialog(null)}
          onSave={(name, content) => {
            const meta = ORG_ITEM_TYPES.find((t) => t.type === dialog.type)!;
            addOrgItem({
              id: nextId("o"),
              name,
              type: dialog.type,
              icon: meta.icon,
              content,
              referencedIn: [],
              createdBy: "Rui Marçalo",
              createdOn: "Sep 1, 2026",
            });
            if (dialog.type === "Audience") {
              addAudience(name);
              setAudienceContent(name, content);
            }
            setDialog(null);
            toast(`${dialog.type} “${name}” added`);
          }}
        />
      )}

      {newBrand && (
        <NewBrandDialog
          onClose={() => setNewBrand(false)}
          onCreate={(name, extracted) => {
            const id = nextId("brand");
            /* A PDF gives us the styles; without one the brand starts on the
               app's defaults and is filled in by hand in the peek. */
            addBrand(extracted ? extractedBrand(name, id) : blankBrand(name, id));
            addOrgItem({
              id: nextId("o"),
              name,
              type: "Brand",
              icon: "brand",
              referencedIn: [],
              createdBy: "Rui Marçalo",
              createdOn: "Sep 21, 2026",
            });
            setNewBrand(false);
            setBrandPeek(id);
            toast(
              extracted ? `Styles extracted into “${name}”` : `Brand “${name}” added`
            );
          }}
        />
      )}

      {brandPeek && brands.find((b) => b.id === brandPeek) && (
        <BrandPeek
          brand={brands.find((b) => b.id === brandPeek)!}
          onClose={() => setBrandPeek(null)}
          onSave={(b) => {
            updateBrand(b.id, b);
            setBrandPeek(null);
            toast("Brand styles were successfully saved");
          }}
        />
      )}

      {dialog?.mode === "edit" && (
        <AudienceDialog
          mode="edit"
          itemLabel={dialog.item.type}
          name={dialog.item.name}
          content={audienceContent[dialog.item.name] ?? dialog.item.content ?? ""}
          canRevert={
            AUDIENCE_CONTENT[dialog.item.name] !== undefined &&
            (audienceContent[dialog.item.name] ?? "") !== AUDIENCE_CONTENT[dialog.item.name]
          }
          onRevert={() => {
            setAudienceContent(dialog.item.name, AUDIENCE_CONTENT[dialog.item.name] ?? "");
            setDialog(null);
            toast("Reverted to default");
          }}
          onClose={() => setDialog(null)}
          onSave={(_n, content) => {
            setAudienceContent(dialog.item.name, content);
            updateOrgItem(dialog.item.id, { content });
            setDialog(null);
            toast(`${dialog.item.name} updated`);
          }}
        />
      )}
    </div>
  );
}
