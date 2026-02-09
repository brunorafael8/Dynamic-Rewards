"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = useCallback(() => setCollapsed((c) => !c), []);
  const handleMobileToggle = useCallback(
    () => setMobileOpen((o) => !o),
    []
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleMobileToggle}
        />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          "lg:hidden fixed z-50 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar collapsed={false} onToggle={handleMobileToggle} />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-[margin-left] duration-200",
          collapsed ? "lg:ml-16" : "lg:ml-60"
        )}
      >
        <Header onMobileMenuToggle={handleMobileToggle} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
