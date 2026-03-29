"use client";

import {
  CARD_CONDITION_LABELS,
  CARD_TYPE_LABELS,
  type OwnedCardItem,
} from "@/lib/cards/types";

type OwnedCardGridProps = {
  cards: OwnedCardItem[];
  activeUserId: string | null;
  editable: boolean;
  readOnlyReason?: string | null;
  emptyHint?: string | null;
  missingUserMessage?: string | null;
  viewMode: "detail" | "compact";
  selectedCardId?: string | null;
  pendingId?: string | null;
  onEdit: (card: OwnedCardItem) => void;
  onInspect: (card: OwnedCardItem) => void;
  onDelete: (card: OwnedCardItem) => void;
};

function getPreviewImageSrc(card: OwnedCardItem) {
  return card.card.thumbnailUrl ?? card.card.imageUrl;
}

function formatDate(date: string | null) {
  if (!date) {
    return "미입력";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function OwnedCardGrid({
  cards,
  activeUserId,
  editable,
  readOnlyReason,
  emptyHint,
  missingUserMessage,
  viewMode,
  selectedCardId,
  pendingId,
  onDelete,
  onEdit,
  onInspect,
}: OwnedCardGridProps) {
  if (!activeUserId) {
    return (
      <div className="empty-state">
        {missingUserMessage ?? "사용자 ID를 먼저 불러와야 카드 목록을 표시할 수 있습니다."}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        아직 저장된 카드가 없습니다.
        {emptyHint ? (
          <>
            <br />
            {emptyHint}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className={`card-grid ${viewMode === "compact" ? "card-grid-compact" : ""}`}>
        {cards.map((card) => {
          const previewImageSrc = getPreviewImageSrc(card);
          const isSelected = selectedCardId === card.id;

          if (viewMode === "compact") {
            return (
              <article
                className={`card-compact-item ${editable ? "card-item-clickable" : "card-item-readonly"} ${isSelected ? "card-item-selected" : ""}`}
                key={card.id}
                role={editable ? "button" : undefined}
                tabIndex={editable ? 0 : undefined}
                onClick={() => {
                  if (editable) {
                    onEdit(card);
                  }
                }}
                onKeyDown={(event) => {
                  if (!editable) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onEdit(card);
                  }
                }}
                aria-label={`${card.card.cardNameKo} 카드 수정 창 열기`}
              >
                <div className="card-compact-media">
                  {previewImageSrc ? (
                    <button
                      className="owned-card-image-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onInspect(card);
                      }}
                      aria-label={`${card.card.cardNameKo} 상세 정보 보기`}
                    >
                      {/* External master thumbnails can come from multiple hosts. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewImageSrc} alt={card.card.cardNameKo} />
                    </button>
                  ) : (
                    <div className="catalog-card-fallback">NO IMAGE</div>
                  )}
                </div>

                <div className="card-compact-body">
                  <strong className="card-compact-title">{card.card.cardNameKo}</strong>
                  <span className="card-compact-qty">x {card.quantity}</span>
                </div>
              </article>
            );
          }

          return (
            <article
              className={`card-item ${editable ? "card-item-clickable" : "card-item-readonly"} ${isSelected ? "card-item-selected" : ""}`}
              key={card.id}
              role={editable ? "button" : undefined}
              tabIndex={editable ? 0 : undefined}
              onClick={() => {
                if (editable) {
                  onEdit(card);
                }
              }}
              onKeyDown={(event) => {
                if (!editable) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onEdit(card);
                }
              }}
              aria-label={`${card.card.cardNameKo} 카드 수정 창 열기`}
            >
              <div className="card-item-layout">
                <div className="owned-card-media">
                  {previewImageSrc ? (
                    <button
                      className="owned-card-image-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onInspect(card);
                      }}
                      aria-label={`${card.card.cardNameKo} 상세 정보 보기`}
                    >
                      {/* External master thumbnails can come from multiple hosts. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewImageSrc} alt={card.card.cardNameKo} />
                    </button>
                  ) : (
                    <div className="catalog-card-fallback">NO IMAGE</div>
                  )}
                </div>

                <div className="owned-card-body">
                  <div className="card-item-header">
                    <div>
                      <h3>{card.card.cardNameKo}</h3>
                      <div className="card-meta">
                        <span>{card.card.setNameKo}</span>
                      </div>
                    </div>
                    <span className="status-pill">x {card.quantity}</span>
                  </div>

                  <div className="card-meta">
                    <span>
                      카드 번호 <strong>{card.card.cardNo}</strong>
                    </span>
                    <span>
                      카드 유형 <strong>{CARD_TYPE_LABELS[card.card.cardType]}</strong>
                    </span>
                    <span>
                      상태 <strong>{CARD_CONDITION_LABELS[card.condition]}</strong>
                    </span>
                    <span>
                      구매일 <strong>{formatDate(card.acquiredAt)}</strong>
                    </span>
                    <span>
                      메모 <strong>{card.memo ?? "없음"}</strong>
                    </span>
                  </div>

                  <div className="card-actions">
                    <div className="card-item-hint">
                      <strong>
                        {editable
                          ? isSelected
                            ? "수정 창 열림"
                            : "카드를 눌러 수정"
                          : "현재는 읽기 전용"}
                      </strong>
                      <span>
                        {editable
                          ? "수량, 상태, 메모를 바꿀 수 있습니다."
                          : readOnlyReason ?? "로그인한 본인 목록에서만 수정할 수 있습니다."}
                      </span>
                    </div>
                    {editable ? (
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(card);
                        }}
                        disabled={pendingId === card.id}
                      >
                        {pendingId === card.id ? "삭제 중..." : "삭제"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

    </>
  );
}
