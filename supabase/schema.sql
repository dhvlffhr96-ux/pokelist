-- Pokelist master catalog reference schema
-- Supabase에서는 이 테이블들을 읽기 전용으로 사용합니다.

create table if not exists public.card_sets (
  id bigserial primary key,

  game varchar(30) not null default 'pokemon',
  language varchar(10) not null default 'ko',

  set_code varchar(50),
  set_name_ko varchar(200) not null,
  set_name_en varchar(200),
  series_name varchar(200),
  release_date date,
  total_cards integer,
  logo_url text,
  symbol_url text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id bigserial primary key,

  game varchar(30) not null default 'pokemon',
  language varchar(10) not null default 'ko',
  set_id bigint not null references public.card_sets(id) on delete restrict,

  card_no varchar(50) not null,
  local_code varchar(100),

  card_name_ko varchar(200) not null,
  card_name_en varchar(200),
  card_name_jp varchar(200),

  rarity varchar(50) not null,
  card_type varchar(30) not null,
  subtypes text[],
  hp integer,
  element_types text[],
  regulation_mark varchar(10),
  artist varchar(200),
  image_url text,
  thumbnail_url text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_cards_unique
    unique (game, language, set_id, card_no),
  constraint chk_cards_card_type
    check (card_type in ('pokemon', 'trainer', 'energy'))
);

create index if not exists idx_card_sets_lookup
  on public.card_sets (game, language, is_active, set_name_ko);

create index if not exists idx_cards_lookup
  on public.cards (game, language, is_active, card_name_ko);

create index if not exists idx_cards_set_id
  on public.cards (set_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_card_sets_updated_at on public.card_sets;
create trigger trg_card_sets_updated_at
before update on public.card_sets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_cards_updated_at on public.cards;
create trigger trg_cards_updated_at
before update on public.cards
for each row
execute function public.set_updated_at();
