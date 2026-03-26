import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokelist",
  description: "내 포켓몬 카드 보관 리스트를 정리하는 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
