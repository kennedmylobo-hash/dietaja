import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";

export interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  icon: string | null;
  type: "kit" | "marmita";
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useMenuCategories() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ["menu-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("active", true)
        .eq("tenant_id", tenantId)
        .order("sort_order");

      if (error) throw error;
      return data as MenuCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllMenuCategories() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ["menu-categories-all", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order");

      if (error) throw error;
      return data as MenuCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
