import { useState } from "react";
import { Icon, type IconName } from "../ui/Icon";
import { useStore, type View } from "../../state/store";

interface NavEntry {
  label: string;
  icon: IconName;
  view?: View;
  beta?: boolean;
}

const CREATE: NavEntry[] = [
  { label: "Create Intel Agent", icon: "plus" },
  { label: "Create AI Feed", icon: "ai" },
  { label: "Follow Sources", icon: "rss" },
  { label: "Research", icon: "research" },
];

const MAIN: NavEntry[] = [
  { label: "Report Builder", icon: "wand", view: "reportBuilder", beta: true },
  { label: "Today", icon: "today" },
  { label: "Threat Landscape", icon: "landscape" },
  { label: "Automated Newsletters", icon: "newsletter" },
  { label: "Org Profile", icon: "shield", view: "orgProfile" },
  { label: "Integrations & API", icon: "api" },
];

const AGENT_GROUPS: { label: string; children?: string[] }[] = [
  {
    label: "Vulnerabilities",
    children: ["Last 30 days", "Trending High + CVEs", "Exploited via Network"],
  },

  { label: "Cyberattacks" },
  { label: "TTPs" },
  { label: "Credential Leaks" },
  { label: "Brand Mentions" },
];

export function LeftNav() {
  const { view, setView } = useStore();
  const [openGroup, setOpenGroup] = useState<string | null>("Vulnerabilities");
  const [newsOpen, setNewsOpen] = useState(true);

  return (
    <nav className="leftnav">
      <div className="leftnav-org">
        <span className="leftnav-logo">
          <Icon name="logo" size={22} />
        </span>
        <span className="leftnav-orgname">ACME North America</span>
        <Icon name="chevron-down" size={16} style={{ color: "var(--content-medium)" }} />
        <span className="spacer" />
        <Icon name="collapse" size={18} style={{ color: "var(--content-light)" }} />
      </div>

      <div className="leftnav-section" style={{ paddingTop: 4 }}>
        {CREATE.map((e) => (
          <button key={e.label} className="nav-item">
            <span className="nav-icon">
              <Icon name={e.icon} size={18} />
            </span>
            {e.label}
          </button>
        ))}
      </div>

      <div className="leftnav-section" style={{ paddingTop: 14 }}>
        {MAIN.map((e) => (
          <button
            key={e.label}
            className={`nav-item ${e.view && view === e.view ? "active" : ""}`}
            onClick={() => e.view && setView(e.view)}
          >
            <span className="nav-icon">
              <Icon name={e.icon} size={18} />
            </span>
            {e.label}
            {e.beta && <span className="nav-beta">Beta</span>}
          </button>
        ))}
      </div>

      <div className="leftnav-section">
        <div className="leftnav-heading">
          <span>Intel Agents</span>
          <Icon name="plus" size={16} />
        </div>
        {AGENT_GROUPS.map((g) => (
          <div key={g.label}>
            <button
              className="nav-item"
              onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
            >
              <span className="nav-icon">
                <Icon
                  name={openGroup === g.label && g.children ? "chevron-down" : "chevron-right"}
                  size={16}
                />
              </span>
              {g.label}
            </button>
            {openGroup === g.label &&
              g.children?.map((c) => (
                <button
                  key={c}
                  className={`nav-item child ${
                    view === "agent" && c === "Trending High + CVEs" ? "active" : ""
                  }`}
                  onClick={() => c === "Trending High + CVEs" && setView("agent")}
                >
                  <span className="nav-icon">
                    <Icon name="bug" size={16} />
                  </span>
                  {c}
                </button>
              ))}
          </div>
        ))}
      </div>

      <div className="leftnav-section">
        <div className="leftnav-heading">
          <span>Team Feeds</span>
          <Icon name="plus" size={16} />
        </div>
        <button className="nav-item" onClick={() => setNewsOpen((o) => !o)}>
          <span className="nav-icon">
            <Icon name={newsOpen ? "chevron-down" : "chevron-right"} size={16} />
          </span>
          News
          <span className="nav-count">1</span>
        </button>
        {newsOpen && (
          <button
            className={`nav-item child ${view === "feed" ? "active" : ""}`}
            onClick={() => setView("feed")}
          >
            <span className="nav-icon">
              <Icon name="feed" size={16} />
            </span>
            <span className="truncate">Massachusetts Data Breach Filings</span>
          </button>
        )}
        <button className="nav-item">
          <span className="nav-icon">
            <Icon name="chevron-right" size={16} />
          </span>
          Advisories
          <span className="nav-count">22</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon">
            <Icon name="chevron-right" size={16} />
          </span>
          Threat Intelligence
          <span className="nav-count">22</span>
        </button>
      </div>

      <div className="leftnav-section">
        <div className="leftnav-heading">
          <span>Team Boards</span>
        </div>
        <button className="nav-item">
          <span className="nav-icon">
            <Icon name="bookmark" size={16} />
          </span>
          Action Required
        </button>
        <button className="nav-item">
          <span className="nav-icon">
            <Icon name="bookmark" size={16} />
          </span>
          Read Later
        </button>
      </div>
    </nav>
  );
}
