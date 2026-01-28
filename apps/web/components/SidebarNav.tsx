import Link from "next/link";
import { usePathname } from "next/navigation";

import { getModules } from "@aion2/core";

import "../lib/moduleRegistry";

type NavItem = {
  title: string;
  href: string;
};

const DASHBOARD_ITEM: NavItem = { title: "Dashboard", href: "/" };
const CHARACTERS_ITEM: NavItem = { title: "Characters", href: "/characters" };
const SETTINGS_ITEM: NavItem = { title: "Settings", href: "/settings" };

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const moduleItems: NavItem[] = getModules().flatMap((module) =>
    module.nav.map((nav) => ({ title: nav.title, href: nav.href }))
  );

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
