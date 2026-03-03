import { Menu, X, Sun, Moon, Handshake } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import { NDC_LOGO_URL } from "@/lib/constants";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [currentLocation, setCurrentLocation] = useState(location);

  useEffect(() => {
    setCurrentLocation(location);
  }, [location]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/events", label: "Events" },
    // { href: "/blogs", label: "Blog" },
    { href: "/community", label: "Community" },
  ];

  const handleNavClick = (href: string) => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const openExternal = (raw: string) => {
      try {
        const u = new URL(raw);
        if (u.protocol !== "https:" && u.protocol !== "http:") return;
        window.open(u.toString(), "_blank", "noopener,noreferrer");
      } catch {
        return;
      }
    };

    const isExternal = href.startsWith("http");
    if (isExternal) {
      openExternal(href);
    } else if (href.startsWith("/")) {
      setLocation(href);
    } else if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });

        if (window.location.hash !== href) {
          window.history.replaceState(null, "", href);
        }
        setCurrentLocation(window.location.pathname + href);
      }
    } else if (/^(mailto|tel):/i.test(href)) {
      // handle mailto:, tel: specifically to avoid dangerous schemes like javascript:
      window.location.assign(href);
    }
    // fallthrough handled by default browser behavior if needed,
    // but here we just no-op to prevent querySelector crashes.

    setIsOpen(false);
  };

  // update active link when navigation occurs (hash change / history)
  useEffect(() => {
    const handleChange = () => setCurrentLocation(window.location.pathname + window.location.hash);
    window.addEventListener("popstate", handleChange);
    window.addEventListener("hashchange", handleChange);
    return () => {
      window.removeEventListener("popstate", handleChange);
      window.removeEventListener("hashchange", handleChange);
    };
  }, []);

  const isActive = (href: string) => {
    if (href.startsWith("/")) {
      // normalize trailing slash
      const a = currentLocation.split("#")[0].replace(/\/$/, "") || "/";
      const b = href.replace(/\/$/, "") || "/";
      return a === b;
    }
    if (href.startsWith("#")) {
      return currentLocation.includes(href);
    }
    if (href.startsWith("http")) {
      return currentLocation.startsWith(href);
    }
    return false;
  };

  return (
    <header className="bg-[#F5F5F580] border-b text-black border-border sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <img
                  src={NDC_LOGO_URL}
                  alt="Nairobi DevOps"
                  className="w-36 object-contain cursor-pointer"
                />
              </Link>
            </div>
          </div>

          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`${isActive(link.href) ? "text-primary" : "text-black"} hover:text-primary focus:text-primary transition-colors`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <Button
              className="hidden md:inline-flex bg-primary text-white hover:bg-[#023047] transition-colors duration-200"
              onClick={() => {
                setLocation("/partners");
                setCurrentLocation("/partners");
              }}
            >
              <Handshake className="mr-2 h-5 w-5" />
              Partner With Us
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>Mobile navigation menu</SheetDescription>
                </SheetHeader>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold">Menu</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="flex flex-col space-y-4">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => handleNavClick(link.href)}
                      className={`${isActive(link.href) ? "text-primary" : "text-black"} text-left hover:text-primary focus:text-primary transition-colors py-2`}
                    >
                      {link.label}
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
