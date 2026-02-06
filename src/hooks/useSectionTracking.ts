/**
 * Section Tracking Hook
 * Rastreia tempo de permanência em cada seção do site
 */

import { useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUTMParams } from '@/lib/utm';
import { useTenantId } from './useTenantId';

// Session ID único
const getSessionId = (): string => {
  const key = 'analytics_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

// Detectar tipo de dispositivo
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

interface SectionTime {
  enterTime: number;
  section: string;
}

export const useSectionTracking = () => {
  const sessionId = useRef(getSessionId());
  const utmParams = useRef(getUTMParams());
  const deviceType = useRef(getDeviceType());
  const activeSections = useRef<Map<string, SectionTime>>(new Map());
  const trackedEnters = useRef<Set<string>>(new Set());
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());
  const tenantId = useTenantId();

  // Enviar evento de seção
  const trackSectionEvent = useCallback(async (
    eventType: 'section_enter' | 'section_exit',
    section: string,
    timeSpent?: number
  ) => {
    try {
      await supabase.from('analytics_events').insert({
        session_id: sessionId.current,
        event_type: eventType,
        section,
        section_time_spent: timeSpent || null,
        device_type: deviceType.current,
        page: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        utm_source: utmParams.current.utm_source || null,
        utm_campaign: utmParams.current.utm_campaign || null,
        tenant_id: tenantId,
      });
    } catch (error) {
      console.debug('Section tracking error:', error);
    }
  }, [tenantId]);

  // Rastrear entrada em seção
  const handleSectionEnter = useCallback((section: string) => {
    if (trackedEnters.current.has(section)) return;
    
    trackedEnters.current.add(section);
    activeSections.current.set(section, {
      enterTime: Date.now(),
      section,
    });
    
    trackSectionEvent('section_enter', section);
    
    // Enviar ViewContent para Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'ViewSection', {
        section_name: section,
        device: deviceType.current,
      });
    }
  }, [trackSectionEvent]);

  // Rastrear saída de seção
  const handleSectionExit = useCallback((section: string) => {
    const sectionData = activeSections.current.get(section);
    if (!sectionData) return;
    
    const timeSpent = Math.round((Date.now() - sectionData.enterTime) / 1000);
    activeSections.current.delete(section);
    
    if (timeSpent > 1) { // Só rastreia se ficou mais de 1 segundo
      trackSectionEvent('section_exit', section, timeSpent);
    }
  }, [trackSectionEvent]);

  // Observar seção com IntersectionObserver
  const observeSection = useCallback((element: HTMLElement | null, sectionName: string) => {
    if (!element) return;
    
    // Limpar observer anterior se existir
    const existingObserver = observersRef.current.get(sectionName);
    if (existingObserver) {
      existingObserver.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            handleSectionEnter(sectionName);
          } else if (activeSections.current.has(sectionName)) {
            handleSectionExit(sectionName);
          }
        });
      },
      { threshold: 0.3 } // 30% da seção visível
    );

    observer.observe(element);
    observersRef.current.set(sectionName, observer);

    return () => {
      observer.disconnect();
      observersRef.current.delete(sectionName);
    };
  }, [handleSectionEnter, handleSectionExit]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      // Enviar eventos de saída para seções ativas
      activeSections.current.forEach((sectionData, section) => {
        const timeSpent = Math.round((Date.now() - sectionData.enterTime) / 1000);
        if (timeSpent > 1) {
          // Usar sendBeacon para garantir envio mesmo ao sair
          const payload = JSON.stringify({
            session_id: sessionId.current,
            event_type: 'section_exit',
            section,
            section_time_spent: timeSpent,
            device_type: deviceType.current,
            page: window.location.pathname,
            utm_source: utmParams.current.utm_source || null,
            utm_campaign: utmParams.current.utm_campaign || null,
          });
          
          navigator.sendBeacon?.(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`,
            payload
          );
        }
      });
      
      // Limpar observers
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current.clear();
    };
  }, []);

  return {
    observeSection,
    sessionId: sessionId.current,
    deviceType: deviceType.current,
  };
};

// Hook para rastrear eventos do carrinho
export const useCartTracking = () => {
  const sessionId = useRef(getSessionId());
  const utmParams = useRef(getUTMParams());
  const deviceType = useRef(getDeviceType());
  const tenantId = useTenantId();

  const trackCartEvent = useCallback(async (
    eventType: 'cart_open' | 'cart_add' | 'cart_remove' | 'checkout_start' | 'checkout_complete',
    metadata?: Record<string, unknown>
  ) => {
    try {
      await supabase.from('analytics_events').insert({
        session_id: sessionId.current,
        event_type: eventType,
        device_type: deviceType.current,
        page: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        utm_source: utmParams.current.utm_source || null,
        utm_campaign: utmParams.current.utm_campaign || null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        tenant_id: tenantId,
      });
    } catch (error) {
      console.debug('Cart tracking error:', error);
    }
  }, [tenantId]);

  return { trackCartEvent };
};
