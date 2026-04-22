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
      actors: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["actor_status"]
          type: Database["public"]["Enums"]["actor_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["actor_status"]
          type: Database["public"]["Enums"]["actor_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["actor_status"]
          type?: Database["public"]["Enums"]["actor_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          actor_id: string
          capabilities: string[] | null
          config: Json | null
          cost_per_1k_input_tokens_usd: number | null
          cost_per_1k_output_tokens_usd: number | null
          created_at: string
          id: string
          model: string
          openclaw_agent_id: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          actor_id: string
          capabilities?: string[] | null
          config?: Json | null
          cost_per_1k_input_tokens_usd?: number | null
          cost_per_1k_output_tokens_usd?: number | null
          created_at?: string
          id?: string
          model: string
          openclaw_agent_id?: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          actor_id?: string
          capabilities?: string[] | null
          config?: Json | null
          cost_per_1k_input_tokens_usd?: number | null
          cost_per_1k_output_tokens_usd?: number | null
          created_at?: string
          id?: string
          model?: string
          openclaw_agent_id?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          is_transferencia: boolean
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string | null
          id?: string
          is_transferencia?: boolean
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string | null
          id?: string
          is_transferencia?: boolean
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
          codigo: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          responsavel: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          responsavel?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
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
      colaboradores: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          bairro: string | null
          banco: string | null
          cargo: string | null
          cep: string | null
          chaves_pix: string[] | null
          cidade: string | null
          complemento: string | null
          conta: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          data_admissao: string | null
          emails: string[] | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          salario_base: number | null
          telefones: string[] | null
          tipo_conta: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          bairro?: string | null
          banco?: string | null
          cargo?: string | null
          cep?: string | null
          chaves_pix?: string[] | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_admissao?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          salario_base?: number | null
          telefones?: string[] | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          bairro?: string | null
          banco?: string | null
          cargo?: string | null
          cep?: string | null
          chaves_pix?: string[] | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_admissao?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          salario_base?: number | null
          telefones?: string[] | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string | null
          company_type: Database["public"]["Enums"]["company_type"]
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          id: string
          industry: string | null
          legal_name: string
          notes: string | null
          organization_id: string
          size: Database["public"]["Enums"]["company_size"] | null
          status: Database["public"]["Enums"]["company_status"]
          trade_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          cnpj?: string | null
          company_type: Database["public"]["Enums"]["company_type"]
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          legal_name: string
          notes?: string | null
          organization_id: string
          size?: Database["public"]["Enums"]["company_size"] | null
          status?: Database["public"]["Enums"]["company_status"]
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          cnpj?: string | null
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          legal_name?: string
          notes?: string | null
          organization_id?: string
          size?: Database["public"]["Enums"]["company_size"] | null
          status?: Database["public"]["Enums"]["company_status"]
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_people: {
        Row: {
          company_id: string
          created_at: string
          ended_at: string | null
          id: string
          is_primary_contact: boolean
          person_id: string
          role: string | null
          started_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_primary_contact?: boolean
          person_id: string
          role?: string | null
          started_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_primary_contact?: boolean
          person_id?: string
          role?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
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
      humans: {
        Row: {
          actor_id: string
          auth_user_id: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          cpf: string | null
          created_at: string
          email: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          fixed_monthly_pay: number | null
          hourly_cost: number | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["human_role"]
          updated_at: string
          variable_percentage: number | null
        }
        Insert: {
          actor_id: string
          auth_user_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          fixed_monthly_pay?: number | null
          hourly_cost?: number | null
          id?: string
          phone?: string | null
          role: Database["public"]["Enums"]["human_role"]
          updated_at?: string
          variable_percentage?: number | null
        }
        Update: {
          actor_id?: string
          auth_user_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          fixed_monthly_pay?: number | null
          hourly_cost?: number | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["human_role"]
          updated_at?: string
          variable_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "humans_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_contracts: {
        Row: {
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          end_date: string | null
          hours_budget: number | null
          id: string
          monthly_fee: number
          monthly_fee_discount_percent: number
          notes: string | null
          organization_id: string
          project_id: string
          start_date: string
          status: Database["public"]["Enums"]["maintenance_contract_status"]
          token_budget_brl: number | null
          updated_at: string
          updated_by_actor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          end_date?: string | null
          hours_budget?: number | null
          id?: string
          monthly_fee: number
          monthly_fee_discount_percent?: number
          notes?: string | null
          organization_id: string
          project_id: string
          start_date: string
          status?: Database["public"]["Enums"]["maintenance_contract_status"]
          token_budget_brl?: number | null
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          end_date?: string | null
          hours_budget?: number | null
          id?: string
          monthly_fee?: number
          monthly_fee_discount_percent?: number
          notes?: string | null
          organization_id?: string
          project_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["maintenance_contract_status"]
          token_budget_brl?: number | null
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contracts_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "maintenance_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_updated_by_actor_id_fkey"
            columns: ["updated_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
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
          colaborador_id: string | null
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
          is_automatic: boolean
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
          recorrencia_ativa: boolean
          recorrente: boolean | null
          source_entity_id: string | null
          source_entity_type: string | null
          source_module: string | null
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
          colaborador_id?: string | null
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
          is_automatic?: boolean
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
          recorrencia_ativa?: boolean
          recorrente?: boolean | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_module?: string | null
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
          colaborador_id?: string | null
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
          is_automatic?: boolean
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
          recorrencia_ativa?: boolean
          recorrente?: boolean | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_module?: string | null
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
            foreignKeyName: "movimentacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
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
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "movimentacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          linkedin_url: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          role_in_company: string | null
          status: Database["public"]["Enums"]["person_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          role_in_company?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          role_in_company?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      project_actors: {
        Row: {
          actor_id: string
          allocation_percent: number | null
          created_at: string
          ended_at: string | null
          id: string
          project_id: string
          role_in_project: Database["public"]["Enums"]["project_actor_role"]
          started_at: string
        }
        Insert: {
          actor_id: string
          allocation_percent?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          project_id: string
          role_in_project: Database["public"]["Enums"]["project_actor_role"]
          started_at?: string
        }
        Update: {
          actor_id?: string
          allocation_percent?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          project_id?: string
          role_in_project?: Database["public"]["Enums"]["project_actor_role"]
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_actors_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_actors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_actors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dependencies: {
        Row: {
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          dependency_type: Database["public"]["Enums"]["project_dependency_type"]
          description: string | null
          expected_at: string | null
          id: string
          is_blocking: boolean
          notes: string | null
          organization_id: string
          project_id: string
          received_at: string | null
          requested_at: string | null
          requested_from: string | null
          responsible_actor_id: string | null
          status: Database["public"]["Enums"]["project_dependency_status"]
          title: string
          updated_at: string
          updated_by_actor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          dependency_type: Database["public"]["Enums"]["project_dependency_type"]
          description?: string | null
          expected_at?: string | null
          id?: string
          is_blocking?: boolean
          notes?: string | null
          organization_id: string
          project_id: string
          received_at?: string | null
          requested_at?: string | null
          requested_from?: string | null
          responsible_actor_id?: string | null
          status?: Database["public"]["Enums"]["project_dependency_status"]
          title: string
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          dependency_type?: Database["public"]["Enums"]["project_dependency_type"]
          description?: string | null
          expected_at?: string | null
          id?: string
          is_blocking?: boolean
          notes?: string | null
          organization_id?: string
          project_id?: string
          received_at?: string | null
          requested_at?: string | null
          requested_from?: string | null
          responsible_actor_id?: string | null
          status?: Database["public"]["Enums"]["project_dependency_status"]
          title?: string
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_dependencies_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dependencies_responsible_actor_id_fkey"
            columns: ["responsible_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dependencies_updated_by_actor_id_fkey"
            columns: ["updated_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_integrations: {
        Row: {
          created_at: string
          created_by_actor_id: string | null
          credentials_location: string | null
          deleted_at: string | null
          documentation_url: string | null
          estimated_cost_monthly_brl: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          project_id: string
          provider: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["project_integration_status"]
          updated_at: string
          updated_by_actor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_actor_id?: string | null
          credentials_location?: string | null
          deleted_at?: string | null
          documentation_url?: string | null
          estimated_cost_monthly_brl?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          project_id: string
          provider?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["project_integration_status"]
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_actor_id?: string | null
          credentials_location?: string | null
          deleted_at?: string | null
          documentation_url?: string | null
          estimated_cost_monthly_brl?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          provider?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["project_integration_status"]
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_updated_by_actor_id_fkey"
            columns: ["updated_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          acceptance_notes: string | null
          actual_date: string | null
          billing_amount: number | null
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          organization_id: string
          project_id: string
          sequence_order: number
          status: Database["public"]["Enums"]["project_milestone_status"]
          target_date: string
          title: string
          triggers_billing: boolean
          updated_at: string
          updated_by_actor_id: string | null
        }
        Insert: {
          acceptance_notes?: string | null
          actual_date?: string | null
          billing_amount?: number | null
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          project_id: string
          sequence_order: number
          status?: Database["public"]["Enums"]["project_milestone_status"]
          target_date: string
          title: string
          triggers_billing?: boolean
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Update: {
          acceptance_notes?: string | null
          actual_date?: string | null
          billing_amount?: number | null
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          sequence_order?: number
          status?: Database["public"]["Enums"]["project_milestone_status"]
          target_date?: string
          title?: string
          triggers_billing?: boolean
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_updated_by_actor_id_fkey"
            columns: ["updated_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_risks: {
        Row: {
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          identified_at: string
          mitigation_plan: string | null
          notes: string | null
          organization_id: string
          probability: Database["public"]["Enums"]["project_risk_probability"]
          project_id: string
          resolved_at: string | null
          responsible_actor_id: string | null
          severity: Database["public"]["Enums"]["project_risk_severity"]
          status: Database["public"]["Enums"]["project_risk_status"]
          title: string
          updated_at: string
          updated_by_actor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          identified_at?: string
          mitigation_plan?: string | null
          notes?: string | null
          organization_id: string
          probability?: Database["public"]["Enums"]["project_risk_probability"]
          project_id: string
          resolved_at?: string | null
          responsible_actor_id?: string | null
          severity?: Database["public"]["Enums"]["project_risk_severity"]
          status?: Database["public"]["Enums"]["project_risk_status"]
          title: string
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          identified_at?: string
          mitigation_plan?: string | null
          notes?: string | null
          organization_id?: string
          probability?: Database["public"]["Enums"]["project_risk_probability"]
          project_id?: string
          resolved_at?: string | null
          responsible_actor_id?: string | null
          severity?: Database["public"]["Enums"]["project_risk_severity"]
          status?: Database["public"]["Enums"]["project_risk_status"]
          title?: string
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_risks_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risks_responsible_actor_id_fkey"
            columns: ["responsible_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risks_updated_by_actor_id_fkey"
            columns: ["updated_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          acceptance_criteria: string | null
          actual_delivery_date: string | null
          business_context: string | null
          code: string
          company_id: string
          contract_value: number | null
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          deliverables: string | null
          description: string | null
          estimated_delivery_date: string | null
          id: string
          identified_risks: string | null
          installments_count: number | null
          name: string
          notes: string | null
          organization_id: string
          owner_actor_id: string | null
          premises: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          scope_in: string | null
          scope_out: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          technical_stack: string | null
          token_budget_brl: number | null
          updated_at: string
          updated_by_actor_id: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          actual_delivery_date?: string | null
          business_context?: string | null
          code?: string
          company_id: string
          contract_value?: number | null
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          deliverables?: string | null
          description?: string | null
          estimated_delivery_date?: string | null
          id?: string
          identified_risks?: string | null
          installments_count?: number | null
          name: string
          notes?: string | null
          organization_id: string
          owner_actor_id?: string | null
          premises?: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          scope_in?: string | null
          scope_out?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          technical_stack?: string | null
          token_budget_brl?: number | null
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          actual_delivery_date?: string | null
          business_context?: string | null
          code?: string
          company_id?: string
          contract_value?: number | null
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          deliverables?: string | null
          description?: string | null
          estimated_delivery_date?: string | null
          id?: string
          identified_risks?: string | null
          installments_count?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          owner_actor_id?: string | null
          premises?: string | null
          project_type?: Database["public"]["Enums"]["project_type"]
          scope_in?: string | null
          scope_out?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          technical_stack?: string | null
          token_budget_brl?: number | null
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_actor_id_fkey"
            columns: ["updated_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
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
      project_metrics: {
        Row: {
          actors_allocated: number | null
          avg_resolution_hours: number | null
          blocking_dependencies: number | null
          cost_integrations_monthly: number | null
          cost_total_estimated: number | null
          created_at: string | null
          deleted_at: string | null
          estimated_delivery_date: string | null
          high_risks_active: number | null
          hours_actual: number | null
          hours_estimated: number | null
          integrations_active: number | null
          integrations_total: number | null
          margin_real: number | null
          milestones_done: number | null
          milestones_total: number | null
          next_milestone: Json | null
          project_code: string | null
          project_id: string | null
          project_status: Database["public"]["Enums"]["project_status"] | null
          revenue_contracted: number | null
          revenue_pending: number | null
          revenue_received: number | null
          start_date: string | null
          tasks_backlog: number | null
          tasks_blocked: number | null
          tasks_completion_percent: number | null
          tasks_done: number | null
          tasks_in_progress: number | null
          tasks_total: number | null
          tickets_open: number | null
          tickets_resolved_30d: number | null
          tokens_budget_brl: number | null
          tokens_consumed_month_brl: number | null
          tokens_consumption_percent: number | null
          total_dependencies: number | null
          total_risks: number | null
          updated_at: string | null
        }
        Insert: {
          actors_allocated?: never
          avg_resolution_hours?: never
          blocking_dependencies?: never
          cost_integrations_monthly?: never
          cost_total_estimated?: never
          created_at?: string | null
          deleted_at?: string | null
          estimated_delivery_date?: string | null
          high_risks_active?: never
          hours_actual?: never
          hours_estimated?: never
          integrations_active?: never
          integrations_total?: never
          margin_real?: never
          milestones_done?: never
          milestones_total?: never
          next_milestone?: never
          project_code?: string | null
          project_id?: string | null
          project_status?: Database["public"]["Enums"]["project_status"] | null
          revenue_contracted?: never
          revenue_pending?: never
          revenue_received?: never
          start_date?: string | null
          tasks_backlog?: never
          tasks_blocked?: never
          tasks_completion_percent?: never
          tasks_done?: never
          tasks_in_progress?: never
          tasks_total?: never
          tickets_open?: never
          tickets_resolved_30d?: never
          tokens_budget_brl?: never
          tokens_consumed_month_brl?: never
          tokens_consumption_percent?: never
          total_dependencies?: never
          total_risks?: never
          updated_at?: string | null
        }
        Update: {
          actors_allocated?: never
          avg_resolution_hours?: never
          blocking_dependencies?: never
          cost_integrations_monthly?: never
          cost_total_estimated?: never
          created_at?: string | null
          deleted_at?: string | null
          estimated_delivery_date?: string | null
          high_risks_active?: never
          hours_actual?: never
          hours_estimated?: never
          integrations_active?: never
          integrations_total?: never
          margin_real?: never
          milestones_done?: never
          milestones_total?: never
          next_milestone?: never
          project_code?: string | null
          project_id?: string | null
          project_status?: Database["public"]["Enums"]["project_status"] | null
          revenue_contracted?: never
          revenue_pending?: never
          revenue_received?: never
          start_date?: string | null
          tasks_backlog?: never
          tasks_blocked?: never
          tasks_completion_percent?: never
          tasks_done?: never
          tasks_in_progress?: never
          tasks_total?: never
          tickets_open?: never
          tickets_resolved_30d?: never
          tokens_budget_brl?: never
          tokens_consumed_month_brl?: never
          tokens_consumption_percent?: never
          total_dependencies?: never
          total_risks?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      financeiro_dashboard: {
        Args: { p_fim?: string; p_inicio?: string }
        Returns: {
          inadimplencia_percent: number
          mes_anterior_despesa: number
          mes_anterior_receita: number
          mes_anterior_resultado: number
          mes_despesa: number
          mes_despesa_prevista: number
          mes_margem_percent: number
          mes_receita: number
          mes_receita_prevista: number
          mes_resultado: number
          pagar_vencido: number
          qtd_pagar_vencido: number
          qtd_receber_vencido: number
          receber_vencido: number
          saldo_total: number
          total_a_pagar: number
          total_a_receber: number
        }[]
      }
      financeiro_fluxo_projetado: {
        Args: { p_conta?: string; p_dias?: number }
        Returns: {
          dia: string
          entradas: number
          saidas: number
          saldo_acumulado: number
        }[]
      }
      financeiro_serie_mensal: {
        Args: { p_conta?: string; p_meses?: number }
        Returns: {
          despesa_prevista: number
          despesa_realizada: number
          mes: string
          receita_prevista: number
          receita_realizada: number
          resultado: number
        }[]
      }
      financeiro_top_rankings: {
        Args: { p_fim?: string; p_inicio?: string }
        Returns: {
          kind: string
          label: string
          valor: number
        }[]
      }
      generate_project_code: { Args: never; Returns: string }
      getbrain_org_id: { Args: never; Returns: string }
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
      actor_status: "active" | "inactive" | "archived"
      actor_type: "human" | "ai_agent"
      ai_provider: "anthropic" | "openai" | "google" | "custom"
      app_role: "admin" | "member"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "restore"
        | "status_change"
        | "custom"
      company_size: "micro" | "small" | "medium" | "large" | "enterprise"
      company_status: "active" | "inactive" | "churned" | "lost"
      company_type: "client" | "prospect" | "supplier" | "partner" | "other"
      employment_type: "founder" | "pj" | "clt" | "intern" | "freelancer"
      human_role:
        | "owner"
        | "developer"
        | "designer"
        | "commercial"
        | "support"
        | "manager"
      maintenance_contract_status: "active" | "paused" | "ended" | "cancelled"
      person_status: "active" | "inactive"
      project_actor_role:
        | "owner"
        | "developer"
        | "designer"
        | "consultant"
        | "support"
      project_dependency_status:
        | "pendente"
        | "solicitado"
        | "em_andamento"
        | "recebido"
        | "atrasado"
        | "bloqueante"
        | "resolvido"
        | "cancelado"
      project_dependency_type:
        | "acesso_api"
        | "credenciais"
        | "dados_cliente"
        | "aprovacao"
        | "documentacao"
        | "homologacao"
        | "infraestrutura"
        | "outro"
      project_integration_status:
        | "planejada"
        | "em_desenvolvimento"
        | "testando"
        | "ativa"
        | "com_erro"
        | "descontinuada"
      project_milestone_status:
        | "planejado"
        | "em_andamento"
        | "concluido"
        | "atrasado"
        | "cancelado"
      project_risk_probability: "baixa" | "media" | "alta"
      project_risk_severity: "baixa" | "media" | "alta" | "critica"
      project_risk_status:
        | "identificado"
        | "em_mitigacao"
        | "mitigado"
        | "materializado"
        | "aceito"
      project_status:
        | "proposta"
        | "aceito"
        | "em_desenvolvimento"
        | "em_homologacao"
        | "entregue"
        | "em_manutencao"
        | "pausado"
        | "cancelado"
        | "arquivado"
      project_type:
        | "sistema_personalizado"
        | "chatbot"
        | "consultoria"
        | "interno"
        | "outro"
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
      actor_status: ["active", "inactive", "archived"],
      actor_type: ["human", "ai_agent"],
      ai_provider: ["anthropic", "openai", "google", "custom"],
      app_role: ["admin", "member"],
      audit_action: [
        "create",
        "update",
        "delete",
        "restore",
        "status_change",
        "custom",
      ],
      company_size: ["micro", "small", "medium", "large", "enterprise"],
      company_status: ["active", "inactive", "churned", "lost"],
      company_type: ["client", "prospect", "supplier", "partner", "other"],
      employment_type: ["founder", "pj", "clt", "intern", "freelancer"],
      human_role: [
        "owner",
        "developer",
        "designer",
        "commercial",
        "support",
        "manager",
      ],
      maintenance_contract_status: ["active", "paused", "ended", "cancelled"],
      person_status: ["active", "inactive"],
      project_actor_role: [
        "owner",
        "developer",
        "designer",
        "consultant",
        "support",
      ],
      project_dependency_status: [
        "pendente",
        "solicitado",
        "em_andamento",
        "recebido",
        "atrasado",
        "bloqueante",
        "resolvido",
        "cancelado",
      ],
      project_dependency_type: [
        "acesso_api",
        "credenciais",
        "dados_cliente",
        "aprovacao",
        "documentacao",
        "homologacao",
        "infraestrutura",
        "outro",
      ],
      project_integration_status: [
        "planejada",
        "em_desenvolvimento",
        "testando",
        "ativa",
        "com_erro",
        "descontinuada",
      ],
      project_milestone_status: [
        "planejado",
        "em_andamento",
        "concluido",
        "atrasado",
        "cancelado",
      ],
      project_risk_probability: ["baixa", "media", "alta"],
      project_risk_severity: ["baixa", "media", "alta", "critica"],
      project_risk_status: [
        "identificado",
        "em_mitigacao",
        "mitigado",
        "materializado",
        "aceito",
      ],
      project_status: [
        "proposta",
        "aceito",
        "em_desenvolvimento",
        "em_homologacao",
        "entregue",
        "em_manutencao",
        "pausado",
        "cancelado",
        "arquivado",
      ],
      project_type: [
        "sistema_personalizado",
        "chatbot",
        "consultoria",
        "interno",
        "outro",
      ],
    },
  },
} as const
