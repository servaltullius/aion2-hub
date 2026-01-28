"use client";

import { useState } from "react";

import { OfflineBanner } from "./OfflineBanner";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="appShell">
      <TopBar onMenuClick={() => setSidebarOpen((value) => !value)} />
      <OfflineBanner />
      <div className="appShellBody">
        <aside className={sidebarOpen ? "sidebar sidebarOpen" : "sidebar"}>
          <SidebarNav onNavigate={() => setSidebarOpen(false)} />
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

