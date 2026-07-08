/**
 * Handgeschreven database-types, gespiegeld aan
 * supabase/migrations/0001_init_schema.sql. Bij schemawijzigingen: eerst de
 * migratie aanpassen, dan dit bestand bijwerken (of vervangen door
 * `supabase gen types typescript` zodra de Supabase CLI aan het project
 * gelinkt is).
 */
export interface Database {
  public: {
    Tables: {
      organisaties: {
        Row: {
          id: string;
          naam: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          naam: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organisaties"]["Insert"]>;
      };
      teams: {
        Row: {
          id: string;
          organisatie_id: string;
          naam: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisatie_id: string;
          naam: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      scanrondes: {
        Row: {
          id: string;
          organisatie_id: string;
          naam: string;
          gestart_op: string | null;
          gesloten_op: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisatie_id: string;
          naam: string;
          gestart_op?: string | null;
          gesloten_op?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scanrondes"]["Insert"]>;
      };
      respondenten: {
        Row: {
          id: string;
          scanronde_id: string;
          team_id: string | null;
          respondent_code: string;
          email: string | null;
          stellingen_versie: string;
          open_vraag_antwoord: string | null;
          gestart_op: string;
          afgerond_op: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scanronde_id: string;
          team_id?: string | null;
          respondent_code: string;
          email?: string | null;
          stellingen_versie: string;
          open_vraag_antwoord?: string | null;
          gestart_op?: string;
          afgerond_op?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["respondenten"]["Insert"]>;
      };
      antwoorden: {
        Row: {
          id: string;
          respondent_id: string;
          stelling_key: string;
          waarde: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          respondent_id: string;
          stelling_key: string;
          waarde: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["antwoorden"]["Insert"]>;
      };
    };
  };
}
