/**
 * Realtime Presence Hook
 * Rastreia visitantes online em tempo real usando Supabase Presence
 * Usa device fingerprinting para identificação robusta mesmo em anônimo
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getVisitorIdWithFingerprint } from '@/lib/fingerprint';

interface VisitorPresence {
  visitorId: string;
  page: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  utmSource: string | null;
  enteredAt: string;
  lastSeen: string;
}

interface PresenceState {
  [key: string]: VisitorPresence[];
}

// Detecta tipo de dispositivo
const getDeviceType = (): 'mobile' | 'desktop' | 'tablet' => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Hook para rastrear presença do visitante (usado no site)
export const useVisitorPresence = () => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const visitorIdRef = useRef<string | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let removePopstateListener: (() => void) | null = null;

    const initPresence = async () => {
      // Gerar ID com fingerprinting
      const visitorId = await getVisitorIdWithFingerprint();
      visitorIdRef.current = visitorId;

      if (!isMounted || channelRef.current) return;

      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source') || sessionStorage.getItem('utm_source');

      const getPresenceData = (): VisitorPresence => ({
        visitorId,
        page: window.location.pathname,
        deviceType: getDeviceType(),
        utmSource,
        enteredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });

      channelRef.current = supabase.channel('online-visitors', {
        config: {
          presence: {
            key: visitorId,
          },
        },
      });

      channelRef.current
        .on('presence', { event: 'sync' }, () => {
          // Sync event - presença atualizada
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channelRef.current?.track(getPresenceData());
            setIsReady(true);
          }
        });

      // Atualizar página atual quando mudar
      const updatePage = async () => {
        if (channelRef.current && visitorIdRef.current) {
          await channelRef.current.track(getPresenceData());
        }
      };

      // Heartbeat para manter presença ativa
      heartbeatInterval.current = setInterval(async () => {
        if (channelRef.current && visitorIdRef.current) {
          await channelRef.current.track(getPresenceData());
        }
      }, 30000); // A cada 30 segundos

      // Escutar mudanças de rota
      window.addEventListener('popstate', updatePage);
      removePopstateListener = () => window.removeEventListener('popstate', updatePage);
    };

    initPresence();

    return () => {
      isMounted = false;
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
      if (removePopstateListener) {
        removePopstateListener();
      }
    };
  }, []);

  return { isReady, visitorId: visitorIdRef.current };
};

// Hook para monitorar visitantes online (usado no Admin)
export const useOnlineVisitors = () => {
  const [visitors, setVisitors] = useState<VisitorPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = supabase.channel('online-visitors');

    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current?.presenceState() as PresenceState;
        if (state) {
          const allVisitors = Object.values(state).flat();
          setVisitors(allVisitors);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Novo visitante:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Visitante saiu:', leftPresences);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return { visitors, isConnected, count: visitors.length };
};

// Hook para escutar eventos de analytics em tempo real
export const useRealtimeAnalytics = () => {
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [checkoutAlerts, setCheckoutAlerts] = useState<any[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
        },
        (payload) => {
          const event = payload.new;
          
          // Adicionar aos eventos recentes (máximo 50)
          setRecentEvents((prev) => [event, ...prev].slice(0, 50));

          // Alertas especiais para checkout
          if (event.event_type === 'checkout_started') {
            setCheckoutAlerts((prev) => [
              { ...event, alertedAt: new Date().toISOString() },
              ...prev,
            ].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { recentEvents, checkoutAlerts };
};
