import type { Metadata } from "next";
import { AppAuthProvider } from "@/components/app-auth-context";
import { AppSummaryProvider } from "@/components/app-summary-context";
import { SiteHeader } from "@/components/site-header";
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
      <body>
        <AppAuthProvider>
          <AppSummaryProvider>
            <SiteHeader />
            {children}
          </AppSummaryProvider>
        </AppAuthProvider>
      </body>
    </html>
  );
}
