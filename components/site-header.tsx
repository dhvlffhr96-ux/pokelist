"use client";

import { useState } from "react";
import { useAppAuth } from "@/components/app-auth-context";
import { useAppSummary } from "@/components/app-summary-context";
import { HeaderAuthDialog } from "@/components/header-auth-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/catalog",
    label: "카드 검색",
  },
  {
    href: "/my-cards",
    label: "내 카드",
  },
  {
    href: "/viewer",
    label: "카드 열람",
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { summary } = useAppSummary();
  const { sessionUserId, isRestoringSession, logout, setSessionUserId } = useAppAuth();
  const [dialogMode, setDialogMode] = useState<"login" | "register" | null>(null);
  const [authUserId, setAuthUserId] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPendingAuth, setIsPendingAuth] = useState(false);
  const viewedUserId =
    sessionUserId && summary.activeUserId && summary.activeUserId !== sessionUserId
      ? summary.activeUserId
      : null;

  function closeDialog() {
    setDialogMode(null);
    setAuthError(null);
    setAuthPassword("");
    setAuthPasswordConfirm("");
  }

  async function handleAuthSubmit() {
    if (!dialogMode) {
      return;
    }

    setAuthError(null);
    setIsPendingAuth(true);

    try {
      const response = await fetch(
        dialogMode === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: authUserId,
            password: authPassword,
            passwordConfirm: authPasswordConfirm,
          }),
        },
      );
      const result = (await response.json()) as {
        data?: { userId: string };
        error?: string;
      };

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "인증 처리에 실패했습니다.");
      }

      setSessionUserId(result.data.userId);
      closeDialog();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "인증 처리에 실패했습니다.");
    } finally {
      setIsPendingAuth(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <>
      <header className="site-header">
        <div className="page-shell site-header-shell">
          <Link className="site-brand" href="/catalog">
            Pokelist
          </Link>

          <div className="site-header-actions">
            <nav className="site-nav" aria-label="주요 메뉴">
              {NAV_ITEMS.map((item) => (
                <Link
                  className={`site-nav-link ${isActive(pathname, item.href) ? "site-nav-link-active" : ""}`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {isRestoringSession ? (
              <div className="header-auth-placeholder" aria-hidden="true" />
            ) : sessionUserId ? (
              <div className="header-summary-wrap">
                <div className="header-summary" aria-label="현재 목록 요약">
                  <div className="header-summary-item">
                    <span>로그인</span>
                    <strong>{sessionUserId}</strong>
                  </div>
                  <div className="header-summary-item">
                    <span>수량</span>
                    <strong>{summary.totalQuantity}</strong>
                  </div>
                  <div className="header-summary-item">
                    <span>종류/세트</span>
                    <strong>
                      {summary.totalCards}/{summary.uniqueSets}
                    </strong>
                  </div>
                  {viewedUserId ? (
                    <div className="header-summary-item">
                      <span>열람</span>
                      <strong>{viewedUserId}</strong>
                    </div>
                  ) : null}
                </div>

                <button className="btn btn-secondary" type="button" onClick={() => void handleLogout()}>
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="header-auth-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setDialogMode("register");
                    setAuthError(null);
                  }}
                >
                  아이디 등록
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setDialogMode("login");
                    setAuthError(null);
                  }}
                >
                  로그인
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {dialogMode ? (
        <HeaderAuthDialog
          mode={dialogMode}
          userId={authUserId}
          password={authPassword}
          passwordConfirm={authPasswordConfirm}
          pending={isPendingAuth}
          error={authError}
          onClose={closeDialog}
          onModeChange={(nextMode) => {
            setDialogMode(nextMode);
            setAuthError(null);
            setAuthPassword("");
            setAuthPasswordConfirm("");
          }}
          onUserIdChange={setAuthUserId}
          onPasswordChange={setAuthPassword}
          onPasswordConfirmChange={setAuthPasswordConfirm}
          onSubmit={() => {
            void handleAuthSubmit();
          }}
        />
      ) : null}
    </>
  );
}
