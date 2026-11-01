import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "封面生成器",
  description: "封面生成器——自由组合文字、图标与背景，实时预览并导出多种尺寸的封面。",
  icons: {
    icon: "https://tc.lcxj.dpdns.org/docs/image-833f4dc7-3344-4b84-b6fa-f6a66ec88d4f.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
