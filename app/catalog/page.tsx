import { CardListApp } from "@/components/card-list-app";
import { PageHero } from "@/components/page-hero";

export default function CatalogPage() {
  return (
    <main className="page-shell">
      <PageHero
        title="카드 검색하고 내 목록에 담기"
        description="시리즈, 세트, 레어도 기준으로 카드 마스터를 찾고 내 보유 카드로 바로 저장할 수 있습니다."
        noteLabel="빠른 사용"
        noteValue="카드를 누르면 바로 추가할 수 있습니다."
      />

      <CardListApp mode="catalog" />
    </main>
  );
}
