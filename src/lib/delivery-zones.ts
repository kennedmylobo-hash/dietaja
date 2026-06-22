import { supabase } from "@/integrations/supabase/client";

export interface DeliveryZone {
  id: string;
  tenant_id: string;
  name: string;
  neighborhoods: string[];
  fee: number;
  estimated_time: string;
  is_active: boolean;
  sort_order: number;
}

export async function fetchDeliveryZones(tenantId?: string): Promise<DeliveryZone[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching delivery zones:', error);
    return [];
  }

  return (data || []).map((z: any) => ({
    id: z.id,
    tenant_id: z.tenant_id,
    name: z.name,
    neighborhoods: z.neighborhoods || [],
    fee: Number(z.fee),
    estimated_time: z.estimated_time || '',
    is_active: z.is_active,
    sort_order: z.sort_order,
  }));
}

export function findZoneByNeighborhood(zones: DeliveryZone[], neighborhood: string): DeliveryZone | null {
  const lower = neighborhood.toLowerCase();
  return zones.find(z =>
    z.neighborhoods.some((n: string) => lower.includes(n.toLowerCase()))
  ) || null;
}
