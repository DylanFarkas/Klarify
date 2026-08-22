"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MouseEvent,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWorkspace } from "@/lib/api-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_LINKS = [
  { label: "Producto", href: "/#producto", sectionId: "producto" },
  { label: "Precios", href: "/#pricing", sectionId: "pricing" },
  { label: "Impacto", href: "/#impacto", sectionId: "impacto" },
  { label: "FAQ", href: "/#faq", sectionId: "faq" },
  { label: "Manual", href: "/manual", sectionId: null },
] as const;

const SECTION_IDS = NAV_LINKS.map((link) => link.sectionId).filter(
  (id): id is NonNullable<typeof id> => id !== null,
);

export function Navbar() {
  const [visible, setVisible] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const handleLogin = () => {
    setMobileOpen(false);
    router.push("/login");
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await signOut();
    router.push("/");
  };

  const goToMyAgent = async () => {
    setMobileOpen(false);
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const { preferences } = await fetchWorkspace(user);
      router.push(`/agentes/${preferences.lastAgent || "1"}`);
    } catch {
      router.push("/agentes/1");
    }
  };

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const navOffset = 72;
    const top = el.getBoundingClientRect().top + window.scrollY - navOffset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string | null,
  ) => {
    setMobileOpen(false);

    if (!sectionId) return;

    if (isHome) {
      event.preventDefault();
      scrollToSection(sectionId);
      window.history.replaceState(null, "", `/#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setVisible(false);
        setMobileOpen(false);
      } else {
        setVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isHome) {
      setActiveSection(null);
      return;
    }

    const observers: IntersectionObserver[] = [];
    const visibility = new Map<string, number>();

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibility.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);

          let bestId: string | null = null;
          let bestRatio = 0;
          for (const [sectionId, ratio] of visibility) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = sectionId;
            }
          }
          setActiveSection(bestRatio > 0.08 ? bestId : null);
        },
        {
          rootMargin: "-20% 0px -55% 0px",
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        },
      );

      observer.observe(el);
      observers.push(observer);
    });

    const hash = window.location.hash.slice(1);
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload = navigation?.type === "reload";

    // En reload, ignorar el hash y quedarse en el hero.
    if (isReload) {
      if (hash) {
        window.history.replaceState(null, "", pathname);
      }
      window.scrollTo(0, 0);
    } else if (hash && SECTION_IDS.includes(hash as (typeof SECTION_IDS)[number])) {
      requestAnimationFrame(() => scrollToSection(hash));
      setActiveSection(hash);
    }

    return () => observers.forEach((observer) => observer.disconnect());
  }, [isHome, pathname, scrollToSection]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isLinkActive = (link: (typeof NAV_LINKS)[number]) => {
    if (link.sectionId) {
      return isHome && activeSection === link.sectionId;
    }
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  const linkClassName = (active: boolean) =>
    active
      ? "border-b-2 border-[#005bbf] pb-1 text-sm font-bold text-[#005bbf]"
      : "border-b-2 border-transparent pb-1 text-sm font-medium text-white/50 transition-colors hover:text-white";

  return (
    <nav
      className={`sticky top-0 left-0 right-0 z-50 bg-[#000000]/80 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-500 items-center justify-between px-5 md:px-16">
        <Link
          className="text-xl font-extrabold tracking-tight text-white"
          href="/"
          onClick={() => setMobileOpen(false)}
        >
          Klarify
        </Link>

        <div className="ml-10 mr-auto hidden items-center gap-8 lg:ml-50 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              className={linkClassName(isLinkActive(link))}
              href={link.href}
              onClick={(event) => handleNavClick(event, link.sectionId)}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {!loading &&
            (user ? (
              <>
                <button
                  onClick={goToMyAgent}
                  className="hidden text-sm font-bold text-[#4d8fff] hover:underline sm:inline"
                >
                  Volver al workspace
                </button>
                <button
                  onClick={handleLogout}
                  className="hidden rounded-full border border-white/25 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 cursor-pointer sm:inline"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[#0A0A0A] transition-transform hover:scale-[0.98] cursor-pointer"
              >
                Iniciar sesión
              </button>
            ))}

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 lg:hidden cursor-pointer"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">{mobileOpen ? "Cerrar menú" : "Abrir menú"}</span>
            <span aria-hidden="true" className="flex w-4 flex-col gap-1.5">
              <span
                className={`block h-0.5 w-full bg-current transition-transform ${
                  mobileOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-current transition-opacity ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-current transition-transform ${
                  mobileOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="border-t border-white/10 bg-[#000000]/95 px-5 py-4 backdrop-blur-xl lg:hidden md:px-16"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  isLinkActive(link)
                    ? "bg-[#005bbf]/20 font-bold text-[#4d8fff]"
                    : "font-medium text-white/50 hover:bg-white/5 hover:text-white"
                }`}
                href={link.href}
                onClick={(event) => handleNavClick(event, link.sectionId)}
              >
                {link.label}
              </a>
            ))}
          </div>

          {!loading && user && (
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:hidden">
              <button
                onClick={goToMyAgent}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-bold text-[#4d8fff] cursor-pointer"
              >
                Volver al workspace
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-bold text-white cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
