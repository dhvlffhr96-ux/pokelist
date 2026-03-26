import { CardListApp } from "@/components/card-list-app";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Pokelist</p>
        <div className="hero-grid">
          <div>
            <h1>내가 가진 카드 한눈에 보기</h1>

          </div>
          <div className="hero-note">
            <span>구조</span>
            <strong>Read: Supabase / Write: Storage</strong>
          </div>
        </div>
      </section>

      <CardListApp
        catalogSourceLabel="Supabase public.card_sets + public.cards"
        personalStorageLabel="Supabase Storage user-collections/<userId>.json"
      />
    </main>
  );
}
