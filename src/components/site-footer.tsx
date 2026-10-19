import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function SiteFooter({ locale }: { locale: Locale }) {
  const { footer } = getDictionary(locale);

  const links = [
    { href: `/${locale}/about`, label: footer.links.about },
    { href: `/${locale}/contact`, label: footer.links.contact },
    { href: `/${locale}/privacy`, label: footer.links.privacy },
    { href: `/${locale}/terms`, label: footer.links.terms },
  ];

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
            Quiero Cafe
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {footer.description}
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {footer.disclaimer}
          </p>
        </div>
        <nav>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
