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
    Functions: {
      open_wager: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          host_token: string;
        }[];
      };
      claim_wager: {
        Args: {
          p_code: string;
        };
        Returns: {
          guest_token: string | null;
          reason: string;
        }[];
      };
      resume_wager: {
        Args: {
          p_code: string;
          p_token: string;
        };
        Returns: {
          seat: string;
          status: string;
        }[];
      };
      confirm_guest: {
        Args: {
          p_code: string;
          p_host_token: string;
          p_guest_token: string;
        };
        Returns: boolean;
      };
      mark_wager: {
        Args: {
          p_code: string;
          p_host_token: string;
          p_status: string;
        };
        Returns: boolean;
      };
      open_chart: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          host_token: string;
        }[];
      };
      claim_chart: {
        Args: {
          p_code: string;
        };
        Returns: {
          guest_token: string | null;
          reason: string;
        }[];
      };
      resume_chart: {
        Args: {
          p_code: string;
          p_token: string;
        };
        Returns: {
          ok: boolean;
          reason?: string;
          seat?: string;
          status?: string;
          youLocked?: boolean;
          opponentLocked?: boolean;
          yourFleet?: unknown;
          turn?: string | null;
          winner?: string | null;
          shots?: unknown;
        };
      };
      lock_chart: {
        Args: {
          p_code: string;
          p_token: string;
          p_fleet: {
            name: string;
            x: number;
            y: number;
            dir: string;
          }[];
        };
        Returns: {
          ok: boolean;
          both?: boolean;
          reason?: string;
          seat?: string;
        };
      };
      fire_chart: {
        Args: {
          p_code: string;
          p_token: string;
          p_x: number;
          p_y: number;
        };
        Returns: {
          ok: boolean;
          reason?: string;
          result?: string;
          ship?: string | null;
          cells?: unknown;
          winner?: string | null;
          turn?: string | null;
        };
      };
      abandon_chart: {
        Args: {
          p_code: string;
          p_token: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
