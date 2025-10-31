"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/history", label: "Historico" },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [isMounted, setIsMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 32);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex justify-center px-4 transition-all duration-250 sm:px-6",
        isScrolled ? "pt-4 pb-2" : "pt-6 pb-3"
      )}
    >
      <div
        className={cn(
          "border border-slate-900/5 flex w-full max-w-5xl items-center justify-between gap-4 rounded-[28px] bg-slate-900/5 px-4 py-3 text-white/90 backdrop-blur-2xl transition-all duration-250 sm:gap-6 sm:px-6",
          isMounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
          isScrolled &&
            "border-white/20 bg-slate-900/5 shadow-[0_14px_32px_rgba(15,23,42,0.55)] backdrop-blur-[28px]"
        )}
      >
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Ir para dashboard"
          className="flex shrink-0 items-center gap-3 rounded-full bg-white/10 px-3 py-2 text-left transition-all duration-250 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-transform duration-250">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 16.5L8.5 12l3 3 4.5-4.5 4 4" />
              <path d="M4 7h16" className="opacity-60" />
              <path d="M4 21h6" className="opacity-60" />
            </svg>
          </span>
          <div className="flex flex-col leading-tight text-white transition-opacity duration-250">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-white/60">
              bot2
            </span>
            <span className="text-xl font-semibold">TRADES</span>
          </div>
        </button>

        <nav aria-label="Navegacao principal" className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item, index) => {
            const active = isActivePath(pathname, item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                aria-pressed={active}
                style={{
                  transitionDelay: isMounted ? `${index * 80 + 120}ms` : "0ms",
                }}
                className={cn(
                  "border rounded-full px-4 py-2 text-sm font-medium text-white/70 transition-all duration-50 ease-out focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white/60",
                  isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
                  active ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.25)]" : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-200"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
