import { useSyncExternalStore } from "react";
import { DEFAULT_BRAND } from "./brand";
import { themeFromBrand, type ReportTheme } from "./theme";

/* Version F (Nov 5): themes are their own thing, apart from the brand. The
   org starts with one, "Main report", in the Feedly brand. */
let list: ReportTheme[] = [themeFromBrand(DEFAULT_BRAND, "theme-main", "Main report")];
const subs = new Set<() => void>();

export function setThemesF(next: ReportTheme[]) {
  list = next;
  subs.forEach((f) => f());
}
export const upsertThemeF = (t: ReportTheme) =>
  setThemesF(list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t]);
export const removeThemeF = (id: string) => setThemesF(list.filter((x) => x.id !== id));

export function useThemesF(): ReportTheme[] {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => list
  );
}
