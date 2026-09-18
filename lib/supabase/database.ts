export type ParlorProfile = {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type ParlorScore = {
  id: number;
  user_id: string;
  game: string;
  score: number;
  duration_ms: number;
  grid_size: number;
  created_at: string;
};

type ParlorProfilesTable = {
  Row: ParlorProfile;
  Insert: {
    id: string;
    display_name: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    display_name?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
};

type ParlorScoresTable = {
  Row: ParlorScore;
  Insert: {
    id?: number;
    user_id: string;
    game?: string;
    score: number;
    duration_ms: number;
    grid_size?: number;
    created_at?: string;
  };
  Update: {
    id?: number;
    user_id?: string;
    game?: string;
    score?: number;
    duration_ms?: number;
    grid_size?: number;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "parlor_scores_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "parlor_profiles";
      referencedColumns: ["id"];
    },
  ];
};

export type Database = {
  public: {
    Tables: {
      parlor_profiles: ParlorProfilesTable;
      parlor_scores: ParlorScoresTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
