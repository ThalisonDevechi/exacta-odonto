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
      appointment_reminders: {
        Row: {
          appointment_id: string
          cancelled_reason: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          patient_id: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          updated_at: string
        }
        Insert: {
          appointment_id: string
          cancelled_reason?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          patient_id: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          cancelled_reason?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          patient_id?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string | null
          cancellation_reason: string | null
          confirmation_channel:
            | Database["public"]["Enums"]["communication_channel"]
            | null
          confirmation_notes: string | null
          confirmation_status: Database["public"]["Enums"]["appointment_confirmation_status"]
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          date: string
          dentist_id: string
          end_time: string
          id: string
          notes: string | null
          patient_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_type?: string | null
          cancellation_reason?: string | null
          confirmation_channel?:
            | Database["public"]["Enums"]["communication_channel"]
            | null
          confirmation_notes?: string | null
          confirmation_status?: Database["public"]["Enums"]["appointment_confirmation_status"]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          dentist_id: string
          end_time: string
          id?: string
          notes?: string | null
          patient_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_type?: string | null
          cancellation_reason?: string | null
          confirmation_channel?:
            | Database["public"]["Enums"]["communication_channel"]
            | null
          confirmation_notes?: string | null
          confirmation_status?: Database["public"]["Enums"]["appointment_confirmation_status"]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          dentist_id?: string
          end_time?: string
          id?: string
          notes?: string | null
          patient_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["attachment_category"]
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          medical_record_id: string | null
          patient_id: string
          released_to_patient: boolean
          uploaded_by: string | null
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["attachment_category"]
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          medical_record_id?: string | null
          patient_id: string
          released_to_patient?: boolean
          uploaded_by?: string | null
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["attachment_category"]
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          medical_record_id?: string | null
          patient_id?: string
          released_to_patient?: boolean
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          budget_id: string
          created_at: string
          description: string
          id: string
          order_index: number
          quantity: number
          tooth_number: number | null
          total_value: number
          unit_value: number
        }
        Insert: {
          budget_id: string
          created_at?: string
          description: string
          id?: string
          order_index?: number
          quantity?: number
          tooth_number?: number | null
          total_value?: number
          unit_value?: number
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          quantity?: number
          tooth_number?: number | null
          total_value?: number
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "treatment_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          clinic_name: string
          cnpj: string | null
          created_at: string
          default_budget_validity_days: number
          district: string | null
          document_footer: string | null
          email: string | null
          id: string
          logo_path: string | null
          logo_url: string | null
          number: string | null
          opening_hours: string | null
          phone: string | null
          responsible_cro: string | null
          responsible_name: string | null
          state: string | null
          trade_name: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          clinic_name: string
          cnpj?: string | null
          created_at?: string
          default_budget_validity_days?: number
          district?: string | null
          document_footer?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          logo_url?: string | null
          number?: string | null
          opening_hours?: string | null
          phone?: string | null
          responsible_cro?: string | null
          responsible_name?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          clinic_name?: string
          cnpj?: string | null
          created_at?: string
          default_budget_validity_days?: number
          district?: string | null
          document_footer?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          logo_url?: string | null
          number?: string | null
          opening_hours?: string | null
          phone?: string | null
          responsible_cro?: string | null
          responsible_name?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      clinical_evolutions: {
        Row: {
          appointment_id: string | null
          created_at: string
          description: string
          id: string
          medical_record_id: string
          original_text: string | null
          patient_id: string
          professional_id: string
          professional_name: string | null
          rectification_reason: string | null
          released_to_patient: boolean
          status: Database["public"]["Enums"]["evolution_status"]
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          description: string
          id?: string
          medical_record_id: string
          original_text?: string | null
          patient_id: string
          professional_id: string
          professional_name?: string | null
          rectification_reason?: string | null
          released_to_patient?: boolean
          status?: Database["public"]["Enums"]["evolution_status"]
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          description?: string
          id?: string
          medical_record_id?: string
          original_text?: string | null
          patient_id?: string
          professional_id?: string
          professional_name?: string | null
          rectification_reason?: string | null
          released_to_patient?: boolean
          status?: Database["public"]["Enums"]["evolution_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_evolutions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_evolutions_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          appointment_id: string | null
          budget_id: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          direction: Database["public"]["Enums"]["communication_direction"]
          financial_record_id: string | null
          id: string
          message: string | null
          patient_id: string
          receipt_id: string | null
          reminder_id: string | null
          responsible_name: string | null
          responsible_user_id: string | null
          status: Database["public"]["Enums"]["communication_status"]
          type: Database["public"]["Enums"]["communication_type"]
        }
        Insert: {
          appointment_id?: string | null
          budget_id?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          direction?: Database["public"]["Enums"]["communication_direction"]
          financial_record_id?: string | null
          id?: string
          message?: string | null
          patient_id: string
          receipt_id?: string | null
          reminder_id?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Update: {
          appointment_id?: string | null
          budget_id?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          direction?: Database["public"]["Enums"]["communication_direction"]
          financial_record_id?: string | null
          id?: string
          message?: string | null
          patient_id?: string
          receipt_id?: string | null
          reminder_id?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "treatment_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "appointment_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      dentists: {
        Row: {
          created_at: string
          cro: string
          email: string | null
          id: string
          name: string
          phone: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cro: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cro?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_sequences: {
        Row: {
          doc_type: string
          last_number: number
          year: number
        }
        Insert: {
          doc_type: string
          last_number?: number
          year: number
        }
        Update: {
          doc_type?: string
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      document_signatures: {
        Row: {
          accepted_terms: boolean
          created_at: string
          created_by: string | null
          document_id: string
          document_type: Database["public"]["Enums"]["document_signature_type"]
          id: string
          patient_id: string
          signature_image_path: string
          signature_image_url: string | null
          signed_at: string
          signer_document: string
          signer_name: string
        }
        Insert: {
          accepted_terms?: boolean
          created_at?: string
          created_by?: string | null
          document_id: string
          document_type: Database["public"]["Enums"]["document_signature_type"]
          id?: string
          patient_id: string
          signature_image_path: string
          signature_image_url?: string | null
          signed_at?: string
          signer_document: string
          signer_name: string
        }
        Update: {
          accepted_terms?: boolean
          created_at?: string
          created_by?: string | null
          document_id?: string
          document_type?: Database["public"]["Enums"]["document_signature_type"]
          id?: string
          patient_id?: string
          signature_image_path?: string
          signature_image_url?: string | null
          signed_at?: string
          signer_document?: string
          signer_name?: string
        }
        Relationships: []
      }
      export_logs: {
        Row: {
          created_at: string
          export_type: Database["public"]["Enums"]["export_type"]
          filters: Json | null
          format: Database["public"]["Enums"]["export_format"]
          id: string
          total_records: number
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          export_type: Database["public"]["Enums"]["export_type"]
          filters?: Json | null
          format?: Database["public"]["Enums"]["export_format"]
          id?: string
          total_records?: number
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          export_type?: Database["public"]["Enums"]["export_type"]
          filters?: Json | null
          format?: Database["public"]["Enums"]["export_format"]
          id?: string
          total_records?: number
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          appointment_id: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string | null
          description: string
          discount_value: number
          due_date: string | null
          final_value: number
          id: string
          original_value: number
          paid_value: number
          patient_id: string
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          procedure_id: string | null
          received_by: string | null
          refunded_reason: string | null
          remaining_value: number
          status: Database["public"]["Enums"]["financial_status"]
          treatment_plan_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          discount_value?: number
          due_date?: string | null
          final_value?: number
          id?: string
          original_value?: number
          paid_value?: number
          patient_id: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          procedure_id?: string | null
          received_by?: string | null
          refunded_reason?: string | null
          remaining_value?: number
          status?: Database["public"]["Enums"]["financial_status"]
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          discount_value?: number
          due_date?: string | null
          final_value?: number
          id?: string
          original_value?: number
          paid_value?: number
          patient_id?: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          procedure_id?: string | null
          received_by?: string | null
          refunded_reason?: string | null
          remaining_value?: number
          status?: Database["public"]["Enums"]["financial_status"]
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          allergies: string | null
          chief_complaint: string | null
          clinical_notes: string | null
          created_at: string
          diagnosis: string | null
          id: string
          last_updated_by: string | null
          medical_history: string | null
          medications: string | null
          patient_id: string
          released_to_patient: boolean
          treatment_plan_summary: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          last_updated_by?: string | null
          medical_history?: string | null
          medications?: string | null
          patient_id: string
          released_to_patient?: boolean
          treatment_plan_summary?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          last_updated_by?: string | null
          medical_history?: string | null
          medications?: string | null
          patient_id?: string
          released_to_patient?: boolean
          treatment_plan_summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string | null
          type: Database["public"]["Enums"]["message_template_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          type?: Database["public"]["Enums"]["message_template_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["message_template_type"]
          updated_at?: string
        }
        Relationships: []
      }
      odontogram_teeth: {
        Row: {
          created_at: string
          id: string
          observation: string | null
          odontogram_id: string
          patient_id: string
          professional_id: string | null
          quadrant: number
          status: Database["public"]["Enums"]["tooth_status"]
          tooth_kind: Database["public"]["Enums"]["tooth_kind"]
          tooth_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          observation?: string | null
          odontogram_id: string
          patient_id: string
          professional_id?: string | null
          quadrant: number
          status?: Database["public"]["Enums"]["tooth_status"]
          tooth_kind: Database["public"]["Enums"]["tooth_kind"]
          tooth_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          observation?: string | null
          odontogram_id?: string
          patient_id?: string
          professional_id?: string | null
          quadrant?: number
          status?: Database["public"]["Enums"]["tooth_status"]
          tooth_kind?: Database["public"]["Enums"]["tooth_kind"]
          tooth_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "odontogram_teeth_odontogram_id_fkey"
            columns: ["odontogram_id"]
            isOneToOne: false
            referencedRelation: "odontograms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odontogram_teeth_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      odontograms: {
        Row: {
          change_justification: string | null
          created_at: string
          defined_automatically: boolean
          dentition_type: Database["public"]["Enums"]["dentition_type"]
          id: string
          manually_changed: boolean
          patient_id: string
          professional_id: string | null
          updated_at: string
        }
        Insert: {
          change_justification?: string | null
          created_at?: string
          defined_automatically?: boolean
          dentition_type?: Database["public"]["Enums"]["dentition_type"]
          id?: string
          manually_changed?: boolean
          patient_id: string
          professional_id?: string | null
          updated_at?: string
        }
        Update: {
          change_justification?: string | null
          created_at?: string
          defined_automatically?: boolean
          dentition_type?: Database["public"]["Enums"]["dentition_type"]
          id?: string
          manually_changed?: boolean
          patient_id?: string
          professional_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "odontograms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          address_number: string | null
          birth_date: string
          city: string | null
          cpf: string | null
          created_at: string
          email: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          guardian_cpf: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          rg: string | null
          state: string | null
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          birth_date: string
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          birth_date?: string
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          financial_record_id: string
          id: string
          issued_by: string | null
          notes: string | null
          patient_id: string
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_number: string | null
          released_to_patient: boolean
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          financial_record_id: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          patient_id: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_number?: string | null
          released_to_patient?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          financial_record_id?: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          patient_id?: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_number?: string | null
          released_to_patient?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          appointment_id: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string | null
          dentist_id: string
          description: string | null
          id: string
          name: string
          patient_id: string
          performed_date: string | null
          planned_date: string | null
          status: Database["public"]["Enums"]["procedure_status"]
          tooth_face: string | null
          tooth_number: number | null
          treatment_plan_id: string | null
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          appointment_id?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          dentist_id: string
          description?: string | null
          id?: string
          name: string
          patient_id: string
          performed_date?: string | null
          planned_date?: string | null
          status?: Database["public"]["Enums"]["procedure_status"]
          tooth_face?: string | null
          tooth_number?: number | null
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Update: {
          appointment_id?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          dentist_id?: string
          description?: string | null
          id?: string
          name?: string
          patient_id?: string
          performed_date?: string | null
          planned_date?: string | null
          status?: Database["public"]["Enums"]["procedure_status"]
          tooth_face?: string | null
          tooth_number?: number | null
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login: string | null
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          last_login?: string | null
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tooth_faces: {
        Row: {
          appointment_id: string | null
          condition: Database["public"]["Enums"]["face_condition"]
          created_at: string
          face: Database["public"]["Enums"]["tooth_face_type"]
          id: string
          observation: string | null
          performed_procedure: string | null
          planned_procedure: string | null
          professional_id: string | null
          tooth_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          condition?: Database["public"]["Enums"]["face_condition"]
          created_at?: string
          face: Database["public"]["Enums"]["tooth_face_type"]
          id?: string
          observation?: string | null
          performed_procedure?: string | null
          planned_procedure?: string | null
          professional_id?: string | null
          tooth_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          condition?: Database["public"]["Enums"]["face_condition"]
          created_at?: string
          face?: Database["public"]["Enums"]["tooth_face_type"]
          id?: string
          observation?: string | null
          performed_procedure?: string | null
          planned_procedure?: string | null
          professional_id?: string | null
          tooth_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooth_faces_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_faces_tooth_id_fkey"
            columns: ["tooth_id"]
            isOneToOne: false
            referencedRelation: "odontogram_teeth"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_budgets: {
        Row: {
          accepted_at: string | null
          budget_number: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string | null
          dentist_id: string | null
          description: string | null
          discount_value: number
          id: string
          notes: string | null
          patient_id: string
          released_to_patient: boolean
          status: Database["public"]["Enums"]["budget_status"]
          subtotal: number
          title: string
          total_value: number
          treatment_plan_id: string | null
          updated_at: string
          validity_date: string | null
        }
        Insert: {
          accepted_at?: string | null
          budget_number?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          dentist_id?: string | null
          description?: string | null
          discount_value?: number
          id?: string
          notes?: string | null
          patient_id: string
          released_to_patient?: boolean
          status?: Database["public"]["Enums"]["budget_status"]
          subtotal?: number
          title: string
          total_value?: number
          treatment_plan_id?: string | null
          updated_at?: string
          validity_date?: string | null
        }
        Update: {
          accepted_at?: string | null
          budget_number?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          dentist_id?: string | null
          description?: string | null
          discount_value?: number
          id?: string
          notes?: string | null
          patient_id?: string
          released_to_patient?: boolean
          status?: Database["public"]["Enums"]["budget_status"]
          subtotal?: number
          title?: string
          total_value?: number
          treatment_plan_id?: string | null
          updated_at?: string
          validity_date?: string | null
        }
        Relationships: []
      }
      treatment_plan_steps: {
        Row: {
          cancelled_reason: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          expected_date: string | null
          id: string
          order_index: number
          status: Database["public"]["Enums"]["treatment_step_status"]
          title: string
          treatment_plan_id: string
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          expected_date?: string | null
          id?: string
          order_index?: number
          status?: Database["public"]["Enums"]["treatment_step_status"]
          title: string
          treatment_plan_id: string
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          expected_date?: string | null
          id?: string
          order_index?: number
          status?: Database["public"]["Enums"]["treatment_step_status"]
          title?: string
          treatment_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_steps_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          approved_at: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string | null
          dentist_id: string | null
          description: string | null
          end_date: string | null
          estimated_value: number
          final_value: number | null
          id: string
          patient_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["treatment_plan_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          dentist_id?: string | null
          description?: string | null
          end_date?: string | null
          estimated_value?: number
          final_value?: number | null
          id?: string
          patient_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          dentist_id?: string | null
          description?: string | null
          end_date?: string | null
          estimated_value?: number
          final_value?: number | null
          id?: string
          patient_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      next_document_number: {
        Args: { _doc_type: string; _prefix: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "receptionist" | "dentist" | "assistant" | "patient"
      appointment_confirmation_status:
        | "pendente"
        | "confirmada"
        | "recusada"
        | "sem_resposta"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "missed"
        | "rescheduled"
      attachment_category:
        | "documento"
        | "exame"
        | "radiografia"
        | "imagem_clinica"
        | "contrato"
        | "outro"
      budget_status:
        | "rascunho"
        | "emitido"
        | "aceito"
        | "recusado"
        | "vencido"
        | "cancelado"
      communication_channel:
        | "whatsapp"
        | "telefone"
        | "presencial"
        | "email"
        | "sms"
        | "outro"
      communication_direction: "enviada" | "recebida"
      communication_status:
        | "registrada"
        | "enviada_manual"
        | "sem_resposta"
        | "respondida"
        | "falhou"
      communication_type:
        | "lembrete_consulta"
        | "confirmacao_consulta"
        | "cobranca"
        | "envio_orcamento"
        | "envio_recibo"
        | "retorno_pos_atendimento"
        | "atendimento_manual"
        | "outro"
      dentition_type: "deciduous" | "mixed" | "permanent"
      document_signature_type:
        | "budget"
        | "receipt"
        | "treatment_plan"
        | "consent"
      evolution_status: "active" | "rectified" | "cancelled"
      export_format: "csv"
      export_type:
        | "pacientes"
        | "consultas"
        | "financeiro"
        | "procedimentos"
        | "planos_tratamento"
        | "logs_auditoria"
        | "recibos"
        | "orcamentos"
        | "comunicacoes"
        | "lembretes"
        | "assinaturas"
      face_condition:
        | "normal"
        | "carie"
        | "restauracao"
        | "restauracao_infiltrada"
        | "fratura"
        | "desgaste"
        | "mancha"
        | "selante"
        | "tratamento_indicado"
        | "tratamento_realizado"
        | "outro"
      financial_status:
        | "pendente"
        | "pago"
        | "parcial"
        | "atrasado"
        | "cancelado"
        | "estornado"
      gender_type: "M" | "F" | "O"
      message_channel: "whatsapp" | "email" | "sms" | "outro"
      message_template_type:
        | "confirmacao_consulta"
        | "lembrete_consulta"
        | "cobranca"
        | "orcamento"
        | "recibo"
        | "retorno_pos_atendimento"
        | "aniversario"
        | "outro"
      patient_status: "active" | "inactive" | "archived"
      payment_method:
        | "dinheiro"
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "boleto"
        | "transferencia"
        | "convenio"
        | "outro"
      procedure_status:
        | "planejado"
        | "autorizado"
        | "em_execucao"
        | "realizado"
        | "cancelado"
      reminder_status:
        | "pendente"
        | "preparado"
        | "enviado_manual"
        | "cancelado"
        | "falhou"
      reminder_type: "vinte_quatro_horas_antes" | "no_dia" | "personalizado"
      tooth_face_type:
        | "vestibular"
        | "lingual"
        | "palatina"
        | "mesial"
        | "distal"
        | "oclusal"
        | "incisal"
        | "cervical"
        | "raiz"
      tooth_kind: "deciduous" | "permanent"
      tooth_status:
        | "integro"
        | "cariado"
        | "restaurado"
        | "ausente"
        | "extraido"
        | "indicado_para_extracao"
        | "tratamento_endodontico"
        | "coroa"
        | "implante"
        | "protese"
        | "selante"
        | "fraturado"
        | "incluso"
        | "em_erupcao"
        | "nao_erupcionado"
        | "mobilidade"
        | "outro"
      treatment_plan_status:
        | "rascunho"
        | "apresentado"
        | "aprovado"
        | "em_andamento"
        | "pausado"
        | "concluido"
        | "cancelado"
      treatment_step_status:
        | "pendente"
        | "em_andamento"
        | "concluida"
        | "cancelada"
      user_status: "active" | "inactive" | "blocked"
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
      app_role: ["admin", "receptionist", "dentist", "assistant", "patient"],
      appointment_confirmation_status: [
        "pendente",
        "confirmada",
        "recusada",
        "sem_resposta",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "missed",
        "rescheduled",
      ],
      attachment_category: [
        "documento",
        "exame",
        "radiografia",
        "imagem_clinica",
        "contrato",
        "outro",
      ],
      budget_status: [
        "rascunho",
        "emitido",
        "aceito",
        "recusado",
        "vencido",
        "cancelado",
      ],
      communication_channel: [
        "whatsapp",
        "telefone",
        "presencial",
        "email",
        "sms",
        "outro",
      ],
      communication_direction: ["enviada", "recebida"],
      communication_status: [
        "registrada",
        "enviada_manual",
        "sem_resposta",
        "respondida",
        "falhou",
      ],
      communication_type: [
        "lembrete_consulta",
        "confirmacao_consulta",
        "cobranca",
        "envio_orcamento",
        "envio_recibo",
        "retorno_pos_atendimento",
        "atendimento_manual",
        "outro",
      ],
      dentition_type: ["deciduous", "mixed", "permanent"],
      document_signature_type: [
        "budget",
        "receipt",
        "treatment_plan",
        "consent",
      ],
      evolution_status: ["active", "rectified", "cancelled"],
      export_format: ["csv"],
      export_type: [
        "pacientes",
        "consultas",
        "financeiro",
        "procedimentos",
        "planos_tratamento",
        "logs_auditoria",
        "recibos",
        "orcamentos",
        "comunicacoes",
        "lembretes",
        "assinaturas",
      ],
      face_condition: [
        "normal",
        "carie",
        "restauracao",
        "restauracao_infiltrada",
        "fratura",
        "desgaste",
        "mancha",
        "selante",
        "tratamento_indicado",
        "tratamento_realizado",
        "outro",
      ],
      financial_status: [
        "pendente",
        "pago",
        "parcial",
        "atrasado",
        "cancelado",
        "estornado",
      ],
      gender_type: ["M", "F", "O"],
      message_channel: ["whatsapp", "email", "sms", "outro"],
      message_template_type: [
        "confirmacao_consulta",
        "lembrete_consulta",
        "cobranca",
        "orcamento",
        "recibo",
        "retorno_pos_atendimento",
        "aniversario",
        "outro",
      ],
      patient_status: ["active", "inactive", "archived"],
      payment_method: [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "boleto",
        "transferencia",
        "convenio",
        "outro",
      ],
      procedure_status: [
        "planejado",
        "autorizado",
        "em_execucao",
        "realizado",
        "cancelado",
      ],
      reminder_status: [
        "pendente",
        "preparado",
        "enviado_manual",
        "cancelado",
        "falhou",
      ],
      reminder_type: ["vinte_quatro_horas_antes", "no_dia", "personalizado"],
      tooth_face_type: [
        "vestibular",
        "lingual",
        "palatina",
        "mesial",
        "distal",
        "oclusal",
        "incisal",
        "cervical",
        "raiz",
      ],
      tooth_kind: ["deciduous", "permanent"],
      tooth_status: [
        "integro",
        "cariado",
        "restaurado",
        "ausente",
        "extraido",
        "indicado_para_extracao",
        "tratamento_endodontico",
        "coroa",
        "implante",
        "protese",
        "selante",
        "fraturado",
        "incluso",
        "em_erupcao",
        "nao_erupcionado",
        "mobilidade",
        "outro",
      ],
      treatment_plan_status: [
        "rascunho",
        "apresentado",
        "aprovado",
        "em_andamento",
        "pausado",
        "concluido",
        "cancelado",
      ],
      treatment_step_status: [
        "pendente",
        "em_andamento",
        "concluida",
        "cancelada",
      ],
      user_status: ["active", "inactive", "blocked"],
    },
  },
} as const
