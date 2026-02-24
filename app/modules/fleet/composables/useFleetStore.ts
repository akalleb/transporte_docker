import { fleetService } from '../services/fleet.service'
import type { Vehicle, VehicleFilters, MaintenanceRecord, FleetStats } from '../types/fleet.types'

export const useFleetStore = () => {
  // State (usando useState do Nuxt para persistência SSR friendly e compartilhamento de estado)
  // Nota: Usar nomes únicos para as chaves do useState
  const vehicles = useState<Vehicle[]>('fleet_vehicles', () => [])
  const stats = useState<FleetStats>('fleet_stats', () => ({ total: 0, available: 0, maintenance: 0, out: 0 }))
  const loading = useState<boolean>('fleet_loading', () => false)
  const error = useState<string | null>('fleet_error', () => null)
  
  // UI State
  const isDrawerOpen = useState<boolean>('fleet_drawer_open', () => false)
  const isFormOpen = useState<boolean>('fleet_form_open', () => false)
  const isMaintenanceFormOpen = useState<boolean>('fleet_maintenance_form_open', () => false)
  
  const selectedVehicle = useState<Vehicle | null>('fleet_selected_vehicle', () => null)
  const selectedMaintenance = useState<MaintenanceRecord | null>('fleet_selected_maintenance', () => null)

  // Pagination & Filters State (local ao store, mas poderia ser persistido)
  const pagination = useState('fleet_pagination', () => ({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  }))

  const filters = useState<VehicleFilters>('fleet_filters', () => ({
    search: '',
    status: ''
  }))

  // Actions

  const loadDashboard = async () => {
    loading.value = true
    error.value = null
    try {
      // Carrega dados e estatísticas em paralelo
      const [vehiclesData, statsData] = await Promise.all([
        fleetService.getVehicles(filters.value, pagination.value.page, pagination.value.limit),
        fleetService.getStats()
      ])
      
      if (vehiclesData.error) throw vehiclesData.error
      
      vehicles.value = (vehiclesData.data as Vehicle[]) || []
      stats.value = statsData
      
      if (vehiclesData.count !== null) {
        pagination.value.total = vehiclesData.count
        pagination.value.totalPages = Math.ceil(vehiclesData.count / pagination.value.limit)
      }

    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err)
      error.value = 'Erro ao carregar dados: ' + err.message
    } finally {
      loading.value = false
    }
  }

  const selectVehicle = async (vehicle: Vehicle) => {
    selectedVehicle.value = vehicle
    isDrawerOpen.value = true
    
    // Carregar manutenções ao selecionar
    const { data, error: err } = await fleetService.getMaintenanceRecords(vehicle.id)
    if (!err && data) {
        // Atualiza o objeto selecionado com os registros (assumindo que a interface suporte ou apenas localmente)
        // Se Vehicle tiver maintenance_records opcional:
        selectedVehicle.value = { ...vehicle, maintenance_records: data as MaintenanceRecord[] }
    }
  }

  const addVehicle = async (vehicle: Partial<Vehicle>) => {
    loading.value = true
    try {
      const { data, error: err } = await fleetService.createVehicle(vehicle)
      if (err) throw err
      
      await loadDashboard() 
      closeForm()
      return data
    } catch (err: any) {
      error.value = 'Erro ao adicionar veículo: ' + err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateVehicle = async (id: number, updates: Partial<Vehicle>) => {
    loading.value = true
    try {
      const { data, error: err } = await fleetService.updateVehicle(id, updates)
      if (err) throw err
      
      await loadDashboard()
      // Atualiza o selecionado se for o mesmo
      if (selectedVehicle.value?.id === id) {
        selectedVehicle.value = { ...selectedVehicle.value, ...data }
      }
      closeForm()
      return data
    } catch (err: any) {
      error.value = 'Erro ao atualizar veículo: ' + err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteVehicle = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return

    loading.value = true
    try {
      const { error: err } = await fleetService.deleteVehicle(id)
      if (err) throw err
      
      await loadDashboard()
      if (selectedVehicle.value?.id === id) {
        closeDrawer()
      }
    } catch (err: any) {
      error.value = 'Erro ao excluir veículo: ' + err.message
    } finally {
      loading.value = false
    }
  }

  // UI Helpers
  const openForm = (vehicle?: Vehicle) => {
    selectedVehicle.value = vehicle || null
    isFormOpen.value = true
  }

  const closeForm = () => {
    isFormOpen.value = false
    if (!isDrawerOpen.value) selectedVehicle.value = null
  }

  const openDrawer = () => isDrawerOpen.value = true
  const closeDrawer = () => {
    isDrawerOpen.value = false
    selectedVehicle.value = null
  }

  const setPage = (page: number) => {
    pagination.value.page = page
    loadDashboard()
  }

  const setFilter = (newFilters: Partial<VehicleFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // Reset page on filter change
    loadDashboard()
  }

  return {
    // State
    vehicles,
    stats,
    loading,
    error,
    pagination,
    filters,
    selectedVehicle,
    selectedMaintenance,
    
    // UI State
    isDrawerOpen,
    isFormOpen,
    isMaintenanceFormOpen,

    // Actions
    loadDashboard,
    selectVehicle,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setPage,
    setFilter,
    
    // UI Actions
    openForm,
    closeForm,
    openDrawer,
    closeDrawer
  }
}
