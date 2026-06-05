import type { Metadata } from "next";
import "./globals.css";
import { BottomTabBar } from "@/components/BottomTabBar";

export const metadata: Metadata = {
  title: "Kramkiste",
  description: "Eine kleine Kramkiste voller Seiten, mit Liebe für dich gemacht.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
  themeColor: "#fdf8ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
