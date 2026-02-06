import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ["club-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_plans")
        .select("*")
        .eq("active", true)
        .order("sort_order");

      if (error) throw error;
      return data as ClubPlan[];
    },
  });
};
