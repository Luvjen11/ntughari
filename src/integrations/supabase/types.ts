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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      letter_examples: {
        Row: {
          created_at: string
          english_translation: string
          id: string
          igbo_word: string
          letter_id: string
        }
        Insert: {
          created_at?: string
          english_translation: string
          id?: string
          igbo_word: string
          letter_id: string
        }
        Update: {
          created_at?: string
          english_translation?: string
          id?: string
          igbo_word?: string
          letter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "letter_examples_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
        ]
      }
      letters: {
        Row: {
          character: string
          created_at: string
          id: string
          order_index: number
          pronunciation_tip: string | null
        }
        Insert: {
          character: string
          created_at?: string
          id?: string
          order_index: number
          pronunciation_tip?: string | null
        }
        Update: {
          character?: string
          created_at?: string
          id?: string
          order_index?: number
          pronunciation_tip?: string | null
        }
        Relationships: []
      }
      phrase_parts: {
        Row: {
          created_at: string
          english_meaning: string
          grammar_note: string | null
          id: string
          igbo_word: string
          order_index: number
          phrase_id: string
        }
        Insert: {
          created_at?: string
          english_meaning: string
          grammar_note?: string | null
          id?: string
          igbo_word: string
          order_index?: number
          phrase_id: string
        }
        Update: {
          created_at?: string
          english_meaning?: string
          grammar_note?: string | null
          id?: string
          igbo_word?: string
          order_index?: number
          phrase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrase_parts_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
        ]
      }
      phrases: {
        Row: {
          created_at: string
          english_translation: string
          id: string
          igbo_phrase: string
          order_index: number
        }
        Insert: {
          created_at?: string
          english_translation: string
          id?: string
          igbo_phrase: string
          order_index?: number
        }
        Update: {
          created_at?: string
          english_translation?: string
          id?: string
          igbo_phrase?: string
          order_index?: number
        }
        Relationships: []
      }
      sentence_skeletons: {
        Row: {
          created_at: string
          example_english: string
          example_igbo: string
          explanation: string | null
          id: string
          name: string
          order_index: number
          structure: string
        }
        Insert: {
          created_at?: string
          example_english: string
          example_igbo: string
          explanation?: string | null
          id?: string
          name: string
          order_index?: number
          structure: string
        }
        Update: {
          created_at?: string
          example_english?: string
          example_igbo?: string
          explanation?: string | null
          id?: string
          name?: string
          order_index?: number
          structure?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          created_at: string
          id: string
          last_accessed: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_accessed?: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_accessed?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_saved_words: {
        Row: {
          created_at: string
          id: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      vocabulary: {
        Row: {
          category_id: string
          created_at: string
          english_translation: string
          example_sentence_english: string | null
          example_sentence_igbo: string | null
          id: string
          igbo_word: string
        }
        Insert: {
          category_id: string
          created_at?: string
          english_translation: string
          example_sentence_english?: string | null
          example_sentence_igbo?: string | null
          id?: string
          igbo_word: string
        }
        Update: {
          category_id?: string
          created_at?: string
          english_translation?: string
          example_sentence_english?: string | null
          example_sentence_igbo?: string | null
          id?: string
          igbo_word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vocab_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
