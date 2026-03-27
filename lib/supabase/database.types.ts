export type Database = {
  public: {
    Tables: {
      card_rarity_meta: {
        Row: {
          rarity_name: string;
          rarity_code: string | null;
          display_name_ko: string | null;
          display_name_en: string | null;
          sort_order: number | null;
          badge_tone: string | null;
        };
        Insert: {
          rarity_name: string;
          rarity_code?: string | null;
          display_name_ko?: string | null;
          display_name_en?: string | null;
          sort_order?: number | null;
          badge_tone?: string | null;
        };
        Update: {
          rarity_name?: string;
          rarity_code?: string | null;
          display_name_ko?: string | null;
          display_name_en?: string | null;
          sort_order?: number | null;
          badge_tone?: string | null;
        };
        Relationships: [];
      };
      card_sets: {
        Row: {
          id: number;
          game: string;
          language: string;
          set_code: string | null;
          set_name_ko: string;
          set_name_en: string | null;
          series_name: string | null;
          release_date: string | null;
          total_cards: number | null;
          logo_url: string | null;
          symbol_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          game?: string;
          language?: string;
          set_code?: string | null;
          set_name_ko: string;
          set_name_en?: string | null;
          series_name?: string | null;
          release_date?: string | null;
          total_cards?: number | null;
          logo_url?: string | null;
          symbol_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          game?: string;
          language?: string;
          set_code?: string | null;
          set_name_ko?: string;
          set_name_en?: string | null;
          series_name?: string | null;
          release_date?: string | null;
          total_cards?: number | null;
          logo_url?: string | null;
          symbol_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          id: number;
          game: string;
          language: string;
          set_id: number;
          card_no: string;
          local_code: string | null;
          card_name_ko: string;
          card_name_en: string | null;
          card_name_jp: string | null;
          rarity: string;
          card_type: "pokemon" | "trainer" | "energy";
          subtypes: string[] | null;
          hp: number | null;
          element_types: string[] | null;
          regulation_mark: string | null;
          artist: string | null;
          image_url: string | null;
          thumbnail_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          game?: string;
          language?: string;
          set_id: number;
          card_no: string;
          local_code?: string | null;
          card_name_ko: string;
          card_name_en?: string | null;
          card_name_jp?: string | null;
          rarity: string;
          card_type: "pokemon" | "trainer" | "energy";
          subtypes?: string[] | null;
          hp?: number | null;
          element_types?: string[] | null;
          regulation_mark?: string | null;
          artist?: string | null;
          image_url?: string | null;
          thumbnail_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          game?: string;
          language?: string;
          set_id?: number;
          card_no?: string;
          local_code?: string | null;
          card_name_ko?: string;
          card_name_en?: string | null;
          card_name_jp?: string | null;
          rarity?: string;
          card_type?: "pokemon" | "trainer" | "energy";
          subtypes?: string[] | null;
          hp?: number | null;
          element_types?: string[] | null;
          regulation_mark?: string | null;
          artist?: string | null;
          image_url?: string | null;
          thumbnail_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cards_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "card_sets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
