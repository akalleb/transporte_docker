import type { VehicleStatus } from '../types/fleet.types'

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Disponível',
  maintenance: 'Em Manutenção',
  out: 'Em Uso'
}

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  available: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  maintenance: 'bg-yellow-100 dark:bg-amber-900/40 text-yellow-800 dark:text-amber-300',
  out: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
}
