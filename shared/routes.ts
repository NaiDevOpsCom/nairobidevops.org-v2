export interface RouteDefinition {
  path: string;
  dynamic?: boolean;
  sitemap: {
    changefreq: "daily" | "weekly" | "monthly" | "yearly";
    priority: number;
  };
}

export const routes: RouteDefinition[] = [
  { path: "/", sitemap: { changefreq: "weekly", priority: 1.0 } },
  { path: "/about", sitemap: { changefreq: "monthly", priority: 0.8 } },
  { path: "/events", sitemap: { changefreq: "weekly", priority: 0.8 } },
  { path: "/faqpage", sitemap: { changefreq: "monthly", priority: 0.6 } },
  { path: "/community", sitemap: { changefreq: "weekly", priority: 0.8 } },
  { path: "/partners", sitemap: { changefreq: "monthly", priority: 0.7 } },
  { path: "/blogs", sitemap: { changefreq: "daily", priority: 0.9 } },
  { path: "/blogs/:slug", dynamic: true, sitemap: { changefreq: "weekly", priority: 0.6 } },
  { path: "/donate", sitemap: { changefreq: "monthly", priority: 0.7 } },
  { path: "/code-of-conduct", sitemap: { changefreq: "yearly", priority: 0.4 } },
  { path: "/terms", sitemap: { changefreq: "yearly", priority: 0.3 } },
  { path: "/privacy", sitemap: { changefreq: "yearly", priority: 0.3 } },
];

export const routePaths = routes.map((r) => r.path);
