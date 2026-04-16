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
      anexos: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          movimentacao_id: string | null
          nome_arquivo: string
          projeto_id: string | null
          tamanho_bytes: number | null
          tipo: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          movimentacao_id?: string | null
          nome_arquivo: string
          projeto_id?: string | null
          tamanho_bytes?: number | null
          tipo?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          movimentacao_id?: string | null
          nome_arquivo?: string
          projeto_id?: string | null
          tamanho_bytes?: number | null
          tipo?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean | null
          categoria_pai_id: string | null
          created_at: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string | null
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          emails: string[] | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          nome_empresa: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string | null
          telefone: string | null
          telefones: string[] | null
          tipo_pessoa: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          nome_empresa?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          telefones?: string[] | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          nome_empresa?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          telefones?: string[] | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco: string | null
          chaves_pix: string[] | null
          conta: string | null
          created_at: string | null
          id: string
          moeda: string
          nome: string
          observacoes: string | null
          saldo_inicial: number | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          chaves_pix?: string[] | null
          conta?: string | null
          created_at?: string | null
          id?: string
          moeda?: string
          nome: string
          observacoes?: string | null
          saldo_inicial?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          chaves_pix?: string[] | null
          conta?: string | null
          created_at?: string | null
          id?: string
          moeda?: string
          nome?: string
          observacoes?: string | null
          saldo_inicial?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      extrato_importacoes: {
        Row: {
          conta_bancaria_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          id: string
          nome_arquivo: string
          status: string
          total_transacoes: number
          transacoes_conciliadas: number
          transacoes_criadas: number
        }
        Insert: {
          conta_bancaria_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          nome_arquivo: string
          status?: string
          total_transacoes?: number
          transacoes_conciliadas?: number
          transacoes_criadas?: number
        }
        Update: {
          conta_bancaria_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          nome_arquivo?: string
          status?: string
          total_transacoes?: number
          transacoes_conciliadas?: number
          transacoes_criadas?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_importacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      extrato_transacoes: {
        Row: {
          conciliado: boolean
          conta_bancaria_id: string
          created_at: string
          data_transacao: string
          descricao_banco: string
          id: string
          importacao_id: string
          movimentacao_id: string | null
          status_match: string
          tipo: string
          valor: number
        }
        Insert: {
          conciliado?: boolean
          conta_bancaria_id: string
          created_at?: string
          data_transacao: string
          descricao_banco: string
          id?: string
          importacao_id: string
          movimentacao_id?: string | null
          status_match?: string
          tipo: string
          valor: number
        }
        Update: {
          conciliado?: boolean
          conta_bancaria_id?: string
          created_at?: string
          data_transacao?: string
          descricao_banco?: string
          id?: string
          importacao_id?: string
          movimentacao_id?: string | null
          status_match?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_transacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_transacoes_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "extrato_importacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_transacoes_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          categoria_servico: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          emails: string[] | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          razao_social: string | null
          telefone: string | null
          telefones: string[] | null
          tipo_pessoa: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          categoria_servico?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          telefones?: string[] | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          categoria_servico?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          telefones?: string[] | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meios_pagamento: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          cofins: number | null
          conciliado: boolean | null
          conta_bancaria_id: string | null
          created_at: string | null
          created_by: string | null
          csll: number | null
          data_competencia: string
          data_pagamento: string | null
          data_vencimento: string
          desconto_previsto: number | null
          descricao: string
          fornecedor_id: string | null
          frequencia_recorrencia: string | null
          id: string
          inss: number | null
          ir: number | null
          iss: number | null
          juros: number | null
          meio_pagamento_id: string | null
          movimentacao_pai_id: string | null
          multa: number | null
          observacoes: string | null
          parcela_atual: number | null
          parcelado: boolean | null
          pis: number | null
          projeto_id: string | null
          recorrente: boolean | null
          status: string | null
          tags: string[] | null
          taxas_adm: number | null
          tipo: string
          total_parcelas: number | null
          updated_at: string | null
          valor_previsto: number
          valor_realizado: number | null
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          cofins?: number | null
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          csll?: number | null
          data_competencia: string
          data_pagamento?: string | null
          data_vencimento: string
          desconto_previsto?: number | null
          descricao: string
          fornecedor_id?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          inss?: number | null
          ir?: number | null
          iss?: number | null
          juros?: number | null
          meio_pagamento_id?: string | null
          movimentacao_pai_id?: string | null
          multa?: number | null
          observacoes?: string | null
          parcela_atual?: number | null
          parcelado?: boolean | null
          pis?: number | null
          projeto_id?: string | null
          recorrente?: boolean | null
          status?: string | null
          tags?: string[] | null
          taxas_adm?: number | null
          tipo: string
          total_parcelas?: number | null
          updated_at?: string | null
          valor_previsto: number
          valor_realizado?: number | null
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          cofins?: number | null
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          csll?: number | null
          data_competencia?: string
          data_pagamento?: string | null
          data_vencimento?: string
          desconto_previsto?: number | null
          descricao?: string
          fornecedor_id?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          inss?: number | null
          ir?: number | null
          iss?: number | null
          juros?: number | null
          meio_pagamento_id?: string | null
          movimentacao_pai_id?: string | null
          multa?: number | null
          observacoes?: string | null
          parcela_atual?: number | null
          parcelado?: boolean | null
          pis?: number | null
          projeto_id?: string | null
          recorrente?: boolean | null
          status?: string | null
          tags?: string[] | null
          taxas_adm?: number | null
          tipo?: string
          total_parcelas?: number | null
          updated_at?: string | null
          valor_previsto?: number
          valor_realizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_meio_pagamento_id_fkey"
            columns: ["meio_pagamento_id"]
            isOneToOne: false
            referencedRelation: "meios_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_movimentacao_pai_id_fkey"
            columns: ["movimentacao_pai_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento: {
        Row: {
          ano: number
          categoria_id: string | null
          created_at: string | null
          id: string
          mes: number
          updated_at: string | null
          valor_orcado: number
        }
        Insert: {
          ano: number
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          mes: number
          updated_at?: string | null
          valor_orcado: number
        }
        Update: {
          ano?: number
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          mes?: number
          updated_at?: string | null
          valor_orcado?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projetos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string | null
          updated_at: string | null
          valor_contrato: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      update_status_atrasado: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
