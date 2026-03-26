"use client";

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
    <div className="card-grid">
      {cards.map((card) => (
        <article className="card-item" key={card.id}>
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
        </article>
      ))}
    </div>
  );
}
