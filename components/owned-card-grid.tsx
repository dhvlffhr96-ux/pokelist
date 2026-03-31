"use client";

import { CARD_CONDITION_LABELS, type OwnedCardItem } from "@/lib/cards/types";

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

function getSeriesLabel(card: OwnedCardItem) {
  return card.card.seriesName?.trim() || card.card.setNameKo?.trim() || "시리즈 없음";
}

function getMemoPreview(memo: string | null) {
  const normalized = memo?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "없음";
  }

  if (normalized.length <= 72) {
    return normalized;
  }

  return `${normalized.slice(0, 72)}...`;
}

export function OwnedCardGrid({
  cards,
  activeUserId,
  editable,
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
          const handleCardActivate = () => {
            if (editable) {
              onEdit(card);
              return;
            }

            onInspect(card);
          };
          const cardActionLabel = editable ? "카드 수정 창 열기" : "카드 상세 정보 열기";

          if (viewMode === "compact") {
            return (
              <article
                className={`card-compact-item card-item-clickable ${isSelected ? "card-item-selected" : ""}`}
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={handleCardActivate}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleCardActivate();
                  }
                }}
                aria-label={`${card.card.cardNameKo} ${cardActionLabel}`}
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
              className={`card-item card-item-clickable ${isSelected ? "card-item-selected" : ""}`}
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={handleCardActivate}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCardActivate();
                }
              }}
              aria-label={`${card.card.cardNameKo} ${cardActionLabel}`}
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
                        <span>{getSeriesLabel(card)}</span>
                      </div>
                    </div>
                    <span className="status-pill">x {card.quantity}</span>
                  </div>

                  <div className="card-meta">
                    <span>
                      상태 <strong>{CARD_CONDITION_LABELS[card.condition]}</strong>
                    </span>
                    <span>
                      메모{" "}
                      <strong className="card-meta-memo" title={card.memo?.trim() || undefined}>
                        {getMemoPreview(card.memo)}
                      </strong>
                    </span>
                  </div>

                  {editable ? (
                    <div className="card-actions">
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
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

    </>
  );
}
