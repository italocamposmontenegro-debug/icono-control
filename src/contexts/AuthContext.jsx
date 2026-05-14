/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, careers(name, code)')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  useEffect(() => {
    let active = true;
    const finishLoading = () => active && setLoading(false);
    const startupTimeout = window.setTimeout(finishLoading, 8000);

    async function loadInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.warn('No se pudo restaurar la sesion:', error);
        if (active) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        window.clearTimeout(startupTimeout);
        finishLoading();
      }
    }

    void loadInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void (async () => {
          try {
            if (!active) return;
            setUser(session?.user ?? null);
            if (session?.user) {
              await fetchProfile(session.user.id);
            } else {
              setProfile(null);
            }
          } catch (error) {
            console.warn('No se pudo actualizar el perfil de sesion:', error);
            if (active) setProfile(null);
          } finally {
            finishLoading();
          }
        })();
      }
    );

    return () => {
      active = false;
      window.clearTimeout(startupTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading || !user || profile) return;

    const profileTimeout = window.setTimeout(() => {
      if (!profile) {
        console.warn('La carga del perfil demoro demasiado; se libera el loader.');
        setLoading(false);
      }
    }, 8000);

    return () => window.clearTimeout(profileTimeout);
  }, [loading, profile, user]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin_comite';
  const isResponsable = profile?.role === 'responsable_carrera';
  const isViewer = profile?.role === 'visualizador';
  const canEdit = isAdmin || isResponsable;

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signIn, signOut,
      isAdmin, isResponsable, isViewer, canEdit,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
