"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumbs } from "./breadcrumbs";

export function ThemeShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f4f2] text-[15px] leading-6 text-[#171717] transition-colors duration-200">
      <div className="grid min-h-screen lg:grid-cols-[88px_minmax(0,1fr)]">
        <AppSidebar />
        <div className="min-w-0 px-4 py-5 text-[#171717] sm:px-6 lg:px-8">
          <Breadcrumbs />
          {children}
        </div>
      </div>
    </div>
  );
}
