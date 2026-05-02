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
          deal_id: string | null
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
          deal_id?: string | null
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
          deal_id?: string | null
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
      cargo_permissoes: {
        Row: {
          acao: string
          cargo_id: string
          created_at: string
          id: string
          modulo: string
        }
        Insert: {
          acao: string
          cargo_id: string
          created_at?: string
          id?: string
          modulo: string
        }
        Update: {
          acao?: string
          cargo_id?: string
          created_at?: string
          id?: string
          modulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargo_permissoes_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          cor: string
          created_at: string
          descricao: string | null
          id: string
          is_system: boolean
          nivel: number
          nome: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          nivel?: number
          nome: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          nivel?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
          client_type: Database["public"]["Enums"]["company_client_type"] | null
          cnpj: string | null
          company_type: Database["public"]["Enums"]["company_type"]
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          digital_maturity: number | null
          employee_count_range: string | null
          id: string
          industry: string | null
          legal_name: string
          linkedin_url: string | null
          logo_url: string | null
          notes: string | null
          organization_id: string
          relationship_status: Database["public"]["Enums"]["company_relationship_status"]
          revenue_range:
            | Database["public"]["Enums"]["company_revenue_range"]
            | null
          sector_id: string | null
          size: Database["public"]["Enums"]["company_size"] | null
          status: Database["public"]["Enums"]["company_status"]
          trade_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          client_type?:
            | Database["public"]["Enums"]["company_client_type"]
            | null
          cnpj?: string | null
          company_type: Database["public"]["Enums"]["company_type"]
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          digital_maturity?: number | null
          employee_count_range?: string | null
          id?: string
          industry?: string | null
          legal_name: string
          linkedin_url?: string | null
          logo_url?: string | null
          notes?: string | null
          organization_id: string
          relationship_status?: Database["public"]["Enums"]["company_relationship_status"]
          revenue_range?:
            | Database["public"]["Enums"]["company_revenue_range"]
            | null
          sector_id?: string | null
          size?: Database["public"]["Enums"]["company_size"] | null
          status?: Database["public"]["Enums"]["company_status"]
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          client_type?:
            | Database["public"]["Enums"]["company_client_type"]
            | null
          cnpj?: string | null
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          digital_maturity?: number | null
          employee_count_range?: string | null
          id?: string
          industry?: string | null
          legal_name?: string
          linkedin_url?: string | null
          logo_url?: string | null
          notes?: string | null
          organization_id?: string
          relationship_status?: Database["public"]["Enums"]["company_relationship_status"]
          revenue_range?:
            | Database["public"]["Enums"]["company_revenue_range"]
            | null
          sector_id?: string | null
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
          {
            foreignKeyName: "companies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contact_roles: {
        Row: {
          company_person_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["contact_role"] | null
          role_id: string
        }
        Insert: {
          company_person_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["contact_role"] | null
          role_id: string
        }
        Update: {
          company_person_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["contact_role"] | null
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contact_roles_company_person_id_fkey"
            columns: ["company_person_id"]
            isOneToOne: false
            referencedRelation: "company_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contact_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contact_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contact_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_roles"
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
      crm_contact_roles: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_lead_sources: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_pain_categories: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_project_types: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      deal_activities: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          happened_at: string | null
          id: string
          lead_id: string | null
          organization_id: string
          outcome: string | null
          owner_actor_id: string | null
          participants: string[] | null
          scheduled_at: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          happened_at?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
          outcome?: string | null
          owner_actor_id?: string | null
          participants?: string[] | null
          scheduled_at?: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          happened_at?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
          outcome?: string | null
          owner_actor_id?: string | null
          participants?: string[] | null
          scheduled_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_dependencies: {
        Row: {
          agreed_deadline: string | null
          created_at: string
          created_by: string | null
          deal_id: string
          deleted_at: string | null
          dependency_type: Database["public"]["Enums"]["deal_dependency_type"]
          description: string
          id: string
          impact_if_missing: string | null
          internal_owner_actor_id: string | null
          is_blocker: boolean
          links: string[]
          notes: string | null
          organization_id: string
          priority: Database["public"]["Enums"]["deal_dependency_priority"]
          requested_at: string | null
          responsible_email: string | null
          responsible_person_name: string | null
          responsible_person_role: string | null
          responsible_phone: string | null
          status: Database["public"]["Enums"]["deal_dependency_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agreed_deadline?: string | null
          created_at?: string
          created_by?: string | null
          deal_id: string
          deleted_at?: string | null
          dependency_type: Database["public"]["Enums"]["deal_dependency_type"]
          description: string
          id?: string
          impact_if_missing?: string | null
          internal_owner_actor_id?: string | null
          is_blocker?: boolean
          links?: string[]
          notes?: string | null
          organization_id: string
          priority?: Database["public"]["Enums"]["deal_dependency_priority"]
          requested_at?: string | null
          responsible_email?: string | null
          responsible_person_name?: string | null
          responsible_person_role?: string | null
          responsible_phone?: string | null
          status?: Database["public"]["Enums"]["deal_dependency_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agreed_deadline?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string
          deleted_at?: string | null
          dependency_type?: Database["public"]["Enums"]["deal_dependency_type"]
          description?: string
          id?: string
          impact_if_missing?: string | null
          internal_owner_actor_id?: string | null
          is_blocker?: boolean
          links?: string[]
          notes?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["deal_dependency_priority"]
          requested_at?: string | null
          responsible_email?: string | null
          responsible_person_name?: string | null
          responsible_person_role?: string | null
          responsible_phone?: string | null
          status?: Database["public"]["Enums"]["deal_dependency_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_dependencies_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_dependencies_internal_owner_actor_id_fkey"
            columns: ["internal_owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_dependencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_dependencies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          acceptance_criteria: Json
          budget_range_max: number | null
          budget_range_min: number | null
          business_context: string | null
          closed_at: string | null
          code: string
          company_id: string
          competitors: string | null
          contact_person_id: string | null
          created_at: string
          created_by: string | null
          current_solution: string | null
          decision_makers: string | null
          deleted_at: string | null
          deliverables: string[]
          desired_delivery_date: string | null
          desired_start_date: string | null
          discount_amount: number | null
          discount_kind: string | null
          discount_notes: string | null
          discount_valid_until: string | null
          estimated_complexity: number | null
          estimated_hours_total: number | null
          estimated_implementation_value: number | null
          estimated_mrr_value: number | null
          estimated_value: number | null
          estimation_confidence:
            | Database["public"]["Enums"]["estimation_confidence"]
            | null
          expected_close_date: string | null
          extra_costs: Json
          first_installment_date: string | null
          generated_project_id: string | null
          id: string
          identified_risks: string[]
          installments_count: number | null
          lost_reason: string | null
          mockup_screenshots: string[]
          mockup_url: string | null
          mrr_discount_kind: string | null
          mrr_discount_months: number | null
          mrr_discount_until_date: string | null
          mrr_discount_until_stage:
            | Database["public"]["Enums"]["project_status"]
            | null
          mrr_discount_value: number | null
          mrr_duration_months: number | null
          mrr_start_date: string | null
          mrr_start_trigger: string | null
          next_step: string | null
          next_step_date: string | null
          notes: string | null
          organization_id: string
          organograma_url: string | null
          origin_lead_id: string | null
          owner_actor_id: string | null
          pain_categories: string[]
          pain_category: string | null
          pain_cost_brl_monthly: number | null
          pain_description: string | null
          pain_hours_monthly: number | null
          premises: string[]
          pricing_rationale: string | null
          probability_pct: number
          project_type: Database["public"]["Enums"]["project_type"] | null
          project_type_v2: string[]
          proposal_id: string | null
          proposal_url: string | null
          scope_bullets: Json
          scope_in: string | null
          scope_out: string | null
          scope_summary: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at: string
          technical_stack: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acceptance_criteria?: Json
          budget_range_max?: number | null
          budget_range_min?: number | null
          business_context?: string | null
          closed_at?: string | null
          code?: string
          company_id: string
          competitors?: string | null
          contact_person_id?: string | null
          created_at?: string
          created_by?: string | null
          current_solution?: string | null
          decision_makers?: string | null
          deleted_at?: string | null
          deliverables?: string[]
          desired_delivery_date?: string | null
          desired_start_date?: string | null
          discount_amount?: number | null
          discount_kind?: string | null
          discount_notes?: string | null
          discount_valid_until?: string | null
          estimated_complexity?: number | null
          estimated_hours_total?: number | null
          estimated_implementation_value?: number | null
          estimated_mrr_value?: number | null
          estimated_value?: number | null
          estimation_confidence?:
            | Database["public"]["Enums"]["estimation_confidence"]
            | null
          expected_close_date?: string | null
          extra_costs?: Json
          first_installment_date?: string | null
          generated_project_id?: string | null
          id?: string
          identified_risks?: string[]
          installments_count?: number | null
          lost_reason?: string | null
          mockup_screenshots?: string[]
          mockup_url?: string | null
          mrr_discount_kind?: string | null
          mrr_discount_months?: number | null
          mrr_discount_until_date?: string | null
          mrr_discount_until_stage?:
            | Database["public"]["Enums"]["project_status"]
            | null
          mrr_discount_value?: number | null
          mrr_duration_months?: number | null
          mrr_start_date?: string | null
          mrr_start_trigger?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          organization_id: string
          organograma_url?: string | null
          origin_lead_id?: string | null
          owner_actor_id?: string | null
          pain_categories?: string[]
          pain_category?: string | null
          pain_cost_brl_monthly?: number | null
          pain_description?: string | null
          pain_hours_monthly?: number | null
          premises?: string[]
          pricing_rationale?: string | null
          probability_pct?: number
          project_type?: Database["public"]["Enums"]["project_type"] | null
          project_type_v2?: string[]
          proposal_id?: string | null
          proposal_url?: string | null
          scope_bullets?: Json
          scope_in?: string | null
          scope_out?: string | null
          scope_summary?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          technical_stack?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acceptance_criteria?: Json
          budget_range_max?: number | null
          budget_range_min?: number | null
          business_context?: string | null
          closed_at?: string | null
          code?: string
          company_id?: string
          competitors?: string | null
          contact_person_id?: string | null
          created_at?: string
          created_by?: string | null
          current_solution?: string | null
          decision_makers?: string | null
          deleted_at?: string | null
          deliverables?: string[]
          desired_delivery_date?: string | null
          desired_start_date?: string | null
          discount_amount?: number | null
          discount_kind?: string | null
          discount_notes?: string | null
          discount_valid_until?: string | null
          estimated_complexity?: number | null
          estimated_hours_total?: number | null
          estimated_implementation_value?: number | null
          estimated_mrr_value?: number | null
          estimated_value?: number | null
          estimation_confidence?:
            | Database["public"]["Enums"]["estimation_confidence"]
            | null
          expected_close_date?: string | null
          extra_costs?: Json
          first_installment_date?: string | null
          generated_project_id?: string | null
          id?: string
          identified_risks?: string[]
          installments_count?: number | null
          lost_reason?: string | null
          mockup_screenshots?: string[]
          mockup_url?: string | null
          mrr_discount_kind?: string | null
          mrr_discount_months?: number | null
          mrr_discount_until_date?: string | null
          mrr_discount_until_stage?:
            | Database["public"]["Enums"]["project_status"]
            | null
          mrr_discount_value?: number | null
          mrr_duration_months?: number | null
          mrr_start_date?: string | null
          mrr_start_trigger?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          organization_id?: string
          organograma_url?: string | null
          origin_lead_id?: string | null
          owner_actor_id?: string | null
          pain_categories?: string[]
          pain_category?: string | null
          pain_cost_brl_monthly?: number | null
          pain_description?: string | null
          pain_hours_monthly?: number | null
          premises?: string[]
          pricing_rationale?: string | null
          probability_pct?: number
          project_type?: Database["public"]["Enums"]["project_type"] | null
          project_type_v2?: string[]
          proposal_id?: string | null
          proposal_url?: string | null
          scope_bullets?: Json
          scope_in?: string | null
          scope_out?: string | null
          scope_summary?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          technical_stack?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_person_id_fkey"
            columns: ["contact_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_generated_project_id_fkey"
            columns: ["generated_project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "deals_generated_project_id_fkey"
            columns: ["generated_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_origin_lead_id_fkey"
            columns: ["origin_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
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
      financial_recurrences: {
        Row: {
          amount: number
          categoria_id: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          code: string
          conta_bancaria_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          direction: string
          discount_active: boolean
          discount_full_amount: number | null
          discount_kind: string | null
          discount_months: number | null
          discount_started_at: string | null
          discount_until_date: string | null
          discount_until_stage:
            | Database["public"]["Enums"]["project_status"]
            | null
          discount_value: number | null
          end_date: string | null
          fornecedor_id: string | null
          frequency: string
          id: string
          meio_pagamento_id: string | null
          organization_id: string
          projeto_id: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          source_module: string | null
          start_date: string
          status: string
          total_installments: number | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          code?: string
          conta_bancaria_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          direction: string
          discount_active?: boolean
          discount_full_amount?: number | null
          discount_kind?: string | null
          discount_months?: number | null
          discount_started_at?: string | null
          discount_until_date?: string | null
          discount_until_stage?:
            | Database["public"]["Enums"]["project_status"]
            | null
          discount_value?: number | null
          end_date?: string | null
          fornecedor_id?: string | null
          frequency: string
          id?: string
          meio_pagamento_id?: string | null
          organization_id: string
          projeto_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_module?: string | null
          start_date: string
          status?: string
          total_installments?: number | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          code?: string
          conta_bancaria_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          direction?: string
          discount_active?: boolean
          discount_full_amount?: number | null
          discount_kind?: string | null
          discount_months?: number | null
          discount_started_at?: string | null
          discount_until_date?: string | null
          discount_until_stage?:
            | Database["public"]["Enums"]["project_status"]
            | null
          discount_value?: number | null
          end_date?: string | null
          fornecedor_id?: string | null
          frequency?: string
          id?: string
          meio_pagamento_id?: string | null
          organization_id?: string
          projeto_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_module?: string | null
          start_date?: string
          status?: string
          total_installments?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_recurrences_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_meio_pagamento_id_fkey"
            columns: ["meio_pagamento_id"]
            isOneToOne: false
            referencedRelation: "meios_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurrences_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_recurrences_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      integration_connections: {
        Row: {
          access_token_expires_at: string | null
          access_token_secret_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          enabled_capabilities: string[]
          external_account_id: string
          external_account_label: string | null
          granted_scopes: string[]
          id: string
          last_refresh_at: string | null
          last_used_at: string | null
          organization_id: string
          owner_actor_id: string
          provider_id: string
          refresh_token_secret_id: string | null
          scope_type: Database["public"]["Enums"]["integration_scope_type"]
          status: Database["public"]["Enums"]["integration_status"]
          status_message: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_token_expires_at?: string | null
          access_token_secret_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enabled_capabilities?: string[]
          external_account_id: string
          external_account_label?: string | null
          granted_scopes?: string[]
          id?: string
          last_refresh_at?: string | null
          last_used_at?: string | null
          organization_id: string
          owner_actor_id: string
          provider_id: string
          refresh_token_secret_id?: string | null
          scope_type: Database["public"]["Enums"]["integration_scope_type"]
          status?: Database["public"]["Enums"]["integration_status"]
          status_message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_token_expires_at?: string | null
          access_token_secret_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enabled_capabilities?: string[]
          external_account_id?: string
          external_account_label?: string | null
          granted_scopes?: string[]
          id?: string
          last_refresh_at?: string | null
          last_used_at?: string | null
          organization_id?: string
          owner_actor_id?: string
          provider_id?: string
          refresh_token_secret_id?: string | null
          scope_type?: Database["public"]["Enums"]["integration_scope_type"]
          status?: Database["public"]["Enums"]["integration_status"]
          status_message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          capability: string | null
          connection_id: string
          created_at: string
          created_by: string | null
          details: Json | null
          event_type: Database["public"]["Enums"]["integration_event_type"]
          id: string
          organization_id: string
        }
        Insert: {
          capability?: string | null
          connection_id: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          event_type: Database["public"]["Enums"]["integration_event_type"]
          id?: string
          organization_id: string
        }
        Update: {
          capability?: string | null
          connection_id?: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          event_type?: Database["public"]["Enums"]["integration_event_type"]
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          available_capabilities: string[]
          code: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          oauth_authorize_url: string | null
          oauth_revoke_url: string | null
          oauth_token_url: string | null
          updated_at: string
        }
        Insert: {
          available_capabilities?: string[]
          code: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          oauth_authorize_url?: string | null
          oauth_revoke_url?: string | null
          oauth_token_url?: string | null
          updated_at?: string
        }
        Update: {
          available_capabilities?: string[]
          code?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          oauth_authorize_url?: string | null
          oauth_revoke_url?: string | null
          oauth_token_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          code: string
          company_id: string
          contact_person_id: string | null
          converted_at: string | null
          converted_to_deal_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estimated_value: number | null
          id: string
          lost_reason: string | null
          notes: string | null
          organization_id: string
          owner_actor_id: string | null
          pain_description: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          title: string
          triagem_happened_at: string | null
          triagem_scheduled_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string
          company_id: string
          contact_person_id?: string | null
          converted_at?: string | null
          converted_to_deal_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estimated_value?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          organization_id: string
          owner_actor_id?: string | null
          pain_description?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          title: string
          triagem_happened_at?: string | null
          triagem_scheduled_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          contact_person_id?: string | null
          converted_at?: string | null
          converted_to_deal_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estimated_value?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          organization_id?: string
          owner_actor_id?: string | null
          pain_description?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          title?: string
          triagem_happened_at?: string | null
          triagem_scheduled_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_person_id_fkey"
            columns: ["contact_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_to_deal_id_fkey"
            columns: ["converted_to_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
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
          discount_duration_months: number | null
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
          discount_duration_months?: number | null
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
          discount_duration_months?: number | null
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
          deleted_at: string | null
          desconto_previsto: number | null
          descricao: string
          fornecedor_id: string | null
          frequencia_recorrencia: string | null
          id: string
          inss: number | null
          installment_number: number | null
          installments_total: number | null
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
          recurrence_id: string | null
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
          deleted_at?: string | null
          desconto_previsto?: number | null
          descricao: string
          fornecedor_id?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          inss?: number | null
          installment_number?: number | null
          installments_total?: number | null
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
          recurrence_id?: string | null
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
          deleted_at?: string | null
          desconto_previsto?: number | null
          descricao?: string
          fornecedor_id?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          inss?: number | null
          installment_number?: number | null
          installments_total?: number | null
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
          recurrence_id?: string | null
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
          {
            foreignKeyName: "movimentacoes_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "financial_recurrences"
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
          ativo: boolean
          avatar_url: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          full_name: string
          id: string
          numero: string | null
          pais: string | null
          plano_saude: string | null
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          full_name: string
          id: string
          numero?: string | null
          pais?: string | null
          plano_saude?: string | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          full_name?: string
          id?: string
          numero?: string | null
          pais?: string | null
          plano_saude?: string | null
          telefone?: string | null
          ultimo_acesso?: string | null
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
          source_deal_dependency_id: string | null
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
          source_deal_dependency_id?: string | null
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
          source_deal_dependency_id?: string | null
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
            foreignKeyName: "project_dependencies_source_deal_dependency_id_fkey"
            columns: ["source_deal_dependency_id"]
            isOneToOne: false
            referencedRelation: "deal_dependencies"
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
          acceptance_criteria: Json
          actual_delivery_date: string | null
          business_context: string | null
          code: string
          commercial_context: Json
          company_id: string
          complexity_baseline: number | null
          contract_value: number | null
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          deliverables: string[]
          description: string | null
          estimated_delivery_date: string | null
          estimated_hours_baseline: number | null
          id: string
          identified_risks: string[]
          installments_count: number | null
          mockup_screenshots: string[]
          mockup_url: string | null
          mrr_value: number | null
          name: string
          notes: string | null
          organization_id: string
          organograma_url: string | null
          origin_lead_id: string | null
          origin_lead_source_id: string | null
          owner_actor_id: string | null
          premises: string[]
          primary_contact_person_id: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          project_type_v2: string[]
          scope_bullets: Json
          scope_in: string | null
          scope_out: string | null
          source_deal_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          technical_stack: string[]
          token_budget_brl: number | null
          updated_at: string
          updated_by_actor_id: string | null
        }
        Insert: {
          acceptance_criteria?: Json
          actual_delivery_date?: string | null
          business_context?: string | null
          code?: string
          commercial_context?: Json
          company_id: string
          complexity_baseline?: number | null
          contract_value?: number | null
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          deliverables?: string[]
          description?: string | null
          estimated_delivery_date?: string | null
          estimated_hours_baseline?: number | null
          id?: string
          identified_risks?: string[]
          installments_count?: number | null
          mockup_screenshots?: string[]
          mockup_url?: string | null
          mrr_value?: number | null
          name: string
          notes?: string | null
          organization_id: string
          organograma_url?: string | null
          origin_lead_id?: string | null
          origin_lead_source_id?: string | null
          owner_actor_id?: string | null
          premises?: string[]
          primary_contact_person_id?: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          project_type_v2?: string[]
          scope_bullets?: Json
          scope_in?: string | null
          scope_out?: string | null
          source_deal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          technical_stack?: string[]
          token_budget_brl?: number | null
          updated_at?: string
          updated_by_actor_id?: string | null
        }
        Update: {
          acceptance_criteria?: Json
          actual_delivery_date?: string | null
          business_context?: string | null
          code?: string
          commercial_context?: Json
          company_id?: string
          complexity_baseline?: number | null
          contract_value?: number | null
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          deliverables?: string[]
          description?: string | null
          estimated_delivery_date?: string | null
          estimated_hours_baseline?: number | null
          id?: string
          identified_risks?: string[]
          installments_count?: number | null
          mockup_screenshots?: string[]
          mockup_url?: string | null
          mrr_value?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          organograma_url?: string | null
          origin_lead_id?: string | null
          origin_lead_source_id?: string | null
          owner_actor_id?: string | null
          premises?: string[]
          primary_contact_person_id?: string | null
          project_type?: Database["public"]["Enums"]["project_type"]
          project_type_v2?: string[]
          scope_bullets?: Json
          scope_in?: string | null
          scope_out?: string | null
          source_deal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          technical_stack?: string[]
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
            foreignKeyName: "projects_origin_lead_source_id_fkey"
            columns: ["origin_lead_source_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_sources"
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
            foreignKeyName: "projects_primary_contact_person_id_fkey"
            columns: ["primary_contact_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_deal_id_fkey"
            columns: ["source_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
      proposal_access_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_hash: string
          proposal_id: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_hash: string
          proposal_id: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_hash?: string
          proposal_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proposal_access_attempts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_ai_generations: {
        Row: {
          cost_usd: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          filter_reasons: string[] | null
          generation_type: Database["public"]["Enums"]["proposal_ai_generation_type"]
          id: string
          input_tokens: number | null
          model: string
          organization_id: string
          output_raw: string | null
          output_tokens: number | null
          output_used: string | null
          prompt_used: string
          proposal_id: string
          triggered_by: string | null
          updated_at: string
          updated_by: string | null
          was_filtered: boolean
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filter_reasons?: string[] | null
          generation_type: Database["public"]["Enums"]["proposal_ai_generation_type"]
          id?: string
          input_tokens?: number | null
          model: string
          organization_id: string
          output_raw?: string | null
          output_tokens?: number | null
          output_used?: string | null
          prompt_used: string
          proposal_id: string
          triggered_by?: string | null
          updated_at?: string
          updated_by?: string | null
          was_filtered?: boolean
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filter_reasons?: string[] | null
          generation_type?: Database["public"]["Enums"]["proposal_ai_generation_type"]
          id?: string
          input_tokens?: number | null
          model?: string
          organization_id?: string
          output_raw?: string | null
          output_tokens?: number | null
          output_used?: string | null
          prompt_used?: string
          proposal_id?: string
          triggered_by?: string | null
          updated_at?: string
          updated_by?: string | null
          was_filtered?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proposal_ai_generations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_ai_settings: {
        Row: {
          chat_enabled: boolean
          chat_model: string
          created_at: string
          created_by: string | null
          current_month_spend_usd: number
          current_month_started_at: string
          deleted_at: string | null
          generation_enabled: boolean
          generation_model: string
          id: string
          max_messages_per_session: number
          monthly_budget_usd: number
          notify_on_first_view: boolean
          notify_on_high_engagement: boolean
          notify_on_manifested_interest: boolean
          notify_on_pdf_download: boolean
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chat_enabled?: boolean
          chat_model?: string
          created_at?: string
          created_by?: string | null
          current_month_spend_usd?: number
          current_month_started_at?: string
          deleted_at?: string | null
          generation_enabled?: boolean
          generation_model?: string
          id?: string
          max_messages_per_session?: number
          monthly_budget_usd?: number
          notify_on_first_view?: boolean
          notify_on_high_engagement?: boolean
          notify_on_manifested_interest?: boolean
          notify_on_pdf_download?: boolean
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chat_enabled?: boolean
          chat_model?: string
          created_at?: string
          created_by?: string | null
          current_month_spend_usd?: number
          current_month_started_at?: string
          deleted_at?: string | null
          generation_enabled?: boolean
          generation_model?: string
          id?: string
          max_messages_per_session?: number
          monthly_budget_usd?: number
          notify_on_first_view?: boolean
          notify_on_high_engagement?: boolean
          notify_on_manifested_interest?: boolean
          notify_on_pdf_download?: boolean
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      proposal_attachments: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          file_path: string
          id: string
          kind: string
          label: string
          mime_type: string
          proposal_id: string
          show_in_pdf: boolean
          show_in_web: boolean
          size_bytes: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          file_path: string
          id?: string
          kind?: string
          label: string
          mime_type: string
          proposal_id: string
          show_in_pdf?: boolean
          show_in_web?: boolean
          size_bytes?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          file_path?: string
          id?: string
          kind?: string
          label?: string
          mime_type?: string
          proposal_id?: string
          show_in_pdf?: boolean
          show_in_web?: boolean
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_attachments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_chat_messages: {
        Row: {
          content: string
          cost_usd: number | null
          created_at: string
          filter_reasons: string[] | null
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: Database["public"]["Enums"]["proposal_chat_role"]
          session_id: string
          was_escalation_suggested: boolean | null
          was_filtered: boolean | null
        }
        Insert: {
          content: string
          cost_usd?: number | null
          created_at?: string
          filter_reasons?: string[] | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: Database["public"]["Enums"]["proposal_chat_role"]
          session_id: string
          was_escalation_suggested?: boolean | null
          was_filtered?: boolean | null
        }
        Update: {
          content?: string
          cost_usd?: number | null
          created_at?: string
          filter_reasons?: string[] | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: Database["public"]["Enums"]["proposal_chat_role"]
          session_id?: string
          was_escalation_suggested?: boolean | null
          was_filtered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "proposal_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_chat_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ended_at: string | null
          escalated_to_whatsapp: boolean
          id: string
          ip_hash: string | null
          message_count: number
          organization_id: string
          proposal_id: string
          session_token: string
          started_at: string
          updated_at: string
          updated_by: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ended_at?: string | null
          escalated_to_whatsapp?: boolean
          id?: string
          ip_hash?: string | null
          message_count?: number
          organization_id: string
          proposal_id: string
          session_token: string
          started_at?: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ended_at?: string | null
          escalated_to_whatsapp?: boolean
          id?: string
          ip_hash?: string | null
          message_count?: number
          organization_id?: string
          proposal_id?: string
          session_token?: string
          started_at?: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_chat_sessions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          proposal_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          proposal_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_faqs: {
        Row: {
          answer: string
          category: Database["public"]["Enums"]["proposal_faq_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          organization_id: string
          question: string
          status: Database["public"]["Enums"]["proposal_faq_status"]
          updated_at: string
          updated_by: string | null
          usage_count: number
        }
        Insert: {
          answer: string
          category?: Database["public"]["Enums"]["proposal_faq_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id: string
          question: string
          status?: Database["public"]["Enums"]["proposal_faq_status"]
          updated_at?: string
          updated_by?: string | null
          usage_count?: number
        }
        Update: {
          answer?: string
          category?: Database["public"]["Enums"]["proposal_faq_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id?: string
          question?: string
          status?: Database["public"]["Enums"]["proposal_faq_status"]
          updated_at?: string
          updated_by?: string | null
          usage_count?: number
        }
        Relationships: []
      }
      proposal_interactions: {
        Row: {
          auto_generated: boolean
          channel: Database["public"]["Enums"]["proposal_interaction_channel"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          details: string | null
          direction: Database["public"]["Enums"]["proposal_interaction_direction"]
          id: string
          interaction_at: string
          metadata: Json
          organization_id: string
          proposal_id: string
          recorded_by: string | null
          summary: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_generated?: boolean
          channel: Database["public"]["Enums"]["proposal_interaction_channel"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          details?: string | null
          direction: Database["public"]["Enums"]["proposal_interaction_direction"]
          id?: string
          interaction_at?: string
          metadata?: Json
          organization_id?: string
          proposal_id: string
          recorded_by?: string | null
          summary: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_generated?: boolean
          channel?: Database["public"]["Enums"]["proposal_interaction_channel"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          details?: string | null
          direction?: Database["public"]["Enums"]["proposal_interaction_direction"]
          id?: string
          interaction_at?: string
          metadata?: Json
          organization_id?: string
          proposal_id?: string
          recorded_by?: string | null
          summary?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_interactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          acceptance_criteria: string[]
          client_dependencies: string[]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deliverables: string[]
          description: string
          detailed_description: string | null
          id: string
          order_index: number
          proposal_id: string
          quantity: number
          total: number | null
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acceptance_criteria?: string[]
          client_dependencies?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deliverables?: string[]
          description: string
          detailed_description?: string | null
          id?: string
          order_index?: number
          proposal_id: string
          quantity?: number
          total?: number | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acceptance_criteria?: string[]
          client_dependencies?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deliverables?: string[]
          description?: string
          detailed_description?: string | null
          id?: string
          order_index?: number
          proposal_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_mockups: {
        Row: {
          brand_color: string
          client_company_name: string | null
          created_by: string | null
          enabled: boolean
          generated_at: string
          id: string
          logo_url: string | null
          modules: Json
          proposal_id: string
          updated_at: string
          user_profiles: Json
          version: number
        }
        Insert: {
          brand_color?: string
          client_company_name?: string | null
          created_by?: string | null
          enabled?: boolean
          generated_at?: string
          id?: string
          logo_url?: string | null
          modules?: Json
          proposal_id: string
          updated_at?: string
          user_profiles?: Json
          version?: number
        }
        Update: {
          brand_color?: string
          client_company_name?: string | null
          created_by?: string | null
          enabled?: boolean
          generated_at?: string
          id?: string
          logo_url?: string | null
          modules?: Json
          proposal_id?: string
          updated_at?: string
          user_profiles?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_mockups_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_public_slugs: {
        Row: {
          created_at: string
          created_by: string | null
          proposal_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          proposal_id: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          proposal_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_public_slugs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          organization_id: string | null
          pdf_size_bytes: number | null
          pdf_storage_path: string
          pdf_url: string
          proposal_id: string
          snapshot: Json
          template_key: string | null
          template_version: string | null
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          pdf_size_bytes?: number | null
          pdf_storage_path: string
          pdf_url: string
          proposal_id: string
          snapshot: Json
          template_key?: string | null
          template_version?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          pdf_size_bytes?: number | null
          pdf_storage_path?: string
          pdf_url?: string
          proposal_id?: string
          snapshot?: Json
          template_key?: string | null
          template_version?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_views: {
        Row: {
          duration_seconds: number | null
          id: string
          ip_hash: string | null
          proposal_id: string
          sections_viewed: Json
          session_id: string | null
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          ip_hash?: string | null
          proposal_id: string
          sections_viewed?: Json
          session_id?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          ip_hash?: string | null
          proposal_id?: string
          sections_viewed?: Json
          session_id?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          access_password_hash: string | null
          access_password_plain: string | null
          access_token: string | null
          client_brand_color: string | null
          client_city: string | null
          client_company_name: string
          client_logo_url: string | null
          client_name: string | null
          code: string
          company_id: string | null
          considerations: Json | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          executive_summary: string | null
          expires_at: string | null
          first_viewed_at: string | null
          id: string
          implementation_days: number | null
          last_viewed_at: string | null
          maintenance_description: string | null
          maintenance_monthly_value: number | null
          mockup_url: string | null
          organization_id: string
          pain_context: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          project_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          scope_items: Json
          sent_at: string | null
          solution_overview: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          template_key: string
          template_slug: string
          template_version: string
          title: string | null
          updated_at: string
          updated_by: string | null
          valid_until: string
          validation_days: number | null
          view_count: number
          welcome_message: string | null
        }
        Insert: {
          accepted_at?: string | null
          access_password_hash?: string | null
          access_password_plain?: string | null
          access_token?: string | null
          client_brand_color?: string | null
          client_city?: string | null
          client_company_name: string
          client_logo_url?: string | null
          client_name?: string | null
          code?: string
          company_id?: string | null
          considerations?: Json | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          executive_summary?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          implementation_days?: number | null
          last_viewed_at?: string | null
          maintenance_description?: string | null
          maintenance_monthly_value?: number | null
          mockup_url?: string | null
          organization_id: string
          pain_context?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scope_items?: Json
          sent_at?: string | null
          solution_overview?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          template_key?: string
          template_slug?: string
          template_version?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_until: string
          validation_days?: number | null
          view_count?: number
          welcome_message?: string | null
        }
        Update: {
          accepted_at?: string | null
          access_password_hash?: string | null
          access_password_plain?: string | null
          access_token?: string | null
          client_brand_color?: string | null
          client_city?: string | null
          client_company_name?: string
          client_logo_url?: string | null
          client_name?: string | null
          code?: string
          company_id?: string | null
          considerations?: Json | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          executive_summary?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          implementation_days?: number | null
          last_viewed_at?: string | null
          maintenance_description?: string | null
          maintenance_monthly_value?: number | null
          mockup_url?: string | null
          organization_id?: string
          pain_context?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scope_items?: Json
          sent_at?: string | null
          solution_overview?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          template_key?: string
          template_slug?: string
          template_version?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_until?: string
          validation_days?: number | null
          view_count?: number
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_metrics"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parent_sector_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parent_sector_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_sector_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_parent_sector_id_fkey"
            columns: ["parent_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          actual_end_date: string | null
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_date: string
          goal: string | null
          id: string
          name: string
          organization_id: string
          start_date: string
          status: Database["public"]["Enums"]["sprint_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_end_date?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date: string
          goal?: string | null
          id?: string
          name: string
          organization_id?: string
          start_date: string
          status?: Database["public"]["Enums"]["sprint_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_end_date?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string
          goal?: string | null
          id?: string
          name?: string
          organization_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["sprint_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          acao: string
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          modulo: string | null
          registro_id: string | null
          resumo: string | null
          tabela: string | null
          user_agent: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          modulo?: string | null
          registro_id?: string | null
          resumo?: string | null
          tabela?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          modulo?: string | null
          registro_id?: string | null
          resumo?: string | null
          tabela?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          actor_id: string
          assigned_at: string
          assigned_by: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_primary: boolean
          role: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          actor_id: string
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          role?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          actor_id?: string
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          role?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          actor_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          organization_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          actor_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          actor_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          acceptance_criteria: Json
          actual_hours: number
          blocked_reason: string | null
          blocked_since: string | null
          code: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_blocked: boolean
          labels: string[]
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          rework_count: number
          rework_reason: string | null
          sort_order: number
          sprint_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acceptance_criteria?: Json
          actual_hours?: number
          blocked_reason?: string | null
          blocked_since?: string | null
          code: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_blocked?: boolean
          labels?: string[]
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          rework_count?: number
          rework_reason?: string | null
          sort_order?: number
          sprint_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acceptance_criteria?: Json
          actual_hours?: number
          blocked_reason?: string | null
          blocked_since?: string | null
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_blocked?: boolean
          labels?: string[]
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          rework_count?: number
          rework_reason?: string | null
          sort_order?: number
          sprint_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "dev_dashboard_metrics"
            referencedColumns: ["sprint_id"]
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          iata: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string | null
          razao_social: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          iata?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          iata?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      usuario_cargos: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          cargo_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          cargo_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          cargo_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_cargos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_contratos: {
        Row: {
          anexo_url: string | null
          cargo: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          observacoes: string | null
          salario: number | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anexo_url?: string | null
          cargo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          observacoes?: string | null
          salario?: number | null
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anexo_url?: string | null
          cargo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          observacoes?: string | null
          salario?: number | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          created_by: string | null
          data_primeira_parcela: string | null
          data_venda: string
          deleted_at: string | null
          descricao: string | null
          id: string
          maintenance_contract_id: string | null
          meio_pagamento_id: string | null
          numero: string
          observacoes: string | null
          organization_id: string
          project_id: string
          quantidade_parcelas: number
          status: string
          tipo_venda: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_primeira_parcela?: string | null
          data_venda?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          maintenance_contract_id?: string | null
          meio_pagamento_id?: string | null
          numero?: string
          observacoes?: string | null
          organization_id?: string
          project_id: string
          quantidade_parcelas?: number
          status?: string
          tipo_venda: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_primeira_parcela?: string | null
          data_venda?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          maintenance_contract_id?: string | null
          meio_pagamento_id?: string | null
          numero?: string
          observacoes?: string | null
          organization_id?: string
          project_id?: string
          quantidade_parcelas?: number
          status?: string
          tipo_venda?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: []
      }
    }
    Views: {
      crm_dashboard_metrics: {
        Row: {
          atividades_proximos_7d: number | null
          deals_abertos_total: number | null
          deals_parados_7d: number | null
          fechados_30d: number | null
          ganhos_30d: number | null
          ganhos_30d_anterior: number | null
          organization_id: string | null
          pipeline_value_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_dashboard_sparklines: {
        Row: {
          deals_parados: number | null
          dia: string | null
          organization_id: string | null
          pipeline_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_funnel_metrics: {
        Row: {
          avg_deal_cycle_days: number | null
          deal_win_rate_30d: number | null
          deals_created_30d: number | null
          deals_created_90d: number | null
          deals_em_negociacao_current: number | null
          deals_lost_90d: number | null
          deals_orcamento_enviado_current: number | null
          deals_overdue: number | null
          deals_presencial_agendada_current: number | null
          deals_presencial_feita_current: number | null
          deals_stalled_14d: number | null
          deals_won_30d: number | null
          deals_won_90d: number | null
          lead_conversion_rate_30d: number | null
          leads_converted_30d: number | null
          leads_converted_90d: number | null
          leads_created_30d: number | null
          leads_created_90d: number | null
          leads_discarded_total: number | null
          leads_novo_current: number | null
          leads_ready_stale: number | null
          leads_triagem_agendada_current: number | null
          leads_triagem_feita_current: number | null
          overdue_activities: number | null
          revenue_won_30d: number | null
          revenue_won_90d: number | null
        }
        Relationships: []
      }
      crm_pipeline_by_stage: {
        Row: {
          avg_days_in_stage: number | null
          deals_count: number | null
          organization_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"] | null
          stage_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_metrics: {
        Row: {
          conversion_rate_pct: number | null
          deals_ativos: number | null
          deals_ganhos_total: number | null
          deals_perdidos_total: number | null
          forecast_ponderado_brl: number | null
          leads_convertidos: number | null
          leads_descartados: number | null
          leads_novos: number | null
          leads_triagem_agendada: number | null
          leads_triagem_feita: number | null
          pipeline_total_brl: number | null
          receita_ganha_total_brl: number | null
          ticket_medio_brl: number | null
        }
        Relationships: []
      }
      dev_dashboard_metrics: {
        Row: {
          actual_end_date: string | null
          avg_cycle_time_hours: number | null
          end_date: string | null
          estimation_accuracy_pct: number | null
          hours_actual_total: number | null
          hours_estimated_total: number | null
          rework_total: number | null
          sprint_code: string | null
          sprint_elapsed_days: number | null
          sprint_id: string | null
          sprint_name: string | null
          sprint_remaining_days: number | null
          sprint_status: Database["public"]["Enums"]["sprint_status"] | null
          sprint_total_days: number | null
          start_date: string | null
          tasks_backlog: number | null
          tasks_blocked_now: number | null
          tasks_cancelled: number | null
          tasks_done: number | null
          tasks_done_late: number | null
          tasks_done_on_time: number | null
          tasks_in_progress: number | null
          tasks_in_review: number | null
          tasks_overdue: number | null
          tasks_reworked: number | null
          tasks_todo: number | null
          tasks_total: number | null
        }
        Relationships: []
      }
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
          revenue_pending_implementation: number | null
          revenue_pending_maintenance: number | null
          revenue_received: number | null
          revenue_received_implementation: number | null
          revenue_received_maintenance: number | null
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
        Relationships: []
      }
      proposal_metrics: {
        Row: {
          avg_view_count: number | null
          conversion_rate: number | null
          organization_id: string | null
          total_converted: number | null
          total_draft: number | null
          total_proposals: number | null
          total_sent: number | null
          total_value_converted: number | null
          total_value_sent: number | null
          total_viewed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_account_balance: {
        Args: { p_ate_data?: string; p_conta_id: string }
        Returns: number
      }
      cascade_delete_deal: { Args: { p_deal_id: string }; Returns: Json }
      close_deal_as_won: {
        Args: { p_deal_id: string; p_installments?: Json; p_project_data: Json }
        Returns: Json
      }
      convert_lead_to_deal: {
        Args: { p_deal_data?: Json; p_lead_id: string }
        Returns: string
      }
      create_proposal_from_deal: {
        Args: { p_deal_id: string; p_force_new_version?: boolean }
        Returns: Json
      }
      create_recurrence_with_installments: {
        Args: { p_horizon_months?: number; p_payload: Json }
        Returns: Json
      }
      cron_extend_recurrences: { Args: never; Returns: number }
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
      gen_proposal_access_token: { Args: never; Returns: string }
      generate_project_code: { Args: never; Returns: string }
      generate_recurrence_installments: {
        Args: { p_horizon_months?: number; p_recurrence_id: string }
        Returns: number
      }
      generate_venda_numero: { Args: never; Returns: string }
      get_account_balances: {
        Args: { p_days_history?: number }
        Returns: {
          banco: string
          conta_id: string
          conta_nome: string
          saldo_anterior: number
          saldo_atual: number
          tipo: string
          variacao_pct: number
        }[]
      }
      get_cash_projection: {
        Args: {
          p_account_ids?: string[]
          p_days_ahead?: number
          p_scenario?: string
        }
        Returns: {
          entradas_dia: number
          projection_date: string
          saidas_dia: number
          saldo_projetado: number
        }[]
      }
      get_client_financial_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          a_receber_futuro: number
          atrasado: number
          atrasado_mais_30d: number
          company_id: string
          company_name: string
          count_projetos: number
          count_projetos_ativos: number
          dias_atraso_max: number
          ltv_total: number
          recebido_periodo: number
          relationship_status: string
          ultimo_pagamento: string
        }[]
      }
      get_colaboradores_minimal: {
        Args: never
        Returns: {
          ativo: boolean
          cargo: string
          id: string
          nome: string
        }[]
      }
      get_crm_owner_performance: {
        Args: { p_days_back?: number }
        Returns: {
          activities_completed: number
          deals_handled: number
          deals_lost: number
          deals_won: number
          leads_converted: number
          leads_handled: number
          owner_actor_id: string
          owner_name: string
          revenue_generated: number
          win_rate_pct: number
        }[]
      }
      get_crm_source_performance: {
        Args: { p_days_back?: number }
        Returns: {
          avg_ticket: number
          conversion_rate_pct: number
          deals_won: number
          leads_converted: number
          leads_discarded: number
          leads_total: number
          revenue_generated: number
          source: string
        }[]
      }
      get_crm_velocity_by_stage: {
        Args: { p_days_back?: number }
        Returns: {
          avg_days_in_stage: number
          deals_passed_through: number
          median_days_in_stage: number
          stage: Database["public"]["Enums"]["deal_stage"]
        }[]
      }
      get_dev_capacity: {
        Args: { p_sprint_id: string }
        Returns: {
          actor_id: string
          actor_name: string
          avatar_url: string
          hours_actual_sprint: number
          hours_planned_sprint: number
          hours_remaining: number
          tasks_blocked: number
          tasks_in_progress: number
          tasks_open: number
        }[]
      }
      get_dev_estimation_accuracy: {
        Args: { p_sprint_ids: string[] }
        Returns: {
          actor_id: string
          actor_name: string
          avg_accuracy_pct: number
          avg_deviation_hours: number
          tasks_accurate: number
          tasks_counted: number
          tasks_overestimated: number
          tasks_underestimated: number
        }[]
      }
      get_expense_by_category: {
        Args: {
          p_account_ids?: string[]
          p_end_date: string
          p_project_ids?: string[]
          p_regime?: string
          p_start_date: string
        }
        Returns: {
          category_id: string
          category_name: string
          count_movimentacoes: number
          pct_do_total: number
          valor_pendente: number
          valor_realizado: number
          valor_total: number
        }[]
      }
      get_expense_by_project: {
        Args: { p_end_date: string; p_regime?: string; p_start_date: string }
        Returns: {
          pct_do_total: number
          project_code: string
          project_id: string
          project_name: string
          valor_pendente: number
          valor_realizado: number
          valor_total: number
        }[]
      }
      get_financial_summary: {
        Args: {
          p_account_ids?: string[]
          p_category_ids?: string[]
          p_end_date: string
          p_project_ids?: string[]
          p_regime?: string
          p_start_date: string
        }
        Returns: {
          count_movimentacoes: number
          despesa_pendente: number
          despesa_realizada: number
          despesa_total: number
          margem_pct: number
          receita_bruta: number
          receita_pendente: number
          receita_realizada: number
          resultado: number
        }[]
      }
      get_humans_minimal: {
        Args: never
        Returns: {
          actor_id: string
          auth_user_id: string
          email: string
          id: string
        }[]
      }
      get_monthly_evolution: {
        Args: { p_months?: number; p_regime?: string }
        Returns: {
          despesa: number
          margem_pct: number
          mes: string
          mes_label: string
          receita: number
          resultado: number
          saldo_fim_mes: number
        }[]
      }
      get_profiles_public: {
        Args: never
        Returns: {
          ativo: boolean
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          ultimo_acesso: string
        }[]
      }
      get_project_health_summary: {
        Args: { p_sprint_ids: string[] }
        Returns: {
          bug_rate_pct: number
          consumption_pct: number
          hours_actual: number
          hours_estimated: number
          project_code: string
          project_id: string
          project_name: string
          rework_rate_pct: number
          tasks_bugs: number
          tasks_done: number
          tasks_rework: number
          tasks_total: number
        }[]
      }
      get_project_profitability: {
        Args: { p_end_date?: string; p_regime?: string; p_start_date?: string }
        Returns: {
          company_name: string
          count_despesas: number
          count_receitas: number
          despesa_realizada: number
          despesa_total: number
          margem_pct: number
          pct_recebido: number
          project_code: string
          project_id: string
          project_name: string
          project_status: string
          receita_pendente: number
          receita_realizada: number
          receita_total: number
          resultado: number
          tasks_hours_actual: number
        }[]
      }
      get_revenue_by_category: {
        Args: {
          p_account_ids?: string[]
          p_end_date: string
          p_project_ids?: string[]
          p_regime?: string
          p_start_date: string
        }
        Returns: {
          category_id: string
          category_name: string
          count_movimentacoes: number
          pct_do_total: number
          valor_pendente: number
          valor_realizado: number
          valor_total: number
        }[]
      }
      get_revenue_by_project: {
        Args: { p_end_date: string; p_regime?: string; p_start_date: string }
        Returns: {
          has_overdue: boolean
          pct_do_total: number
          project_code: string
          project_id: string
          project_name: string
          valor_pendente: number
          valor_recebido: number
          valor_total: number
        }[]
      }
      get_sprint_burndown: {
        Args: { p_sprint_id: string }
        Returns: {
          day: string
          ideal_remaining: number
          remaining_tasks: number
          total_tasks: number
        }[]
      }
      get_upcoming_movements: {
        Args: { p_days_ahead?: number; p_include_overdue?: boolean }
        Returns: {
          categoria_nome: string
          company_name: string
          data_vencimento: string
          descricao: string
          dias_ate_vencimento: number
          id: string
          is_overdue: boolean
          project_code: string
          status: string
          tipo: string
          valor: number
        }[]
      }
      getbrain_org_id: { Args: never; Returns: string }
      has_permission: {
        Args: { _acao: string; _modulo: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      integration_delete_token: {
        Args: { p_secret_id: string }
        Returns: undefined
      }
      integration_get_token: { Args: { p_secret_id: string }; Returns: string }
      integration_save_token: {
        Args: { p_label: string; p_token: string }
        Returns: string
      }
      integration_update_token: {
        Args: { p_new_token: string; p_secret_id: string }
        Returns: undefined
      }
      set_proposal_password: {
        Args: { _plain_password: string; _proposal_id: string }
        Returns: undefined
      }
      update_status_atrasado: { Args: never; Returns: undefined }
      vendas_cancelar: { Args: { p_venda_id: string }; Returns: undefined }
      vendas_dashboard: {
        Args: { p_fim?: string; p_inicio?: string }
        Returns: {
          qtd_vendas: number
          ticket_medio: number
          total_a_receber: number
          total_atrasado: number
          total_recebido: number
          total_vendido: number
        }[]
      }
      vendas_gerar_parcelas: { Args: { p_venda_id: string }; Returns: number }
      vendas_importar_existentes: { Args: never; Returns: number }
    }
    Enums: {
      activity_type:
        | "reuniao_presencial"
        | "reuniao_virtual"
        | "ligacao"
        | "email"
        | "whatsapp"
        | "outro"
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
      company_client_type: "b2b" | "b2c" | "b2b_b2c"
      company_relationship_status:
        | "prospect"
        | "lead"
        | "active_client"
        | "former_client"
        | "lost"
      company_revenue_range:
        | "ate_360k"
        | "de_360k_a_4_8m"
        | "de_4_8m_a_30m"
        | "acima_30m"
      company_size: "micro" | "small" | "medium" | "large" | "enterprise"
      company_status: "active" | "inactive" | "churned" | "lost"
      company_type: "client" | "prospect" | "supplier" | "partner" | "other"
      contact_role:
        | "decisor"
        | "usuario_final"
        | "tecnico"
        | "financeiro"
        | "outro"
      deal_dependency_priority: "baixa" | "media" | "alta" | "critica"
      deal_dependency_status:
        | "aguardando_combinar"
        | "combinado"
        | "liberado"
        | "atrasado"
      deal_dependency_type:
        | "acesso_sistema"
        | "dado"
        | "pessoa"
        | "hardware"
        | "autorizacao_legal"
        | "outro"
      deal_stage:
        | "presencial_agendada"
        | "presencial_feita"
        | "orcamento_enviado"
        | "em_negociacao"
        | "orcamento_aceito_verbal"
        | "fechado_ganho"
        | "fechado_perdido"
        | "descoberta_marcada"
        | "descobrindo"
        | "proposta_na_mesa"
        | "ajustando"
        | "ganho"
        | "perdido"
        | "gelado"
      employment_type: "founder" | "pj" | "clt" | "intern" | "freelancer"
      estimation_confidence: "alta" | "media" | "baixa"
      human_role:
        | "owner"
        | "developer"
        | "designer"
        | "commercial"
        | "support"
        | "manager"
      integration_event_type:
        | "connected"
        | "token_refreshed"
        | "refresh_failed"
        | "used"
        | "rate_limited"
        | "revoked"
        | "reconnected"
        | "error"
      integration_scope_type: "per_user" | "per_organization"
      integration_status: "connected" | "expired" | "revoked" | "error"
      lead_status:
        | "novo"
        | "triagem_agendada"
        | "triagem_feita"
        | "descartado"
        | "convertido"
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
      proposal_ai_generation_type:
        | "full_content"
        | "executive_summary"
        | "pain_context"
        | "solution_overview"
        | "item_description"
      proposal_chat_role: "user" | "assistant"
      proposal_faq_category:
        | "pagamento"
        | "prazo"
        | "manutencao"
        | "tecnico"
        | "comercial"
        | "outros"
      proposal_faq_status: "ativo" | "inativo"
      proposal_interaction_channel:
        | "whatsapp"
        | "email"
        | "telefone"
        | "reuniao_presencial"
        | "reuniao_video"
        | "observacao"
      proposal_interaction_direction: "inbound" | "outbound" | "internal"
      proposal_status:
        | "rascunho"
        | "enviada"
        | "visualizada"
        | "interesse_manifestado"
        | "expirada"
        | "convertida"
        | "recusada"
      sprint_status: "planned" | "active" | "completed" | "cancelled"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "backlog"
        | "todo"
        | "in_progress"
        | "in_review"
        | "done"
        | "cancelled"
      task_type: "feature" | "bug" | "chore" | "refactor" | "docs" | "research"
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
      activity_type: [
        "reuniao_presencial",
        "reuniao_virtual",
        "ligacao",
        "email",
        "whatsapp",
        "outro",
      ],
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
      company_client_type: ["b2b", "b2c", "b2b_b2c"],
      company_relationship_status: [
        "prospect",
        "lead",
        "active_client",
        "former_client",
        "lost",
      ],
      company_revenue_range: [
        "ate_360k",
        "de_360k_a_4_8m",
        "de_4_8m_a_30m",
        "acima_30m",
      ],
      company_size: ["micro", "small", "medium", "large", "enterprise"],
      company_status: ["active", "inactive", "churned", "lost"],
      company_type: ["client", "prospect", "supplier", "partner", "other"],
      contact_role: [
        "decisor",
        "usuario_final",
        "tecnico",
        "financeiro",
        "outro",
      ],
      deal_dependency_priority: ["baixa", "media", "alta", "critica"],
      deal_dependency_status: [
        "aguardando_combinar",
        "combinado",
        "liberado",
        "atrasado",
      ],
      deal_dependency_type: [
        "acesso_sistema",
        "dado",
        "pessoa",
        "hardware",
        "autorizacao_legal",
        "outro",
      ],
      deal_stage: [
        "presencial_agendada",
        "presencial_feita",
        "orcamento_enviado",
        "em_negociacao",
        "orcamento_aceito_verbal",
        "fechado_ganho",
        "fechado_perdido",
        "descoberta_marcada",
        "descobrindo",
        "proposta_na_mesa",
        "ajustando",
        "ganho",
        "perdido",
        "gelado",
      ],
      employment_type: ["founder", "pj", "clt", "intern", "freelancer"],
      estimation_confidence: ["alta", "media", "baixa"],
      human_role: [
        "owner",
        "developer",
        "designer",
        "commercial",
        "support",
        "manager",
      ],
      integration_event_type: [
        "connected",
        "token_refreshed",
        "refresh_failed",
        "used",
        "rate_limited",
        "revoked",
        "reconnected",
        "error",
      ],
      integration_scope_type: ["per_user", "per_organization"],
      integration_status: ["connected", "expired", "revoked", "error"],
      lead_status: [
        "novo",
        "triagem_agendada",
        "triagem_feita",
        "descartado",
        "convertido",
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
      proposal_ai_generation_type: [
        "full_content",
        "executive_summary",
        "pain_context",
        "solution_overview",
        "item_description",
      ],
      proposal_chat_role: ["user", "assistant"],
      proposal_faq_category: [
        "pagamento",
        "prazo",
        "manutencao",
        "tecnico",
        "comercial",
        "outros",
      ],
      proposal_faq_status: ["ativo", "inativo"],
      proposal_interaction_channel: [
        "whatsapp",
        "email",
        "telefone",
        "reuniao_presencial",
        "reuniao_video",
        "observacao",
      ],
      proposal_interaction_direction: ["inbound", "outbound", "internal"],
      proposal_status: [
        "rascunho",
        "enviada",
        "visualizada",
        "interesse_manifestado",
        "expirada",
        "convertida",
        "recusada",
      ],
      sprint_status: ["planned", "active", "completed", "cancelled"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "backlog",
        "todo",
        "in_progress",
        "in_review",
        "done",
        "cancelled",
      ],
      task_type: ["feature", "bug", "chore", "refactor", "docs", "research"],
    },
  },
} as const
