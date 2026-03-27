"use client";

import { useEffect, useState } from "react";
import {
  CARD_TYPE_LABELS,
  type CardMaster,
  type CardRarityMeta,
  type CardSeriesSummary,
  type CardSetSummary,
} from "@/lib/cards/types";

type CatalogSearchPanelProps = {
  query: string;
  pending: boolean;
  seriesPending: boolean;
  setPending: boolean;
  rarityPending: boolean;
  results: CardMaster[];
  seriesOptions: CardSeriesSummary[];
  setOptions: CardSetSummary[];
  rarityOptions: CardRarityMeta[];
  selectedCardId: number | null;
  selectedSeriesName: string;
  selectedSetId: number | null;
  selectedRarity: string;
  error?: string | null;
  seriesError?: string | null;
  setError?: string | null;
  rarityError?: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  searchDisabled: boolean;
  selectionEnabled: boolean;
  selectionDisabledReason?: string | null;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onSeriesChange: (seriesName: string) => void;
  onSetChange: (setId: string) => void;
  onRarityChange: (rarity: string) => void;
  onSelect: (card: CardMaster) => void;
};

function getPreviewImageSrc(card: CardMaster) {
  return card.thumbnailUrl ?? card.imageUrl;
}

function getRarityLabel(rarity: CardRarityMeta) {
  return rarity.rarityCode ?? rarity.displayNameKo ?? rarity.displayNameEn ?? rarity.rarityName;
}

