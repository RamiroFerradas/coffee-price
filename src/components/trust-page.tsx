import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import type { TrustPageContent } from "@/i18n/dictionaries/types";
import type { Locale } from "@/i18n/config";

export function TrustPage({
  locale,
  content,
  children,
}: {
  locale: Locale;
  content: TrustPageContent;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href={`/${locale}`}
            className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-foreground underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            Quiero Cafe
          </Link>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-foreground sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {content.intro}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-10">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-sm leading-relaxed text-muted sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        {children ? (
          <div className="mt-10 border-t border-line pt-8">{children}</div>
        ) : null}
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
