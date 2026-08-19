import type { Metadata } from "next";
import { Onest, Source_Serif_4, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const onest = Onest({
  variable: "--font-onest",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blossom — Write together, in real time",
  description:
    "A collaborative writing desk. Create, share and edit documents together with live cursors and comments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${onest.variable} ${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}