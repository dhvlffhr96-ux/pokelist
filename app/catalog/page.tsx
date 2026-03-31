import { CardListApp } from "@/components/card-list-app";
import { PageHero } from "@/components/page-hero";

export default function CatalogPage() {
  return (
    <main className="page-shell">
      <CardListApp
        mode="catalog"
        hero={
          <PageHero
            title="카드 검색하고 내 목록에 담기"
            description="시리즈와 레어도 기준으로 카드 마스터를 찾고 내 보유 카드로 바로 저장할 수 있습니다."
            noteLabel="안내 말씀"
            noteValue="미국 카드 기준으로 레어도나 이름이 맞지 않을 수 있습니다."
          />
        }
      />
    </main>
  );
}
