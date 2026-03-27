"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { CatalogSearchPanel } from "@/components/catalog-search-panel";
import { OwnedCardForm } from "@/components/owned-card-form";
import { OwnedCardGrid } from "@/components/owned-card-grid";
import {
  emptyCollectionFormValues,
  toCollectionFormValues,
  userIdSchema,
  type CollectionFormValues,
} from "@/lib/cards/schema";
import {
  CARD_CONDITION_LABELS,
  CARD_TYPE_LABELS,
  type CardMaster,
  type CardRarityMeta,
  type CardSeriesSummary,
  type CardSetSummary,
  type OwnedCardItem,
  type PaginatedResult,
} from "@/lib/cards/types";

type CardListAppProps = {
  mode: "catalog" | "collection";
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type UserCollectionResponse = {
  version: 1;
  userId: string;
  items: OwnedCardItem[];
  storagePath: string;
};

const CATALOG_PAGE_SIZE = 12;
const LAST_ACTIVE_USER_ID_STORAGE_KEY = "pokelist:last-active-user-id";

function matchesCollectionQuery(item: OwnedCardItem, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const searchable = [
    item.card.cardNameKo,
    item.card.cardNameEn ?? "",
    item.card.setNameKo,
    item.card.cardNo,
    item.card.localCode ?? "",
    item.memo ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedQuery);
}

function sortCards(cards: OwnedCardItem[]) {
  return [...cards].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function upsertOwnedItem(cards: OwnedCardItem[], nextItem: OwnedCardItem) {
  return sortCards([nextItem, ...cards.filter((card) => card.id !== nextItem.id)]);
}

function getMasterPreviewImageSrc(card: CardMaster) {
  return card.imageUrl ?? card.thumbnailUrl;
}

function getOwnedPreviewImageSrc(card: OwnedCardItem) {
  return card.card.imageUrl ?? card.card.thumbnailUrl;
}

function formatOwnedDate(date: string | null) {
  if (!date) {
    return "미입력";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function readStoredActiveUserId() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUserId = window.localStorage.getItem(LAST_ACTIVE_USER_ID_STORAGE_KEY);
  const parsedUserId = userIdSchema.safeParse(storedUserId);

  if (!parsedUserId.success) {
    window.localStorage.removeItem(LAST_ACTIVE_USER_ID_STORAGE_KEY);
    return null;
  }

  return parsedUserId.data;
}

export function CardListApp({
  mode,
}: CardListAppProps) {
  const catalogPanelRef = useRef<HTMLElement | null>(null);
  const hasRestoredUserRef = useRef(false);
  const [userIdInput, setUserIdInput] = useState("");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [cards, setCards] = useState<OwnedCardItem[]>([]);
  const [editingCard, setEditingCard] = useState<OwnedCardItem | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<CardMaster | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<CardMaster[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogTotalCount, setCatalogTotalCount] = useState(0);
  const [seriesOptions, setSeriesOptions] = useState<CardSeriesSummary[]>([]);
  const [selectedSeriesName, setSelectedSeriesName] = useState("");
  const [setOptions, setSetOptions] = useState<CardSetSummary[]>([]);
  const [selectedSet, setSelectedSet] = useState<CardSetSummary | null>(null);
  const [rarityOptions, setRarityOptions] = useState<CardRarityMeta[]>([]);
  const [selectedRarity, setSelectedRarity] = useState("");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [setError, setSetError] = useState<string | null>(null);
  const [rarityError, setRarityError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [isLoadingRarities, setIsLoadingRarities] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(collectionQuery);
  const isCatalogMode = mode === "catalog";
  const isCollectionMode = mode === "collection";

  const visibleCards = cards.filter((card) => matchesCollectionQuery(card, deferredQuery));
  const totalQuantity = cards.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueSets = new Set(cards.map((card) => card.card.setNameKo)).size;

  useEffect(() => {
    if (!isCatalogMode) {
      return;
    }

    async function loadInitialFilters() {
      setIsLoadingSeries(true);
      setIsLoadingRarities(true);
      setSeriesError(null);
      setRarityError(null);

      const seriesQuery = new URLSearchParams({
        limit: "200",
      });
      const [seriesSettled, raritySettled] = await Promise.allSettled([
        fetch(`/api/catalog/series?${seriesQuery.toString()}`, {
          cache: "no-store",
        }),
        fetch("/api/catalog/rarities", {
          cache: "no-store",
        }),
      ]);

      if (seriesSettled.status === "fulfilled") {
        try {
          const seriesResult =
            (await seriesSettled.value.json()) as ApiResponse<CardSeriesSummary[]>;

          if (!seriesSettled.value.ok || !seriesResult.data) {
            throw new Error(seriesResult.error ?? "카드 시리즈 조회에 실패했습니다.");
          }

          setSeriesOptions(seriesResult.data);
        } catch (error) {
          setSeriesError(
            error instanceof Error ? error.message : "카드 시리즈 조회에 실패했습니다.",
          );
        } finally {
          setIsLoadingSeries(false);
        }
      } else {
        setSeriesError("카드 시리즈 조회에 실패했습니다.");
        setIsLoadingSeries(false);
      }

      if (raritySettled.status === "fulfilled") {
        try {
          const rarityResult =
            (await raritySettled.value.json()) as ApiResponse<CardRarityMeta[]>;

          if (!raritySettled.value.ok || !rarityResult.data) {
            throw new Error(rarityResult.error ?? "카드 레어도 조회에 실패했습니다.");
          }

          setRarityOptions(rarityResult.data);
        } catch (error) {
          setRarityError(
            error instanceof Error ? error.message : "카드 레어도 조회에 실패했습니다.",
          );
        } finally {
          setIsLoadingRarities(false);
        }
      } else {
        setRarityError("카드 레어도 조회에 실패했습니다.");
        setIsLoadingRarities(false);
      }
    }

    void loadInitialFilters();
  }, [isCatalogMode]);

  useEffect(() => {
    if (!selectedMaster && !editingCard) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedMaster(null);
        setEditingCard(null);
        setSubmitError(null);
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [selectedMaster, editingCard]);

  function resetCatalogResults() {
    setCatalogResults([]);
    setCatalogPage(1);
    setCatalogTotalPages(1);
    setCatalogTotalCount(0);
    setCatalogError(null);
  }

  function scrollToCatalogTop() {
    if (!catalogPanelRef.current) {
      return;
    }

    const top = catalogPanelRef.current.getBoundingClientRect().top + window.scrollY - 88;

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth",
    });
  }

  async function loadSeriesSets(seriesName: string) {
    if (!seriesName) {
      setSetOptions([]);
      setSetError(null);
      return;
    }

    setIsLoadingSets(true);
    setSetError(null);

    try {
      const query = new URLSearchParams({
        seriesName,
        limit: "200",
      });
      const response = await fetch(`/api/catalog/sets?${query.toString()}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse<CardSetSummary[]>;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "카드 세트 조회에 실패했습니다.");
      }

      setSetOptions(result.data);
    } catch (error) {
      setSetError(error instanceof Error ? error.message : "카드 세트 조회에 실패했습니다.");
    } finally {
      setIsLoadingSets(false);
    }
  }

  const loadUserCollection = useCallback(
    async (rawUserId: string, options?: { restored?: boolean }) => {
      const parsedUserId = userIdSchema.safeParse(rawUserId);

      if (!parsedUserId.success) {
        setLoadError(parsedUserId.error.issues[0]?.message ?? "사용자 ID를 확인해 주세요.");
        return;
      }

      setIsLoadingUser(true);
      setLoadError(null);
      setSubmitError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(parsedUserId.data)}/collection`,
          {
            cache: "no-store",
          },
        );
        const result = (await response.json()) as ApiResponse<UserCollectionResponse>;

        if (!response.ok || !result.data) {
          throw new Error(result.error ?? "사용자 카드 목록을 불러오지 못했습니다.");
        }

        setActiveUserId(result.data.userId);
        setUserIdInput(result.data.userId);
        setStoragePath(result.data.storagePath);
        setCards(sortCards(result.data.items));
        setEditingCard(null);
        setSelectedMaster(null);
        window.localStorage.setItem(LAST_ACTIVE_USER_ID_STORAGE_KEY, result.data.userId);
        setSuccessMessage(
          options?.restored
            ? `사용자 "${result.data.userId}" 목록을 자동으로 불러왔습니다.`
            : `사용자 "${result.data.userId}" 목록을 불러왔습니다.`,
        );
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "사용자 카드 목록을 불러오지 못했습니다.",
        );
      } finally {
        setIsLoadingUser(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (hasRestoredUserRef.current) {
      return;
    }

    hasRestoredUserRef.current = true;

    const storedUserId = readStoredActiveUserId();

    if (!storedUserId) {
      return;
    }

    setUserIdInput(storedUserId);
    void loadUserCollection(storedUserId, {
      restored: true,
    });
  }, [loadUserCollection]);

  async function searchCatalog(
    page = 1,
    nextSet = selectedSet,
    nextRarity = selectedRarity || undefined,
  ) {
    setIsSearchingCatalog(true);
    setCatalogError(null);

    try {
      const query = new URLSearchParams({
        q: catalogQuery,
        page: String(page),
        pageSize: String(CATALOG_PAGE_SIZE),
      });

      if (nextSet) {
        query.set("setId", String(nextSet.id));
      }

      if (nextRarity) {
        const selectedRarityMeta = rarityOptions.find(
          (rarityMeta) => rarityMeta.filterKey === nextRarity,
        );

        if (selectedRarityMeta) {
          for (const rarityValue of selectedRarityMeta.filterValues) {
            query.append("rarity", rarityValue);
          }
        } else {
          query.append("rarity", nextRarity);
        }
      }

      const response = await fetch(`/api/catalog/cards?${query.toString()}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse<PaginatedResult<CardMaster>>;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "카드 마스터 검색에 실패했습니다.");
      }

      setCatalogResults(result.data.items);
      setCatalogPage(result.data.page);
      setCatalogTotalPages(result.data.totalPages);
      setCatalogTotalCount(result.data.totalCount);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "카드 검색에 실패했습니다.");
    } finally {
      setIsSearchingCatalog(false);
    }
  }

  async function handleSeriesChange(nextSeriesName: string) {
    setSelectedSeriesName(nextSeriesName);
    setSelectedSet(null);
    setSelectedMaster(null);
    setSetOptions([]);
    setSetError(null);
    resetCatalogResults();

    if (!nextSeriesName) {
      return;
    }

    await loadSeriesSets(nextSeriesName);
  }

  function handleSetChange(nextSetId: string) {
    if (!nextSetId) {
      setSelectedSet(null);
      setSelectedMaster(null);
      resetCatalogResults();
      return;
    }

    const nextSet = setOptions.find((set) => set.id === Number(nextSetId));

    if (!nextSet) {
      setSetError("선택한 카드 세트를 찾지 못했습니다.");
      return;
    }

    setSetError(null);
    setSelectedSet(nextSet);
    setSelectedMaster(null);
    void searchCatalog(1, nextSet);
  }

  function handleRarityChange(nextRarity: string) {
    setSelectedRarity(nextRarity);
    setSelectedMaster(null);
    resetCatalogResults();

    if (selectedSeriesName && !selectedSet) {
      return;
    }

    void searchCatalog(1, selectedSet, nextRarity || undefined);
  }

  function handleCatalogSearch(page = 1) {
    if (selectedSeriesName && !selectedSet) {
      setCatalogError("시리즈를 선택했다면 세트도 함께 골라 주세요.");
      return;
    }

    if (page !== catalogPage) {
      scrollToCatalogTop();
    }

    void searchCatalog(page);
  }

  async function submitToApi(
    url: string,
    method: "POST" | "PATCH",
    body: unknown,
  ): Promise<OwnedCardItem> {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as ApiResponse<OwnedCardItem>;

    if (!response.ok || !result.data) {
      throw new Error(result.error ?? "요청 처리에 실패했습니다.");
    }

    return result.data;
  }

  async function handleSubmit(values: CollectionFormValues) {
    if (!activeUserId) {
      setSubmitError("먼저 사용자 ID를 입력하고 목록을 불러와 주세요.");
      return false;
    }

    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (editingCard) {
        const updated = await submitToApi(
          `/api/users/${encodeURIComponent(activeUserId)}/collection/${editingCard.id}`,
          "PATCH",
          values,
        );

        setCards((current) => upsertOwnedItem(current, updated));
        setEditingCard(null);
        setSuccessMessage("내 카드 정보를 수정했습니다.");
        return true;
      }

      if (!selectedMaster) {
        setSubmitError("먼저 마스터 카드에서 추가할 카드를 선택해 주세요.");
        return false;
      }

      const created = await submitToApi(
        `/api/users/${encodeURIComponent(activeUserId)}/collection`,
        "POST",
        {
          ...values,
          cardId: selectedMaster.id,
        },
      );

      setCards((current) => upsertOwnedItem(current, created));
      setSelectedMaster(null);
      setSuccessMessage("내 카드 목록에 저장했습니다.");
      return true;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "저장 처리에 실패했습니다.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(card: OwnedCardItem) {
    if (!activeUserId) {
      setSubmitError("먼저 사용자 ID를 입력하고 목록을 불러와 주세요.");
      return;
    }

    const confirmed = window.confirm(`"${card.card.cardNameKo}" 카드를 삭제할까요?`);

    if (!confirmed) {
      return;
    }

    setSubmitError(null);
    setSuccessMessage(null);
    setPendingDeleteId(card.id);

    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(activeUserId)}/collection/${card.id}`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json()) as ApiResponse<{ success: boolean }>;

      if (!response.ok) {
        throw new Error(result.error ?? "삭제 처리에 실패했습니다.");
      }

      setCards((current) => current.filter((item) => item.id !== card.id));
      setEditingCard((current) => (current?.id === card.id ? null : current));
      setSuccessMessage("내 카드에서 삭제했습니다.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "삭제 처리에 실패했습니다.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <section className="app-shell">
      <div className="summary-grid">
        <article className="summary-card">
          <span>현재 사용자</span>
          <strong>{activeUserId ?? "미선택"}</strong>
        </article>
        <article className="summary-card">
          <span>총 보유 수량</span>
          <strong>{totalQuantity}</strong>
        </article>
        <article className="summary-card">
          <span>보유 카드 종류 / 세트</span>
          <strong>
            {cards.length} / {uniqueSets}
          </strong>
          <p className="summary-detail">{cards.length}종 카드</p>
        </article>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>사용자 목록 불러오기</h2>
            <p>
              사용자 ID를 입력하면 저장된 내 카드 목록을 불러옵니다. 아직 기록이 없으면
              빈 상태에서 시작하고, 첫 저장 시 목록이 만들어집니다.
            </p>
          </div>
          <span className="storage-pill">{activeUserId ?? "사용자 미선택"}</span>
        </div>

        {loadError ? <div className="alert alert-error">{loadError}</div> : null}

        <div className="identity-grid">
          <div className="field">
            <label htmlFor="userId">사용자 ID</label>
            <input
              id="userId"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="예: soulx02"
              disabled={isLoadingUser}
            />
          </div>
          <div className="form-actions align-end">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => loadUserCollection(userIdInput)}
              disabled={isLoadingUser}
            >
              {isLoadingUser ? "불러오는 중..." : "목록 불러오기"}
            </button>
          </div>
        </div>

        {storagePath ? (
          <div className="results-meta">
            <span>{activeUserId} 사용자 목록을 불러왔습니다.</span>
          </div>
        ) : null}
      </section>

      {isCatalogMode ? (
        <>
          <section className="panel" ref={catalogPanelRef}>
            {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

            <CatalogSearchPanel
              query={catalogQuery}
              pending={isSearchingCatalog}
              results={catalogResults}
              selectedCardId={selectedMaster?.id ?? null}
              seriesOptions={seriesOptions}
              selectedSeriesName={selectedSeriesName}
              seriesPending={isLoadingSeries}
              setOptions={setOptions}
              selectedSetId={selectedSet?.id ?? null}
              setPending={isLoadingSets}
              rarityOptions={rarityOptions}
              selectedRarity={selectedRarity}
              rarityPending={isLoadingRarities}
              error={catalogError}
              seriesError={seriesError}
              setError={setError}
              rarityError={rarityError}
              page={catalogPage}
              pageSize={CATALOG_PAGE_SIZE}
              totalPages={catalogTotalPages}
              totalCount={catalogTotalCount}
              searchDisabled={Boolean(selectedSeriesName) && !selectedSet}
              onQueryChange={setCatalogQuery}
              onSearch={() => handleCatalogSearch(1)}
              onPageChange={handleCatalogSearch}
              onSeriesChange={(seriesName) => {
                void handleSeriesChange(seriesName);
              }}
              onSetChange={handleSetChange}
              onRarityChange={handleRarityChange}
              onSelect={(card) => {
                setSelectedMaster(card);
                setEditingCard(null);
                setSubmitError(null);
                setSuccessMessage(null);
              }}
            />
          </section>

          {selectedMaster ? (
            <div
              className="form-dialog-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="catalog-save-dialog-title"
              onClick={() => {
                setSelectedMaster(null);
                setSubmitError(null);
              }}
            >
              <div className="form-dialog-panel" onClick={(event) => event.stopPropagation()}>
                <div className="form-dialog-header">
                  <div>
                    <span className="form-dialog-eyebrow">내 카드 추가</span>
                    <h2 id="catalog-save-dialog-title">{selectedMaster.cardNameKo}</h2>
                    <p>
                      {selectedMaster.set.setNameKo} · {selectedMaster.cardNo}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setSelectedMaster(null);
                      setSubmitError(null);
                    }}
                  >
                    닫기
                  </button>
                </div>

                <div className="form-dialog-layout">
                  <div className="form-dialog-preview">
                    <div className="form-dialog-image">
                      {getMasterPreviewImageSrc(selectedMaster) ? (
                        <>
                          {/* External master images can come from multiple hosts. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getMasterPreviewImageSrc(selectedMaster) ?? ""}
                            alt={selectedMaster.cardNameKo}
                          />
                        </>
                      ) : (
                        <div className="catalog-card-fallback">NO IMAGE</div>
                      )}
                    </div>

                    <div className="catalog-card-meta form-dialog-meta">
                      <span>희귀도 {selectedMaster.rarity}</span>
                      <span>유형 {CARD_TYPE_LABELS[selectedMaster.cardType]}</span>
                      <span>로컬 코드 {selectedMaster.localCode ?? "없음"}</span>
                    </div>

                    <p className="form-dialog-copy">
                      마스터 정보는 읽기 전용으로 유지되고, 여기서는 내 목록용 수량과 상태,
                      메모만 저장합니다.
                    </p>
                  </div>

                  <div className="form-dialog-form">
                    <OwnedCardForm
                      key={`form-${selectedMaster.id}`}
                      mode="create"
                      title={selectedMaster.cardNameKo}
                      subtitle={`${selectedMaster.set.setNameKo} · ${selectedMaster.cardNo}`}
                      initialValues={emptyCollectionFormValues}
                      activeUserId={activeUserId}
                      pending={isSubmitting}
                      serverError={submitError}
                      cancelLabel="닫기"
                      onCancel={() => {
                        setSelectedMaster(null);
                        setSubmitError(null);
                      }}
                      onSubmit={handleSubmit}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {isCollectionMode ? (
        <>
          <section className="panel list-panel">
            <div className="panel-header">
              <div>
                <h3>내 카드 목록</h3>
                <p>검색은 카드명, 세트명, 카드 번호, 로컬 코드, 메모 기준으로 동작합니다.</p>
              </div>
              <div className="toolbar">
                <input
                  value={collectionQuery}
                  onChange={(event) => setCollectionQuery(event.target.value)}
                  placeholder="내 카드 검색"
                />
              </div>
            </div>

            {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

            <div className="results-meta">
              <span>{visibleCards.length}개 표시</span>
              <span>카드를 누르면 수정 창이 열립니다.</span>
              <span>사진을 누르면 크게 볼 수 있습니다.</span>
            </div>

            <OwnedCardGrid
              cards={visibleCards}
              activeUserId={activeUserId}
              selectedCardId={editingCard?.id ?? null}
              pendingId={pendingDeleteId}
              onEdit={(card) => {
                setEditingCard(card);
                setSelectedMaster(null);
                setSubmitError(null);
                setSuccessMessage(null);
              }}
              onDelete={handleDelete}
            />
          </section>

          {editingCard ? (
            <div
              className="form-dialog-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="collection-edit-dialog-title"
              onClick={() => {
                setEditingCard(null);
                setSubmitError(null);
              }}
            >
              <div className="form-dialog-panel" onClick={(event) => event.stopPropagation()}>
                <div className="form-dialog-header">
                  <div>
                    <span className="form-dialog-eyebrow">내 카드 수정</span>
                    <h2 id="collection-edit-dialog-title">{editingCard.card.cardNameKo}</h2>
                    <p>
                      {editingCard.card.setNameKo} · {editingCard.card.cardNo}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setEditingCard(null);
                      setSubmitError(null);
                    }}
                  >
                    닫기
                  </button>
                </div>

                <div className="form-dialog-layout">
                  <div className="form-dialog-preview">
                    <div className="form-dialog-image">
                      {getOwnedPreviewImageSrc(editingCard) ? (
                        <>
                          {/* External master images can come from multiple hosts. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getOwnedPreviewImageSrc(editingCard) ?? ""}
                            alt={editingCard.card.cardNameKo}
                          />
                        </>
                      ) : (
                        <div className="catalog-card-fallback">NO IMAGE</div>
                      )}
                    </div>

                    <div className="catalog-card-meta form-dialog-meta">
                      <span>보유 수량 {editingCard.quantity}</span>
                      <span>상태 {CARD_CONDITION_LABELS[editingCard.condition]}</span>
                      <span>구매일 {formatOwnedDate(editingCard.acquiredAt)}</span>
                    </div>

                    <p className="form-dialog-copy">
                      저장된 내 카드 기록을 수정합니다. 카드 마스터 정보는 그대로 두고,
                      수량과 상태, 메모, 구매일만 업데이트합니다.
                    </p>
                  </div>

                  <div className="form-dialog-form">
                    <OwnedCardForm
                      key={`form-${editingCard.id}`}
                      mode="edit"
                      title={editingCard.card.cardNameKo}
                      subtitle={`${editingCard.card.setNameKo} · ${editingCard.card.cardNo}`}
                      initialValues={toCollectionFormValues(editingCard)}
                      activeUserId={activeUserId}
                      pending={isSubmitting}
                      serverError={submitError}
                      cancelLabel="닫기"
                      onCancel={() => {
                        setEditingCard(null);
                        setSubmitError(null);
                      }}
                      onSubmit={handleSubmit}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
