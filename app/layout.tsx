import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Girl",
  description: "Virtual companion MVP foundation"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
