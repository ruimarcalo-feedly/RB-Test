import { useContext } from "react";
import {
  EmbedTab,
  FilePanel,
  FilePanelController,
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
} from "@blocknote/react";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { BrandContext, ImageSource } from "./ImageSource";

/**
 * Version C — BlockNote's "Add image" panel, with the same source as
 * everywhere else an image is added: drag and drop or upload, then the
 * brand's assets.
 */
function UploadOrBrandTab({ blockId }: { blockId: string }) {
  const editor = useBlockNoteEditor();
  const C = useComponentsContext()!;
  const panel = useExtension(FilePanelExtension);
  const brand = useContext(BrandContext);
  const set = (url: string, name: string) => {
    if (!editor.getBlock(blockId)) return;
    editor.updateBlock(blockId, { props: { url, name } } as never);
    panel.closeMenu();
  };
  return (
    <C.FilePanel.TabPanel className="bn-tab-panel brand-file-tab">
      <ImageSource brand={brand} onFile={set} onAsset={(a) => set(a.src, a.name)} />
    </C.FilePanel.TabPanel>
  );
}

function BrandFilePanel({ blockId }: { blockId: string }) {
  return (
    <FilePanel
      blockId={blockId}
      tabs={[
        { name: "Upload", tabPanel: <UploadOrBrandTab blockId={blockId} /> },
        { name: "Embed", tabPanel: <EmbedTab blockId={blockId} /> },
      ]}
    />
  );
}

export function BrandFilePanelController() {
  return <FilePanelController filePanel={BrandFilePanel} />;
}
