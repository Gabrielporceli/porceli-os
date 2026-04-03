
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TagInput {
  name: string;
  color: string;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar tags do banco
  const fetchTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as tags',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Criar nova tag
  const createTag = async (tagData: TagInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: tagData.name,
          color: tagData.color,
        })
        .select()
        .single();

      if (error) throw error;

      setTags(prev => [...prev, data]);
      toast({
        title: 'Sucesso',
        description: 'Tag criada com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a tag',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Atualizar tag
  const updateTag = async (id: string, updates: Partial<TagInput>) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTags(prev => prev.map(tag => tag.id === id ? data : tag));
      toast({
        title: 'Sucesso',
        description: 'Tag atualizada com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Erro ao atualizar tag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a tag',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Deletar tag
  const deleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTags(prev => prev.filter(tag => tag.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Tag removida com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar tag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a tag',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Configurar real-time subscriptions
  useEffect(() => {
    fetchTags();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const channel = supabase
          .channel('tags-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tags',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('Tag change detected:', payload);
              fetchTags(); // Recarregar tags quando houver mudanças
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
    tags,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
    refetch: fetchTags,
  };
}
