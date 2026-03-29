"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState, type ReactNode } from "react";
import { CatalogSearchPanel } from "@/components/catalog-search-panel";
import { ImageLightbox } from "@/components/image-lightbox";
import { OwnedCardForm } from "@/components/owned-card-form";
import { OwnedCardDetailDialog } from "@/components/owned-card-detail-dialog";
import { OwnedCardGrid } from "@/components/owned-card-grid";
import { useAppAuth } from "@/components/app-auth-context";
import {
  useAppSummary,
} from "@/components/app-summary-context";
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
  type OwnedCardSnapshot,
  type PaginatedResult,
} from "@/lib/cards/types";

type CardListAppProps = {
  mode: "catalog" | "collection" | "viewer";
  hero?: ReactNode;
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

type CollectionViewMode = "detail" | "compact";
type CatalogViewMode = "detail" | "compact";
type LightboxState = {
  alt: string;
  imageSrc: string;
  subtitle: string;
  title: string;
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

function getOwnedSetFilterKey(card: OwnedCardSnapshot) {
  return `${card.setNameKo}::${card.setCode ?? ""}`;
}

function getOwnedSetFilterLabel(card: OwnedCardSnapshot) {
  return card.setCode ? `${card.setNameKo} · ${card.setCode}` : card.setNameKo;
}

function getRarityFilterLabel(rarity: CardRarityMeta) {
  return rarity.rarityCode ?? rarity.displayNameKo ?? rarity.displayNameEn ?? rarity.rarityName;
}

function getOwnedSetOptions(cards: OwnedCardItem[]) {
  const grouped = new Map<string, string>();

  for (const card of cards) {
    const key = getOwnedSetFilterKey(card.card);

    if (!grouped.has(key)) {
      grouped.set(key, getOwnedSetFilterLabel(card.card));
    }
  }

  return [...grouped.entries()]
    .map(([key, label]) => ({
      key,
      label,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "ko-KR"));
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
  hero,
}: CardListAppProps) {
  const catalogPanelRef = useRef<HTMLElement | null>(null);
  const pendingCatalogScrollRef = useRef(false);
  const hasRestoredUserRef = useRef(false);
  const autoLoadedSessionUserRef = useRef<string | null>(null);
  const { sessionUserId } = useAppAuth();
  const { setSummary } = useAppSummary();
  const [userIdInput, setUserIdInput] = useState("");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [cards, setCards] = useState<OwnedCardItem[]>([]);
  const [editingCard, setEditingCard] = useState<OwnedCardItem | null>(null);
  const [inspectCard, setInspectCard] = useState<OwnedCardItem | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<CardMaster | null>(null);
  const [lightboxState, setLightboxState] = useState<LightboxState | null>(null);
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
  const [catalogViewMode, setCatalogViewMode] = useState<CatalogViewMode>("detail");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionViewMode, setCollectionViewMode] = useState<CollectionViewMode>("detail");
  const [collectionOnlyMultiOwned, setCollectionOnlyMultiOwned] = useState(false);
  const [selectedCollectionRarity, setSelectedCollectionRarity] = useState("");
  const [selectedCollectionSet, setSelectedCollectionSet] = useState("");
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
  const isViewerMode = mode === "viewer";
  const canManageActiveCollection = !isViewerMode && Boolean(
    sessionUserId && activeUserId && sessionUserId === activeUserId,
  );

  const searchedCards = cards.filter((card) => matchesCollectionQuery(card, deferredQuery));
  const collectionSetOptions = getOwnedSetOptions(searchedCards);
  const visibleCards = searchedCards.filter((card) => {
    if (collectionOnlyMultiOwned && card.quantity < 2) {
      return false;
    }

    if (selectedCollectionRarity) {
      const selectedRarityMeta = rarityOptions.find(
        (rarityMeta) => rarityMeta.filterKey === selectedCollectionRarity,
      );

      if (selectedRarityMeta) {
        if (!selectedRarityMeta.filterValues.includes(card.card.rarity)) {
          return false;
        }
      } else if (card.card.rarity !== selectedCollectionRarity) {
        return false;
      }
    }

    if (selectedCollectionSet && getOwnedSetFilterKey(card.card) !== selectedCollectionSet) {
      return false;
    }

    return true;
  });
  const totalQuantity = cards.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueSets = new Set(cards.map((card) => card.card.setNameKo)).size;

  function getWriteBlockedMessage() {
    if (!activeUserId) {
      return "먼저 카드 열람 탭에서 사용자 목록을 불러와 주세요.";
    }

    if (!sessionUserId) {
      return "로그인 후 본인 목록만 수정할 수 있습니다.";
    }

    if (sessionUserId !== activeUserId) {
      return "로그인한 사용자 본인 목록만 수정할 수 있습니다.";
    }

    return null;
  }

  const loadRarityOptions = useCallback(async (params?: {
    query?: string;
    seriesName?: string;
    setId?: number;
  }) => {
    setIsLoadingRarities(true);
    setRarityError(null);

    try {
      const query = new URLSearchParams();

      if (params?.query?.trim()) {
        query.set("q", params.query.trim());
      }

      if (params?.seriesName?.trim()) {
        query.set("seriesName", params.seriesName.trim());
      }

      if (params?.setId) {
        query.set("setId", String(params.setId));
      }

      const response = await fetch(
        query.size > 0 ? `/api/catalog/rarities?${query.toString()}` : "/api/catalog/rarities",
        {
          cache: "no-store",
        },
      );
      const result = (await response.json()) as ApiResponse<CardRarityMeta[]>;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "카드 레어도 조회에 실패했습니다.");
      }

      setRarityOptions(result.data);

      return result.data;
    } catch (error) {
      setRarityError(error instanceof Error ? error.message : "카드 레어도 조회에 실패했습니다.");
      return null;
    } finally {
      setIsLoadingRarities(false);
    }
  }, []);

  useEffect(() => {
    if (!isCatalogMode) {
      return;
    }

    async function loadInitialFilters() {
      setIsLoadingSeries(true);
      setSeriesError(null);

      const seriesQuery = new URLSearchParams({
        limit: "200",
      });
      const [seriesSettled] = await Promise.allSettled([
        fetch(`/api/catalog/series?${seriesQuery.toString()}`, {
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
    }

    void loadInitialFilters();
    void loadRarityOptions();
  }, [isCatalogMode, loadRarityOptions]);

  useEffect(() => {
    if (!isCollectionMode && !isViewerMode) {
      return;
    }

    void loadRarityOptions();
  }, [isCollectionMode, isViewerMode, loadRarityOptions]);

  useEffect(() => {
    if (lightboxState || (!selectedMaster && !editingCard && !inspectCard)) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedMaster(null);
        setEditingCard(null);
        setInspectCard(null);
        setSubmitError(null);
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [editingCard, inspectCard, lightboxState, selectedMaster]);

  useEffect(() => {
    setSummary({
      activeUserId,
      totalQuantity,
      totalCards: cards.length,
      uniqueSets,
    });
  }, [activeUserId, cards.length, setSummary, totalQuantity, uniqueSets]);

  useEffect(() => {
    if (
      selectedCollectionRarity &&
      !rarityOptions.some((rarity) => rarity.filterKey === selectedCollectionRarity)
    ) {
      setSelectedCollectionRarity("");
    }
  }, [rarityOptions, selectedCollectionRarity]);

  useEffect(() => {
    if (
      selectedCollectionSet &&
      !collectionSetOptions.some((option) => option.key === selectedCollectionSet)
    ) {
      setSelectedCollectionSet("");
    }
  }, [collectionSetOptions, selectedCollectionSet]);

  useEffect(() => {
    if (!isCatalogMode || !pendingCatalogScrollRef.current || isSearchingCatalog) {
      return;
    }

    pendingCatalogScrollRef.current = false;

    window.requestAnimationFrame(() => {
      scrollToCatalogTop();
    });
  }, [catalogPage, catalogResults.length, isCatalogMode, isSearchingCatalog]);

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

  function resolveSelectedRarityWithOptions(
    options: CardRarityMeta[] | null,
    currentSelection: string,
  ) {
    if (!options || !currentSelection) {
      return "";
    }

    const isAvailable = options.some((rarity) => rarity.filterKey === currentSelection);

    return isAvailable ? currentSelection : "";
  }

  const loadUserCollection = useCallback(
    async (rawUserId: string, options?: { restored?: boolean }) => {
      const parsedUserId = userIdSchema.safeParse(rawUserId);

      if (!parsedUserId.success) {
        setLoadError(parsedUserId.error.issues[0]?.message ?? "사용자 ID를 확인해 주세요.");
        return false;
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
        setInspectCard(null);
        setSelectedMaster(null);
        setCollectionOnlyMultiOwned(false);
        setSelectedCollectionRarity("");
        setSelectedCollectionSet("");
        window.localStorage.setItem(LAST_ACTIVE_USER_ID_STORAGE_KEY, result.data.userId);
        setSuccessMessage(
          options?.restored
            ? `사용자 "${result.data.userId}" 목록을 자동으로 불러왔습니다.`
            : `사용자 "${result.data.userId}" 목록을 불러왔습니다.`,
        );
        return true;
      } catch (error) {
        setActiveUserId(null);
        setStoragePath(null);
        setCards([]);
        setEditingCard(null);
        setInspectCard(null);
        setSelectedMaster(null);
        setCollectionOnlyMultiOwned(false);
        setSelectedCollectionRarity("");
        setSelectedCollectionSet("");
        setLoadError(
          error instanceof Error ? error.message : "사용자 카드 목록을 불러오지 못했습니다.",
        );

        if (options?.restored) {
          window.localStorage.removeItem(LAST_ACTIVE_USER_ID_STORAGE_KEY);
        }
        return false;
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

  useEffect(() => {
    if (sessionUserId && !userIdInput) {
      setUserIdInput(sessionUserId);
    }
  }, [sessionUserId, userIdInput]);

  useEffect(() => {
    if (!sessionUserId) {
      autoLoadedSessionUserRef.current = null;
      return;
    }

    if (!isCatalogMode && !isCollectionMode) {
      return;
    }

    if (activeUserId === sessionUserId) {
      autoLoadedSessionUserRef.current = sessionUserId;

      if (userIdInput !== sessionUserId) {
        setUserIdInput(sessionUserId);
      }

      return;
    }

    if (autoLoadedSessionUserRef.current === sessionUserId) {
      return;
    }

    autoLoadedSessionUserRef.current = sessionUserId;
    setUserIdInput(sessionUserId);

    void loadUserCollection(sessionUserId).then((success) => {
      if (!success) {
        autoLoadedSessionUserRef.current = null;
      }
    });
  }, [
    activeUserId,
    isCatalogMode,
    isCollectionMode,
    loadUserCollection,
    sessionUserId,
    userIdInput,
  ]);

  useEffect(() => {
    if (!isCatalogMode) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(max-width: 640px)").matches) {
      setCatalogViewMode("compact");
    }
  }, [isCatalogMode]);

  useEffect(() => {
    if (!isCollectionMode && !isViewerMode) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(max-width: 640px)").matches) {
      setCollectionViewMode("compact");
    }
  }, [isCollectionMode, isViewerMode]);

  async function searchCatalog(
    page = 1,
    nextSeriesName = selectedSeriesName || undefined,
    nextSet = selectedSet,
    nextRarity = selectedRarity,
    raritySourceOptions = rarityOptions,
  ) {
    setIsSearchingCatalog(true);
    setCatalogError(null);

    try {
      const query = new URLSearchParams({
        q: catalogQuery,
        page: String(page),
        pageSize: String(CATALOG_PAGE_SIZE),
      });

      if (nextSeriesName) {
        query.set("seriesName", nextSeriesName);
      }

      if (nextSet) {
        query.set("setId", String(nextSet.id));
      }

      if (nextRarity) {
        const selectedRarityMeta = raritySourceOptions.find(
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

      const nextRarityOptions = await loadRarityOptions({
        query: catalogQuery,
        seriesName: nextSeriesName,
        setId: nextSet?.id,
      });
      setSelectedRarity(resolveSelectedRarityWithOptions(nextRarityOptions, nextRarity));
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
    const nextRarityOptions = await loadRarityOptions({
      query: catalogQuery,
      seriesName: nextSeriesName || undefined,
    });
    const nextRarity = resolveSelectedRarityWithOptions(nextRarityOptions, selectedRarity);
    setSelectedRarity(nextRarity);

    if (nextSeriesName) {
      await loadSeriesSets(nextSeriesName);
    }

    void searchCatalog(
      1,
      nextSeriesName || undefined,
      null,
      nextRarity,
      nextRarityOptions ?? rarityOptions,
    );
  }

  async function handleSetChange(nextSetId: string) {
    if (!nextSetId) {
      setSelectedSet(null);
      setSelectedMaster(null);
      resetCatalogResults();
      const nextRarityOptions = await loadRarityOptions({
        query: catalogQuery,
        seriesName: selectedSeriesName || undefined,
      });
      const nextRarity = resolveSelectedRarityWithOptions(nextRarityOptions, selectedRarity);
      setSelectedRarity(nextRarity);
      void searchCatalog(
        1,
        selectedSeriesName || undefined,
        null,
        nextRarity,
        nextRarityOptions ?? rarityOptions,
      );
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
    const nextRarityOptions = await loadRarityOptions({
      query: catalogQuery,
      seriesName: selectedSeriesName || undefined,
      setId: nextSet.id,
    });
    const nextRarity = resolveSelectedRarityWithOptions(nextRarityOptions, selectedRarity);
    setSelectedRarity(nextRarity);
    void searchCatalog(
      1,
      selectedSeriesName || undefined,
      nextSet,
      nextRarity,
      nextRarityOptions ?? rarityOptions,
    );
  }

  async function handleRarityChange(nextRarity: string) {
    setSelectedRarity(nextRarity);
    setSelectedMaster(null);
    resetCatalogResults();

    const nextRarityOptions = await loadRarityOptions({
      query: catalogQuery,
      seriesName: selectedSeriesName || undefined,
      setId: selectedSet?.id,
    });

    void searchCatalog(
      1,
      selectedSeriesName || undefined,
      selectedSet,
      nextRarity,
      nextRarityOptions ?? rarityOptions,
    );
  }

  function handleCatalogSearch(page = 1) {
    if (page !== catalogPage) {
      pendingCatalogScrollRef.current = true;
      scrollToCatalogTop();
    }

    void searchCatalog(page, selectedSeriesName || undefined, selectedSet, selectedRarity, rarityOptions);
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
    const writeBlockedMessage = getWriteBlockedMessage();

    if (writeBlockedMessage) {
      setSubmitError(writeBlockedMessage);
      return false;
    }

    const targetUserId = activeUserId;

    if (!targetUserId) {
      setSubmitError("먼저 사용자 ID를 입력하고 목록을 불러와 주세요.");
      return false;
    }

    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (editingCard) {
        const updated = await submitToApi(
          `/api/users/${encodeURIComponent(targetUserId)}/collection/${editingCard.id}`,
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
        `/api/users/${encodeURIComponent(targetUserId)}/collection`,
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
    const writeBlockedMessage = getWriteBlockedMessage();

    if (writeBlockedMessage) {
      setSubmitError(writeBlockedMessage);
      return;
    }

    const targetUserId = activeUserId;

    if (!targetUserId) {
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
        `/api/users/${encodeURIComponent(targetUserId)}/collection/${card.id}`,
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
      setInspectCard((current) => (current?.id === card.id ? null : current));
      setSuccessMessage("내 카드에서 삭제했습니다.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "삭제 처리에 실패했습니다.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <section className="app-shell">
      {isViewerMode ? (
        <div className="intro-grid">
          {hero ? hero : null}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>사용자 목록 불러오기</h2>
                <p>
                  아이디를 입력하면 해당 사용자 카드 목록을 열람할 수 있습니다. 이
                  페이지는 읽기 전용으로 사용합니다.
                </p>
              </div>
            </div>

            {loadError ? <div className="alert alert-error">{loadError}</div> : null}

            <div className="identity-grid">
              <div className="field">
                <label htmlFor="userId">사용자 ID</label>
                <input
                  id="userId"
                  value={userIdInput}
                  onChange={(event) => setUserIdInput(event.target.value)}
                  placeholder="예: abcd1234"
                  disabled={isLoadingUser}
                />
              </div>
              <div className="form-actions align-end">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    void loadUserCollection(userIdInput);
                  }}
                  disabled={isLoadingUser}
                >
                  {isLoadingUser ? "불러오는 중..." : "목록 불러오기"}
                </button>
              </div>
            </div>

            {storagePath ? (
              <div className="results-meta">
                <span>{activeUserId} 사용자 목록을 불러왔습니다.</span>
                <span>현재는 열람만 가능합니다.</span>
              </div>
            ) : null}
          </section>
        </div>
      ) : hero ? (
        hero
      ) : null}

      {isCatalogMode ? (
        <>
          <section className="panel" ref={catalogPanelRef}>
            {submitError && !selectedMaster ? (
              <div className="alert alert-error">{submitError}</div>
            ) : null}
            {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

            <CatalogSearchPanel
              query={catalogQuery}
              pending={isSearchingCatalog}
              results={catalogResults}
              viewMode={catalogViewMode}
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
              searchDisabled={false}
              selectionEnabled={canManageActiveCollection}
              selectionDisabledReason={getWriteBlockedMessage()}
              onQueryChange={setCatalogQuery}
              onSearch={() => handleCatalogSearch(1)}
              onPageChange={handleCatalogSearch}
              onViewModeChange={setCatalogViewMode}
              onSeriesChange={(seriesName) => {
                void handleSeriesChange(seriesName);
              }}
              onSetChange={handleSetChange}
              onRarityChange={handleRarityChange}
              onSelect={(card) => {
                const writeBlockedMessage = getWriteBlockedMessage();

                if (writeBlockedMessage) {
                  setSubmitError(writeBlockedMessage);
                  return;
                }

                setSelectedMaster(card);
                setEditingCard(null);
                setInspectCard(null);
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
                    <button
                      className="form-dialog-image-button"
                      type="button"
                      onClick={() => {
                        const imageSrc =
                          selectedMaster.imageUrl ?? getMasterPreviewImageSrc(selectedMaster);

                        if (!imageSrc) {
                          return;
                        }

                        setLightboxState({
                          imageSrc,
                          alt: selectedMaster.cardNameKo,
                          title: selectedMaster.cardNameKo,
                          subtitle: `${selectedMaster.set.setNameKo} · ${selectedMaster.cardNo}`,
                        });
                      }}
                      disabled={!getMasterPreviewImageSrc(selectedMaster)}
                      aria-label={`${selectedMaster.cardNameKo} 이미지 크게 보기`}
                    >
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
                    </button>

                    <div className="catalog-card-meta form-dialog-meta">
                      <span>희귀도 {selectedMaster.rarity}</span>
                      <span>유형 {CARD_TYPE_LABELS[selectedMaster.cardType]}</span>
                      <span>로컬 코드 {selectedMaster.localCode ?? "없음"}</span>
                    </div>

                    <p className="form-dialog-copy">
                      이미지를 누르면 크게 볼 수 있습니다. 마스터 정보는 읽기 전용으로
                      유지되고, 여기서는 내 목록용 수량과 상태, 메모만 저장합니다.
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

      {isCollectionMode || (isViewerMode && activeUserId) ? (
        <>
          <section className="panel list-panel">
            <div className="panel-header">
              <div>
                <h3>{isViewerMode ? "사용자 카드 열람" : "내 카드 목록"}</h3>
                <p>
                  {isViewerMode
                    ? "불러온 사용자 카드 목록을 보고, 사진을 눌러 크게 확인할 수 있습니다."
                    : "검색은 카드명, 세트명, 카드 번호, 로컬 코드, 메모 기준으로 동작합니다."}
                </p>
              </div>
              <div className="collection-toolbar">
                <input
                  value={collectionQuery}
                  onChange={(event) => setCollectionQuery(event.target.value)}
                  placeholder="내 카드 검색"
                />
                <div className="view-switch" role="tablist" aria-label="내 카드 보기 방식">
                  <button
                    className={`view-switch-button ${collectionViewMode === "detail" ? "view-switch-button-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={collectionViewMode === "detail"}
                    onClick={() => setCollectionViewMode("detail")}
                  >
                    상세 보기
                  </button>
                  <button
                    className={`view-switch-button ${collectionViewMode === "compact" ? "view-switch-button-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={collectionViewMode === "compact"}
                    onClick={() => setCollectionViewMode("compact")}
                  >
                    간단 보기
                  </button>
                </div>
                <div className="collection-filter-grid">
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={collectionOnlyMultiOwned}
                      onChange={(event) => setCollectionOnlyMultiOwned(event.target.checked)}
                    />
                    <span>2개 이상만 보기</span>
                  </label>

                  <div className="field">
                    <label htmlFor="collectionRarity">레어도</label>
                    <select
                      id="collectionRarity"
                      value={selectedCollectionRarity}
                      onChange={(event) => setSelectedCollectionRarity(event.target.value)}
                      disabled={isLoadingRarities}
                    >
                      <option value="">
                        {isLoadingRarities ? "레어도 불러오는 중..." : "전체 레어도"}
                      </option>
                      {rarityOptions.map((rarity) => (
                        <option key={rarity.filterKey} value={rarity.filterKey}>
                          {getRarityFilterLabel(rarity)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="collectionSetFilter">카드 세트</label>
                    <select
                      id="collectionSetFilter"
                      value={selectedCollectionSet}
                      onChange={(event) => setSelectedCollectionSet(event.target.value)}
                    >
                      <option value="">전체 카드 세트</option>
                      {collectionSetOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {submitError && !editingCard ? (
              <div className="alert alert-error">{submitError}</div>
            ) : null}
            {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

            <div className="results-meta">
              <span>{visibleCards.length}개 표시</span>
              <span>
                {isViewerMode
                  ? "이 페이지에서는 열람만 가능합니다."
                  : canManageActiveCollection
                  ? "카드를 누르면 수정 창이 열립니다."
                  : "현재는 열람만 가능합니다."}
              </span>
              <span>사진을 누르면 카드 상세 정보가 열립니다.</span>
            </div>

            <OwnedCardGrid
              cards={visibleCards}
              activeUserId={activeUserId}
              editable={isViewerMode ? false : canManageActiveCollection}
              readOnlyReason={
                isViewerMode
                  ? "카드 열람 페이지에서는 수정할 수 없습니다."
                  : getWriteBlockedMessage()
              }
              emptyHint={
                isViewerMode
                  ? null
                  : "카드 검색 페이지에서 카드를 선택해서 내 목록에 추가해 보세요."
              }
              missingUserMessage="카드 열람 탭에서 사용자 ID를 불러오면 카드 목록을 표시할 수 있습니다."
              viewMode={collectionViewMode}
              selectedCardId={editingCard?.id ?? inspectCard?.id ?? null}
              pendingId={pendingDeleteId}
              onEdit={(card) => {
                setEditingCard(card);
                setSelectedMaster(null);
                setInspectCard(null);
                setSubmitError(null);
                setSuccessMessage(null);
              }}
              onInspect={(card) => {
                setInspectCard(card);
                setEditingCard(null);
                setSelectedMaster(null);
                setSubmitError(null);
                setSuccessMessage(null);
              }}
              onDelete={handleDelete}
            />
          </section>

          {inspectCard ? (
            <OwnedCardDetailDialog
              card={inspectCard}
              editable={isCollectionMode && canManageActiveCollection}
              onClose={() => {
                setInspectCard(null);
              }}
              onOpenImage={() => {
                const imageSrc = inspectCard.card.imageUrl ?? getOwnedPreviewImageSrc(inspectCard);

                if (!imageSrc) {
                  return;
                }

                setLightboxState({
                  imageSrc,
                  alt: inspectCard.card.cardNameKo,
                  title: inspectCard.card.cardNameKo,
                  subtitle: `${inspectCard.card.setNameKo} · ${inspectCard.card.cardNo}`,
                });
              }}
              onEdit={
                isCollectionMode && canManageActiveCollection
                  ? () => {
                      setEditingCard(inspectCard);
                      setInspectCard(null);
                    }
                  : undefined
              }
            />
          ) : null}

          {isCollectionMode && editingCard ? (
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
                    <button
                      className="form-dialog-image-button"
                      type="button"
                      onClick={() => {
                        const imageSrc = editingCard.card.imageUrl ?? getOwnedPreviewImageSrc(editingCard);

                        if (!imageSrc) {
                          return;
                        }

                        setLightboxState({
                          imageSrc,
                          alt: editingCard.card.cardNameKo,
                          title: editingCard.card.cardNameKo,
                          subtitle: `${editingCard.card.setNameKo} · ${editingCard.card.cardNo}`,
                        });
                      }}
                      disabled={!getOwnedPreviewImageSrc(editingCard)}
                      aria-label={`${editingCard.card.cardNameKo} 이미지 크게 보기`}
                    >
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
                    </button>

                    <div className="catalog-card-meta form-dialog-meta">
                      <span>보유 수량 {editingCard.quantity}</span>
                      <span>상태 {CARD_CONDITION_LABELS[editingCard.condition]}</span>
                      <span>구매일 {formatOwnedDate(editingCard.acquiredAt)}</span>
                    </div>

                    <p className="form-dialog-copy">
                      이미지를 누르면 크게 볼 수 있습니다. 저장된 내 카드 기록을 수정하고,
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

      {lightboxState ? (
        <ImageLightbox
          alt={lightboxState.alt}
          imageSrc={lightboxState.imageSrc}
          title={lightboxState.title}
          subtitle={lightboxState.subtitle}
          onClose={() => {
            setLightboxState(null);
          }}
        />
      ) : null}
    </section>
  );
}
