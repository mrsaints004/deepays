export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          x_id: string | null;
          x_username: string;
          x_avatar_url: string;
          is_admin: boolean;
          created_at: string;
          last_login: string;
          wallet_address: string | null;
          auth_id: string | null;
          email: string | null;
        };
        Insert: {
          x_username: string;
          last_login: string;
          x_id?: string | null;
          x_avatar_url?: string;
          auth_id?: string | null;
          email?: string | null;
          wallet_address?: string | null;
        };
        Update: {
          id?: string;
          x_id?: string | null;
          x_username?: string;
          x_avatar_url?: string;
          is_admin?: boolean;
          created_at?: string;
          last_login?: string;
          wallet_address?: string | null;
          auth_id?: string | null;
          email?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          action_url: string;
          reward_usd: number;
          status: "active" | "paused" | "expired";
          expires_at: string | null;
          created_at: string;
          category: string;
          max_participants: number | null;
        };
        Insert: {
          title: string;
          description: string;
          action_url: string;
          reward_usd: number;
          status: "active" | "paused" | "expired";
          expires_at?: string | null;
          category?: string;
          max_participants?: number | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          action_url?: string;
          reward_usd?: number;
          status?: "active" | "paused" | "expired";
          expires_at?: string | null;
          created_at?: string;
          category?: string;
          max_participants?: number | null;
        };
      };
      completions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          completed_at: string;
          week_start: string;
          proof_url: string | null;
          proof_image_url: string | null;
          review_status: "pending_review" | "approved" | "rejected";
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewer_note: string | null;
        };
        Insert: {
          user_id: string;
          task_id: string;
          week_start: string;
          proof_url?: string | null;
          proof_image_url?: string | null;
          review_status?: "pending_review" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          completed_at?: string;
          week_start?: string;
          proof_url?: string | null;
          proof_image_url?: string | null;
          review_status?: "pending_review" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_note?: string | null;
        };
      };
      weekly_payouts: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          total_usd: number;
          status: "pending" | "processing" | "paid";
          tx_hash: string | null;
          paid_at: string | null;
          paid_amount_usdc: number | null;
        };
        Insert: {
          user_id: string;
          week_start: string;
          total_usd: number;
          status: "pending" | "processing" | "paid";
          tx_hash?: string | null;
          paid_at?: string | null;
          paid_amount_usdc?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          total_usd?: number;
          status?: "pending" | "processing" | "paid";
          tx_hash?: string | null;
          paid_at?: string | null;
          paid_amount_usdc?: number | null;
        };
      };
      payout_transactions: {
        Row: {
          id: string;
          payout_id: string;
          user_id: string;
          wallet_address: string;
          amount_usdc: number;
          tx_hash: string | null;
          status: "pending" | "submitted" | "confirmed" | "failed";
          error_message: string | null;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          payout_id: string;
          user_id: string;
          wallet_address: string;
          amount_usdc: number;
          tx_hash?: string | null;
          status: "pending" | "submitted" | "confirmed" | "failed";
          error_message?: string | null;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          payout_id?: string;
          user_id?: string;
          wallet_address?: string;
          amount_usdc?: number;
          tx_hash?: string | null;
          status?: "pending" | "submitted" | "confirmed" | "failed";
          error_message?: string | null;
          created_at?: string;
          confirmed_at?: string | null;
        };
      };
    };
  };
}

export type User = Database["public"]["Tables"]["users"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Completion = Database["public"]["Tables"]["completions"]["Row"];
export type WeeklyPayout =
  Database["public"]["Tables"]["weekly_payouts"]["Row"];
export type PayoutTransaction =
  Database["public"]["Tables"]["payout_transactions"]["Row"];
