
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatToJID, cleanPhone } from '@/lib/utils';

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  stage: string | null;
  tags: string[] | null;
  value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sdr_status: string | null;
  sdr_started_at: string | null;
  sdr_last_contact_at: string | null;
  sdr_followup_count: number | null;
  meeting_date: string | null;
  reuniao_realizada: boolean | null;
  photo_url: string | null;
  remotejid: string | null;
}

export interface LeadInput {
  name: string;
  company: string;
  phone: string;
  email?: string;
  stage: string;
  tags?: string[];
  value?: number;
  notes?: string;
  meeting_date?: string;
  reuniao_realizada?: boolean;
  remotejid?: string;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar leads do banco
  const fetchLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as unknown as Lead[]) || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os leads',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Criar novo lead
  const createLead = async (leadData: LeadInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Derivar o remotejid do telefone, se não fornecido
      const derivedJid = leadData.remotejid || formatToJID(leadData.phone);
      const cleanedPhone = cleanPhone(leadData.phone);

      const { data, error } = await supabase
        .from('leads')
        .upsert({
          user_id: user.id,
          name: leadData.name,
          company: leadData.company,
          phone: cleanedPhone,
          email: leadData.email || null,
          stage: leadData.stage,
          tags: leadData.tags || [],
          value: leadData.value || null,
          notes: leadData.notes || null,
          meeting_date: leadData.meeting_date || null,
          reuniao_realizada: leadData.reuniao_realizada || false,
          remotejid: derivedJid,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,remotejid'
        })
        .select()
        .single();

      if (error) throw error;

      // Se o data já existia, a query .select().single() retorna o atualizado.
      // Precisamos atualizar o estado local removendo o antigo se existir ou atualizando.
      setLeads(prev => {
        const filtered = prev.filter(l => l.remotejid !== derivedJid);
        return [data as unknown as Lead, ...filtered];
      });

      toast({
        title: 'Sucesso',
        description: 'Lead processado com sucesso (criado ou atualizado).',
      });
      return data;
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o lead',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Atualizar lead
  const updateLead = async (id: string, updates: Partial<LeadInput>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => prev.map(lead => lead.id === id ? (data as unknown as Lead) : lead));
      toast({
        title: 'Sucesso',
        description: 'Lead atualizado com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o lead',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Deletar lead
  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Lead removido com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o lead',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Atualizar etapa do lead (para drag and drop)
  const updateLeadStage = async (id: string, newStage: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => prev.map(lead => lead.id === id ? (data as unknown as Lead) : lead));
      return data;
    } catch (error) {
      console.error('Erro ao atualizar etapa do lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a etapa do lead',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Configurar real-time subscriptions
  useEffect(() => {
    fetchLeads();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const channel = supabase
          .channel('leads-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'leads',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('Lead change detected:', payload);
              fetchLeads(); // Recarregar leads quando houver mudanças
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
    leads,
    isLoading,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStage,
    refetch: fetchLeads,
  };
}