export function CatalogSearchPanel({
  query,
  pending,
  seriesPending,
  setPending,
  rarityPending,
  results,
  seriesOptions,
  setOptions,
  rarityOptions,
  selectedCardId,
  selectedSeriesName,
  selectedSetId,
  selectedRarity,
  error,
  seriesError,
  setError,
  rarityError,
  page,
  pageSize,
  totalPages,
  totalCount,
  searchDisabled,
  selectionEnabled,
  selectionDisabledReason,
  onQueryChange,
  onSearch,
  onPageChange,
  onSeriesChange,
  onSetChange,
  onRarityChange,
  onSelect,
}: CatalogSearchPanelProps) {
  const [previewCard, setPreviewCard] = useState<CardMaster | null>(null);

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

  return (
    <>
      <div className="panel-stack">
        <div className="panel-header">
          <div>
            <h2>카드 검색</h2>
            <p>
              카드명, 카드번호, 코드 기준으로 원하는 카드를 찾을 수 있습니다. 카드를
              누르면 바로 추가 창이 열리고, 사진은 따로 크게 볼 수 있습니다.
            </p>
          </div>
          <span className="storage-pill">카탈로그</span>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="toolbar">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="예: 피카츄, 012/106, sv5k"
            disabled={pending}
          />
          <button
            className="btn btn-primary"
            type="button"
            onClick={onSearch}
            disabled={pending || searchDisabled}
          >
            {pending ? "검색 중..." : "카드 검색"}
          </button>
        </div>

        <div className="filter-section">
          <div className="filter-grid">
            <div className="field">
              <label htmlFor="seriesName">시리즈 선택</label>
              <select
                id="seriesName"
                value={selectedSeriesName}
                onChange={(event) => onSeriesChange(event.target.value)}
                disabled={seriesPending}
              >
                <option value="">
                  {seriesPending ? "시리즈 불러오는 중..." : "시리즈를 선택하세요"}
                </option>
                {seriesOptions.map((series) => (
                  <option key={series.name} value={series.name}>
                    {series.name} ({series.setCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="setNameKo">세트 선택</label>
              <select
                id="setNameKo"
                value={selectedSetId ? String(selectedSetId) : ""}
                onChange={(event) => onSetChange(event.target.value)}
                disabled={!selectedSeriesName || setPending}
              >
                <option value="">
                  {!selectedSeriesName
                    ? "먼저 시리즈를 선택하세요"
                    : setPending
                      ? "세트 불러오는 중..."
                      : "세트를 선택하세요"}
                </option>
                {setOptions.map((set) => (
                  <option key={set.id} value={String(set.id)}>
                    {set.setNameKo}
                    {set.setCode ? ` · ${set.setCode}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="rarity">레어도</label>
              <select
                id="rarity"
                value={selectedRarity}
                onChange={(event) => onRarityChange(event.target.value)}
                disabled={rarityPending}
              >
                <option value="">
                  {rarityPending ? "레어도 불러오는 중..." : "전체 레어도"}
                </option>
                {rarityOptions.map((rarity) => (
                  <option key={rarity.filterKey} value={rarity.filterKey}>
                    {getRarityLabel(rarity)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {seriesError ? <div className="alert alert-error">{seriesError}</div> : null}
          {setError ? <div className="alert alert-error">{setError}</div> : null}
          {rarityError ? <div className="alert alert-error">{rarityError}</div> : null}

          <div className="filter-help">
            시리즈를 먼저 고른 뒤 세트를 선택하면 해당 세트 카드만 페이지당 {pageSize}개씩 볼 수 있고,
            레어도도 함께 좁혀서 볼 수 있습니다.
          </div>
        </div>

        {results.length === 0 ? (
          <div className="empty-state">
            아직 검색 결과가 없습니다.
            <br />
            검색 버튼을 눌러 카드 마스터를 조회해 보세요.
          </div>
        ) : (
          <div className="results-shell">
            <div className="results-meta">
              <span>
                총 {totalCount}개 중 {results.length}개 표시
              </span>
              <span>
                {page} / {totalPages} 페이지
              </span>
              <span>페이지당 {pageSize}개</span>
              <span>카드 본문을 누르면 추가 창이 열립니다.</span>
              <span>사진을 누르면 크게 볼 수 있습니다.</span>
            </div>

            <div className="catalog-grid">
              {results.map((card) => {
                const previewImageSrc = getPreviewImageSrc(card);
                const isSelected = selectedCardId === card.id;

                return (
                  <article
                    className={`catalog-card ${selectionEnabled ? "catalog-card-interactive" : "catalog-card-readonly"} ${isSelected ? "catalog-card-selected" : ""}`}
                    key={card.id}
                    role={selectionEnabled ? "button" : undefined}
                    tabIndex={selectionEnabled ? 0 : undefined}
                    onClick={() => {
                      if (selectionEnabled) {
                        onSelect(card);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!selectionEnabled) {
                        return;
                      }

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(card);
                      }
                    }}
                    aria-label={`${card.cardNameKo} 카드 추가 창 열기`}
                  >
                    <div className="catalog-card-media">
                      {previewImageSrc ? (
                        <button
                          className="catalog-card-image-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewCard(card);
                          }}
                          aria-label={`${card.cardNameKo} 이미지 크게 보기`}
                        >
                          {/* External master thumbnails can come from multiple hosts. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={previewImageSrc} alt={card.cardNameKo} />
                        </button>
                      ) : (
                        <div className="catalog-card-fallback">NO IMAGE</div>
                      )}
                    </div>

                    <div className="catalog-card-body">
                      <div className="catalog-card-header">
                        <div>
                          <h3>{card.cardNameKo}</h3>
                          <p>{card.set.setNameKo}</p>
                        </div>
                        {isSelected ? <span className="status-pill">추가 창 열림</span> : null}
                      </div>

                      <div className="catalog-card-meta">
                        <span>번호 {card.cardNo}</span>
                        <span>희귀도 {card.rarity}</span>
                        <span>유형 {CARD_TYPE_LABELS[card.cardType]}</span>
                        <span>로컬 코드 {card.localCode ?? "없음"}</span>
                      </div>

                    <div className="catalog-card-action">
                        <strong>
                          {selectionEnabled
                            ? isSelected
                              ? "모달이 열려 있습니다"
                              : "카드를 눌러 추가"
                            : "현재는 읽기 전용"}
                        </strong>
                        <span>
                          {selectionEnabled
                            ? "수량, 상태, 메모를 바로 입력할 수 있습니다."
                            : selectionDisabledReason ?? "로그인한 본인 목록에서만 추가할 수 있습니다."}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1 || pending}
                >
                  이전 {pageSize}개
                </button>
                <div className="pagination-status">
                  <strong>{page}</strong>
                  <span>/ {totalPages}</span>
                </div>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages || pending}
                >
                  다음 {pageSize}개
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {previewCard ? (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewCard.cardNameKo} 이미지 미리보기`}
          onClick={() => setPreviewCard(null)}
        >
          <div className="image-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <div className="image-lightbox-header">
              <div>
                <strong>{previewCard.cardNameKo}</strong>
                <span>
                  {previewCard.set.setNameKo} · {previewCard.cardNo}
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
                src={previewCard.imageUrl ?? getPreviewImageSrc(previewCard) ?? ""}
                alt={previewCard.cardNameKo}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
