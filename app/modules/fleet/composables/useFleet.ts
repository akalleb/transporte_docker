import { ref, computed, watch } from 'vue'
import type { Vehicle, VehicleFilters, MaintenanceRecord } from '../types/fleet.types'
import { fleetService } from '../services/fleetService'

// Estado global do módulo (opcional, mas bom para manter estado entre navegações se necessário)
// Aqui vou manter local ao composable, mas poderia ser global.

export function useFleet() {
  const vehicles = ref<Vehicle[]>([])
  const selectedVehicle = ref<Vehicle | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isDrawerOpen = ref(false)
  const isFormOpen = ref(false)
  const isMaintenanceFormOpen = ref(false)
  const selectedMaintenance = ref<MaintenanceRecord | null>(null)

  // Filtros e Paginação
  const filters = ref<VehicleFilters>({
    search: '',
    status: ''
  })

  const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const stats = ref({
    total: 0,
    available: 0,
    maintenance: 0,
    out: 0
  })

  // Supabase client (should be injected or used from context, but Nuxt auto-imports useSupabaseClient)
  const supabase = useSupabaseClient()

  const fetchStats = async () => {
    const { data, error } = await supabase.from('vehicles').select('status')
    if (error || !data) return

    const counts = { total: data.length, available: 0, maintenance: 0, out: 0 }
    for (const v of data) {
      if (v.status === 'available') counts.available++
      else if (v.status === 'maintenance') counts.maintenance++
      else if (v.status === 'out') counts.out++
    }
    stats.value = counts
  }

  const fetchVehicles = async () => {
    loading.value = true
    error.value = null
    try {
      // Refresh stats when fetching vehicles
      await fetchStats()

      let query = supabase
        .from('vehicles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.value.search) {
        const s = filters.value.search
        query = query.or(`name.ilike.%${s}%,plate.ilike.%${s}%,model.ilike.%${s}%`)
      }

      if (filters.value.status) {
        query = query.eq('status', filters.value.status)
      }

      const from = (pagination.value.page - 1) * pagination.value.limit
      const to = from + pagination.value.limit - 1
      query = query.range(from, to)

      const { data, error: err, count } = await query

      if (err) throw err

      vehicles.value = (data as Vehicle[]) || []
      if (count !== null) {
        pagination.value.total = count
        pagination.value.totalPages = Math.ceil(count / pagination.value.limit)
      }
    } catch (err: any) {
      error.value = 'Erro ao carregar veículos: ' + err.message
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const fetchMaintenance = async (vehicleId: number) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })

    if (!error && data && selectedVehicle.value?.id === vehicleId) {
      selectedVehicle.value = { ...selectedVehicle.value, maintenance_records: data as MaintenanceRecord[] }
    }
  }

  const selectVehicle = async (vehicle: Vehicle) => {
    selectedVehicle.value = vehicle
    openDrawer()
    await fetchMaintenance(vehicle.id)
  }

  const openDrawer = () => {
    isDrawerOpen.value = true
  }

  const closeDrawer = () => {
    isDrawerOpen.value = false
    setTimeout(() => {
      if (!isFormOpen.value && !isMaintenanceFormOpen.value) selectedVehicle.value = null
    }, 300)
  }

  const openForm = (vehicle?: Vehicle) => {
    selectedVehicle.value = vehicle || null
    isFormOpen.value = true
  }

  const closeForm = () => {
    isFormOpen.value = false
    selectedVehicle.value = null
  }

  const openMaintenanceForm = (maintenance?: MaintenanceRecord) => {
    selectedMaintenance.value = maintenance || null
    isMaintenanceFormOpen.value = true
  }

  const closeMaintenanceForm = () => {
    isMaintenanceFormOpen.value = false
    selectedMaintenance.value = null
  }

  const saveMaintenance = async (maintenance: Partial<MaintenanceRecord>) => {
    loading.value = true
    try {
      if (maintenance.id) {
        const { error } = await supabase
          .from('maintenance_records')
          .update({ ...maintenance })
          .eq('id', maintenance.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('maintenance_records')
          .insert({ ...maintenance, vehicle_id: selectedVehicle.value?.id })
        if (error) throw error
      }

      if (selectedVehicle.value) {
        await fetchMaintenance(selectedVehicle.value.id)
      }
      closeMaintenanceForm()
    } catch (err: any) {
      error.value = 'Erro ao salvar manutenção: ' + err.message
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const deleteMaintenance = async (id: string) => {

    loading.value = true
    try {
      const { error } = await supabase
        .from('maintenance_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      if (selectedVehicle.value) {
        await fetchMaintenance(selectedVehicle.value.id)
      }
    } catch (err: any) {
      error.value = 'Erro ao excluir manutenção: ' + err.message
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const saveVehicle = async (vehicle: Partial<Vehicle>) => {
    loading.value = true
    try {
      // Remover maintenance_records antes de salvar no banco
      const { maintenance_records, ...vehicleData } = vehicle

      if (vehicleData.id) {
        const { error } = await supabase
          .from('vehicles')
          .update({ ...vehicleData, updated_at: new Date().toISOString() })
          .eq('id', vehicleData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert(vehicleData)
        if (error) throw error
      }
      await fetchVehicles()
      closeForm()
    } catch (err: any) {
      error.value = 'Erro ao salvar: ' + err.message
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const deleteVehicle = async (id: number) => {

    loading.value = true
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchVehicles()
      if (selectedVehicle.value?.id === id) {
        closeDrawer()
      }
    } catch (err: any) {
      error.value = 'Erro ao excluir: ' + err.message
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  // Watchers para reagir a mudanças nos filtros
  let debounceTimer: any = null
  watch(() => filters.value.search, () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      pagination.value.page = 1
      fetchVehicles()
    }, 500)
  })

  return {
    vehicles,
    selectedVehicle,
    loading,
    error,
    filters,
    pagination,
    stats,
    isDrawerOpen,
    isFormOpen,
    isMaintenanceFormOpen,
    selectedMaintenance,
    openDrawer,
    closeDrawer,
    openForm,
    closeForm,
    openMaintenanceForm,
    closeMaintenanceForm,
    fetchVehicles,
    selectVehicle,
    saveVehicle,
    deleteVehicle,
    saveMaintenance,
    deleteMaintenance
  }
}
