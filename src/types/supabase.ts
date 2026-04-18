export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          affiliate_link_id: string | null
          clicked_at: string
          id: string
          ip_hash: string | null
          product_id: string | null
          referer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_link_id?: string | null
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          product_id?: string | null
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_link_id?: string | null
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          product_id?: string | null
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          created_at: string
          currency: string
          id: string
          last_checked_at: string | null
          network: string
          price_current: number | null
          product_id: string
          region: string
          retailer: string
          url_template: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          last_checked_at?: string | null
          network: string
          price_current?: number | null
          product_id: string
          region: string
          retailer: string
          url_template: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          last_checked_at?: string | null
          network?: string
          price_current?: number | null
          product_id?: string
          region?: string
          retailer?: string
          url_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          cards_json: Json | null
          completion_tokens: number | null
          content_md: string
          created_at: string
          id: string
          latency_ms: number | null
          llm_model: string | null
          llm_provider: string | null
          prompt_tokens: number | null
          rag_chunks_used: number | null
          role: string
          session_id: string
        }
        Insert: {
          cards_json?: Json | null
          completion_tokens?: number | null
          content_md: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          llm_model?: string | null
          llm_provider?: string | null
          prompt_tokens?: number | null
          rag_chunks_used?: number | null
          role: string
          session_id: string
        }
        Update: {
          cards_json?: Json | null
          completion_tokens?: number | null
          content_md?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          llm_model?: string | null
          llm_provider?: string | null
          prompt_tokens?: number | null
          rag_chunks_used?: number | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      llm_usage: {
        Row: {
          completion_tokens: number
          day: string
          model: string
          prompt_tokens: number
          provider: string
          request_count: number
        }
        Insert: {
          completion_tokens?: number
          day: string
          model: string
          prompt_tokens?: number
          provider: string
          request_count?: number
        }
        Update: {
          completion_tokens?: number
          day?: string
          model?: string
          prompt_tokens?: number
          provider?: string
          request_count?: number
        }
        Relationships: []
      }
      long_tail_misses: {
        Row: {
          created_at: string
          detected_product_hint: string | null
          id: string
          query_text: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detected_product_hint?: string | null
          id?: string
          query_text: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detected_product_hint?: string | null
          id?: string
          query_text?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          id: string
          user_id: string
          product_id: string
          rating: number
          body: string | null
          status: string
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          rating: number
          body?: string | null
          status?: string
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          rating?: number
          body?: string | null
          status?: string
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_comments: {
        Row: {
          id: string
          user_id: string
          product_id: string
          body: string
          status: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          body: string
          status?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          body?: string
          status?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          ai_tone: string
          preferences_json: Json
          review_count: number
          trust_score: number
          onboarded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          ai_tone?: string
          preferences_json?: Json
          review_count?: number
          trust_score?: number
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          ai_tone?: string
          preferences_json?: Json
          review_count?: number
          trust_score?: number
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string
          category: string
          category_path: string
          created_at: string
          editorial_notes: string | null
          id: string
          image_url: string | null
          model: string
          slug: string
          specs_json: Json | null
          summary_en: string | null
          summary_sv: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          category: string
          category_path: string
          created_at?: string
          editorial_notes?: string | null
          id?: string
          image_url?: string | null
          model: string
          slug: string
          specs_json?: Json | null
          summary_en?: string | null
          summary_sv?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string
          category_path?: string
          created_at?: string
          editorial_notes?: string | null
          id?: string
          image_url?: string | null
          model?: string
          slug?: string
          specs_json?: Json | null
          summary_en?: string | null
          summary_sv?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_chunks: {
        Row: {
          chunk_text: string
          created_at: string
          embedding: string | null
          id: string
          product_id: string | null
          source_id: string | null
        }
        Insert: {
          chunk_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          product_id?: string | null
          source_id?: string | null
        }
        Update: {
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          product_id?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_chunks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "review_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sources: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          published_at: string | null
          publisher: string
          rating_normalized: number | null
          raw_text: string | null
          source_type: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          published_at?: string | null
          publisher: string
          rating_normalized?: number | null
          raw_text?: string | null
          source_type: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          published_at?: string | null
          publisher?: string
          rating_normalized?: number | null
          raw_text?: string | null
          source_type?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_sources_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memory: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          value_text: string
        }
        Insert: {
          key: string
          updated_at?: string
          user_id: string
          value_text: string
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          value_text?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_llm_usage: {
        Args: {
          p_completion_tokens: number
          p_day: string
          p_model: string
          p_prompt_tokens: number
          p_provider: string
          p_requests: number
        }
        Returns: undefined
      }
      match_review_chunks: {
        Args: { match_limit?: number; query_embedding: string }
        Returns: {
          chunk_text: string
          id: string
          product_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
