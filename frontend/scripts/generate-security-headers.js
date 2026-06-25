import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const POLICY_PATH = path.join(ROOT_DIR, "security-policy.json");
const HTACCESS_PATH = path.join(ROOT_DIR, "client", "public", ".htaccess");
const TEMPLATE_PATH = path.join(__dirname, ".htaccess.template");

// ---------------------------------------------------------------------------
// Policy loader
// ---------------------------------------------------------------------------

function loadPolicy() {
  if (!fs.existsSync(POLICY_PATH)) {
    console.error(`Error: Policy file not found at ${POLICY_PATH}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
  } catch (error) {
    console.error(`Error: Failed to parse security policy JSON at ${POLICY_PATH}`);
    console.error(error.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// CSP string builder
// ---------------------------------------------------------------------------

function generateCSPString(cspConfig) {
  const directives = Object.entries(cspConfig)
    .map(([key, value]) => {
      // Boolean directives (e.g. upgrade-insecure-requests, block-all-mixed-content)
      if (typeof value === "boolean") {
        return value ? key : "";
      }

      // Array-valued directives (e.g. "default-src": ["'self'", "https://example.com"])
      if (Array.isArray(value)) {
        return value.length === 0 ? `${key} 'none'` : `${key} ${value.join(" ")}`;
      }

      // String-valued directives (e.g. "default-src": "'self'")
      if (typeof value === "string") {
        return `${key} ${value}`;
      }

      // Any other shape is unexpected and should surface a configuration error
      console.error(
        `Error: Invalid CSP directive value for "${key}" in ${POLICY_PATH}. ` +
          `Expected boolean, string, or array; received: ${JSON.stringify(value)}`
      );
      process.exit(1);
    })
    .filter(Boolean);

  return directives.join("; ");
}

// ---------------------------------------------------------------------------
// Apache header escaping
//
// Apache's mod_headers uses `"` as a value delimiter and `%` as a format-
// string prefix, so both must be escaped before embedding in a Header
// directive.  Backslashes must be doubled first to avoid double-escaping.
// ---------------------------------------------------------------------------

function escapeApacheHeaderValue(str) {
  return str
    .replaceAll("\\", "\\\\") // 1. double backslashes
    .replaceAll('"', '\\"')   // 2. escape double-quotes
    .replaceAll("%", "%%");   // 3. escape mod_headers format specifiers
}

// ---------------------------------------------------------------------------
// .htaccess generator
// ---------------------------------------------------------------------------

function generateHtaccess(policy) {
  const cspString = generateCSPString(policy.contentSecurityPolicy);

  // --- Security header block ---
  const headerRules = [
    "<IfModule mod_headers.c>",
    `  Header always set Content-Security-Policy "${escapeApacheHeaderValue(cspString)}"`,
    ...Object.entries(policy.headers).map(
      ([key, value]) => `  Header always set ${key} "${escapeApacheHeaderValue(value)}"`
    ),
    "</IfModule>",
  ];

  // --- Apache directory options ---
  const apacheConfigRules = [];
  const options = policy.apacheConfig?.options;
  if (options) {
    const hasIndexes = options.includes("-Indexes");

    for (const option of options) {
      if (option === "-Indexes") {
        apacheConfigRules.push(
          "  <IfModule mod_autoindex.c>",
          `    Options ${option}`,
          "  </IfModule>"
        );
      } else if (option === "-MultiViews") {
        apacheConfigRules.push(
          "  <IfModule mod_negotiation.c>",
          `    Options ${hasIndexes ? "-Indexes " : ""}${option}`,
          "  </IfModule>"
        );
      } else {
        apacheConfigRules.push(`  Options ${option}`);
      }
    }
  }

  // --- Proxy rewrite rules ---
  const proxyRules = [];
  if (Array.isArray(policy.proxies)) {
    for (const [index, proxy] of policy.proxies.entries()) {
      // Validate apacheRewrite
      if (typeof proxy.apacheRewrite !== "string" || !proxy.apacheRewrite.trim()) {
        const identifier = proxy.source || `at index ${index}`;
        throw new Error(
          `Invalid or missing "apacheRewrite" for proxy "${identifier}". ` +
            `Expected non-empty string, received: ${JSON.stringify(proxy.apacheRewrite)}`
        );
      }

      // Ensure absolute path for apache rewrite destination
      const destination = proxy.apacheRewrite.startsWith("/")
        ? proxy.apacheRewrite
        : `/${proxy.apacheRewrite}`;

      // Prefer an Apache-specific source pattern; otherwise convert Vercel splat syntax to Apache regex.
      const apacheSource =
        proxy.apacheSource ??
        proxy.source
          .replace(/^\//, "")
          .replace(/:path\*/g, "(.*)")
          .replace(/:(\w+)\*/g, "(.*)");

      proxyRules.push(
        `  # Proxy for ${proxy.source}`,
        `  RewriteRule ^/?${apacheSource}$ ${destination} [QSA,L]`
      );
    }
  }

  // --- Merge into template ---
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Error: Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  let content = fs.readFileSync(TEMPLATE_PATH, "utf8");
  content = content.replaceAll("#{{SECURITY_HEADERS}}#", headerRules.join("\n"));
  content = content.replaceAll("#{{APACHE_CONFIG}}#", apacheConfigRules.join("\n"));
  content = content.replaceAll("#{{PROXY_RULES}}#", proxyRules.join("\n"));

  // Ensure output directory exists
  const dir = path.dirname(HTACCESS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(HTACCESS_PATH, content);
  console.log(`Generated .htaccess at ${HTACCESS_PATH}`);
}

// ---------------------------------------------------------------------------
// Entry point (top-level await — no async wrapper needed)
// ---------------------------------------------------------------------------

console.log("Generating security headers...");
const policy = loadPolicy();
generateHtaccess(policy);
console.log("Done.");
