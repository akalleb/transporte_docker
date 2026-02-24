import type { Vehicle } from '../types/fleet.types'

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 1,
    name: 'Ambulância 01',
    brand: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2020,
    plate: 'ABC-1234',
    type: 'Ambulância',
    status: 'available',
    odometer: 45000,
    fuelLevel: 80,
    fuelEfficiency: 8.5,
    maintenanceHistory: []
  },
  {
    id: 2,
    name: 'Carro Administrativo',
    brand: 'Fiat',
    model: 'Uno',
    year: 2018,
    plate: 'XYZ-9876',
    type: 'Carro',
    status: 'out',
    odometer: 120000,
    fuelLevel: 45,
    fuelEfficiency: 12.0,
    maintenanceHistory: []
  },
  {
    id: 3,
    name: 'Van de Transporte',
    brand: 'Renault',
    model: 'Master',
    year: 2021,
    plate: 'DEF-5678',
    type: 'Van',
    status: 'maintenance',
    odometer: 60000,
    fuelLevel: 10,
    fuelEfficiency: 9.0,
    maintenanceHistory: [
      {
        id: 'm1',
        date: '2023-10-15',
        description: 'Troca de óleo e filtros',
        cost: 450.00,
        mechanic: 'Oficina Central',
        type: 'preventive'
      }
    ]
  },
  {
    id: 4,
    name: 'Ambulância 02',
    brand: 'Fiat',
    model: 'Ducato',
    year: 2019,
    plate: 'GHI-3456',
    type: 'Ambulância',
    status: 'available',
    odometer: 85000,
    fuelLevel: 95,
    fuelEfficiency: 8.0,
    maintenanceHistory: []
  },
  {
    id: 5,
    name: 'Moto Entrega',
    brand: 'Honda',
    model: 'CG 160',
    year: 2022,
    plate: 'JKL-9012',
    type: 'Moto',
    status: 'available',
    odometer: 15000,
    fuelLevel: 60,
    fuelEfficiency: 35.0,
    maintenanceHistory: []
  }
]

export const fleetService = {
  async getVehicles(page = 1, limit = 10, search = ''): Promise<{ data: Vehicle[], total: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = MOCK_VEHICLES
        
        if (search) {
          const lowerSearch = search.toLowerCase()
          filtered = filtered.filter(v => 
            v.name.toLowerCase().includes(lowerSearch) ||
            v.plate.toLowerCase().includes(lowerSearch) ||
            v.model.toLowerCase().includes(lowerSearch)
          )
        }

        const start = (page - 1) * limit
        const end = start + limit
        const paginated = filtered.slice(start, end)

        resolve({
          data: paginated,
          total: filtered.length
        })
      }, 800) // Simula delay de rede
    })
  },

  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_VEHICLES.find(v => v.id === id))
      }, 500)
    })
  }
}
