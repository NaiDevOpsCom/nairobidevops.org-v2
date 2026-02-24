import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { useEffect, type ComponentType } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Switch, Route, useLocation } from "wouter";

import { routes, type RouteDefinition } from "../../shared/routes";

import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import CodeOfConduct from "@/docs/code_of_conduct";
import PrivacyPolicy from "@/docs/privacy_policy";
import TermsAndConditions from "@/docs/terms_and_conditions";
import AboutUs from "@/pages/AboutUs";
import BlogDetail from "@/pages/BlogDetail";
import BlogPage from "@/pages/BlogPage";
import CommunityPage from "@/pages/CommunityPage";
import DonationPage from "@/pages/DonationPage";
import Eventspage from "@/pages/Eventspage";
import FAQPage from "@/pages/FAQPage";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import PartnershipPage from "@/pages/PartnershipPage";

type RoutePath = RouteDefinition["path"];

const pathToComponent: Record<RoutePath, ComponentType> = {
  "/": Home,
  "/about": AboutUs,
  "/events": Eventspage,
  "/faqpage": FAQPage,
  "/code-of-conduct": CodeOfConduct,
  "/terms": TermsAndConditions,
  "/privacy": PrivacyPolicy,
  "/community": CommunityPage,
  "/partners": PartnershipPage,
  "/blogs": BlogPage,
  "/blogs/:slug": BlogDetail,
  "/donate": DonationPage,
};

if (import.meta.env.DEV) {
  for (const route of routes) {
    if (!pathToComponent[route.path]) {
      console.error(`Missing component mapping for route: ${route.path}`);
    }
  }
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  return (
    <Switch>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          component={pathToComponent[route.path] || NotFound}
        />
      ))}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <Analytics />
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
