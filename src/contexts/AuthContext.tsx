'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserSubscription {
  planId: 'free' | 'pro' | 'business';
  status: 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing';
  billingInterval: 'monthly' | 'yearly';
  startDate: string;
  renewalDate: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  paymentProvider: 'mock' | 'stripe' | 'paypal';
  subscriptionId: string | null;
  customerId: string | null;
}

export interface UserUsage {
  pdfProcessedCount: number;
  videoProcessedCount: number;
  aiCreditsUsed: number;
  storageBytesUsed: number;
  lastUsageReset: string;
}

export interface CustomQuotas {
  maxFileSizeMb?: number;
  videoLimitMb?: number;
  aiCredits?: number;
  quotaAdjustReason?: string;
  quotaAdjustedAt?: string;
  quotaAdjustedBy?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  activeSessionsCount?: number;
  createdAt: string;
  subscription?: UserSubscription;
  usage?: UserUsage;
  customQuotas?: CustomQuotas;
  accountStatus?: 'active' | 'suspended' | 'soft_deleted';
  suspendedReason?: string;
  lastLoginAt?: string;
  devVerificationCode?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string, mfaCode?: string) => Promise<{ success: boolean; requiresMfa?: boolean; error?: string }>;
  signup: (name: string, email: string, pass: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: () => Promise<{ success: boolean; codePreview?: string; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  resetPassword: (token: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string, mfaCode?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.requiresMfa) {
        return { success: false, requiresMfa: true, error: data.message };
      }
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during login' };
    }
  };

  const signup = async (name: string, email: string, pass: string, phone?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Signup failed' };
      }
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during signup' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const verifyEmail = async (code: string) => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Verification failed' };
      }
      if (data.user) {
        setUser(data.user);
      } else {
        await refreshUser();
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during email verification' };
    }
  };

  const resendVerification = async () => {
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to resend code' };
      }
      return { success: true, codePreview: data.codePreview };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to process request' };
      }
      return { success: true, resetToken: data.resetToken };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const resetPassword = async (token: string, newPass: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reset password' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
