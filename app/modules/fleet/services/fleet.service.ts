import type { Database } from '@/types/database.types'
import type { Vehicle, VehicleFilters, FleetStats, MaintenanceRecord } from '../types/fleet.types'

class FleetService {
  private get client() {
    return useSupabaseClient<Database>()
  }

  // Helper para pegar ID da organização do usuário logado
  // O RLS já filtra, mas para INSERTs precisamos garantir que o organization_id seja enviado se não for auto-injetado pelo backend
  // Com a policy RLS que criei, o INSERT falhará se organization_id não bater com o do usuário.
  // O ideal é que o trigger ou o backend injete, mas aqui vamos buscar do profile para enviar explicitamente.
  private async getOrgId() {
    const { data: { user } } = await this.client.auth.getUser()
    
    if (!user) {
        console.error('FleetService: Usuário não autenticado (getUser retornou null)')
        throw new Error('Usuário não autenticado')
    }

    if (!user.id) {
        console.error('FleetService: Usuário sem ID', user)
        throw new Error('Erro crítico: Usuário autenticado mas sem ID')
    }
    
    const { data, error } = await this.client
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle() // Usar maybeSingle para evitar erro 406 se não existir
      
    if (error) {
        console.error('FleetService: Erro ao buscar organização', error)
        throw new Error('Erro ao buscar perfil do usuário')
    }

    if (!data || !data.organization_id) {
        console.warn('FleetService: Usuário sem organização. Tentando corrigir perfil automaticamente...')
        
        // Tentar corrigir automaticamente chamando o endpoint de admin
        try {
            const fixData: any = await $fetch('/api/admin/fix-profile', {
                method: 'POST'
            })
            
            // Se corrigiu, retorna o ID da organização
            if (fixData?.organizationId) {
                return fixData.organizationId
            }
            
            if (fixData?.error) {
                console.error('FleetService: Erro detalhado ao corrigir perfil:', fixData.error, fixData.details)
                throw new Error('Erro ao corrigir perfil: ' + fixData.error)
            }
        } catch (e) {
            console.error('FleetService: Falha ao corrigir perfil automaticamente', e)
            throw new Error('Usuário sem organização vinculada. Contate o suporte.')
        }
    }
    
    return data.organization_id
  }

  async getVehicles(filters: VehicleFilters, page: number, limit: number) {
    const orgId = await this.getOrgId()
    
    let query = this.client
      .from('vehicles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (orgId) {
      query = query.eq('organization_id', orgId)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,plate.ilike.%${filters.search}%,model.ilike.%${filters.search}%`)
    }
    if (filters.status) {
      // Cast explícito para garantir compatibilidade de tipo
      query = query.eq('status', filters.status as any)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    
    return await query.range(from, to)
  }

  // ⚡ CORREÇÃO DE PERFORMANCE: Promise.all para evitar Waterfall
  async getStats(): Promise<FleetStats> {
    const orgId = await this.getOrgId()
    
    // Nota: O Supabase (PostgREST) não suporta múltiplos counts em uma única query facilmente sem RPC.
    // Usar Promise.all é a melhor abordagem client-side.
    
    const baseQuery = () => {
        let q = this.client.from('vehicles').select('*', { count: 'exact', head: true })
        if (orgId) q = q.eq('organization_id', orgId)
        return q
    }
    
    const [total, available, maintenance, out] = await Promise.all([
      baseQuery().then(r => r.count || 0),
      baseQuery().eq('status', 'available').then(r => r.count || 0),
      baseQuery().eq('status', 'maintenance').then(r => r.count || 0),
      baseQuery().eq('status', 'out').then(r => r.count || 0)
    ])

    return { total, available, maintenance, out }
  }

  async createVehicle(vehicle: Partial<Vehicle>) {
    const orgId = await this.getOrgId()
    return await this.client
      .from('vehicles')
      .insert({ ...vehicle, organization_id: orgId } as any)
      .select()
      .single()
  }

  async updateVehicle(id: number, updates: Partial<Vehicle>) {
    return await this.client
      .from('vehicles')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()
  }

  async deleteVehicle(id: number) {
    return await this.client
      .from('vehicles')
      .delete()
      .eq('id', id)
  }

  async getMaintenanceRecords(vehicleId: number) {
    return await this.client
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
  }

  async createMaintenance(record: Partial<MaintenanceRecord>) {
    // Nota: Manutenção herda organização do veículo, não precisa de organization_id direto se normalizado
    // Mas se o banco tiver a coluna, ok. Se não, removemos.
    // Assumindo normalização via vehicle_id.
    const { organization_id, ...rest } = record
    return await this.client
      .from('maintenance_records')
      .insert(rest as any)
      .select()
      .single()
  }

  async updateMaintenance(id: string, updates: Partial<MaintenanceRecord>) {
    return await this.client
      .from('maintenance_records')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()
  }

  async deleteMaintenance(id: string) {
    return await this.client
      .from('maintenance_records')
      .delete()
      .eq('id', id)
  }
}

export const fleetService = new FleetService()
