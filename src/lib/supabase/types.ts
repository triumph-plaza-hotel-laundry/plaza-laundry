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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          quantity: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          employee?: string;
          quantity: number;
          reason?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          employee?: string;
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
          archived_at: string;
        };
        Insert: {
          archive_month: string;
          inventory_data: Json;
          plan_data: Json;
          archived_at?: string;
        };
        Update: {
          archive_month?: string;
          inventory_data?: Json;
          plan_data?: Json;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      inventory_operation_type: InventoryOperationType;
    };
    CompositeTypes: Record<string, never>;
  };
};
