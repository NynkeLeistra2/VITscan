/**
 * Handgeschreven database-types, gespiegeld aan
 * supabase/migrations/0001_init_schema.sql. Bij schemawijzigingen: eerst de
 * migratie aanpassen, dan dit bestand bijwerken (of vervangen door
 * `supabase gen types typescript` zodra de Supabase CLI aan het project
 * gelinkt is). De `Relationships`-arrays zijn nodig zodat supabase-js
 * embedded selects (bv. `organisaties(naam)`) correct kan typen.
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "teams_organisatie_id_fkey";
            columns: ["organisatie_id"];
            isOneToOne: false;
            referencedRelation: "organisaties";
            referencedColumns: ["id"];
          },
        ];
      };
      scanrondes: {
        Row: {
          id: string;
          organisatie_id: string | null;
          naam: string;
          gestart_op: string | null;
          gesloten_op: string | null;
          email_verplicht: boolean;
          boost_ingeschakeld: boolean;
          gearchiveerd_op: string | null;
          individuele_gegevens_bewaren: boolean;
          start_limiet_per_ip: number | null;
          bewaartermijn_verlengd_tot: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisatie_id?: string | null;
          naam: string;
          gestart_op?: string | null;
          gesloten_op?: string | null;
          email_verplicht?: boolean;
          boost_ingeschakeld?: boolean;
          gearchiveerd_op?: string | null;
          individuele_gegevens_bewaren?: boolean;
          start_limiet_per_ip?: number | null;
          bewaartermijn_verlengd_tot?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scanrondes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "scanrondes_organisatie_id_fkey";
            columns: ["organisatie_id"];
            isOneToOne: false;
            referencedRelation: "organisaties";
            referencedColumns: ["id"];
          },
        ];
      };
      // Geen enkele policy (zie supabase/migrations/0001_init_schema.sql) --
      // dus geen .from("respondenten") in de app, altijd via de functies
      // hieronder. Deze Row/Insert-vorm staat er alleen voor volledigheid.
      // Bewust geen naam/email/respondent_code (meer): sinds
      // 0008_scan_volledig_anoniem.sql staat er niets meer in deze tabel dat
      // een antwoord naar een persoon terug kan leiden.
      respondenten: {
        Row: {
          id: string;
          scanronde_id: string;
          team_id: string | null;
          toegangstoken: string;
          stellingen_versie: string;
          rapport_mail_pogingen: number;
          gestart_op: string;
          afgerond_op: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scanronde_id: string;
          team_id?: string | null;
          toegangstoken?: string;
          stellingen_versie: string;
          rapport_mail_pogingen?: number;
          gestart_op?: string;
          afgerond_op?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["respondenten"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "respondenten_scanronde_id_fkey";
            columns: ["scanronde_id"];
            isOneToOne: false;
            referencedRelation: "scanrondes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "respondenten_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "antwoorden_respondent_id_fkey";
            columns: ["respondent_id"];
            isOneToOne: false;
            referencedRelation: "respondenten";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      // Geen token nog beschikbaar op dit moment (intro, vóór starten) --
      // werkt op de twee id's die al in de link staan. Geeft null-achtige
      // (geen rijen) terug bij een ongeldige/gearchiveerde combinatie.
      haal_scan_context: {
        Args: {
          p_scanronde_id: string;
          p_team_id?: string | null;
        };
        Returns: {
          scanronde_naam: string;
          organisatie_naam: string | null;
          team_naam: string | null;
          email_verplicht: boolean;
          boost_ingeschakeld: boolean;
        }[];
      };
      // Maakt de respondent aan en geeft het toegangstoken terug -- dat
      // token is vanaf hier het enige dat de browser gebruikt. Geen
      // naam/code meer: die worden nergens meer opgeslagen.
      start_respondent: {
        Args: {
          p_scanronde_id: string;
          p_team_id: string | null;
          p_stellingen_versie: string;
        };
        Returns: string;
      };
      upsert_antwoorden: {
        Args: {
          p_token: string;
          p_antwoorden: Record<string, number>;
        };
        Returns: void;
      };
      // Zet alleen nog afgerond_op. Het e-mailadres gaat rechtstreeks naar
      // de mailroute, nooit via de database.
      rond_respondent_af: {
        Args: {
          p_token: string;
        };
        Returns: void;
      };
      // Poortwachter voor /api/verstuur-resultaten: true als het token bij
      // een echt afgeronde respondent hoort én de teller (max. 5) nog niet
      // vol is. Telt in dezelfde aanroep meteen mee.
      mag_rapport_versturen: {
        Args: {
          p_token: string;
        };
        Returns: boolean;
      };
      // Zelfbediening: de deelnemer verwijdert zijn eigen respondent +
      // antwoorden met zijn eigen token, geen login nodig.
      verwijder_mijn_antwoorden: {
        Args: {
          p_token: string;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
