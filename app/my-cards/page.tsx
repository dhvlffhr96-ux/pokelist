import { CardListApp } from "@/components/card-list-app";
import { PageHero } from "@/components/page-hero";

export default function MyCardsPage() {
  return (
    <main className="page-shell">
      <CardListApp
        mode="collection"
        hero={
          <PageHero
            title="내 카드 목록 관리"
            description="저장해 둔 카드 목록을 한 페이지에서 보고, 이미지 미리보기와 수량, 상태, 메모를 바로 수정할 수 있습니다."
            noteLabel="빠른 관리"
            noteValue="카드를 누르면 바로 수정할 수 있습니다."
          />
        }
      />
    </main>
  );
}
