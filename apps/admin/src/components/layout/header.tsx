"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Menu } from "lucide-react";
import { useSyncExternalStore } from "react";

const BREADCRUMB_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/rules": "Reward Rules",
  "/employees": "Profiles",
  "/processing": "Processing",
};

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const segments = pathname.split("/").filter(Boolean);
  const pageTitle =
    BREADCRUMB_MAP[pathname] ??
    BREADCRUMB_MAP[`/${segments[0]}`] ??
    "Dashboard";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Admin</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">{pageTitle}</span>
          {segments.length > 1 && (
            <>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-muted-foreground font-mono text-xs">
                {segments[segments.length - 1].slice(0, 8)}...
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
