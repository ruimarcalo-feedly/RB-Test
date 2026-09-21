import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AUDIENCES,
  AUDIENCE_CONTENT,
  BLANK_BLOCKS,
  ORG_ITEMS,
  REPORTS,
  TEMPLATES,
  TRADECRAFTS,
  type OrgItem,
  type Report,
  type Template,
} from "../data/mockData";
import type { CreateContext } from "../components/report/script";
import { ACME_BRAND, EMPTY_BAND, FEEDLY_BRAND, type Brand } from "../data/brand";

/* ------------------------------------------------------------------ */

export type View = "reportBuilder" | "feed" | "orgProfile" | "agent";

export type Overlay =
  | { kind: "none" }
  | { kind: "templateEditor"; templateId: string; isNew: boolean }
  | {
      kind: "reportEditor";
      templateId: string;
      /**
       * Where the report was started from and what that entry point carried.
       * This is what makes the four create-report paths differ.
       */
      context: CreateContext;
    };

export interface ToastMsg {
  id: number;
  text: string;
  tone?: "default";
}

interface Settings {
  languages: string[];
  defaultCompany: string;
}

interface Store {
  view: View;
  setView: (v: View) => void;

  overlay: Overlay;
  openTemplateEditor: (templateId: string, isNew?: boolean) => void;
  openReportEditor: (templateId: string, context: CreateContext) => void;
  /** Reopen a report that already exists, from the "View previous reports" table. */
  openReport: (reportId: string) => void;
  closeOverlay: () => void;

  templates: Template[];
  updateTemplate: (id: string, patch: Partial<Template>) => void;
  duplicateTemplate: (id: string) => Template;
  deleteTemplate: (id: string) => void;
  createTemplate: () => Template;

  reports: Report[];
  addReport: (r: Report) => void;

  orgItems: OrgItem[];
  addOrgItem: (item: OrgItem) => void;
  updateOrgItem: (id: string, patch: Partial<OrgItem>) => void;

  /**
   * Brands live in the Org Profile, so a template and the reports it produces
   * reference one rather than each carrying its own copy of the styling.
   */
  brands: Brand[];
  addBrand: (b: Brand) => void;
  updateBrand: (id: string, patch: Partial<Brand>) => void;

  audiences: string[];
  addAudience: (name: string) => void;
  audienceContent: Record<string, string>;
  setAudienceContent: (name: string, content: string) => void;

  tradecrafts: string[];
  addTradecraft: (name: string) => void;

  /** Article-selection state used by the "Selected Articles" entry path. */
  selectedArticles: string[];
  toggleArticle: (id: string) => void;
  clearArticles: () => void;

  settings: Settings;
  setSettings: (s: Settings) => void;

  toasts: ToastMsg[];
  toast: (text: string) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<Store | null>(null);

let uid = 1000;
export const nextId = (prefix = "id") => `${prefix}-${++uid}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("reportBuilder");
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const [reports, setReports] = useState<Report[]>(REPORTS);
  const [orgItems, setOrgItems] = useState<OrgItem[]>(ORG_ITEMS);
  const [brands, setBrands] = useState<Brand[]>([FEEDLY_BRAND, ACME_BRAND]);
  const [audiences, setAudiences] = useState<string[]>(AUDIENCES);
  const [audienceContent, setAudienceContentMap] =
    useState<Record<string, string>>(AUDIENCE_CONTENT);
  const [tradecrafts, setTradecrafts] = useState<string[]>(TRADECRAFTS);
  /* The feed opens with nothing selected — a report created from there covers
     the whole feed until the user picks specific articles. */
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  /* A default company is set, so the create-report flow never asks which one
     to use — the Figma rule is that the step only appears when there is no
     default. Clear it in Report Builder settings to see that question again. */
  const [settings, setSettings] = useState<Settings>({
    languages: ["English (US)"],
    defaultCompany: "Acme North America",
  });
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastSeq = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo<Store>(
    () => ({
      view,
      setView,
      overlay,
      openTemplateEditor: (templateId, isNew = false) =>
        setOverlay({ kind: "templateEditor", templateId, isNew }),
      openReportEditor: (templateId, context) =>
        setOverlay({ kind: "reportEditor", templateId, context }),
      openReport: (reportId) => {
        const r = reports.find((x) => x.id === reportId);
        if (!r) return;
        const template =
          templates.find((t) => t.name === r.templateName && t.audience === r.templateAudience) ??
          templates.find((t) => t.name === r.templateName) ??
          templates[0];
        setOverlay({
          kind: "reportEditor",
          templateId: template.id,
          context: { ...(r.origin ?? { path: "none" }), savedReportId: r.id },
        });
      },
      closeOverlay: () => setOverlay({ kind: "none" }),

      templates,
      updateTemplate: (id, patch) =>
        setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t))),
      duplicateTemplate: (id) => {
        const src = templates.find((t) => t.id === id)!;
        const existing = templates.filter((t) =>
          t.name.startsWith(`${src.name} (Copy`)
        ).length;
        const copy: Template = {
          ...src,
          id: nextId("t"),
          name: `${src.name} (Copy ${existing + 1})`,
          kind: "custom",
          lastUsed: -1,
          builtinNote: undefined,
          parameters: src.parameters.map((p) => ({ ...p })),
          blocks: src.blocks.map((b) => ({ ...b, prompts: [...b.prompts] })),
        };
        setTemplates((ts) => {
          const i = ts.findIndex((t) => t.id === id);
          return [...ts.slice(0, i + 1), copy, ...ts.slice(i + 1)];
        });
        return copy;
      },
      deleteTemplate: (id) => setTemplates((ts) => ts.filter((t) => t.id !== id)),
      createTemplate: () => {
        const t: Template = {
          id: nextId("t"),
          name: "New template",
          description: "",
          icon: "wand",
          kind: "custom",
          audience: "",
          lastUsed: -1,
          tradecrafts: [],
          contextDescription: "",
          parameters: [],
          blocks: BLANK_BLOCKS.map((b) => ({ ...b, prompts: [...b.prompts] })),
          /* A new template is a custom one, so it starts on the organisation's
             brand like every other custom template — with empty bands. */
          brandId: FEEDLY_BRAND.id,
          header: EMPTY_BAND,
          footer: EMPTY_BAND,
        };
        setTemplates((ts) => [t, ...ts]);
        return t;
      },

      reports,
      addReport: (r) => setReports((rs) => [r, ...rs]),

      orgItems,
      addOrgItem: (item) => setOrgItems((is) => [item, ...is]),
      updateOrgItem: (id, patch) =>
        setOrgItems((is) => is.map((i) => (i.id === id ? { ...i, ...patch } : i))),

      brands,
      addBrand: (b) => setBrands((bs) => [...bs, b]),
      updateBrand: (id, patch) =>
        setBrands((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b))),

      audiences,
      addAudience: (name) =>
        setAudiences((a) => (a.includes(name) ? a : [...a, name].sort())),
      audienceContent,
      setAudienceContent: (name, content) =>
        setAudienceContentMap((m) => ({ ...m, [name]: content })),

      tradecrafts,
      addTradecraft: (name) =>
        setTradecrafts((t) => (t.includes(name) ? t : [...t, name])),

      selectedArticles,
      toggleArticle: (id) =>
        setSelectedArticles((s) =>
          s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
        ),
      clearArticles: () => setSelectedArticles([]),

      settings,
      setSettings,

      toasts,
      toast,
      dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    }),
    [
      view,
      overlay,
      templates,
      reports,
      orgItems,
      brands,
      audiences,
      audienceContent,
      tradecrafts,
      selectedArticles,
      settings,
      toasts,
      toast,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
