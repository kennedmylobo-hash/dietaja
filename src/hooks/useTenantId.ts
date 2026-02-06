import { useTenant } from '@/contexts/TenantContext';

/**
 * Returns the current tenant ID for use in queries and inserts.
 * Falls back to the default Dieta Já tenant ID.
 */
export const useTenantId = () => {
  const { tenant } = useTenant();
  return tenant?.id || '00000000-0000-0000-0000-000000000001';
};
