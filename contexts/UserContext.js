import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

// Push is OPTIONAL, but NotificationsService executes native code at module
// scope (expo-notifications). Importing it at the top level means any failure
// inside it aborts this module, and therefore UserProvider, and therefore the
// entire app — before a single screen renders. In a release build an uncaught
// JS error does not show a redbox; the app just closes. So isolate it fully:
// a no-op stub keeps auth working even if notifications are unusable.
let syncPushTokenForUser = () => {};
try {
  // eslint-disable-next-line global-require
  ({ syncPushTokenForUser } = require('../services/NotificationsService'));
} catch (err) {
  console.warn('Push: NotificationsService failed to load — push disabled.', err?.message);
}

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
        syncPushTokenForUser(session.user.id);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
        syncPushTokenForUser(newSession.user.id);
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

  // Student signup (OTP flow): email a one-time code to the student.
  // See STATUS.md "Current state" for the chosen signInWithOtp -> verifyOtp
  // -> updateUser(password) flow.
  const signInWithOtp = async ({ email, phone }) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { phone },
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
    return data;
  };

  // Student signup (OTP flow): verify the emailed code in Step 2 (OTP).
  const verifyOtp = async ({ email, token }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      // Surface a clear, actionable message instead of the raw
      // "Email not confirmed" / "Invalid login" Supabase errors.
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        throw new Error('Please check your email and confirm your account before signing in.');
      }
      if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        throw new Error('Invalid email or password.');
      }
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    try {
      // scope:'local' clears the stored session without needing the
      // server — a failed server call previously left zombie sessions
      // in storage that resurrected on every fresh boot.
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      // Always clear local state, even if the call throws —
      // otherwise the guard keeps routing as if still logged in.
      setProfile(null);
      setSession(null);
    }
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
        signInWithOtp,
        verifyOtp,
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
