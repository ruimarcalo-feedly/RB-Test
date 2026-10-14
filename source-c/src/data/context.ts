/**
 * Where a report came from.
 *
 * Figma: "Source Collection Logic" — the create-report flow changes with the
 * entry point and, more importantly, with the context that entry point carries.
 * A saved report keeps its origin, so reopening it from the reports table can
 * replay the same conversation.
 */

export type CreatePath = "articles" | "selection" | "none" | "broad" | "insight";

export interface CreateContext {
  path: CreatePath;
  /** Selected articles (articles path). */
  articleIds?: string[];
  /** The agent / board / folder / AI feed the user came from (broad path). */
  contextLabel?: string;
  contextKind?: "agent" | "board" | "folder" | "feed";
  /** CVE rows picked in an Intel Agent's table (selection path). */
  cveIds?: string[];
  /**
   * The template was picked without an audience (the Select Template list, or
   * a Report Builder card under "All Audiences"), so the flow asks for one
   * before anything else.
   */
  askAudience?: boolean;
  /** The insight card's entity (insight path). */
  insightId?: string;
  /**
   * Set when the editor is opening a report that already exists — the flow is
   * not re-run, its finished transcript is rebuilt instead.
   */
  savedReportId?: string;
}
