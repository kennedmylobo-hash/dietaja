import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";
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
  price_override_fit: number | null;
  price_override_fitness: number | null;
  price_tiers_fit: Record<string, number> | null;
  price_tiers_fitness: Record<string, number> | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  fiber_g: number | null;
  allergens: string[];
  restrictions: string[];
  featured: boolean;
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
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['marmita-packages', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_packages')
        .select('*')
        .eq('active', true)
        .eq('tenant_id', tenantId)
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

export const useMarmitaEmagrecimento = () => {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['marmita-emagrecimento', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_packages')
        .select('*')
        .eq('active', true)
        .eq('line_type', 'emagrecimento')
        .eq('tenant_id', tenantId)
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

export const useMarmitaHipertrofia = () => {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['marmita-hipertrofia', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_packages')
        .select('*')
        .eq('active', true)
        .eq('line_type', 'hipertrofia')
        .eq('tenant_id', tenantId)
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
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['marmita-flavors', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marmita_flavors')
        .select('*')
        .eq('active', true)
        .eq('tenant_id', tenantId)
        .order('category')
        .order('sort_order');
      
      if (error) throw error;
      return data as MarmitaFlavor[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useKitPackages = () => {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['kit-packages', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_packages')
        .select('*')
        .eq('active', true)
        .eq('tenant_id', tenantId)
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
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['kit-soups', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_soups')
        .select('*')
        .eq('active', true)
        .eq('tenant_id', tenantId)
        .order('sort_order');
      
      if (error) throw error;
      return data as KitSoup[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useKitJuices = () => {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['kit-juices', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_juices')
        .select('*')
        .eq('active', true)
        .eq('tenant_id', tenantId)
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
