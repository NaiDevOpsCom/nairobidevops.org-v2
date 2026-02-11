import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const POLICY_PATH = path.join(ROOT_DIR, "security-policy.json");
const VERCEL_CONFIG_PATH = path.join(ROOT_DIR, "vercel.json");
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

async function updateVercelConfig(policy) {
  let vercelConfig = {};
  try {
    const fileContent = await fs.promises.readFile(VERCEL_CONFIG_PATH, "utf8");
    vercelConfig = JSON.parse(fileContent);
  } catch (error) {
    if (error.code === "ENOENT") {
      // Initialize with a default structure only if file doesn't exist
      vercelConfig = { headers: [] };
    } else {
      // Fail fast on parse or other I/O errors to prevent data loss
      console.error(`Error reading or parsing ${VERCEL_CONFIG_PATH}:`, error);
      process.exit(1);
    }
  }

   
  const cspString = generateCSPString(policy.contentSecurityPolicy);

  const headers = [
    {
      key: "Content-Security-Policy",
      value: cspString,
    },
     
    ...Object.entries(policy.headers).map(([key, value]) => ({
      key,
      value,
    })),
  ];

  // Update or add the headers section for source "/(.*)"
  vercelConfig.headers = vercelConfig.headers || [];
  const headerRuleIndex = vercelConfig.headers.findIndex((h) => h.source === "/(.*)");

  const newSecurityHeaders = headers;

  if (headerRuleIndex >= 0) {
    // Merge new headers into existing rule, ensuring we update or add
    const existingRule = vercelConfig.headers[headerRuleIndex];
    const mergedHeaders = [...existingRule.headers];

    newSecurityHeaders.forEach((newHeader) => {
      const existingHeaderIndex = mergedHeaders.findIndex((h) => h.key === newHeader.key);
      if (existingHeaderIndex >= 0) {
        mergedHeaders[existingHeaderIndex] = newHeader;
      } else {
        mergedHeaders.push(newHeader);
      }
    });

    vercelConfig.headers[headerRuleIndex].headers = mergedHeaders;
  } else {
    vercelConfig.headers.push({
      source: "/(.*)",
      headers: newSecurityHeaders,
    });
  }

  // Update or add the rewrites section
  if (policy.proxies && Array.isArray(policy.proxies)) {
    vercelConfig.rewrites = vercelConfig.rewrites || [];
    const toVercelSplat = (p) => p.replace(/\(\.\*\)/g, ":path*");
    const toVercelDest = (d) => d.replace(/\$1/g, ":path*");

    policy.proxies.forEach((proxy) => {
      const existingRewriteIndex = vercelConfig.rewrites.findIndex(
        (r) => r.source === proxy.source
      );
      const newRewrite = {
        source: toVercelSplat(proxy.source),
        destination: toVercelDest(proxy.vercelDestination),
      };
      if (existingRewriteIndex >= 0) {
        vercelConfig.rewrites[existingRewriteIndex] = newRewrite;
      } else {
        // Add before the catch-all if it exists
        const catchAllIndex = vercelConfig.rewrites.findIndex((r) => r.source === "/(.*)");
        if (catchAllIndex >= 0) {
          vercelConfig.rewrites.splice(catchAllIndex, 0, newRewrite);
        } else {
          vercelConfig.rewrites.push(newRewrite);
        }
      }
    });

    // Ensure unique rewrites per source (keep last occurrence for deterministic overriding)
    const bySource = new Map();
    for (const rewrite of vercelConfig.rewrites) {
      bySource.set(rewrite.source, rewrite);
    }
    vercelConfig.rewrites = Array.from(bySource.values());
  }

  const formattedJson = await format(JSON.stringify(vercelConfig, null, 2), {
    parser: "json",
  });
  await fs.promises.writeFile(VERCEL_CONFIG_PATH, formattedJson);
  console.log(`Updated Vercel config at ${VERCEL_CONFIG_PATH}`);
}

const TEMPLATE_PATH = path.join(__dirname, ".htaccess.template");

function generateHtaccess(policy) {
   
  const cspString = generateCSPString(policy.contentSecurityPolicy);

  const headerRules = [
    "<IfModule mod_headers.c>",
    `  Header always set Content-Security-Policy "${cspString.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
     
    ...Object.entries(policy.headers).map(
      ([key, value]) =>
        `  Header always set ${key} "${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    ),
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

  await updateVercelConfig(policy);
  generateHtaccess(policy);

  console.log("Done.");
}

main();
