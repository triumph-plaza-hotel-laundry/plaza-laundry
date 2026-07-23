export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type InventoryOperationType =
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'create'
  | 'delete';

export type Database = {
  public: {
    Tables: {
      app_data_documents: {
        Row: {
          document_key: string;
          data: Json;
          updated_at: string;
        };
        Insert: {
          document_key: string;
          data?: Json;
          updated_at?: string;
        };
        Update: {
          document_key?: string;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          role: string;
          admin_type: string | null;
          password_hash: string;
          is_owner: boolean;
          is_protected: boolean;
          is_active: boolean;
          laundry_employee_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name: string;
          role: string;
          admin_type?: string | null;
          password_hash: string;
          is_owner?: boolean;
          is_protected?: boolean;
          is_active?: boolean;
          laundry_employee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          role?: string;
          admin_type?: string | null;
          password_hash?: string;
          is_owner?: boolean;
          is_protected?: boolean;
          is_active?: boolean;
          laundry_employee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_inventory_permissions: {
        Row: {
          user_id: string;
          permission: string;
          granted_at: string;
        };
        Insert: {
          user_id: string;
          permission: string;
          granted_at?: string;
        };
        Update: {
          user_id?: string;
          permission?: string;
          granted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_inventory_permissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log_entries: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          role: string;
          action: string;
          page: string;
          old_value: string;
          new_value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name: string;
          role: string;
          action: string;
          page: string;
          old_value?: string;
          new_value?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_name?: string;
          role?: string;
          action?: string;
          page?: string;
          old_value?: string;
          new_value?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      department_items: {
        Row: {
          id: string;
          department_id: string;
          item_key: string;
          item_name: string;
          variant_key: string;
          unit: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          item_key?: string;
          item_name: string;
          variant_key?: string;
          unit?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          item_key?: string;
          item_name?: string;
          variant_key?: string;
          unit?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      department_inventory_assignments: {
        Row: {
          id: string;
          department_id: string;
          item_key: string;
          inventory_item_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          item_key: string;
          inventory_item_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          item_key?: string;
          inventory_item_id?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'department_inventory_assignments_inventory_item_id_fkey';
            columns: ['inventory_item_id'];
            isOneToOne: false;
            referencedRelation: 'inventory_items';
            referencedColumns: ['id'];
          },
        ];
      };
      department_item_categories: {
        Row: {
          id: string;
          department_id: string;
          item_key: string;
          category_name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          item_key: string;
          category_name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          item_key?: string;
          category_name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          code: string;
          name: string | null;
          name_ar: string;
          name_en: string;
          quantity: number;
          total_quantity: number | null;
          incoming_quantity: number;
          issued_quantity: number;
          remaining_quantity: number;
          minimum_quantity: number;
          unit: string;
          notes: string;
          sort_order: number;
          last_updated_at: string;
          updated_at: string | null;
          created_at: string;
          deleted_at: string | null;
          disabled_at: string | null;
        };
        Insert: {
          id?: string;
          code?: string;
          name?: string | null;
          name_ar: string;
          name_en: string;
          quantity?: number;
          total_quantity?: number | null;
          incoming_quantity?: number;
          issued_quantity?: number;
          remaining_quantity?: number;
          minimum_quantity?: number;
          unit?: string;
          notes?: string;
          sort_order: number;
          last_updated_at?: string;
          updated_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          disabled_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string | null;
          name_ar?: string;
          name_en?: string;
          quantity?: number;
          total_quantity?: number | null;
          incoming_quantity?: number;
          issued_quantity?: number;
          remaining_quantity?: number;
          minimum_quantity?: number;
          unit?: string;
          notes?: string;
          sort_order?: number;
          last_updated_at?: string;
          updated_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          disabled_at?: string | null;
        };
        Relationships: [];
      };
      inventory_under_execution: {
        Row: {
          id: string;
          supplier: string;
          department: string;
          supplier_name: string;
          item_code: string;
          item_name: string;
          quantity: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier?: string;
          department?: string;
          supplier_name?: string;
          item_code?: string;
          item_name?: string;
          quantity: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          supplier?: string;
          department?: string;
          supplier_name?: string;
          item_code?: string;
          item_name?: string;
          quantity?: number;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_under_execution_history: {
        Row: {
          id: string;
          supplier: string;
          department: string;
          supplier_name: string;
          item_code: string;
          item_name: string;
          quantity: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier?: string;
          department?: string;
          supplier_name?: string;
          item_code?: string;
          item_name?: string;
          quantity: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          supplier?: string;
          department?: string;
          supplier_name?: string;
          item_code?: string;
          item_name?: string;
          quantity?: number;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_receipts: {
        Row: {
          id: string;
          item_id: string;
          supplier: string;
          receiver: string;
          employee: string;
          quantity: number;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          supplier?: string;
          receiver?: string;
          employee?: string;
          quantity: number;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          supplier?: string;
          receiver?: string;
          employee?: string;
          quantity?: number;
          notes?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_issues: {
        Row: {
          id: string;
          item_id: string;
          employee: string;
          department: string;
          quantity: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          employee?: string;
          department?: string;
          quantity: number;
          reason?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          employee?: string;
          department?: string;
          quantity?: number;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_monthly_archives: {
        Row: {
          archive_month: string;
          inventory_data: Json;
          plan_data: Json;
          under_execution_data: Json;
          archived_at: string;
        };
        Insert: {
          archive_month: string;
          inventory_data: Json;
          plan_data: Json;
          under_execution_data?: Json;
          archived_at?: string;
        };
        Update: {
          archive_month?: string;
          inventory_data?: Json;
          plan_data?: Json;
          under_execution_data?: Json;
          archived_at?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          item_id: string;
          performed_by: string;
          employee_name: string;
          employee_id: string;
          department: string;
          supplier: string;
          reference_number: string;
          reason: string;
          item_code: string;
          item_name: string;
          operation: InventoryOperationType;
          old_quantity: number;
          new_quantity: number;
          quantity_changed: number;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          performed_by: string;
          employee_name?: string;
          employee_id?: string;
          department?: string;
          supplier?: string;
          reference_number?: string;
          reason?: string;
          item_code?: string;
          item_name: string;
          operation: InventoryOperationType;
          old_quantity?: number;
          new_quantity?: number;
          quantity_changed?: number;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          performed_by?: string;
          employee_name?: string;
          employee_id?: string;
          department?: string;
          supplier?: string;
          reference_number?: string;
          reason?: string;
          item_code?: string;
          item_name?: string;
          operation?: InventoryOperationType;
          old_quantity?: number;
          new_quantity?: number;
          quantity_changed?: number;
          notes?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      washing_programs: {
        Row: {
          id: number;
          title_en: string;
          title_ar: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          title_en?: string;
          title_ar?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title_en?: string;
          title_ar?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      washing_program_parameters: {
        Row: {
          program_id: number;
          duration_min: number;
          temp_badge_en: string;
          temp_badge_ar: string;
          footer_en: string;
          footer_ar: string;
          updated_at: string;
        };
        Insert: {
          program_id: number;
          duration_min?: number;
          temp_badge_en?: string;
          temp_badge_ar?: string;
          footer_en?: string;
          footer_ar?: string;
          updated_at?: string;
        };
        Update: {
          program_id?: number;
          duration_min?: number;
          temp_badge_en?: string;
          temp_badge_ar?: string;
          footer_en?: string;
          footer_ar?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      washing_program_steps: {
        Row: {
          id: string;
          program_id: number;
          step_number: number;
          process_en: string;
          process_ar: string;
          water_level: string;
          temperature_en: string;
          temperature_ar: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          program_id: number;
          step_number: number;
          process_en?: string;
          process_ar?: string;
          water_level?: string;
          temperature_en?: string;
          temperature_ar?: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          program_id?: number;
          step_number?: number;
          process_en?: string;
          process_ar?: string;
          water_level?: string;
          temperature_en?: string;
          temperature_ar?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      laundry_chemicals: {
        Row: {
          id: number;
          product_code: string;
          brand: string;
          image: string;
          name_en: string;
          name_ar: string;
          category_en: string;
          category_ar: string;
          description_en: string;
          description_ar: string;
          how_it_works_en: string;
          how_it_works_ar: string;
          usage_en: string;
          usage_ar: string;
          dosage_en: string;
          dosage_ar: string;
          safety_en: string;
          safety_ar: string;
          storage_en: string;
          storage_ar: string;
          technical_footer_en: string;
          technical_footer_ar: string;
          features: Json;
          warnings: Json;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          product_code?: string;
          brand?: string;
          image?: string;
          name_en?: string;
          name_ar?: string;
          category_en?: string;
          category_ar?: string;
          description_en?: string;
          description_ar?: string;
          how_it_works_en?: string;
          how_it_works_ar?: string;
          usage_en?: string;
          usage_ar?: string;
          dosage_en?: string;
          dosage_ar?: string;
          safety_en?: string;
          safety_ar?: string;
          storage_en?: string;
          storage_ar?: string;
          technical_footer_en?: string;
          technical_footer_ar?: string;
          features?: Json;
          warnings?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          product_code?: string;
          brand?: string;
          image?: string;
          name_en?: string;
          name_ar?: string;
          category_en?: string;
          category_ar?: string;
          description_en?: string;
          description_ar?: string;
          how_it_works_en?: string;
          how_it_works_ar?: string;
          usage_en?: string;
          usage_ar?: string;
          dosage_en?: string;
          dosage_ar?: string;
          safety_en?: string;
          safety_ar?: string;
          storage_en?: string;
          storage_ar?: string;
          technical_footer_en?: string;
          technical_footer_ar?: string;
          features?: Json;
          warnings?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chemical_technical_info: {
        Row: {
          id: string;
          chemical_id: number;
          row_key: string;
          label_en: string;
          label_ar: string;
          value_en: string;
          value_ar: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          chemical_id: number;
          row_key: string;
          label_en?: string;
          label_ar?: string;
          value_en?: string;
          value_ar?: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          chemical_id?: number;
          row_key?: string;
          label_en?: string;
          label_ar?: string;
          value_en?: string;
          value_ar?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      admin_device_permissions: {
        Row: {
          user_id: string;
          permission: string;
          granted_at: string;
        };
        Insert: {
          user_id: string;
          permission: string;
          granted_at?: string;
        };
        Update: {
          user_id?: string;
          permission?: string;
          granted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_device_permissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_device_pairing_sessions: {
        Row: {
          id: string;
          pairing_token: string;
          onesignal_player_id: string;
          device_label: string;
          status: 'pending' | 'completed' | 'expired' | 'cancelled';
          laundry_employee_id: string | null;
          laundry_employee_name_en: string | null;
          laundry_employee_name_ar: string | null;
          paired_by_admin_id: string | null;
          created_at: string;
          expires_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          pairing_token: string;
          onesignal_player_id: string;
          device_label?: string;
          status?: 'pending' | 'completed' | 'expired' | 'cancelled';
          laundry_employee_id?: string | null;
          laundry_employee_name_en?: string | null;
          laundry_employee_name_ar?: string | null;
          paired_by_admin_id?: string | null;
          created_at?: string;
          expires_at: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          pairing_token?: string;
          onesignal_player_id?: string;
          device_label?: string;
          status?: 'pending' | 'completed' | 'expired' | 'cancelled';
          laundry_employee_id?: string | null;
          laundry_employee_name_en?: string | null;
          laundry_employee_name_ar?: string | null;
          paired_by_admin_id?: string | null;
          created_at?: string;
          expires_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_device_pairing_sessions_paired_by_admin_id_fkey';
            columns: ['paired_by_admin_id'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_linked_devices: {
        Row: {
          id: string;
          laundry_employee_id: string;
          laundry_employee_name_en: string | null;
          laundry_employee_name_ar: string | null;
          onesignal_player_id: string;
          device_label: string;
          status: 'active' | 'replaced' | 'removed';
          paired_at: string;
          last_seen_at: string;
          paired_by_admin_id: string | null;
          replaced_at: string | null;
          removed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          laundry_employee_id: string;
          laundry_employee_name_en?: string | null;
          laundry_employee_name_ar?: string | null;
          onesignal_player_id: string;
          device_label?: string;
          status?: 'active' | 'replaced' | 'removed';
          paired_at?: string;
          last_seen_at?: string;
          paired_by_admin_id?: string | null;
          replaced_at?: string | null;
          removed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          laundry_employee_id?: string;
          laundry_employee_name_en?: string | null;
          laundry_employee_name_ar?: string | null;
          onesignal_player_id?: string;
          device_label?: string;
          status?: 'active' | 'replaced' | 'removed';
          paired_at?: string;
          last_seen_at?: string;
          paired_by_admin_id?: string | null;
          replaced_at?: string | null;
          removed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_linked_devices_paired_by_admin_id_fkey';
            columns: ['paired_by_admin_id'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      primary_admin_device: {
        Row: {
          id: string;
          singleton: boolean;
          device_id: string;
          onesignal_subscription_id: string;
          registered_at: string;
          registered_by_admin_id: string | null;
        };
        Insert: {
          id?: string;
          singleton?: boolean;
          device_id: string;
          onesignal_subscription_id: string;
          registered_at?: string;
          registered_by_admin_id?: string | null;
        };
        Update: {
          id?: string;
          singleton?: boolean;
          device_id?: string;
          onesignal_subscription_id?: string;
          registered_at?: string;
          registered_by_admin_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'primary_admin_device_registered_by_admin_id_fkey';
            columns: ['registered_by_admin_id'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      onesignal_subscriptions: {
        Row: {
          id: string;
          employee_id: string;
          onesignal_player_id: string;
          device: string;
          laundry_employee_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          onesignal_player_id: string;
          device?: string;
          laundry_employee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          onesignal_player_id?: string;
          device?: string;
          laundry_employee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onesignal_subscriptions_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      push_notification_history: {
        Row: {
          id: string;
          type: 'shift_reminder' | 'shift_manual';
          target_date: string;
          laundry_employee_id: string | null;
          employee_name_en: string | null;
          employee_name_ar: string | null;
          admin_user_id: string | null;
          onesignal_player_id: string | null;
          title_en: string;
          body_en: string;
          shift_period: string | null;
          shift_role: string | null;
          department_en: string | null;
          start_time: string | null;
          status: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message: string | null;
          triggered_by: string;
          audience: string;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: 'shift_reminder' | 'shift_manual';
          target_date: string;
          laundry_employee_id?: string | null;
          employee_name_en?: string | null;
          employee_name_ar?: string | null;
          admin_user_id?: string | null;
          onesignal_player_id?: string | null;
          title_en: string;
          body_en: string;
          shift_period?: string | null;
          shift_role?: string | null;
          department_en?: string | null;
          start_time?: string | null;
          status?: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message?: string | null;
          triggered_by?: string;
          audience?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: 'shift_reminder' | 'shift_manual';
          target_date?: string;
          laundry_employee_id?: string | null;
          employee_name_en?: string | null;
          employee_name_ar?: string | null;
          admin_user_id?: string | null;
          onesignal_player_id?: string | null;
          title_en?: string;
          body_en?: string;
          shift_period?: string | null;
          shift_role?: string | null;
          department_en?: string | null;
          start_time?: string | null;
          status?: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message?: string | null;
          triggered_by?: string;
          audience?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_notification_history_admin_user_id_fkey';
            columns: ['admin_user_id'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_departments: {
        Row: {
          id: string;
          name: string;
          next_employee_seq: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          next_employee_seq?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          next_employee_seq?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      asset_items: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      asset_employees: {
        Row: {
          id: string;
          department_id: string;
          employee_number: number;
          employee_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          employee_number: number;
          employee_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          employee_number?: number;
          employee_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_employees_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'asset_departments';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_receipts: {
        Row: {
          id: string;
          employee_id: string;
          receipt_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          receipt_date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          receipt_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_receipts_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'asset_employees';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_receipt_items: {
        Row: {
          id: string;
          receipt_id: string;
          item_id: string;
          quantity: number;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          item_id: string;
          quantity: number;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          item_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_receipt_items_receipt_id_fkey';
            columns: ['receipt_id'];
            isOneToOne: false;
            referencedRelation: 'asset_receipts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_receipt_items_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'asset_items';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      allocate_asset_employee_number: {
        Args: {
          p_department_id: string;
        };
        Returns: number;
      };
      admin_clear_inventory_under_execution_history: {
        Args: {
          p_actor_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      inventory_operation_type: InventoryOperationType;
    };
    CompositeTypes: Record<string, never>;
  };
};
