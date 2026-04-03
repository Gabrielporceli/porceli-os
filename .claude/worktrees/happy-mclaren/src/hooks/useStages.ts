
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface StageInput {
  name: string;
  color: string;
  position?: number;
}

export function useStages() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar etapas do banco
  const fetchStages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as etapas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Criar nova etapa
  const createStage = async (stageData: StageInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar a maior posição atual
      const { data: maxPositionData } = await supabase
        .from('stages')
        .select('position')
        .eq('user_id', user.id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = maxPositionData && maxPositionData.length > 0 
        ? maxPositionData[0].position + 1 
        : 1;

      const { data, error } = await supabase
        .from('stages')
        .insert({
          user_id: user.id,
          name: stageData.name,
          color: stageData.color,
          position: stageData.position || nextPosition,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      setStages(prev => [...prev, data].sort((a, b) => a.position - b.position));
      toast({
        title: 'Sucesso',
        description: 'Etapa criada com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a etapa',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Atualizar etapa
  const updateStage = async (id: string, updates: Partial<StageInput>) => {
    try {
      const { data, error } = await supabase
        .from('stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setStages(prev => prev.map(stage => stage.id === id ? data : stage));
      toast({
        title: 'Sucesso',
        description: 'Etapa atualizada com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a etapa',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Deletar etapa
  const deleteStage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStages(prev => prev.filter(stage => stage.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Etapa removida com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a etapa',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Configurar real-time subscriptions
  useEffect(() => {
    fetchStages();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const channel = supabase
          .channel('stages-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'stages',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('Stage change detected:', payload);
              fetchStages(); // Recarregar etapas quando houver mudanças
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    const subscription = setupSubscription();
    
    return () => {
      subscription.then(cleanup => cleanup && cleanup());
    };
  }, []);

  return {
    stages,
    isLoading,
    createStage,
    updateStage,
    deleteStage,
    refetch: fetchStages,
  };
}
