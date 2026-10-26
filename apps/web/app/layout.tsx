// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth-helpers";
import { SignOutButton } from "@/components/SignOutButton";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Enterprise Research",
  description: "Structured, evidence-traced research on demand.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className={`${newsreader.variable} ${plexSans.variable} font-sans antialiased`}>
        {session && (
         <div className="print:hidden flex justify-end items-center gap-4 px-6 py-4 font-sans text-sm text-muted">
            <span>{session.user.email}</span>
            <SignOutButton />
          </div>
        )}
        {children}
      </body>
    </html>
  );
}