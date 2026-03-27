"use client";

import { useEffect, useState } from "react";
import {
  CARD_CONDITION_LABELS,
  CARD_TYPE_LABELS,
  type OwnedCardItem,
} from "@/lib/cards/types";

type OwnedCardGridProps = {
  cards: OwnedCardItem[];
  activeUserId: string | null;
  pendingId?: string | null;
  onEdit: (card: OwnedCardItem) => void;
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
  pendingId,
  onDelete,
  onEdit,
}: OwnedCardGridProps) {
  const [previewCard, setPreviewCard] = useState<OwnedCardItem | null>(null);

  useEffect(() => {
    if (!previewCard) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewCard(null);
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [previewCard]);

  if (!activeUserId) {
    return (
      <div className="empty-state">
        사용자 ID를 먼저 불러와야 내 카드 목록을 표시할 수 있습니다.
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        아직 저장된 카드가 없습니다.
        <br />
        마스터 카드 검색 결과에서 카드를 선택해서 내 목록에 추가해 보세요.
      </div>
    );
  }

  return (
    <>
      <div className="card-grid">
        {cards.map((card) => {
          const previewImageSrc = getPreviewImageSrc(card);

          return (
            <article className="card-item" key={card.id}>
              <div className="card-item-layout">
                <div className="owned-card-media">
                  {previewImageSrc ? (
                    <button
                      className="owned-card-image-button"
                      type="button"
                      onClick={() => setPreviewCard(card)}
                      aria-label={`${card.card.cardNameKo} 이미지 크게 보기`}
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
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => onEdit(card)}
                      disabled={pendingId === card.id}
                    >
                      편집
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => onDelete(card)}
                      disabled={pendingId === card.id}
                    >
                      {pendingId === card.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {previewCard ? (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewCard.card.cardNameKo} 이미지 미리보기`}
          onClick={() => setPreviewCard(null)}
        >
          <div className="image-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <div className="image-lightbox-header">
              <div>
                <strong>{previewCard.card.cardNameKo}</strong>
                <span>
                  {previewCard.card.setNameKo} · {previewCard.card.cardNo}
                </span>
              </div>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setPreviewCard(null)}
              >
                닫기
              </button>
            </div>

            <div className="image-lightbox-body">
              {/* External master images can come from multiple hosts. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewCard.card.imageUrl ?? getPreviewImageSrc(previewCard) ?? ""}
                alt={previewCard.card.cardNameKo}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
