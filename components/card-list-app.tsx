"use client";

import { useDeferredValue, useEffect, useState } from "react";
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
  type CardMaster,
  type CardSeriesSummary,
  type CardSetSummary,
  type OwnedCardItem,
  type PaginatedResult,
} from "@/lib/cards/types";

type CardListAppProps = {
  catalogSourceLabel: string;
  personalStorageLabel: string;
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

const CATALOG_PAGE_SIZE = 10;

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

export function CardListApp({
  catalogSourceLabel,
  personalStorageLabel,
}: CardListAppProps) {
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
  const [rarityOptions, setRarityOptions] = useState<string[]>([]);
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

  const visibleCards = cards.filter((card) => matchesCollectionQuery(card, deferredQuery));
  const totalQuantity = cards.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueSets = new Set(cards.map((card) => card.card.setNameKo)).size;

  useEffect(() => {
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
          const rarityResult = (await raritySettled.value.json()) as ApiResponse<string[]>;

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
  }, []);

  function resetCatalogResults() {
    setCatalogResults([]);
    setCatalogPage(1);
    setCatalogTotalPages(1);
    setCatalogTotalCount(0);
    setCatalogError(null);
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

  async function loadUserCollection(rawUserId: string) {
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
      setStoragePath(result.data.storagePath);
      setCards(sortCards(result.data.items));
      setEditingCard(null);
      setSelectedMaster(null);
      setSuccessMessage(`사용자 "${result.data.userId}" 목록을 불러왔습니다.`);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "사용자 카드 목록을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoadingUser(false);
    }
  }

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
        query.set("rarity", nextRarity);
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
              사용자 ID를 입력하면 해당 ID의 Supabase Storage 문서를 읽습니다.
              문서가 없으면 빈 목록으로 시작하고, 첫 저장 시 자동 생성됩니다.
            </p>
          </div>
          <span className="storage-pill">{personalStorageLabel}</span>
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

        <div className="meta-strip">
          <span>저장 방식: Supabase Storage JSON 문서</span>
          <span>마스터 소스: {catalogSourceLabel}</span>
          <span>스토리지 경로: {storagePath ?? "아직 불러오지 않음"}</span>
        </div>
      </section>

      <div className="workspace-grid catalog-layout">
        <section className="panel">
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

        <section className="panel sticky-panel">
          <div className="panel-header">
            <div>
              <h2>{editingCard ? "내 카드 수정" : "내 카드 저장"}</h2>
              <p>
                마스터 카드 정보는 읽기 전용입니다. 여기서는 수량, 상태, 메모,
                구매일만 사용자 스토리지 문서에 저장합니다.
              </p>
            </div>
            <span className="storage-pill">{activeUserId ?? "사용자 미선택"}</span>
          </div>

          {editingCard || selectedMaster ? (
            <OwnedCardForm
              key={`form-${editingCard?.id ?? selectedMaster?.id ?? "empty"}`}
              mode={editingCard ? "edit" : "create"}
              title={
                editingCard
                  ? editingCard.card.cardNameKo
                  : selectedMaster?.cardNameKo ?? "카드 선택 필요"
              }
              subtitle={
                editingCard
                  ? `${editingCard.card.setNameKo} · ${editingCard.card.cardNo}`
                  : selectedMaster
                    ? `${selectedMaster.set.setNameKo} · ${selectedMaster.cardNo}`
                    : "왼쪽 검색 결과에서 카드를 선택하세요."
              }
              initialValues={
                editingCard ? toCollectionFormValues(editingCard) : emptyCollectionFormValues
              }
              activeUserId={activeUserId}
              pending={isSubmitting}
              serverError={submitError}
              onCancel={() => {
                setEditingCard(null);
                setSelectedMaster(null);
                setSubmitError(null);
              }}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="empty-state">
              먼저 왼쪽의 마스터 카드 검색 결과에서 카드를 선택하세요.
              <br />
              사용자 ID를 아직 불러오지 않았다면 상단에서 먼저 불러와야 저장됩니다.
            </div>
          )}
        </section>
      </div>

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
          <span>목록 영역만 스크롤됩니다.</span>
        </div>

        <div className="scroll-area list-scroll-area">
          <OwnedCardGrid
            cards={visibleCards}
            activeUserId={activeUserId}
            pendingId={pendingDeleteId}
            onEdit={(card) => {
              setEditingCard(card);
              setSelectedMaster(null);
              setSubmitError(null);
              setSuccessMessage(null);
            }}
            onDelete={handleDelete}
          />
        </div>
      </section>
    </section>
  );
}
