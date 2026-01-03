import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarmitaPackage {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  image_url: string | null;
  active: boolean;
  popular: boolean;
  sort_order: number;
}

export interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
  active: boolean;
  sort_order: number;
}

export interface KitPackage {
  id: string;
  name: string;
  days: number;
  price: number;
  description: string | null;
  features: string[];
  active: boolean;
  popular: boolean;
  sort_order: number;
}

export interface KitSoup {
  id: string;
  emoji: string;
  name: string;
  ingredients: string | null;
  benefit: string | null;
  active: boolean;
  sort_order: number;
}

export interface KitJuice {
  id: string;
  emoji: string;
  name: string;
  ingredients: string | null;
  benefit: string | null;
  active: boolean;
  sort_order: number;
}

export const useMarmitaPackages = () => {
  return useQuery({
    queryKey: ['marmita-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_packages')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as MarmitaPackage[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

export const useMarmitaFlavors = () => {
  return useQuery({
    queryKey: ['marmita-flavors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_flavors')
        .select('*')
        .eq('active', true)
        .order('category')
        .order('sort_order');
      
      if (error) throw error;
      return data as MarmitaFlavor[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useKitPackages = () => {
  return useQuery({
    queryKey: ['kit-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_packages')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      
      if (error) throw error;
      return (data || []).map(k => ({
        ...k,
        description: k.description || null,
        features: Array.isArray(k.features) ? (k.features as unknown as string[]) : []
      })) as KitPackage[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useKitSoups = () => {
  return useQuery({
    queryKey: ['kit-soups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_soups')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as KitSoup[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useKitJuices = () => {
  return useQuery({
    queryKey: ['kit-juices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_juices')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as KitJuice[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Grouped flavors by category helper
export const useGroupedMarmitaFlavors = () => {
  const { data: flavors, ...rest } = useMarmitaFlavors();
  
  const grouped = {
    carnes: flavors?.filter(f => f.category === 'carnes').map(f => f.name) || [],
    frangos: flavors?.filter(f => f.category === 'frangos').map(f => f.name) || [],
    massas: flavors?.filter(f => f.category === 'massas').map(f => f.name) || [],
    especiais: flavors?.filter(f => f.category === 'especiais').map(f => f.name) || [],
  };
  
  return { grouped, flavors, ...rest };
};
