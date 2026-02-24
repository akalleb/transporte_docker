import type { Json } from '~/types/database.types'

export type VehicleStatus = 'available' | 'maintenance' | 'out'

export interface Vehicle {
  id: number // BigInt in Supabase is usually number in JS unless too large, but let's assume number for now.
  name: string
  brand: string
  model: string
  year: number
  plate: string
  type: string
  status: VehicleStatus
  odometer: number
  fuel_level: number // Mapped from snake_case in DB
  fuel_efficiency: number // Mapped from snake_case
  created_at?: string
  maintenance_records?: MaintenanceRecord[]
}

export interface MaintenanceRecord {
  id: string
  vehicle_id: number
  date: string
  description: string
  cost: number
  mechanic?: string
  type: 'preventive' | 'corrective'
  created_at?: string
}

export interface VehicleFilters {
  status?: VehicleStatus | ''
  search?: string
}
