import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ["menu-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("active", true)
        .order("sort_order");

      if (error) throw error;
      return data as MenuCategory[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAllMenuCategories() {
  return useQuery({
    queryKey: ["menu-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as MenuCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
