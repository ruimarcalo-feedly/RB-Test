/**
 * The written report, as a document rather than a list of paragraphs.
 *
 * The report editor renders this through BlockNote, so the shapes here are the
 * ones a report actually uses — headings, prose, bulleted and numbered steps,
 * and the comparison tables that carry most of a vulnerability advisory's
 * detail. Citation markers stay inline in the text, the way an analyst writes
 * them.
 */

export type DocNode =
  | { k: "h2"; text: string }
  | { k: "h3"; text: string }
  | { k: "p"; text: string }
  | { k: "ul"; items: string[] }
  | { k: "ol"; items: string[] }
  | { k: "table"; head: string[]; rows: string[][]; widths?: number[] };

/* ------------------------------------------------------------------ *
 * Vulnerability Advisory — the worked example the Figma frames show
 * ------------------------------------------------------------------ */

export const VULN_ADVISORY_DOC: DocNode[] = [
  { k: "h2", text: "Executive Summary" },
  {
    k: "p",
    text: 'CVE-2026-63030 and CVE-2026-60137 are two WordPress Core vulnerabilities that chain together into an unauthenticated remote code execution (RCE) path, tracked publicly as "wp2shell." An unauthenticated attacker targeting a default WordPress installation on versions 6.9.0–6.9.4 or 7.0.0–7.0.1 can create an administrator account and execute arbitrary code without any plugin, theme, or credential requirement. [3][8]',
  },
  {
    k: "p",
    text: "Cardinal Trust Financial operates a public-facing WordPress site that falls within the affected version range and is directly exposed. Patch to WordPress 6.9.5 or 7.0.2 immediately and audit for post-exploitation artifacts before restoring trust in the environment. [3][10]",
  },

  { k: "h2", text: "CVE Analysis" },
  {
    k: "table",
    widths: [150, 300, 300],
    head: ["Field", "CVE-2026-63030", "CVE-2026-60137"],
    rows: [
      ["Identifier", "CVE-2026-63030", "CVE-2026-60137"],
      [
        "Vulnerability Type",
        "REST API batch route-confusion → RCE",
        "SQL Injection (WP_Query author__not_in)",
      ],
      ["CVSS v3.1 Score", "7.5 (rated critical in practice) [7]", "Not separately scored in sources"],
      [
        "Affected Products",
        "WordPress 6.9.0–6.9.4; WordPress 7.0.0–7.0.1 [3][10]",
        "WordPress 6.8.0–6.8.5; 6.9.0–6.9.4; 7.0.0–7.0.1 [3][10]",
      ],
      [
        "Fixed Versions",
        "WordPress 6.9.5, 7.0.2 [3][10]",
        "WordPress 6.8.6, 6.9.5, 7.0.2 [3][10]",
      ],
      ["Authentication Required", "None [3][8]", "None (when chained via CVE-2026-63030) [8]"],
      [
        "Exploitation Status",
        "Actively exploited in the wild [1][3]",
        "Actively exploited in the wild [1][3]",
      ],
      [
        "Exploit Maturity",
        "Weaponized — multiple public PoCs on GitHub; purpose-built frameworks observed [2][3][10]",
        "Weaponized — SQLi component present in public PoC chains [10]",
      ],
      [
        "Zero-Day Window",
        "Exploitation began within hours of July 17, 2026 patch release [3]",
        "Exploitation began within hours of July 17, 2026 patch release [3]",
      ],
      ["Patch Availability", "Available — July 17, 2026 [3][10]", "Available — July 17, 2026 [3][10]"],
      [
        "Forced Auto-Update",
        "Enabled by WordPress.org for affected versions [3][10]",
        "Enabled by WordPress.org for affected versions [3][10]",
      ],
    ],
  },
  { k: "h3", text: "Patch Urgency Tier: CRITICAL" },
  {
    k: "p",
    text: "Both CVEs are actively exploited, require no authentication, affect a default installation, and have weaponized public exploits available. WordPress 6.8.x is not vulnerable to the full RCE chain but remains exposed to the SQL injection component and must still be patched. [3]",
  },

  { k: "h2", text: "Technical Details" },
  { k: "h3", text: "Attack Vector and Exploitation Mechanism" },
  {
    k: "p",
    text: "The attack chain begins at the WordPress REST API batch endpoint (/wp-json/batch/v1 or /?rest_route=/batch/v1), which accepts multiple sub-requests in a single HTTP call. [8]",
  },
  {
    k: "ul",
    items: [
      "CVE-2026-63030 — REST API route confusion. The batch handler (WP_REST_Server::serve_batch_request_v1()) maintains parallel arrays for parsed requests, route-handler matches, and validation results. When a member request fails to parse and returns a WP_Error, the code appends to the validation array but does not append a placeholder to the matches array. The resulting index misalignment makes every subsequent valid request execute against the handler tuple belonging to the next request in the list, bypassing the permission and schema checks for its intended handler. [8]",
      "CVE-2026-60137 — SQL injection via author__not_in. Route confusion delivers an unvalidated request to the posts REST handler, which maps author_exclude to the WP_Query variable author__not_in. Because schema validation is bypassed, the value arrives as an attacker-controlled scalar string. WP_Query only sanitizes this value when it is already an array, so a raw string is interpolated directly into the SQL WHERE clause. [8]",
    ],
  },
  { k: "h3", text: "Escalation to RCE" },
  {
    k: "p",
    text: "SQL injection alone does not yield code execution. The chain proceeds through several additional steps: [8]",
  },
  {
    k: "ol",
    items: [
      "The SQL injection controls which rows WP_Query returns and caches as WP_Post objects. Attacker-chosen field values (status, type, parent) are stored in the request-local object cache.",
      "The oEmbed cache write path reads from get_post(), which now returns poisoned objects, and writes those attacker-controlled fields back to the database as a legitimate post save.",
      "The poisoned post fields create a forbidden parent loop. WordPress's loop-repair routine re-saves the posts in a nested fashion, keeping a temporary administrator identity active across the nested save.",
      "A Customizer changeset save briefly switches the current user to an attacker-chosen administrator. A second poisoned post triggers the REST loader during this window by setting its status and type to join into the string parse_request, a hook WordPress's REST loader listens for.",
      "The nested REST request — originally rejected with 401 Unauthorized — re-executes as the administrator and returns 201 Created, registering an attacker-controlled administrator account.",
      "The attacker logs in with the new administrator account and uploads a malicious plugin to execute arbitrary PHP code.",
    ],
  },
  { k: "h3", text: "MITRE ATT&CK References" },
  {
    k: "table",
    widths: [120, 300, 330],
    head: ["Technique ID", "Technique Name", "Observed Behavior"],
    rows: [
      ["T1190", "Exploit Public-Facing Application", "Unauthenticated batch API exploitation [1][3]"],
      [
        "T1505.003",
        "Server Software Component: Web Shell",
        "PHP webshell deployment via malicious plugin upload [1]",
      ],
      ["T1136", "Create Account", "Attacker-created WordPress administrator accounts [1][2]"],
      ["T1083", "File and Directory Discovery", "LFI attempts targeting wp-config.php [1]"],
      [
        "T1003",
        "OS Credential Dumping",
        "Harvesting database credentials and auth keys via LFI [1]",
      ],
    ],
  },
  { k: "h3", text: "Interim Mitigations" },
  {
    k: "p",
    text: "Patching is the only complete fix. For environments that cannot patch immediately: [10]",
  },
  {
    k: "ul",
    items: [
      "Block anonymous access to /wp-json/batch/v1 and /?rest_route=/batch/v1 at the WAF layer.",
      "Install a plugin that disables anonymous REST API access entirely.",
    ],
  },
  {
    k: "p",
    text: "Wordfence Premium, Care, and Response customers received a firewall rule on July 17, 2026. Wordfence Free customers are scheduled to receive the same rule on August 16, 2026. [3]",
  },

  { k: "h2", text: "Impact Assessment" },
  {
    k: "p",
    text: "Cardinal Trust Financial's public WordPress site is an internet-facing asset running the usual plugin and theme ecosystem, with a wp-admin panel and CRM/form integrations. It falls within the affected version range and is directly reachable from the public internet. Successful exploitation grants an attacker administrator-level access to the WordPress site and arbitrary code execution at web server process privileges.",
  },
  {
    k: "p",
    text: "Wiz Research observed the following post-exploitation activity against cloud-hosted WordPress instances within hours of public disclosure: [1]",
  },
  {
    k: "ul",
    items: [
      "Malicious plugin uploads (/wp-admin/update.php?action=upload-plugin) to install persistent backdoors.",
      "User enumeration via the REST API endpoint /wp-json/wp/v2/users?context=edit, harvesting admin usernames and email addresses.",
      "Local file inclusion (LFI) attempts via admin-ajax.php?template=../../../wp-config, targeting database credentials and authentication keys.",
      "Successful authenticated sessions to /wp-admin/ (HTTP 200 responses confirmed).",
    ],
  },
  {
    k: "p",
    text: "The site's CRM and lead-capture form integrations mean that database credentials or API keys stored in wp-config.php are accessible to an attacker achieving LFI or RCE. WordPress is not directly connected to Cardinal Trust's core banking platform or payment rails per the tech stack profile, but an attacker with persistent access to the WordPress server can use it as a staging point for further reconnaissance against adjacent AWS infrastructure. [1][2]",
  },
  {
    k: "p",
    text: "Wiz Research had not confirmed lateral movement or data exfiltration as of July 21, 2026; monitoring is ongoing. [1]",
  },

  { k: "h2", text: "Recommendations" },
  {
    k: "table",
    widths: [80, 420, 140, 140],
    head: ["Priority", "Action", "Timeframe", "Owner"],
    rows: [
      [
        "P1",
        "Patch WordPress to 6.9.5 or 7.0.2 (or 6.8.6 on the 6.8.x branch); confirm auto-update completed successfully [3][10]",
        "Immediate",
        "Web/Platform Team",
      ],
      [
        "P1",
        "Block /wp-json/batch/v1 and /?rest_route=/batch/v1 at the Palo Alto NGFW or WAF if patching is delayed [1][10]",
        "Immediate (if patch delayed)",
        "Network Security",
      ],
      [
        "P1",
        "Audit all WordPress administrator accounts; remove any accounts not recognized [3][4]",
        "Immediate",
        "Web/Platform Team",
      ],
      [
        "P1",
        "Search wp-content/cache/, wp-content/uploads/, and plugin directories for unexpected .php files [1][4]",
        "Immediate",
        "Web/Platform Team",
      ],
      [
        "P1",
        "Run wp core verify-checksums to confirm WordPress Core file integrity [2][4]",
        "Immediate",
        "Web/Platform Team",
      ],
      [
        "P2",
        "Review web server access logs for POST requests to /wp-json/batch/v1 or /?rest_route=/batch/v1 returning HTTP 200 or 207 — a confirmed high-fidelity exploitation indicator [1][3]",
        "Within 24 hours",
        "SOC / Web Team",
      ],
      [
        "P2",
        "Search access logs for user-agent strings wp2shell and rezwp2shell — confirmed signatures of purpose-built exploitation frameworks [1]",
        "Within 24 hours",
        "SOC",
      ],
      [
        "P2",
        "Scan logs for UNION SELECT strings in REST API request parameters [4][5]",
        "Within 24 hours",
        "SOC",
      ],
      [
        "P2",
        "Check the public validator at wp2shell.com to confirm patch status [3]",
        "Within 24 hours",
        "Web/Platform Team",
      ],
      [
        "P2",
        "Review wp-config.php for exposure; rotate database credentials and authentication keys if LFI activity is found in logs [1][4]",
        "Within 24 hours",
        "Web/Platform Team",
      ],
      [
        "P2",
        "Query the WordPress database: SELECT user_login, user_registered FROM wp_users ORDER BY user_registered DESC to identify recently created accounts [4]",
        "Within 24 hours",
        "Web/Platform Team",
      ],
      [
        "P3",
        "If Wordfence Free is in use, note that firewall rule delivery is scheduled for August 16, 2026; consider upgrading to Wordfence Premium for immediate protection [3]",
        "Within 72 hours",
        "Web/Platform Team",
      ],
      [
        "P3",
        "Verify CrowdStrike Falcon coverage on the WordPress host; review for process anomalies consistent with PHP shell execution (e.g. php spawning sh, bash, or curl) [2]",
        "Within 72 hours",
        "SOC",
      ],
      [
        "P3",
        "If compromise is confirmed, treat the full server as compromised; restore from a trusted pre-compromise backup after forensic preservation [2][4]",
        "Contingent on findings",
        "IR / Web Team",
      ],
    ],
  },
  { k: "h3", text: "Verification Steps — Confirming Remediation" },
  {
    k: "ol",
    items: [
      "Run wp core version and confirm the output is 6.8.6, 6.9.5, or 7.0.2. [3]",
      "Cross-check against the public checker at wp2shell.com. [3]",
      "Confirm the WAF rule is active by sending a test POST to /wp-json/batch/v1 and verifying the request is blocked.",
      "Review Wordfence firewall logs for blocked requests to the batch endpoint as a secondary signal. [3]",
      "Re-run wp core verify-checksums after patching to confirm no Core files were modified during any exploitation window. [2]",
    ],
  },

  { k: "h2", text: "Indicators of Compromise (IOCs)" },
  {
    k: "table",
    widths: [330, 90, 250],
    head: ["Indicator", "Type", "Description"],
    rows: [
      ["2a1410d8e2a8337ac2171cedea8c0fdc47c647a0", "SHA1", "PHP webshell"],
      ["58eca847e9eae9e6b08cc211f1559817b71bc4cc", "SHA1", "PHP webshell"],
      ["ebea44890f434d5d67ede22009a3f4bb5cac33f8", "SHA1", "PHP webshell"],
      ["d9a220c8039f1c4d72cae7ccb8b3a33dec8815be", "SHA1", "PHP webshell"],
      ["e9756e2338f84746007235e4cab7a70d5b3ca47f", "SHA1", "PHP webshell"],
      ["45.79.167[.]238", "IP", "Exploitation source"],
      ["34.81.132[.]62", "IP", "Exploitation source"],
      ["79.177.131[.]206", "IP", "Exploitation source"],
      ["15.157.135[.]170", "IP", "Exploitation source"],
      ["94.100.52[.]128", "IP", "Exploitation source"],
      ["172.235.128[.]52", "IP", "Mass scanning source"],
    ],
  },
  {
    k: "p",
    text: "Analytic note: IP addresses and file hashes represent the lowest tiers on the Pyramid of Pain and are trivial for attackers to rotate. Prioritize behavioral detections — batch API POST with HTTP 200/207, unexpected PHP processes, new admin account creation — over IOC-matching alone.",
  },

  { k: "h2", text: "References" },
  {
    k: "ul",
    items: [
      '[1] Cybernoz (July 21, 2026). "Exploitation in the Wild of wp2shell." https://cybernoz.com/exploitation-in-the-wild-of-wp2shell/',
      '[2] UNDERCODE NEWS (July 20, 2026). "WP2Shell Ignites a Global WordPress Crisis, Millions of Websites Face Immediate Remote Takeover Risk." https://undercodenews.com/',
      '[3] Wordfence (July 20, 2026). "wp2shell Aftermath: The First Critical Unauthenticated WordPress Core RCE in Nearly a Decade." https://feedly.com/i/entry/',
      '[4] UNDERCODE NEWS (July 20, 2026). "WordPress Under Siege: Critical CVE-2026-63030 Exploited in Active Attacks, Immediate Action Required." https://undercodenews.com/',
      '[5] SANS Internet Storm Center (July 20, 2026). "WordPress Exploitation Underway (CVE-2026-63030)." https://isc.sans.edu/diary/33168',
      '[7] CyberNetSec.io. "Critical Unauthenticated RCE Flaw Found in WordPress Core." https://cyber.netsecops.io/articles/',
      '[8] Picus Security. "CVE-2026-63030 and CVE-2026-60137 (wp2shell): WordPress RCE Explained." https://www.picussecurity.com/resource/blog/',
      '[9] UNDERCODE NEWS (July 20, 2026). "Critical WordPress Core Vulnerability Chain Exposes Millions of Websites to Potential Remote Code Execution Attacks." https://undercodenews.com/',
      '[10] Qualys ThreatPROTECT (July 20, 2026). "WordPress wp2shell Vulnerabilities Exploited in the Wild (CVE-2026-63030 & CVE-2026-60137)." https://threatprotect.qualys.com/2026/07/20/',
    ],
  },
];

/**
 * Every other template falls back to its prose body, wrapped in the same node
 * shape so the canvas only has to know one thing.
 */
export function proseDoc(
  sections: { heading: string; paragraphs: string[] }[],
  topic: string
): DocNode[] {
  return sections.flatMap((s) => [
    { k: "h2", text: s.heading } as DocNode,
    ...s.paragraphs.map((t) => ({ k: "p", text: t.replace(/\{t\}/g, topic) }) as DocNode),
  ]);
}
