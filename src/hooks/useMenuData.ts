import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface MarmitaPackage {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  image_url: string | null;
  active: boolean;
  popular: boolean;
  sort_order: number;
  line_type: string;
  weight: number;
  description: string | null;
}

export interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
  active: boolean;
  sort_order: number;
  stock_quantity: number | null;
  show_stock: boolean;
  low_stock_threshold: number | null;
  sides: Json | null;
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
  stock_quantity: number | null;
  show_stock: boolean;
  low_stock_threshold: number | null;
}

export interface KitJuice {
  id: string;
  emoji: string;
  name: string;
  ingredients: string | null;
  benefit: string | null;
  active: boolean;
  sort_order: number;
  stock_quantity: number | null;
  show_stock: boolean;
  low_stock_threshold: number | null;
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
      return (data || []).map(pkg => ({
        ...pkg,
        line_type: pkg.line_type || 'emagrecimento',
        weight: pkg.weight || 300,
        description: pkg.description || null,
      })) as MarmitaPackage[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

// Hook for Emagrecimento packages only
export const useMarmitaEmagrecimento = () => {
  return useQuery({
    queryKey: ['marmita-emagrecimento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_packages')
        .select('*')
        .eq('active', true)
        .eq('line_type', 'emagrecimento')
        .order('sort_order');
      
      if (error) throw error;
      return (data || []).map(pkg => ({
        ...pkg,
        line_type: pkg.line_type || 'emagrecimento',
        weight: pkg.weight || 300,
        description: pkg.description || null,
      })) as MarmitaPackage[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Hook for Hipertrofia packages only
export const useMarmitaHipertrofia = () => {
  return useQuery({
    queryKey: ['marmita-hipertrofia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_packages')
        .select('*')
        .eq('active', true)
        .eq('line_type', 'hipertrofia')
        .order('sort_order');
      
      if (error) throw error;
      return (data || []).map(pkg => ({
        ...pkg,
        line_type: pkg.line_type || 'hipertrofia',
        weight: pkg.weight || 450,
        description: pkg.description || null,
      })) as MarmitaPackage[];
    },
    staleTime: 1000 * 60 * 5,
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
