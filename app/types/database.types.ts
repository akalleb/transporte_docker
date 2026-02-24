export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          phone: string | null
          role: 'admin' | 'user'
          status: 'pending' | 'active' | 'blocked'
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          phone?: string | null
          role?: 'admin' | 'user'
          status?: 'pending' | 'active' | 'blocked'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          phone?: string | null
          role?: 'admin' | 'user'
          status?: 'pending' | 'active' | 'blocked'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          contact_name: string | null
          contact_phone: string
          status: 'active' | 'pending' | 'closed'
          last_message: string | null
          last_message_at: string
          unread_count: number
          created_at: string
          flow_step: string | null
          flow_data: Json | null
          is_bot_active: boolean
        }
        Insert: {
          id?: string
          contact_name?: string | null
          contact_phone: string
          status?: 'active' | 'pending' | 'closed'
          last_message?: string | null
          last_message_at?: string
          unread_count?: number
          created_at?: string
          flow_step?: string | null
          flow_data?: Json | null
          is_bot_active?: boolean
        }
        Update: {
          id?: string
          contact_name?: string | null
          contact_phone?: string
          status?: 'active' | 'pending' | 'closed'
          last_message?: string | null
          last_message_at?: string
          unread_count?: number
          created_at?: string
          flow_step?: string | null
          flow_data?: Json | null
          is_bot_active?: boolean
        }
        Relationships: []
      }
      registrations: {
        Row: {
          id: string
          conversation_id: string
          patient_name: string | null
          patient_phone: string | null
          procedure_date: string | null
          procedure_time: string | null
          procedure_type: string | null
          procedure_name: string | null
          location: string | null
          city: string | null
          boarding_neighborhood: string | null
          boarding_point: string | null
          needs_companion: boolean
          companion_reason: string | null
          attachment_url: string | null
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          patient_name?: string | null
          patient_phone?: string | null
          procedure_date?: string | null
          procedure_time?: string | null
          procedure_type?: string | null
          procedure_name?: string | null
          location?: string | null
          city?: string | null
          boarding_neighborhood?: string | null
          boarding_point?: string | null
          needs_companion?: boolean
          companion_reason?: string | null
          attachment_url?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          patient_name?: string | null
          patient_phone?: string | null
          procedure_date?: string | null
          procedure_time?: string | null
          procedure_type?: string | null
          procedure_name?: string | null
          location?: string | null
          city?: string | null
          boarding_neighborhood?: string | null
          boarding_point?: string | null
          needs_companion?: boolean
          companion_reason?: string | null
          attachment_url?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      boarding_locations: {
        Row: {
          id: string
          neighborhood: string
          point_name: string
          created_at: string
        }
        Insert: {
          id?: string
          neighborhood: string
          point_name: string
          created_at?: string
        }
        Update: {
          id?: string
          neighborhood?: string
          point_name?: string
          created_at?: string
        }
        Relationships: []
      },
      vehicles: {
        Row: {
          id: number
          name: string
          brand: string
          model: string
          year: number
          plate: string
          type: string
          status: 'available' | 'maintenance' | 'out'
          odometer: number
          fuel_level: number
          fuel_efficiency: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          brand: string
          model: string
          year: number
          plate: string
          type: string
          status?: 'available' | 'maintenance' | 'out'
          odometer?: number
          fuel_level?: number
          fuel_efficiency?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          brand?: string
          model?: string
          year?: number
          plate?: string
          type?: string
          status?: 'available' | 'maintenance' | 'out'
          odometer?: number
          fuel_level?: number
          fuel_efficiency?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      },
      maintenance_records: {
        Row: {
          id: string
          vehicle_id: number
          date: string
          description: string
          cost: number
          mechanic: string
          type: 'preventive' | 'corrective'
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: number
          date: string
          description: string
          cost: number
          mechanic: string
          type: 'preventive' | 'corrective'
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: number
          date?: string
          description?: string
          cost?: number
          mechanic?: string
          type?: 'preventive' | 'corrective'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender: 'agent' | 'contact' | 'system'
          content: string
          type: 'text' | 'image' | 'audio' | 'file'
          status: 'sent' | 'delivered' | 'read'
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender: 'agent' | 'contact' | 'system'
          content: string
          type?: 'text' | 'image' | 'audio' | 'file'
          status?: 'sent' | 'delivered' | 'read'
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender?: 'agent' | 'contact' | 'system'
          content?: string
          type?: 'text' | 'image' | 'audio' | 'file'
          status?: 'sent' | 'delivered' | 'read'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
