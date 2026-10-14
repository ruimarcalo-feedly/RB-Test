import { LeftNav } from "./components/layout/LeftNav";
import { ReportBuilderPage } from "./pages/ReportBuilderPage";
import { OrgProfilePage } from "./pages/OrgProfilePage";
import { ArticleFeedPage } from "./pages/ArticleFeedPage";
import { AgentPage } from "./pages/AgentPage";
import { TemplateEditor } from "./components/editor/TemplateEditor";
import { ReportEditor } from "./components/report/ReportEditor";
import { ToastLayer } from "./components/ui/primitives";
import { StoreProvider, useStore } from "./state/store";

function Shell() {
  const { view, overlay, toasts, dismissToast } = useStore();

  return (
    <>
      <div className="app">
        <LeftNav />
        <main className="main-scroll">
          {view === "reportBuilder" && <ReportBuilderPage />}
          {view === "orgProfile" && <OrgProfilePage />}
          {view === "feed" && <ArticleFeedPage />}
          {view === "agent" && <AgentPage />}
        </main>
      </div>

      {overlay.kind === "templateEditor" && (
        <TemplateEditor
          key={overlay.templateId}
          templateId={overlay.templateId}
          isNew={overlay.isNew}
        />
      )}
      {overlay.kind === "reportEditor" && (
        <ReportEditor
          key={`${overlay.templateId}-${overlay.context.path}-${overlay.context.insightId ?? ""}`}
          templateId={overlay.templateId}
          context={overlay.context}
        />
      )}

      <ToastLayer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
