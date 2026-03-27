import { CardListApp } from "@/components/card-list-app";
import { PageHero } from "@/components/page-hero";

export default function MyCardsPage() {
  return (
    <main className="page-shell">
      <PageHero
        title="내 카드 목록 관리"
        description="저장해 둔 카드 목록을 한 페이지에서 보고, 이미지 미리보기와 수량, 상태, 메모를 바로 수정할 수 있습니다."
        noteLabel="저장 위치"
        noteValue="Supabase Storage card_list/<userId>.json"
      />

      <CardListApp
        mode="collection"
        catalogSourceLabel="Supabase public.card_sets + public.cards"
        personalStorageLabel="Supabase Storage card_list/<userId>.json"
      />
    </main>
  );
}
