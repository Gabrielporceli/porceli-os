
import React, { createContext, useContext, ReactNode } from 'react';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '@/hooks/usePlans';
import { Tables } from '@/integrations/supabase/types';

type Plan = Tables<'plans'>;

interface PlansContextType {
  plans: Plan[];
  isLoading: boolean;
  error: Error | null;
  createPlan: (plan: { name: string; color?: string }) => Promise<void>;
  updatePlan: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  getPlanNames: () => string[];
  getPlanByName: (name: string) => Plan | undefined;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export function PlansProvider({ children }: { children: ReactNode }) {
  const { data: plans = [], isLoading, error } = usePlans();
  const createPlanMutation = useCreatePlan();
  const updatePlanMutation = useUpdatePlan();
  const deletePlanMutation = useDeletePlan();

  const createPlan = async (plan: { name: string; color?: string }) => {
    await createPlanMutation.mutateAsync({
      name: plan.name,
      color: plan.color || 'bg-purple-600 text-white hover:bg-purple-700',
      is_default: false,
    });
  };

  const updatePlan = async (id: string, updates: { name?: string; color?: string }) => {
    await updatePlanMutation.mutateAsync({ id, ...updates });
  };

  const deletePlan = async (id: string) => {
    await deletePlanMutation.mutateAsync(id);
  };

  const getPlanNames = () => {
    return plans.map(plan => plan.name);
  };

  const getPlanByName = (name: string) => {
    return plans.find(plan => plan.name === name);
  };

  return (
    <PlansContext.Provider
      value={{
        plans,
        isLoading,
        error,
        createPlan,
        updatePlan,
        deletePlan,
        getPlanNames,
        getPlanByName,
      }}
    >
      {children}
    </PlansContext.Provider>
  );
}

export function usePlansContext() {
  const context = useContext(PlansContext);
  if (context === undefined) {
    throw new Error('usePlansContext must be used within a PlansProvider');
  }
  return context;
}
