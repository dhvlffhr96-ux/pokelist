"use client";

export type UserAccessMode = "load" | "login" | "register";

type UserAccessPanelProps = {
  mode: UserAccessMode;
  userIdInput: string;
  passwordInput: string;
  passwordConfirmInput: string;
  pending: boolean;
  error?: string | null;
  activeUserId: string | null;
  sessionUserId: string | null;
  canManageActiveCollection: boolean;
  onModeChange: (mode: UserAccessMode) => void;
  onUserIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onSubmit: () => void;
  onLogout: () => void;
};

const MODE_LABELS: Record<UserAccessMode, string> = {
  load: "불러오기",
  login: "로그인",
  register: "아이디 등록",
};

function getModeDescription(mode: UserAccessMode) {
  if (mode === "register") {
    return "새 아이디를 만들고 비밀번호를 등록합니다. 등록되면 바로 로그인 상태가 됩니다.";
  }

  if (mode === "login") {
    return "등록한 아이디와 비밀번호로 로그인하면 내 카드 추가, 수정, 삭제가 가능합니다.";
  }

  return "아이디만 입력해서 다른 사람 목록도 열람할 수 있습니다. 로그인한 본인 목록일 때만 수정할 수 있습니다.";
}

function getSubmitLabel(mode: UserAccessMode, pending: boolean) {
  if (mode === "register") {
    return pending ? "등록 중..." : "아이디 등록";
  }

  if (mode === "login") {
    return pending ? "로그인 중..." : "로그인";
  }

  return pending ? "불러오는 중..." : "목록 불러오기";
}

export function UserAccessPanel({
  mode,
  userIdInput,
  passwordInput,
  passwordConfirmInput,
  pending,
  error,
  activeUserId,
  sessionUserId,
  canManageActiveCollection,
  onModeChange,
  onUserIdChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
  onLogout,
}: UserAccessPanelProps) {
  return (
    <div className="panel-stack">
      <div className="mode-switch" role="tablist" aria-label="사용자 접근 방식">
        {Object.entries(MODE_LABELS).map(([key, label]) => {
          const nextMode = key as UserAccessMode;

          return (
            <button
              key={nextMode}
              className={`mode-switch-button ${mode === nextMode ? "mode-switch-button-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={mode === nextMode}
              onClick={() => onModeChange(nextMode)}
              disabled={pending}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className={`session-card ${sessionUserId ? "" : "session-card-muted"}`}>
        <div>
          <strong>
            {sessionUserId ? `로그인 사용자: ${sessionUserId}` : "로그인하지 않은 상태"}
          </strong>
          <span>
            {sessionUserId
              ? canManageActiveCollection
                ? "현재 불러온 목록을 수정할 수 있습니다."
                : activeUserId
                  ? `"${activeUserId}" 목록을 열람 중입니다. 수정은 로그인한 본인 목록에서만 가능합니다.`
                  : "로그인 상태입니다. 내 아이디 목록을 불러오면 바로 관리할 수 있습니다."
              : "아이디만으로 목록 열람은 가능하지만, 추가·수정·삭제는 로그인 후 가능합니다."}
          </span>
        </div>

        {sessionUserId ? (
          <button className="btn btn-secondary" type="button" onClick={onLogout} disabled={pending}>
            로그아웃
          </button>
        ) : null}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="field">
        <label htmlFor="userId">사용자 ID</label>
        <input
          id="userId"
          value={userIdInput}
          onChange={(event) => onUserIdChange(event.target.value)}
          placeholder="예: abcd1234"
          disabled={pending}
        />
      </div>

      {mode !== "load" ? (
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={passwordInput}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="8자 이상 비밀번호"
            disabled={pending}
          />
        </div>
      ) : null}

      {mode === "register" ? (
        <div className="field">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <input
            id="passwordConfirm"
            type="password"
            value={passwordConfirmInput}
            onChange={(event) => onPasswordConfirmChange(event.target.value)}
            placeholder="비밀번호를 다시 입력해 주세요"
            disabled={pending}
          />
        </div>
      ) : null}

      <div className="filter-help">{getModeDescription(mode)}</div>

      <div className="form-actions">
        <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={pending}>
          {getSubmitLabel(mode, pending)}
        </button>
      </div>
    </div>
  );
}
