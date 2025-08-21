import { supabase } from '@/integrations/supabase/client';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// Helper to build a company-scoped query for portal content
export function companyContentQuery<T>(
  table: string,
  joinTable: string,
  columns: string,
  companyId: string
): PostgrestFilterBuilder<T, any, any[]> {
  return supabase
    .from<T>(table)
    .select(`${columns}, ${joinTable}!inner(company_id)`)
    .eq(`${joinTable}.company_id`, companyId);
}
