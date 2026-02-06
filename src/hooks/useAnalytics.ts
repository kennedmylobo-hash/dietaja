/**
 * Analytics Hook
 * Rastreia eventos de usuário e envia para Lovable Cloud, Meta Pixel e Google Analytics 4
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUTMParams } from '@/lib/utm';
import { useTenantId } from './useTenantId';

// Gera ou recupera session ID único
const getSessionId = (): string => {
  const key = 'analytics_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

// Helper para enviar eventos ao GA4
const trackGA4 = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

interface AnalyticsEvent {
  event_type: string;
  page?: string;
  section?: string;
  scroll_depth?: number;
  time_on_page?: number;
}

export const useAnalytics = () => {
  const sessionId = useRef(getSessionId());
  const pageStartTime = useRef(Date.now());
  const utmParams = useRef(getUTMParams());
  const tenantId = useTenantId();

  // Envia evento para o banco
  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      await supabase.from('analytics_events').insert({
        session_id: sessionId.current,
        event_type: event.event_type,
        page: event.page || window.location.pathname,
        section: event.section,
        scroll_depth: event.scroll_depth,
        time_on_page: event.time_on_page,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        utm_source: utmParams.current.utm_source || null,
        utm_campaign: utmParams.current.utm_campaign || null,
        tenant_id: tenantId,
      });
    } catch (error) {
      console.debug('Analytics error:', error);
    }
  }, [tenantId]);

  // Track page view
  const trackPageView = useCallback((page?: string) => {
    trackEvent({ event_type: 'page_view', page });
    
    // GA4 page_view é automático, mas podemos enviar eventos customizados
    trackGA4('page_view', {
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [trackEvent]);

  // Track scroll depth
  const trackScrollDepth = useCallback((depth: number, section?: string) => {
    trackEvent({ event_type: 'scroll', scroll_depth: depth, section });
    
    // GA4 scroll tracking
    trackGA4('scroll', {
      percent_scrolled: depth,
      page_location: window.location.pathname,
    });
  }, [trackEvent]);

  // Track section view
  const trackSectionView = useCallback((section: string) => {
    trackEvent({ event_type: 'section_view', section });
    
    // GA4 view_item_list
    trackGA4('view_item_list', {
      item_list_name: section,
      item_list_id: section.toLowerCase().replace(/\s+/g, '_'),
    });
  }, [trackEvent]);

  // Track CTA click - sends to internal, Meta Pixel and GA4
  const trackCTAClick = useCallback((ctaName: string) => {
    trackEvent({ event_type: 'cta_click', section: ctaName });
    
    // Meta Pixel tracking
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'CTAClick', {
        cta_name: ctaName,
        page: window.location.pathname,
      });
    }
    
    // GA4 select_content
    trackGA4('select_content', {
      content_type: 'cta',
      content_id: ctaName,
    });
  }, [trackEvent]);

  // Track time on page (chamado ao sair)
  const trackTimeOnPage = useCallback(() => {
    const timeSpent = Math.round((Date.now() - pageStartTime.current) / 1000);
    trackEvent({ event_type: 'time_on_page', time_on_page: timeSpent });
    
    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'TimeOnPage', {
        time_seconds: timeSpent,
        page: window.location.pathname,
      });
    }
    
    // GA4 timing
    trackGA4('timing_complete', {
      name: 'time_on_page',
      value: timeSpent * 1000, // GA4 expects milliseconds
      event_category: 'engagement',
    });
  }, [trackEvent]);

  // Auto-track page view e time on page
  useEffect(() => {
    trackPageView();

    const handleBeforeUnload = () => {
      trackTimeOnPage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [trackPageView, trackTimeOnPage]);

  return {
    trackEvent,
    trackPageView,
    trackScrollDepth,
    trackSectionView,
    trackCTAClick,
    trackTimeOnPage,
    sessionId: sessionId.current,
  };
};

// Hook para tracking de scroll com Intersection Observer
export const useScrollTracking = () => {
  const trackedSections = useRef<Set<string>>(new Set());
  const { trackSectionView, trackScrollDepth } = useAnalytics();

  const observeSection = useCallback((element: HTMLElement | null, sectionName: string) => {
    if (!element || trackedSections.current.has(sectionName)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !trackedSections.current.has(sectionName)) {
            trackedSections.current.add(sectionName);
            trackSectionView(sectionName);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [trackSectionView]);

  // Track scroll depth milestones
  useEffect(() => {
    const milestones = [25, 50, 75, 100];
    const trackedMilestones = new Set<number>();

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      milestones.forEach((milestone) => {
        if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone);
          trackScrollDepth(milestone);
          
          // Meta Pixel
          if (typeof window.fbq === 'function') {
            window.fbq('trackCustom', 'ScrollDepth', {
              depth_percent: milestone,
              page: window.location.pathname,
            });
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackScrollDepth]);

  return { observeSection };
};

// Export helper para uso em outros componentes
export { trackGA4 };
