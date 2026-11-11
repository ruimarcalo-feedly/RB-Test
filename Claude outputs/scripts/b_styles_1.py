import os, re, sys
ROOT = sys.argv[1]
B = os.path.join(ROOT, "source-b/src")
def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s):
    open(p + ".tmp", "w", encoding="utf-8").write(s); os.replace(p + ".tmp", p)
# component
src = rd(os.path.join(ROOT, "Claude outputs/scripts/DesignStyleBar_1.tsx"))
wr(os.path.join(B, "components/editor/DesignStyleBar.tsx"), src)
p = os.path.join(B, "components/editor/TemplateEditor.tsx")
s = rd(p)
if "DesignStyleBar" not in s:
    s = s.replace('import { Button, Field, Modal, Popover, TagInput, MenuItem, layerStack } from "../ui/primitives";',
                  'import { Button, Field, Modal, Popover, TagInput, MenuItem, layerStack } from "../ui/primitives";\nimport { DesignStyleBar } from "./DesignStyleBar";', 1)
    old = """                onEditBrand={(p) => template.brandId && updateBrand(template.brandId, p)}
              />
            )}
          </div>
        </aside>"""
    assert s.count(old) == 1, "anchor"
    s = s.replace(old, """                onEditBrand={(p) => template.brandId && updateBrand(template.brandId, p)}
              />
            )}
          </div>
          {/* Version A (Nov 4): a sticky foot to pick or save a design style. */}
          {tab === "design" && !readOnly && (
            <DesignStyleBar
              look={{ brandId: template.brandId, header, footer }}
              onApply={(st) => {
                patch({ brandId: st.brandId, header: st.header, footer: st.footer });
                toast(`\\u201c${st.name}\\u201d applied`);
              }}
              toast={toast}
            />
          )}
        </aside>""")
    wr(p, s)
c = os.path.join(B, "styles/global.css")
t = rd(c)
if "/* Version A: design style foot (Nov 4) */" not in t:
    t = t.rstrip("\n") + """

/* Version A: design style foot (Nov 4) */
.side-foot.ds-foot {
  align-items: center;
  justify-content: space-between;
}
.ds-pick {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ds-pick > :first-child {
  flex: 1;
  min-width: 0;
}
.ds-edited {
  flex: none;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  color: var(--content-medium, #757575);
}
.ds-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ds-modes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ds-mode {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-light, #e6e6e6);
  border-radius: 6px;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
}
.ds-mode.on {
  border-color: var(--bg-accent, #2bb24c);
}
.ds-mode input {
  margin-top: 3px;
  accent-color: var(--bg-accent, #2bb24c);
}
.ds-mode-help {
  display: block;
  font-size: 12px;
  line-height: 16px;
  color: var(--content-medium, #757575);
}
"""
    wr(c, t)
print("ok")
