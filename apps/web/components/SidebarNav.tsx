"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getModules } from "@aion2/core";

import "../lib/moduleRegistry";
import { loadEnabledModuleIds, subscribeEnabledModuleIds } from "../lib/moduleToggleStore";

type NavItem = {
  title: string;
  href: string;
};

const DASHBOARD_ITEM: NavItem = { title: "Dashboard", href: "/" };
const CHARACTERS_ITEM: NavItem = { title: "Characters", href: "/characters" };
const SETTINGS_ITEM: NavItem = { title: "Settings", href: "/settings" };

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [enabledModuleIds, setEnabledModuleIds] = useState<string[] | null>(() =>
    loadEnabledModuleIds()
  );

  useEffect(() => {
    const update = () => setEnabledModuleIds(loadEnabledModuleIds());
    return subscribeEnabledModuleIds(update);
  }, []);

  const enabledSet = enabledModuleIds === null ? null : new Set(enabledModuleIds);
  const moduleItems: NavItem[] = getModules()
    .filter((module) => (enabledSet ? enabledSet.has(module.id) : true))
    .flatMap((module) => module.nav.map((nav) => ({ title: nav.title, href: nav.href })));

  const navItems: NavItem[] = [DASHBOARD_ITEM, ...moduleItems, CHARACTERS_ITEM, SETTINGS_ITEM];

  return (
    <nav className="sidebarNav">
      <ul>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                className={active ? "navLink navLinkActive" : "navLink"}
                href={item.href}
                onClick={() => onNavigate?.()}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
