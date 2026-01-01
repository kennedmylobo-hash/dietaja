/**
 * Leads Service
 * Salva e gerencia leads no Lovable Cloud
 */

import { supabase } from '@/integrations/supabase/client';
import { getUTMParams } from '@/lib/utm';
import type { Recommendation, QuizAnswers } from '@/lib/quiz-logic';

interface LeadData {
  name: string;
  phone: string;
  location?: string;
  objective?: string;
  specification?: string;
  recommendation?: Recommendation;
}

export const saveLead = async (data: LeadData): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const utmParams = getUTMParams();
    
    const { data: result, error } = await supabase
      .from('leads')
      .insert({
        name: data.name.trim(),
        phone: data.phone.replace(/\D/g, ''),
        location: data.location || null,
        objective: data.objective || null,
        specification: data.specification || null,
        recommendation_type: data.recommendation?.primary.type || null,
        recommendation_name: data.recommendation?.primary.name || null,
        recommendation_price: data.recommendation?.primary.price || null,
        utm_source: utmParams.utm_source || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_medium: utmParams.utm_medium || null,
        utm_content: utmParams.utm_content || null,
        converted: false,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: result?.id };
  } catch (error) {
    console.error('Error saving lead:', error);
    return { success: false, error: 'Erro ao salvar lead' };
  }
};

export const markLeadAsConverted = async (phone: string): Promise<void> => {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    
    await supabase
      .from('leads')
      .update({ 
        converted: true, 
        converted_at: new Date().toISOString() 
      })
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(1);
  } catch (error) {
    console.error('Error marking lead as converted:', error);
  }
};
