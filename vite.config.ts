import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Vite plugin that generates sitemap.xml after the build completes.
 * Only runs when isHardened is true (typically production/staging modes).
 */
function sitemapPlugin(enabled: boolean): Plugin {
  return {
    name: "generate-sitemap",
    apply: "build",
    async closeBundle() {
      if (!enabled) return;
      try {
        const { generateSitemap } = await import("./scripts/generate-sitemap");
        await generateSitemap();
      } catch (err) {
        console.error("⚠  Sitemap generation failed:", err);
        // Non-fatal: build succeeds even if sitemap generation fails.
        // The validate-sitemap script will catch this in CI.
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const branch =
    process.env.GITHUB_BASE_REF ||
    process.env.GITHUB_REF_NAME ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    "";

  const isHardenedBranch = ["production", "staging", "main", "pre-dev", "pre-staging"].includes(
    branch
  );
  const isHardenedMode = ["production", "staging"].includes(mode);
  const hasBranchInfo = !!branch;
  const isHardened = isHardenedMode && (!hasBranchInfo || isHardenedBranch);

  return {
    plugins: [tailwindcss(), react(), sitemapPlugin(isHardened)],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      copyPublicDir: true,
      emptyOutDir: true,
      sourcemap: !isHardened,
      // Use terser for hardened builds (better at removing console)
      minify: isHardened ? "terser" : "esbuild",
      // Terser options for aggressive console/debugger removal
      terserOptions: isHardened
        ? {
            compress: {
              drop_console: false,
              drop_debugger: true,
              pure_funcs: [
                "console.log",
                "console.info",
                "console.debug",
                "console.warn",
                "console.group",
                "console.groupEnd",
              ],
            },
          }
        : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
        external: [],
      },
    },
    // Keep esbuild.drop as double protection: it runs during the transpilation phase
    // to remove console/debugger before any minification. This ensures stripping
    // even if minify: "terser" (used for hardening) is active.
    esbuild: {
      drop: isHardened ? ["console", "debugger"] : [],
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api/luma": {
          target: "https://api.luma.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/luma/, ""),
          secure: true,
        },
      },
    },
  };
});
