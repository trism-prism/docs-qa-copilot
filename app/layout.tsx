import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import Link from "next/link";
import Nav from "./nav.tsx";
import "./globals.css";

const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });

const description =
  "Retrieval-augmented answers over policy PDFs, with page citations and an eval page that scores retrieval and answers.";
const image = { url: "/og-image.png", width: 1200, height: 630, alt: "Docs Q&A Copilot: the Ask your documents form with an API key field and a question box, for page-cited answers over policy documents" };

export const metadata: Metadata = {
  metadataBase: new URL("https://docs-qa-copilot.vercel.app"),
  title: "Docs Q&A Copilot",
  description,
  openGraph: { title: "Docs Q&A Copilot", description, type: "website", siteName: "Docs Q&A Copilot", images: [image] },
  twitter: { card: "summary_large_image", title: "Docs Q&A Copilot", description, images: [image] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="wrap bar">
            <Link className="brand" href="/">
              Docs Q&amp;A Copilot
            </Link>
            <Nav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
