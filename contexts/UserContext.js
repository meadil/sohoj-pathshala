import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Error fetching profile:', error.message);
        return null;
      }
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    // Deep-link PKCE email confirmation (dynamically handles sohojpathshala:// or sohojshikkhok://)
    const handleUrl = async (url) => {
      if (!url) return;
      try {
        await supabase.auth.exchangeCodeForSession(url);
      } catch (e) {
        // Ignore expired or invalid auth links
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  // Student Signup: role omitted in metadata -> DB trigger defaults to 'student'
  const signUpStudent = async ({ email, password, name, nickname, phone }) => {
    const redirectUrl = Linking.createURL('confirm');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          nickname: nickname || name,
          phone,
        },
      },
    });
    if (error) throw error;
    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session,
    };
  };

  // Teacher Signup: role: 'teacher' in metadata -> DB trigger sets teacher_approval_status = 'pending'
  const signUpTeacher = async ({ email, password, name, nickname, phone }) => {
    const redirectUrl = Linking.createURL('confirm');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          nickname: nickname || name,
          phone,
          role: 'teacher',
        },
      },
    });
    if (error) throw error;
    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session,
    };
  };

  const resendConfirmationEmail = async (email) => {
    const redirectUrl = Linking.createURL('confirm');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) throw error;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const updateProfile = async (updates) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return null;
    return await fetchProfile(session.user.id);
  };

  // Computed role flags
  const role = profile?.role || 'student';
  const isOwner = Boolean(profile?.is_owner);
  const teacherApprovalStatus = profile?.teacher_approval_status || null; // 'pending' | 'approved' | 'rejected'
  const isApprovedTeacher = role === 'teacher' && teacherApprovalStatus === 'approved';

  return (
    <UserContext.Provider
      value={{
        session,
        profile,
        loading,
        role,
        isOwner,
        teacherApprovalStatus,
        isApprovedTeacher,
        signUpStudent,
        signUpTeacher,
        resendConfirmationEmail,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
