import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";

export interface LandingSection {
  id: string;
  tenant_id: string;
  section_key: string;
  content: Record<string, any>;
  is_visible: boolean;
  sort_order: number;
}

export function useLandingContent(sectionKey: string) {
  const tenantId = useTenantId();

  const { data, isLoading } = useQuery({
    queryKey: ["landing-content", tenantId, sectionKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_landing_content")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("section_key", sectionKey)
        .maybeSingle();

      if (error) throw error;
      return data as LandingSection | null;
    },
  });

  return {
    content: data?.content ?? null,
    isVisible: data?.is_visible ?? true,
    isLoading,
  };
}

export function useAllLandingContent() {
  const tenantId = useTenantId();

  const { data, isLoading } = useQuery({
    queryKey: ["landing-content", tenantId, "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_landing_content")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order");

      if (error) throw error;
      return (data ?? []) as LandingSection[];
    },
  });

  return { sections: data ?? [], isLoading };
}

export function useUpsertLandingContent() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sectionKey,
      content,
      isVisible,
    }: {
      sectionKey: string;
      content: Record<string, any>;
      isVisible?: boolean;
    }) => {
      const { error } = await supabase
        .from("tenant_landing_content")
        .upsert(
          {
            tenant_id: tenantId,
            section_key: sectionKey,
            content,
            ...(isVisible !== undefined ? { is_visible: isVisible } : {}),
          },
          { onConflict: "tenant_id,section_key" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-content", tenantId] });
    },
  });
}
