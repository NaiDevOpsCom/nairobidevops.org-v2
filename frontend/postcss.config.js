import autoprefixer from "autoprefixer";

let tailwindPlugin;

try {
  // Tailwind v4+
  tailwindPlugin = (await import("@tailwindcss/postcss")).default;
} catch {
  // Tailwind v3 fallback
  tailwindPlugin = (await import("tailwindcss")).default;
}

export default {
  plugins: [tailwindPlugin, autoprefixer],
};
