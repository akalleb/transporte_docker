<script setup lang="ts">
import { onMounted } from 'vue'
import { useFleet } from '~/modules/fleet/composables/useFleet'
import FleetSidebar from '~/modules/fleet/components/FleetSidebar.vue'
import FleetTable from '~/modules/fleet/components/FleetTable.vue'
import FleetDetailDrawer from '~/modules/fleet/components/FleetDetailDrawer.vue'
import FleetFormDrawer from '~/modules/fleet/components/FleetFormDrawer.vue'
import MaintenanceFormDrawer from '~/modules/fleet/components/MaintenanceFormDrawer.vue'
import type { Vehicle, MaintenanceRecord } from '~/modules/fleet/types/fleet.types'

const {
  vehicles,
  loading,
  filters,
  pagination,
  stats,
  selectedVehicle,
  isDrawerOpen,
  isFormOpen,
  isMaintenanceFormOpen,
  selectedMaintenance,
  fetchVehicles,
  selectVehicle,
  openDrawer,
  closeDrawer,
  openForm,
  closeForm,
  openMaintenanceForm,
  closeMaintenanceForm,
  saveVehicle,
  deleteVehicle,
  saveMaintenance,
  deleteMaintenance
} = useFleet()

onMounted(() => {
  fetchVehicles()
})

const handleCreate = () => {
  openForm()
}

const handleEdit = (vehicle: Vehicle) => {
  closeDrawer()
  openForm(vehicle)
}

const handleSave = async (vehicle: Partial<Vehicle>) => {
  await saveVehicle(vehicle)
}

const handleDelete = async (vehicle: Vehicle) => {
  await deleteVehicle(vehicle.id)
}

const handleSaveMaintenance = async (maintenance: Partial<MaintenanceRecord>) => {
  await saveMaintenance(maintenance)
}

const handleDeleteMaintenance = async (maintenance: MaintenanceRecord) => {
  await deleteMaintenance(maintenance.id)
}

const handlePageChange = (page: number) => {
  pagination.value.page = page
  fetchVehicles()
}
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
    <!-- Module Sidebar -->
    <FleetSidebar :stats="stats" />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">

      <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div class="max-w-7xl mx-auto space-y-6 h-full flex flex-col">
          <!-- Stats or Filters could go here -->
          
          <!-- Table Section -->
          <div class="flex-1 min-h-0">
            <FleetTable 
              :vehicles="vehicles" 
              :loading="loading"
              v-model:searchModel="filters.search"
              :pagination="pagination"
              @select="selectVehicle"
              @create="handleCreate"
              @edit="handleEdit"
              @delete="handleDelete"
              @page-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- Detail Drawer -->
    <FleetDetailDrawer 
      v-model="isDrawerOpen" 
      :vehicle="selectedVehicle"
      @edit="handleEdit"
      @add-maintenance="() => openMaintenanceForm()"
      @edit-maintenance="openMaintenanceForm"
      @delete-maintenance="handleDeleteMaintenance"
    />

    <!-- Form Drawer -->
    <FleetFormDrawer
      v-model="isFormOpen"
      :vehicle="selectedVehicle"
      @save="handleSave"
    />

    <!-- Maintenance Form Drawer -->
    <MaintenanceFormDrawer
      v-model="isMaintenanceFormOpen"
      :maintenance="selectedMaintenance"
      :vehicle-id="selectedVehicle?.id || 0"
      @save="handleSaveMaintenance"
    />
  </div>
</template>
