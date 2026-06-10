import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenGEO",
  description:
    "Open-source GEO evaluation: measure how AI systems discover, describe, compare, and recommend brands.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-semibold tracking-normal text-ink">
              OpenGEO
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/" className="hover:text-ink">
                Audit
              </Link>
              <Link href="/businesses" className="hover:text-ink">
                Reports
              </Link>
              <a
                href="https://github.com/niuguy/OpenGEO"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
