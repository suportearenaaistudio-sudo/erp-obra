import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Invite {
    id: string;
    email: string;
    role: {
        id: string;
        name: string;
    };
    status: 'pending' | 'accepted' | 'expired';
    token: string;
    created_at: string;
    expires_at: string;
}

export function useInvites() {
    const { tenant } = useAuth();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(false);

    const loadInvites = useCallback(async () => {
        if (!tenant?.id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invites')
                .select(`
          id,
          email,
          status,
          token,
          created_at,
          expires_at,
          role:roles (
            id,
            name
          )
        `)
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvites(data as any || []);
        } catch (err) {
            console.error('Erro ao carregar convites:', err);
        } finally {
            setLoading(false);
        }
    }, [tenant?.id]);

    const sendInvite = async (email: string, roleId: string) => {
        if (!tenant?.id) return { error: 'No tenant' };

        try {
            const { data, error } = await supabase
                .from('invites')
                .insert({
                    tenant_id: tenant.id,
                    email,
                    role_id: roleId,
                })
                .select()
                .single();

            if (error) throw error;

            // Atualizar lista
            loadInvites();

            return { data, error: null };
        } catch (err: any) {
            console.error('Erro ao enviar convite:', err);
            return { error: err.message };
        }
    };

    const cancelInvite = async (inviteId: string) => {
        try {
            const { error } = await supabase
                .from('invites')
                .delete()
                .eq('id', inviteId);

            if (error) throw error;

            // Atualizar UI otimista
            setInvites(prev => prev.filter(i => i.id !== inviteId));

            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    };

    return {
        invites,
        loading,
        loadInvites,
        sendInvite,
        cancelInvite
    };
}
