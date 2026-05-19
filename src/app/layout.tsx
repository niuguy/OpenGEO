import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Search Visibility Engine",
  description: "Track how your business appears in AI search results.",
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
              AI Search Visibility Engine
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/audit-machine" className="hover:text-ink">
                Audit Tool
              </Link>
              <Link href="/businesses" className="hover:text-ink">
                My Reports
              </Link>
              <Link href="/#inquiry" className="hover:text-ink">
                New Analysis
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
