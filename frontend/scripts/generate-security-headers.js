import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const POLICY_PATH = path.join(ROOT_DIR, "security-policy.json");
const HTACCESS_PATH = path.join(ROOT_DIR, "client", "public", ".htaccess");

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

function generateCSPString(cspConfig) {
  const directives = Object.entries(cspConfig)
    .map(([key, value]) => {
      // Boolean directives (e.g. upgrade-insecure-requests, block-all-mixed-content)
      if (typeof value === "boolean") {
        return value ? key : "";
      }

      // Array-valued directives (e.g. "default-src": ["'self'", "https://example.com"])
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return `${key} 'none'`;
        }
        return `${key} ${value.join(" ")}`;
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



const TEMPLATE_PATH = path.join(__dirname, ".htaccess.template");

function generateHtaccess(policy) {

  const cspString = generateCSPString(policy.contentSecurityPolicy);

  const headerRules = [
    "<IfModule mod_headers.c>",
    `  Header always set Content-Security-Policy "${cspString
      .replaceAll(/\\/g, "\\\\")
      .replaceAll(/"/g, '\\"')
      .replaceAll(/%/g, "%%")}"`,

    ...Object.entries(policy.headers).map(([key, value]) => {
      const escapedValue = value.replaceAll(/\\/g, "\\\\").replaceAll(/"/g, '\\"').replaceAll(/%/g, "%%");
      return `  Header always set ${key} "${escapedValue}"`;
    }),
    "</IfModule>",
  ];

  const apacheConfigRules = [];
  if (policy.apacheConfig && policy.apacheConfig.options) {
    const options = policy.apacheConfig.options;
    const hasIndexes = options.includes("-Indexes");

    options.forEach((option) => {
      if (option === "-Indexes") {
        apacheConfigRules.push("  <IfModule mod_autoindex.c>");
        apacheConfigRules.push(`    Options ${option}`);
        apacheConfigRules.push("  </IfModule>");
      } else if (option === "-MultiViews") {
        apacheConfigRules.push("  <IfModule mod_negotiation.c>");
        apacheConfigRules.push(`    Options ${hasIndexes ? "-Indexes " : ""}${option}`);
        apacheConfigRules.push("  </IfModule>");
      } else {
        apacheConfigRules.push(`  Options ${option}`);
      }
    });
  }

  const proxyRules = [];
  if (policy.proxies && Array.isArray(policy.proxies)) {
    policy.proxies.forEach((proxy, index) => {
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

      proxyRules.push(`  # Proxy for ${proxy.source}`);
      proxyRules.push(`  RewriteRule ^/?${apacheSource}$ ${destination} [QSA,L]`);
    });
  }

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Error: Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  let content = fs.readFileSync(TEMPLATE_PATH, "utf8");
  content = content.replace("#{{SECURITY_HEADERS}}#", headerRules.join("\n"));
  content = content.replace("#{{APACHE_CONFIG}}#", apacheConfigRules.join("\n"));
  content = content.replace("#{{PROXY_RULES}}#", proxyRules.join("\n"));

  // Ensure directory exists
  const dir = path.dirname(HTACCESS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(HTACCESS_PATH, content);
  console.log(`Generated .htaccess at ${HTACCESS_PATH}`);
}

async function main() {
  console.log("Generating security headers...");
  const policy = loadPolicy();

  generateHtaccess(policy);

  console.log("Done.");
}

main();
