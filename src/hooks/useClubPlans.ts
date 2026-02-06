import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";

export interface ClubPlan {
  id: string;
  name: string;
  kit_type: string;
  description: string;
  items_description: string;
  price: number;
  active: boolean;
  popular: boolean;
  sort_order: number;
  icon_emoji: string;
}

export const useClubPlans = () => {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ["club-plans", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_plans")
        .select("*")
        .eq("active", true)
        .eq("tenant_id", tenantId)
        .order("sort_order");

      if (error) throw error;
      return data as ClubPlan[];
    },
  });
};
