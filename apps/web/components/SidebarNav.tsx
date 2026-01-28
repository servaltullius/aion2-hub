import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  title: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/" },
  { title: "Characters", href: "/characters" },
  { title: "Settings", href: "/settings" }
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="sidebarNav">
      <ul>
        {NAV_ITEMS.map((item) => {
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
