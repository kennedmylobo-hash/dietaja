/**
 * Hook para sistema de Teste A/B
 * Busca testes ativos, sorteia variante, salva em localStorage e registra evento
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from './useTenantId';

interface ABTest {
  id: string;
  tenant_id: string;
  name: string;
  target_section: string;
  variant_a_value: string;
  variant_b_value: string;
  status: string;
  traffic_split: number;
}

interface ABAssignment {
  test_id: string;
  variant: 'a' | 'b';
}

const getStorageKey = (testId: string) => `ab_test_${testId}`;
const getTrackedKey = (testId: string) => `ab_tracked_${testId}`;

export const useABTest = () => {
  const tenantId = useTenantId();
  const trackedRef = useRef<Set<string>>(new Set());

  // Fetch active tests (cached 5 min)
  const { data: activeTests } = useQuery({
    queryKey: ['ab-tests-active', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_tests' as any)
        .select('*')
        .eq('status', 'active')
        .eq('tenant_id', tenantId);

      if (error) {
        console.debug('AB Test fetch error:', error);
        return [];
      }
      return (data || []) as unknown as ABTest[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Get or assign variant for a test
  const getVariant = useCallback((test: ABTest): 'a' | 'b' => {
    const key = getStorageKey(test.id);
    const saved = localStorage.getItem(key);
    
    if (saved === 'a' || saved === 'b') return saved;

    // Assign variant based on traffic_split (% for variant B)
    const variant: 'a' | 'b' = Math.random() * 100 < test.traffic_split ? 'b' : 'a';
    localStorage.setItem(key, variant);
    return variant;
  }, []);

  // Track assignment event (once per session per test)
  useEffect(() => {
    if (!activeTests?.length) return;

    activeTests.forEach(test => {
      const trackedKey = getTrackedKey(test.id);
      if (trackedRef.current.has(test.id) || sessionStorage.getItem(trackedKey)) return;

      const variant = getVariant(test);
      trackedRef.current.add(test.id);
      sessionStorage.setItem(trackedKey, 'true');

      // Fire and forget
      supabase.from('analytics_events').insert({
        session_id: sessionStorage.getItem('analytics_session_id') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'ab_variant_assigned',
        page: window.location.pathname,
        metadata: { test_id: test.id, variant, test_name: test.name, target_section: test.target_section },
        tenant_id: tenantId,
      }).then(() => {});
    });
  }, [activeTests, getVariant, tenantId]);

  /**
   * Returns the variant value for a given target section.
   * Falls back to null if no active test for that section.
   */
  const getVariantValue = useCallback((targetSection: string): string | null => {
    if (!activeTests?.length) return null;

    const test = activeTests.find(t => t.target_section === targetSection);
    if (!test) return null;

    const variant = getVariant(test);
    return variant === 'b' ? test.variant_b_value : test.variant_a_value;
  }, [activeTests, getVariant]);

  /**
   * Returns the current AB test assignments for analytics integration.
   */
  const getActiveAssignments = useCallback((): ABAssignment[] => {
    if (!activeTests?.length) return [];

    return activeTests.map(test => ({
      test_id: test.id,
      variant: getVariant(test),
    }));
  }, [activeTests, getVariant]);

  return {
    getVariantValue,
    getActiveAssignments,
    activeTests: activeTests || [],
  };
};
