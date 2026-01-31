import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LoyaltyLevel {
  id: string;
  name: string;
  slug: string;
  min_orders: number;
  min_spent: number;
  cashback_percent: number;
  emoji: string;
  sort_order: number;
}

interface CashbackBalance {
  id: string;
  customer_email: string;
  current_balance: number;
  total_earned: number;
  total_used: number;
  total_expired: number;
  total_orders: number;
  total_spent: number;
  current_level_id: string | null;
}

interface CashbackTransaction {
  id: string;
  transaction_type: 'earned' | 'used' | 'expired';
  amount: number;
  balance_after: number;
  expires_at: string | null;
  expired: boolean;
  level_slug: string | null;
  notes: string | null;
  created_at: string;
  order_id: string | null;
}

export interface CashbackData {
  balance: CashbackBalance | null;
  currentLevel: LoyaltyLevel | null;
  nextLevel: LoyaltyLevel | null;
  allLevels: LoyaltyLevel[];
  transactions: CashbackTransaction[];
  availableCashback: number;
  expiringCashback: { amount: number; expiresAt: string } | null;
  progressToNextLevel: {
    ordersProgress: number;
    spentProgress: number;
    ordersNeeded: number;
    spentNeeded: number;
  } | null;
  loading: boolean;
}

export const useCashback = (customerEmail?: string) => {
  const [data, setData] = useState<CashbackData>({
    balance: null,
    currentLevel: null,
    nextLevel: null,
    allLevels: [],
    transactions: [],
    availableCashback: 0,
    expiringCashback: null,
    progressToNextLevel: null,
    loading: true,
  });

  useEffect(() => {
    if (!customerEmail) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    fetchCashbackData();
  }, [customerEmail]);

  const fetchCashbackData = async () => {
    if (!customerEmail) return;

    try {
      // Fetch all data in parallel
      const [levelsRes, balanceRes, transactionsRes] = await Promise.all([
        supabase
          .from('loyalty_levels')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('cashback_balances')
          .select('*')
          .eq('customer_email', customerEmail)
          .single(),
        supabase
          .from('cashback_transactions')
          .select('*')
          .eq('customer_email', customerEmail)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const levels = (levelsRes.data || []) as LoyaltyLevel[];
      const balance = balanceRes.data as CashbackBalance | null;
      const transactions = (transactionsRes.data || []) as CashbackTransaction[];

      // Find current level
      let currentLevel: LoyaltyLevel | null = levels[0] || null;
      let nextLevel: LoyaltyLevel | null = null;

      if (balance) {
        // Find the highest level the customer qualifies for
        for (const level of levels) {
          if (
            balance.total_orders >= level.min_orders ||
            balance.total_spent >= level.min_spent
          ) {
            currentLevel = level;
          }
        }

        // Find next level
        const currentIndex = levels.findIndex(l => l.id === currentLevel?.id);
        if (currentIndex >= 0 && currentIndex < levels.length - 1) {
          nextLevel = levels[currentIndex + 1];
        }
      }

      // Calculate available cashback (non-expired earned amounts)
      const now = new Date();
      const availableCashback = balance?.current_balance || 0;

      // Find soonest expiring cashback
      const expiringTransaction = transactions.find(
        t => t.transaction_type === 'earned' && 
             !t.expired && 
             t.expires_at && 
             new Date(t.expires_at) > now
      );

      const expiringCashback = expiringTransaction
        ? { 
            amount: expiringTransaction.amount, 
            expiresAt: expiringTransaction.expires_at! 
          }
        : null;

      // Calculate progress to next level
      let progressToNextLevel = null;
      if (nextLevel && balance) {
        const ordersNeeded = Math.max(0, nextLevel.min_orders - balance.total_orders);
        const spentNeeded = Math.max(0, nextLevel.min_spent - balance.total_spent);
        
        const ordersProgress = nextLevel.min_orders > 0 
          ? Math.min(100, (balance.total_orders / nextLevel.min_orders) * 100)
          : 100;
        const spentProgress = nextLevel.min_spent > 0
          ? Math.min(100, (balance.total_spent / nextLevel.min_spent) * 100)
          : 100;

        progressToNextLevel = {
          ordersProgress,
          spentProgress,
          ordersNeeded,
          spentNeeded,
        };
      }

      setData({
        balance,
        currentLevel,
        nextLevel,
        allLevels: levels,
        transactions,
        availableCashback,
        expiringCashback,
        progressToNextLevel,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching cashback data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  return { ...data, refetch: fetchCashbackData };
};

export default useCashback;
