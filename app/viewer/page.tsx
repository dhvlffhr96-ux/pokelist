import { CardListApp } from "@/components/card-list-app";
import { PageHero } from "@/components/page-hero";

export default function ViewerPage() {
  return (
    <main className="page-shell">
      <CardListApp
        mode="viewer"
        hero={
          <PageHero
            title="사용자 카드 열람"
            description="아이디를 입력하면 해당 사용자의 카드 목록을 불러와 사진과 수량을 한 번에 확인할 수 있습니다."
            noteLabel="읽기 전용"
            noteValue="이 페이지에서는 수정 없이 목록만 확인합니다."
          />
        }
      />
    </main>
  );
}
