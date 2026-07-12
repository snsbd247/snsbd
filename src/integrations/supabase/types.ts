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
      company_settings: {
        Row: {
          address: string | null
          auto_suspend: boolean
          company_name: string
          created_at: string
          email: string | null
          facebook_url: string | null
          favicon_url: string | null
          footer_copyright: string | null
          grace_days: number
          id: boolean
          late_fee_percent: number
          logo_url: string | null
          phone: string | null
          renewal_lead_days: number
          updated_at: string
          vat_percent: number
          website: string | null
        }
        Insert: {
          address?: string | null
          auto_suspend?: boolean
          company_name?: string
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          footer_copyright?: string | null
          grace_days?: number
          id?: boolean
          late_fee_percent?: number
          logo_url?: string | null
          phone?: string | null
          renewal_lead_days?: number
          updated_at?: string
          vat_percent?: number
          website?: string | null
        }
        Update: {
          address?: string | null
          auto_suspend?: boolean
          company_name?: string
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          footer_copyright?: string | null
          grace_days?: number
          id?: boolean
          late_fee_percent?: number
          logo_url?: string | null
          phone?: string | null
          renewal_lead_days?: number
          updated_at?: string
          vat_percent?: number
          website?: string | null
        }
        Relationships: []
      }
      customer_orders: {
        Row: {
          activated_service_id: string | null
          admin_notes: string | null
          billing_cycle: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          domain_action: Database["public"]["Enums"]["domain_action"] | null
          domain_name: string | null
          hosting_package_id: string | null
          id: string
          manual_sender: string | null
          manual_trx_id: string | null
          order_type: Database["public"]["Enums"]["customer_order_type"]
          payment_method: string | null
          quoted_price: number
          service_catalog_id: string | null
          status: Database["public"]["Enums"]["customer_order_status"]
          updated_at: string
          whm_server_id: string | null
        }
        Insert: {
          activated_service_id?: string | null
          admin_notes?: string | null
          billing_cycle?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          domain_action?: Database["public"]["Enums"]["domain_action"] | null
          domain_name?: string | null
          hosting_package_id?: string | null
          id?: string
          manual_sender?: string | null
          manual_trx_id?: string | null
          order_type: Database["public"]["Enums"]["customer_order_type"]
          payment_method?: string | null
          quoted_price?: number
          service_catalog_id?: string | null
          status?: Database["public"]["Enums"]["customer_order_status"]
          updated_at?: string
          whm_server_id?: string | null
        }
        Update: {
          activated_service_id?: string | null
          admin_notes?: string | null
          billing_cycle?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          domain_action?: Database["public"]["Enums"]["domain_action"] | null
          domain_name?: string | null
          hosting_package_id?: string | null
          id?: string
          manual_sender?: string | null
          manual_trx_id?: string | null
          order_type?: Database["public"]["Enums"]["customer_order_type"]
          payment_method?: string | null
          quoted_price?: number
          service_catalog_id?: string | null
          status?: Database["public"]["Enums"]["customer_order_status"]
          updated_at?: string
          whm_server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_hosting_package_id_fkey"
            columns: ["hosting_package_id"]
            isOneToOne: false
            referencedRelation: "hosting_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_service_catalog_id_fkey"
            columns: ["service_catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_whm_server_id_fkey"
            columns: ["whm_server_id"]
            isOneToOne: false
            referencedRelation: "whm_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_pricing: {
        Row: {
          created_at: string
          currency: string
          featured: boolean
          id: string
          is_active: boolean
          register_price: number
          renew_price: number
          sort_order: number
          tld: string
          transfer_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          featured?: boolean
          id?: string
          is_active?: boolean
          register_price?: number
          renew_price?: number
          sort_order?: number
          tld: string
          transfer_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          featured?: boolean
          id?: string
          is_active?: boolean
          register_price?: number
          renew_price?: number
          sort_order?: number
          tld?: string
          transfer_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      hosting_packages: {
        Row: {
          badge: string | null
          bandwidth: string | null
          billing_cycle: string
          category: string
          created_at: string
          description: string | null
          disk_space: string | null
          featured: boolean
          features: Json
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          tagline: string | null
          updated_at: string
          whm_package_name: string | null
        }
        Insert: {
          badge?: string | null
          bandwidth?: string | null
          billing_cycle?: string
          category?: string
          created_at?: string
          description?: string | null
          disk_space?: string | null
          featured?: boolean
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          tagline?: string | null
          updated_at?: string
          whm_package_name?: string | null
        }
        Update: {
          badge?: string | null
          bandwidth?: string | null
          billing_cycle?: string
          category?: string
          created_at?: string
          description?: string | null
          disk_space?: string | null
          featured?: boolean
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          tagline?: string | null
          updated_at?: string
          whm_package_name?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          service_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          late_fee: number
          late_fee_applied_at: string | null
          notes: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          late_fee?: number
          late_fee_applied_at?: string | null
          notes?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          late_fee?: number
          late_fee_applied_at?: string | null
          notes?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          message: string | null
          name: string | null
          notes: string | null
          phone: string | null
          plan_name: string | null
          source: string
          status: string
          subject: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          message?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          plan_name?: string | null
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          message?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          plan_name?: string | null
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      order_domain_changes: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          new_domain: string | null
          old_domain: string | null
          order_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_domain?: string | null
          old_domain?: string | null
          order_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_domain?: string | null
          old_domain?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_domain_changes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          app_key: string | null
          app_secret: string | null
          created_at: string
          extra: Json
          id: string
          is_active: boolean
          merchant_number: string | null
          mode: Database["public"]["Enums"]["gateway_mode"]
          password: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at: string
          username: string | null
        }
        Insert: {
          app_key?: string | null
          app_secret?: string | null
          created_at?: string
          extra?: Json
          id?: string
          is_active?: boolean
          merchant_number?: string | null
          mode?: Database["public"]["Enums"]["gateway_mode"]
          password?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          app_key?: string | null
          app_secret?: string | null
          created_at?: string
          extra?: Json
          id?: string
          is_active?: boolean
          merchant_number?: string | null
          mode?: Database["public"]["Enums"]["gateway_mode"]
          password?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          invoice_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id: string | null
          provider_trx_id: string | null
          raw_response: Json | null
          status: Database["public"]["Enums"]["gateway_txn_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          invoice_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          provider_trx_id?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["gateway_txn_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          invoice_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          provider_trx_id?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["gateway_txn_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string | null
          notes: string | null
          paid_at: string
          receipt_number: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          receipt_number?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          receipt_number?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          milestone_id: string | null
          milestone_title: string | null
          project_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          milestone_id?: string | null
          milestone_title?: string | null
          project_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          milestone_id?: string | null
          milestone_title?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          created_at: string
          customer_id: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          customer_id: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          customer_id?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          pay_period: string
          team_member_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          pay_period: string
          team_member_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          pay_period?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          billing_cycle: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          service_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          service_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          service_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_package_changes: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          new_package_id: string | null
          new_package_name: string | null
          old_package_id: string | null
          old_package_name: string | null
          service_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_package_id?: string | null
          new_package_name?: string | null
          old_package_id?: string | null
          old_package_name?: string | null
          service_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_package_id?: string | null
          new_package_name?: string | null
          old_package_id?: string | null
          old_package_name?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_package_changes_new_package_id_fkey"
            columns: ["new_package_id"]
            isOneToOne: false
            referencedRelation: "hosting_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_changes_old_package_id_fkey"
            columns: ["old_package_id"]
            isOneToOne: false
            referencedRelation: "hosting_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_changes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          cost_price: number | null
          cpanel_password: string | null
          cpanel_url: string | null
          cpanel_username: string | null
          created_at: string
          customer_id: string
          details: string | null
          dns_notes: string | null
          expiry_date: string | null
          hosting_package_id: string | null
          id: string
          last_renewal_invoice_at: string | null
          linked_hosting_id: string | null
          name: string
          nameservers: string | null
          notes: string | null
          project_id: string | null
          provisioning_status: string | null
          purchase_date: string | null
          registrar: string | null
          registrar_meta: Json | null
          registrar_order_id: string | null
          renewable: boolean
          sale_price: number
          status: Database["public"]["Enums"]["service_status"]
          type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          whm_account_user: string | null
          whm_server_id: string | null
        }
        Insert: {
          cost_price?: number | null
          cpanel_password?: string | null
          cpanel_url?: string | null
          cpanel_username?: string | null
          created_at?: string
          customer_id: string
          details?: string | null
          dns_notes?: string | null
          expiry_date?: string | null
          hosting_package_id?: string | null
          id?: string
          last_renewal_invoice_at?: string | null
          linked_hosting_id?: string | null
          name: string
          nameservers?: string | null
          notes?: string | null
          project_id?: string | null
          provisioning_status?: string | null
          purchase_date?: string | null
          registrar?: string | null
          registrar_meta?: Json | null
          registrar_order_id?: string | null
          renewable?: boolean
          sale_price?: number
          status?: Database["public"]["Enums"]["service_status"]
          type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          whm_account_user?: string | null
          whm_server_id?: string | null
        }
        Update: {
          cost_price?: number | null
          cpanel_password?: string | null
          cpanel_url?: string | null
          cpanel_username?: string | null
          created_at?: string
          customer_id?: string
          details?: string | null
          dns_notes?: string | null
          expiry_date?: string | null
          hosting_package_id?: string | null
          id?: string
          last_renewal_invoice_at?: string | null
          linked_hosting_id?: string | null
          name?: string
          nameservers?: string | null
          notes?: string | null
          project_id?: string | null
          provisioning_status?: string | null
          purchase_date?: string | null
          registrar?: string | null
          registrar_meta?: Json | null
          registrar_order_id?: string | null
          renewable?: boolean
          sale_price?: number
          status?: Database["public"]["Enums"]["service_status"]
          type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          whm_account_user?: string | null
          whm_server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_hosting_package_id_fkey"
            columns: ["hosting_package_id"]
            isOneToOne: false
            referencedRelation: "hosting_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_linked_hosting_id_fkey"
            columns: ["linked_hosting_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_whm_server_id_fkey"
            columns: ["whm_server_id"]
            isOneToOne: false
            referencedRelation: "whm_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_internal: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string
          id: string
          last_reply_at: string
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          service_id: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_reply_at?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          service_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_reply_at?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          service_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          joined_at: string | null
          monthly_salary: number
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          joined_at?: string | null
          monthly_salary?: number
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          joined_at?: string | null
          monthly_salary?: number
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whm_servers: {
        Row: {
          api_token: string
          auth_type: string
          created_at: string
          hostname: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_result: string | null
          name: string
          port: number
          updated_at: string
          username: string
        }
        Insert: {
          api_token: string
          auth_type?: string
          created_at?: string
          hostname: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_result?: string | null
          name: string
          port?: number
          updated_at?: string
          username?: string
        }
        Update: {
          api_token?: string
          auth_type?: string
          created_at?: string
          hostname?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_result?: string | null
          name?: string
          port?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email_for_username: { Args: { _username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "customer"
      customer_order_status:
        | "pending"
        | "processing"
        | "completed"
        | "cancelled"
        | "rejected"
      customer_order_type: "hosting" | "service" | "domain"
      domain_action: "register" | "transfer" | "use_existing" | "renew"
      expense_category: "office" | "server" | "utility" | "marketing" | "other"
      gateway_mode: "sandbox" | "live"
      gateway_txn_status:
        | "initiated"
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
      invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "partial"
        | "overdue"
        | "cancelled"
      payment_provider: "bkash" | "nagad" | "sslcommerz"
      project_status:
        | "planning"
        | "in_progress"
        | "completed"
        | "on_hold"
        | "cancelled"
      service_status:
        | "active"
        | "expired"
        | "cancelled"
        | "pending"
        | "suspended"
      service_type: "domain" | "hosting" | "software" | "other"
      support_ticket_priority: "low" | "normal" | "high" | "urgent"
      support_ticket_status: "open" | "pending" | "resolved" | "closed"
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
      app_role: ["admin", "customer"],
      customer_order_status: [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "rejected",
      ],
      customer_order_type: ["hosting", "service", "domain"],
      domain_action: ["register", "transfer", "use_existing", "renew"],
      expense_category: ["office", "server", "utility", "marketing", "other"],
      gateway_mode: ["sandbox", "live"],
      gateway_txn_status: [
        "initiated",
        "pending",
        "completed",
        "failed",
        "cancelled",
      ],
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "partial",
        "overdue",
        "cancelled",
      ],
      payment_provider: ["bkash", "nagad", "sslcommerz"],
      project_status: [
        "planning",
        "in_progress",
        "completed",
        "on_hold",
        "cancelled",
      ],
      service_status: [
        "active",
        "expired",
        "cancelled",
        "pending",
        "suspended",
      ],
      service_type: ["domain", "hosting", "software", "other"],
      support_ticket_priority: ["low", "normal", "high", "urgent"],
      support_ticket_status: ["open", "pending", "resolved", "closed"],
    },
  },
} as const
