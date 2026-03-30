"use client";

import { useDeferredValue, useState, type RefObject } from "react";
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
  viewMode: "detail" | "compact";
  seriesOptions: CardSeriesSummary[];
  setOptions: CardSetSummary[];
  rarityOptions: CardRarityMeta[];
  selectedCardId: number | null;
  selectedSeriesName: string;
  selectedSetId: number | null;
  selectedRarity: string;
  ownedCardIds: number[];
  showOwnershipState: boolean;
  showOwnershipStateToggle: boolean;
  ownershipStateEnabled: boolean;
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
  resultsAnchorRef?: RefObject<HTMLDivElement | null>;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onViewModeChange: (viewMode: "detail" | "compact") => void;
  onOwnershipStateEnabledChange: (enabled: boolean) => void;
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

function matchesResultFilter(card: CardMaster, query: string) {
  if (!query.trim()) {
    return true;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const searchable = [
    card.cardNameKo,
    card.cardNameEn ?? "",
    card.cardNameJp ?? "",
    card.set.setNameKo,
    card.set.setNameEn ?? "",
    card.cardNo,
    card.localCode ?? "",
    card.rarity,
    CARD_TYPE_LABELS[card.cardType],
  ]
    .join(" ")
    .toLocaleLowerCase("ko-KR");

  return searchable.includes(normalizedQuery);
}

export function CatalogSearchPanel({
  query,
  pending,
  seriesPending,
  setPending,
  rarityPending,
  results,
  viewMode,
  seriesOptions,
  setOptions,
  rarityOptions,
  selectedCardId,
  selectedSeriesName,
  selectedSetId,
  selectedRarity,
  ownedCardIds,
  showOwnershipState,
  showOwnershipStateToggle,
  ownershipStateEnabled,
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
  resultsAnchorRef,
  onQueryChange,
  onSearch,
  onPageChange,
  onViewModeChange,
  onOwnershipStateEnabledChange,
  onSeriesChange,
  onSetChange,
  onRarityChange,
  onSelect,
}: CatalogSearchPanelProps) {
  const [resultFilter, setResultFilter] = useState("");
  const deferredResultFilter = useDeferredValue(resultFilter);
  const visibleResults = results.filter((card) => matchesResultFilter(card, deferredResultFilter));
  const ownedCardIdSet = new Set(ownedCardIds);

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
          <div className="input-with-clear">
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || pending || searchDisabled) {
                  return;
                }

                event.preventDefault();
                onSearch();
              }}
              placeholder="예: 피카츄, 012/106, sv5k"
              disabled={pending}
            />
            {query ? (
              <button
                className="input-clear-button"
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="검색어 지우기"
                disabled={pending}
              >
                ×
              </button>
            ) : null}
          </div>
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
            시리즈만 골라도 해당 시리즈 카드만 볼 수 있고, 세트까지 선택하면 더 좁혀집니다.
            레어도는 현재 검색 조건에 맞는 카드들 기준으로 다시 계산됩니다.
          </div>
        </div>

        <div className="view-switch" role="tablist" aria-label="카드 검색 보기 방식">
          <button
            className={`view-switch-button ${viewMode === "detail" ? "view-switch-button-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={viewMode === "detail"}
            onClick={() => onViewModeChange("detail")}
          >
            상세 보기
          </button>
          <button
            className={`view-switch-button ${viewMode === "compact" ? "view-switch-button-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={viewMode === "compact"}
            onClick={() => onViewModeChange("compact")}
          >
            간단 보기
          </button>
        </div>

        {showOwnershipStateToggle ? (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={ownershipStateEnabled}
              onChange={(event) => onOwnershipStateEnabledChange(event.target.checked)}
            />
            <span>내 카드 보유 여부 컬러로 보기</span>
          </label>
        ) : null}

        {results.length === 0 ? (
          <div className="empty-state">
            아직 검색 결과가 없습니다.
            <br />
            검색 버튼을 눌러 카드 마스터를 조회해 보세요.
          </div>
        ) : (
          <div className="results-shell" ref={resultsAnchorRef}>
            <div className="results-filter-bar">
              <input
                value={resultFilter}
                onChange={(event) => setResultFilter(event.target.value)}
                placeholder="현재 불러온 결과 안에서 카드명, 세트, 번호, 레어도 필터"
              />
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setResultFilter("")}
                disabled={!resultFilter}
              >
                초기화
              </button>
            </div>

            <div className="results-meta">
              <span>
                총 {totalCount}개 중 현재 페이지 {results.length}개 불러옴
              </span>
              <span>결과 내 필터 적용 후 {visibleResults.length}개 표시</span>
              <span>
                {page} / {totalPages} 페이지
              </span>
              <span>페이지당 {pageSize}개</span>
              {showOwnershipState ? (
                <span>보유 카드는 컬러, 미보유 카드는 흑백으로 표시됩니다.</span>
              ) : null}
              <span>카드나 사진을 누르면 추가 창이 열립니다.</span>
            </div>

            {visibleResults.length === 0 ? (
              <div className="empty-state">
                현재 불러온 검색 결과 안에서 조건에 맞는 카드가 없습니다.
                <br />
                결과 내 필터를 지우거나 페이지를 바꿔서 다시 확인해 보세요.
              </div>
            ) : (
              <div className={`catalog-grid ${viewMode === "compact" ? "catalog-grid-compact" : ""}`}>
                {visibleResults.map((card) => {
                const previewImageSrc = getPreviewImageSrc(card);
                const isSelected = selectedCardId === card.id;
                const isOwned = showOwnershipState && ownedCardIdSet.has(card.id);

                if (viewMode === "compact") {
                  return (
                    <article
                      className={`catalog-card-compact ${selectionEnabled ? "catalog-card-interactive" : "catalog-card-readonly"} ${isSelected ? "catalog-card-selected" : ""} ${showOwnershipState ? (isOwned ? "catalog-card-owned" : "catalog-card-unowned") : ""}`}
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
                      <div className="catalog-card-compact-media">
                        {previewImageSrc ? (
                          <button
                            className="catalog-card-image-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelect(card);
                            }}
                            aria-label={`${card.cardNameKo} 카드 추가 창 열기`}
                          >
                            {/* External master thumbnails can come from multiple hosts. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImageSrc} alt={card.cardNameKo} />
                          </button>
                        ) : (
                          <div className="catalog-card-fallback">NO IMAGE</div>
                        )}
                      </div>

                      <div className="catalog-card-compact-body">
                        <strong className="catalog-card-compact-title">{card.cardNameKo}</strong>
                        <span className="catalog-card-compact-subtitle">
                          {card.cardNo} · {card.rarity}
                        </span>
                        <span className="catalog-card-compact-subtitle">
                          {card.set.setNameKo}
                        </span>
                        {showOwnershipState ? (
                          <span className={`catalog-ownership-badge ${isOwned ? "catalog-ownership-badge-owned" : "catalog-ownership-badge-unowned"}`}>
                            {isOwned ? "보유 중" : "미보유"}
                          </span>
                        ) : null}
                        {isSelected ? <span className="status-pill">추가 창 열림</span> : null}
                      </div>
                    </article>
                  );
                  }

                  return (
                    <article
                      className={`catalog-card ${selectionEnabled ? "catalog-card-interactive" : "catalog-card-readonly"} ${isSelected ? "catalog-card-selected" : ""} ${showOwnershipState ? (isOwned ? "catalog-card-owned" : "catalog-card-unowned") : ""}`}
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
                              onSelect(card);
                            }}
                            aria-label={`${card.cardNameKo} 카드 추가 창 열기`}
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
                          <div className="catalog-card-header-badges">
                            {showOwnershipState ? (
                              <span className={`catalog-ownership-badge ${isOwned ? "catalog-ownership-badge-owned" : "catalog-ownership-badge-unowned"}`}>
                                {isOwned ? "보유 중" : "미보유"}
                              </span>
                            ) : null}
                            {isSelected ? <span className="status-pill">추가 창 열림</span> : null}
                          </div>
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
            )}

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

    </>
  );
}
