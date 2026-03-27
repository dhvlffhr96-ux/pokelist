"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/catalog",
    label: "카드 검색",
  },
  {
    href: "/my-cards",
    label: "내 카드",
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="page-shell site-header-shell">
        <Link className="site-brand" href="/catalog">
          Pokelist
        </Link>

        <nav className="site-nav" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link
              className={`site-nav-link ${isActive(pathname, item.href) ? "site-nav-link-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
