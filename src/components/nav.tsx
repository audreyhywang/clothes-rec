import Link from "next/link";

const links = [
  { href: "/measurements", label: "身材資料" },
  { href: "/recommend", label: "穿搭建議" },
  { href: "/wardrobe", label: "我的衣櫃" },
  { href: "/news", label: "時尚資訊" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tracking-tight">穿搭顧問</span>
          <span className="text-xs text-muted-foreground">Style Advisor</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
