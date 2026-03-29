"use client";

import {
  CARD_CONDITION_LABELS,
  CARD_TYPE_LABELS,
  type OwnedCardItem,
} from "@/lib/cards/types";

type OwnedCardDetailDialogProps = {
  card: OwnedCardItem;
  editable?: boolean;
  onClose: () => void;
  onOpenImage: () => void;
  onEdit?: () => void;
};

function formatOwnedDate(date: string | null) {
  if (!date) {
    return "미입력";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function getPreviewImageSrc(card: OwnedCardItem) {
  return card.card.imageUrl ?? card.card.thumbnailUrl;
}

export function OwnedCardDetailDialog({
  card,
  editable = false,
  onClose,
  onOpenImage,
  onEdit,
}: OwnedCardDetailDialogProps) {
  const previewImageSrc = getPreviewImageSrc(card);

  return (
    <div
      className="form-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owned-card-detail-dialog-title"
      onClick={onClose}
    >
      <div className="form-dialog-panel" onClick={(event) => event.stopPropagation()}>
        <div className="form-dialog-header">
          <div>
            <span className="form-dialog-eyebrow">카드 상세 정보</span>
            <h2 id="owned-card-detail-dialog-title">{card.card.cardNameKo}</h2>
            <p>
              {card.card.setNameKo} · {card.card.cardNo}
            </p>
          </div>
          <div className="detail-dialog-actions">
            {editable && onEdit ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  onEdit();
                }}
              >
                수정
              </button>
            ) : null}
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>

        <div className="form-dialog-layout">
          <div className="form-dialog-preview">
            <button
              className="form-dialog-image-button"
              type="button"
              onClick={onOpenImage}
              disabled={!previewImageSrc}
              aria-label={`${card.card.cardNameKo} 이미지 크게 보기`}
            >
              <div className="form-dialog-image">
                {previewImageSrc ? (
                  <>
                    {/* External master images can come from multiple hosts. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewImageSrc} alt={card.card.cardNameKo} />
                  </>
                ) : (
                  <div className="catalog-card-fallback">NO IMAGE</div>
                )}
              </div>
            </button>

            <div className="catalog-card-meta form-dialog-meta">
              <span>보유 수량 {card.quantity}</span>
              <span>상태 {CARD_CONDITION_LABELS[card.condition]}</span>
              <span>구매일 {formatOwnedDate(card.acquiredAt)}</span>
            </div>

            <p className="form-dialog-copy">
              이미지를 누르면 크게 볼 수 있습니다. 이 카드의 보유 정보와 카드 마스터
              요약을 함께 확인합니다.
            </p>
          </div>

          <div className="form-dialog-form">
            <div className="detail-field-list">
              <div className="detail-field">
                <span>세트</span>
                <strong>{card.card.setNameKo}</strong>
              </div>
              <div className="detail-field">
                <span>카드 번호</span>
                <strong>{card.card.cardNo}</strong>
              </div>
              <div className="detail-field">
                <span>레어도</span>
                <strong>{card.card.rarity}</strong>
              </div>
              <div className="detail-field">
                <span>카드 유형</span>
                <strong>{CARD_TYPE_LABELS[card.card.cardType]}</strong>
              </div>
              <div className="detail-field">
                <span>로컬 코드</span>
                <strong>{card.card.localCode ?? "없음"}</strong>
              </div>
              <div className="detail-field">
                <span>시리즈</span>
                <strong>{card.card.seriesName ?? "없음"}</strong>
              </div>
              <div className="detail-field detail-field-full">
                <span>메모</span>
                <strong>{card.memo?.trim() ? card.memo : "없음"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
