/**
 * Hand-authored to match supabase/migrations/. Kept in sync by hand for v1;
 * regenerate with `supabase gen types typescript` once the CLI is set up.
 *
 * Each table is declared via standalone Row/Insert types (no self-referential
 * indexed access), which keeps `Database["public"]` structurally matching
 * postgrest-js's GenericSchema so `.insert()/.upsert()` stay typed.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// user_profiles
type UserProfileRow = {
  user_id: string;
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  logo_url: string | null;
  updated_at: string;
}
type UserProfileInsert = {
  user_id: string;
  business_name?: string;
  business_address?: string | null;
  business_phone?: string | null;
  logo_url?: string | null;
  updated_at?: string;
}

// user_dimensions
type UserDimensionsRow = {
  user_id: string;
  patia_lengths_ft: number[];
  patia_widths_in: number[];
  patia_thicknesses_in: number[];
  pawa_lengths_in: number[];
  pawa_sizes: number[];
}
type UserDimensionsInsert = {
  user_id: string;
  patia_lengths_ft?: number[];
  patia_widths_in?: number[];
  patia_thicknesses_in?: number[];
  pawa_lengths_in?: number[];
  pawa_sizes?: number[];
}

// projects
type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  client_name: string | null;
  client_address: string | null;
  project_date: string;
  notes: string | null;
  public_share_id: string | null;
  created_at: string;
  updated_at: string;
}
type ProjectInsert = {
  id?: string;
  user_id: string;
  name: string;
  client_name?: string | null;
  client_address?: string | null;
  project_date?: string;
  notes?: string | null;
  public_share_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// patia_entries
type PatiaEntryRow = {
  id: string;
  project_id: string;
  length_ft: number;
  width_in: number;
  thickness_in: number;
  quantity: number;
}
type PatiaEntryInsert = {
  id?: string;
  project_id: string;
  length_ft: number;
  width_in: number;
  thickness_in: number;
  quantity: number;
}

// pawa_entries
type PawaEntryRow = {
  id: string;
  project_id: string;
  length_in: number;
  size_side: number;
  quantity: number;
}
type PawaEntryInsert = {
  id?: string;
  project_id: string;
  length_in: number;
  size_side: number;
  quantity: number;
}

// price_configs
type PriceConfigRow = {
  project_id: string;
  frame_3_4: number;
  patia_1_5_to_4: number;
  patia_4_5_to_5: number;
  patia_5_5_to_up: number;
  pawa: number;
}
type PriceConfigInsert = {
  project_id: string;
  frame_3_4?: number;
  patia_1_5_to_4?: number;
  patia_4_5_to_5?: number;
  patia_5_5_to_up?: number;
  pawa?: number;
}

// project_snapshots
type ProjectSnapshotRow = {
  id: string;
  project_id: string;
  label: string | null;
  data: Json;
  created_at: string;
}
type ProjectSnapshotInsert = {
  id?: string;
  project_id: string;
  label?: string | null;
  data: Json;
  created_at?: string;
}

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: Partial<UserProfileInsert>;
        Relationships: [];
      };
      user_dimensions: {
        Row: UserDimensionsRow;
        Insert: UserDimensionsInsert;
        Update: Partial<UserDimensionsInsert>;
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: Partial<ProjectInsert>;
        Relationships: [];
      };
      patia_entries: {
        Row: PatiaEntryRow;
        Insert: PatiaEntryInsert;
        Update: Partial<PatiaEntryInsert>;
        Relationships: [];
      };
      pawa_entries: {
        Row: PawaEntryRow;
        Insert: PawaEntryInsert;
        Update: Partial<PawaEntryInsert>;
        Relationships: [];
      };
      price_configs: {
        Row: PriceConfigRow;
        Insert: PriceConfigInsert;
        Update: Partial<PriceConfigInsert>;
        Relationships: [];
      };
      project_snapshots: {
        Row: ProjectSnapshotRow;
        Insert: ProjectSnapshotInsert;
        Update: Partial<ProjectSnapshotInsert>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      owns_project: {
        Args: { pid: string };
        Returns: boolean;
      };
      restore_snapshot: {
        Args: { snapshot_id: string };
        Returns: undefined;
      };
      get_shared_project: {
        Args: { share_token: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
