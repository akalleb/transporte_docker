import type { VehicleStatus } from '../types/fleet.types'

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Disponível',
  maintenance: 'Em Manutenção',
  out: 'Em Uso'
}

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  available: 'bg-green-100 text-green-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  out: 'bg-blue-100 text-blue-800'
}
