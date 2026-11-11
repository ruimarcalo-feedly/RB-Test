import { SideMenuController } from "@blocknote/react";
import { offset } from "@floating-ui/react";

/**
 * BlockNote's side menu (the "+" and the drag handle), lined up with the first
 * line of the block it belongs to.
 *
 * BlockNote nudges the menu down by fixed amounts tuned to its own heading
 * sizes. Our documents set their own type sizes and spacing, so those amounts
 * land the menu off the line. Instead, measure the block: the menu's centre
 * goes on the centre of the block's first line of text, whatever its style.
 */
export function AlignedSideMenu() {
  return (
    <SideMenuController
      floatingUIOptions={{
        useFloatingOptions: {
          middleware: [
            offset(({ elements }) => {
              const ref = elements.reference as Element | { contextElement?: Element };
              const block = ref instanceof Element ? ref : ref.contextElement;
              if (!block) return 0;
              const top = block.getBoundingClientRect().top;
              const menuH = elements.floating.getBoundingClientRect().height || 30;
              /* The block's text: BlockNote's inline content, or the template's
                 own prompt box. */
              const line = block.querySelector(".bn-inline-content, .prompt-box") as HTMLElement | null;
              if (!line) {
                /* Images, tables and the like: line up with the block's top. */
                const content = block.querySelector(".bn-block-content");
                return { crossAxis: content ? content.getBoundingClientRect().top - top : 0 };
              }
              const cs = getComputedStyle(line);
              const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 24;
              const padTop = parseFloat(cs.paddingTop) || 0;
              return {
                crossAxis: line.getBoundingClientRect().top + padTop - top + lh / 2 - menuH / 2,
              };
            }),
          ],
        },
      }}
    />
  );
}
