"use client";

type HeaderAuthDialogProps = {
  mode: "login" | "register";
  userId: string;
  password: string;
  passwordConfirm: string;
  pending: boolean;
  error?: string | null;
  onClose: () => void;
  onModeChange: (mode: "login" | "register") => void;
  onUserIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onSubmit: () => void;
};

export function HeaderAuthDialog({
  mode,
  userId,
  password,
  passwordConfirm,
  pending,
  error,
  onClose,
  onModeChange,
  onUserIdChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
}: HeaderAuthDialogProps) {
  return (
    <div
      className="form-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="header-auth-dialog-title"
      onClick={onClose}
    >
      <div className="form-dialog-panel header-auth-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="form-dialog-header">
          <div>
            <span className="form-dialog-eyebrow">사용자 인증</span>
            <h2 id="header-auth-dialog-title">
              {mode === "register" ? "아이디 등록" : "로그인"}
            </h2>
            <p>
              {mode === "register"
                ? "사용할 아이디와 비밀번호를 등록합니다."
                : "등록한 아이디와 비밀번호로 로그인합니다."}
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="mode-switch" role="tablist" aria-label="인증 방식">
          <button
            className={`mode-switch-button ${mode === "login" ? "mode-switch-button-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => onModeChange("login")}
            disabled={pending}
          >
            로그인
          </button>
          <button
            className={`mode-switch-button ${mode === "register" ? "mode-switch-button-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => onModeChange("register")}
            disabled={pending}
          >
            아이디 등록
          </button>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="field">
            <label htmlFor="headerAuthUserId">사용자 ID</label>
            <input
              id="headerAuthUserId"
              value={userId}
              onChange={(event) => onUserIdChange(event.target.value)}
              placeholder="예: abcd1234"
              disabled={pending}
            />
          </div>

          <div className="field">
            <label htmlFor="headerAuthPassword">비밀번호</label>
            <input
              id="headerAuthPassword"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="8자 이상 비밀번호"
              disabled={pending}
            />
          </div>

          {mode === "register" ? (
            <div className="field">
              <label htmlFor="headerAuthPasswordConfirm">비밀번호 확인</label>
              <input
                id="headerAuthPasswordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(event) => onPasswordConfirmChange(event.target.value)}
                placeholder="비밀번호를 다시 입력해 주세요"
                disabled={pending}
              />
            </div>
          ) : null}

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "처리 중..." : mode === "register" ? "아이디 등록" : "로그인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
