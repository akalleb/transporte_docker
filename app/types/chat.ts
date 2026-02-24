export interface Conversation {
  id: string
  contact_name: string | null
  contact_phone: string
  status: 'active' | 'pending' | 'closed'
  last_message: string | null
  last_message_at: string
  unread_count: number
  is_bot_active?: boolean
  flow_step?: string | null
  flow_data?: any | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender: 'agent' | 'contact' | 'system'
  content: string
  type: 'text' | 'image' | 'audio' | 'file'
  status: 'sent' | 'delivered' | 'read'
  created_at: string
}
