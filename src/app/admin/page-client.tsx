'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldAlert,
  Users,
  Settings,
  BarChart3,
  Lock,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  HardDrive,
  DollarSign,
  CreditCard,
  History,
  Sliders,
  KeyRound,
  Globe,
  Ban,
  UserCheck,
  Gift,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  activeStatusUsers: number;
  suspendedUsers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  subscribersByPlan: {
    free: number;
    pro: number;
    business: number;
  };
  subscribersByStatus: {
    active: number;
    canceled: number;
    expired: number;
    past_due: number;
  };
  revenueMetrics: {
    totalRevenue: number;
    mrr: number;
    arr: number;
    transactionCount: number;
    stripeRevenue?: number;
    paypalRevenue?: number;
    sandboxRevenue?: number;
    totalRefunded?: number;
    totalChargebacks?: number;
    totalFees?: number;
    netRevenue?: number;
    subscribersByProvider?: {
      stripe: number;
      paypal: number;
      sandbox: number;
    };
  };
  processingMetrics: {
    totalPdfRequests: number;
    signedRequests: number;
    totalBytesProcessed: number;
    totalVideoProcessed: number;
    processingFailures: number;
  };
  superAdminCount: number;
  securityLogs: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
    ip?: string;
  }>;
  locationBreakdown: Array<{ country: string; count: number }>;
  dbLastUpdated: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  accountStatus: 'active' | 'suspended' | 'soft_deleted';
  suspendedReason?: string;
  lastLoginAt?: string;
  approxLocation?: {
    country: string;
    city?: string;
    note: string;
  };
  subscription?: {
    planId: 'free' | 'pro' | 'business';
    status: string;
    billingInterval: 'monthly' | 'yearly';
    startDate: string;
    renewalDate: string;
    cancelAtPeriodEnd: boolean;
  };
  usage?: {
    pdfProcessedCount: number;
    videoProcessedCount: number;
    aiCreditsUsed: number;
    storageBytesUsed: number;
  };
  customQuotas?: {
    maxFileSizeMb?: number;
    videoLimitMb?: number;
    aiCredits?: number;
    quotaAdjustReason?: string;
    quotaAdjustedAt?: string;
    quotaAdjustedBy?: string;
  };
}

interface PlanConfig {
  id: 'free' | 'pro' | 'business';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  badge?: string;
  features: string[];
  limits: {
    maxFileSizeMb: number;
    videoLimitMb: number;
    aiCreditsPerMonth: number;
    maxSeats: number;
    unlimitedBatches: boolean;
    ocrEnabled: boolean;
    teamWorkspaces: boolean;
    multiSigners: boolean;
    ndaDashboardAccess: boolean;
  };
}

interface BillingTransaction {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  amount: number;
  fee?: number;
  net?: number;
  currency: string;
  billingInterval: string;
  status: string;
  paymentMethod: string;
  provider: string;
  transactionRef: string;
  receiptUrl?: string;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  userId?: string;
  userEmail?: string;
  category: string;
  action: string;
  details: string;
  ip?: string;
  approxLocation?: string;
  timestamp: string;
}

interface AdminAuditLog {
  id: string;
  actorAdmin: string;
  targetUserId?: string;
  targetEmail?: string;
  action: string;
  reason: string;
  outcome: string;
  timestamp: string;
}

interface PlatformSettingsState {
  maintenanceMode: boolean;
  allowPublicSignups: boolean;
  maxVideoUploadMb: number;
  enforceNdaAuth: boolean;
  siteBanner: string;
  requireMfaForAdmin: boolean;
  telemetryEnabled: boolean;
}

export default function SuperAdminPage() {
  const { user, login, logout, loading: authLoading } = useAuth();

  // Admin credentials state for login
  const [adminId, setAdminId] = useState('habibullah');
  const [adminPass, setAdminPass] = useState('habib8963');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'subscriptions' | 'activity' | 'audit' | 'privacy' | 'settings'
  >('overview');

  // Main Data States
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettingsState | null>(null);

  // Pagination & Filtering for Users
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, _setUserRoleFilter] = useState('all');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);

  // Filters for Activity Logs
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // UI state
  const [loadingData, setLoadingData] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [selectedUserModal, setSelectedUserModal] = useState<UserItem | null>(null);
  const [quotaModalUser, setQuotaModalUser] = useState<UserItem | null>(null);
  const [quotaForm, setQuotaForm] = useState({ maxFileSizeMb: 250, videoLimitMb: 800, aiCredits: 50, reason: '' });

  const [promoModalUser, setPromoModalUser] = useState<UserItem | null>(null);
  const [promoForm, setPromoForm] = useState({ planId: 'pro', durationMonths: 3, reason: '' });

  const [statusModalUser, setStatusModalUser] = useState<UserItem | null>(null);
  const [statusForm, setStatusForm] = useState<{ status: 'active' | 'suspended'; reason: string }>({
    status: 'suspended',
    reason: '',
  });

  const [editProfileModalUser, setEditProfileModalUser] = useState<UserItem | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({ name: '', phone: '' });

  const [selectedPlanEdit, setSelectedPlanEdit] = useState<PlanConfig | null>(null);

  const isSuperAdmin = user?.role === 'superadmin';

  // Load Admin Data
  const loadAdminData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoadingData(true);
    setErrorMessage(null);

    try {
      const [statsRes, usersRes, plansRes, txRes, actRes, auditRes, setRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/users?page=${userPage}&search=${encodeURIComponent(userSearch)}&role=${userRoleFilter}&plan=${userPlanFilter}&status=${userStatusFilter}`),
        fetch('/api/admin/plans'),
        fetch('/api/admin/billing'),
        fetch(`/api/admin/activity?category=${activityCategoryFilter}&search=${encodeURIComponent(activitySearch)}`),
        fetch('/api/admin/audit'),
        fetch('/api/admin/settings'),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
        setUserTotalPages(d.totalPages || 1);
        setUserTotalCount(d.total || 0);
      }
      if (plansRes.ok) {
        const d = await plansRes.json();
        setPlans(d.plans || []);
      }
      if (txRes.ok) {
        const d = await txRes.json();
        setTransactions(d.transactions || []);
      }
      if (actRes.ok) {
        const d = await actRes.json();
        setActivityLogs(d.logs || []);
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.auditLogs || []);
      }
      if (setRes.ok) {
        const d = await setRes.json();
        setSettings(d.settings);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setErrorMessage('Failed to connect to admin API endpoints.');
    } finally {
      setLoadingData(false);
    }
  }, [isSuperAdmin, userPage, userSearch, userRoleFilter, userPlanFilter, userStatusFilter, activityCategoryFilter, activitySearch]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdminData();
    }
  }, [isSuperAdmin, loadAdminData]);

  // Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const res = await login(adminId, adminPass);
    setIsLoggingIn(false);

    if (!res.success) {
      setLoginError(res.error || 'Invalid credentials');
    }
  };

  // Adjust Quota Handler
  const handleSaveQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaModalUser) return;
    if (!quotaForm.reason || quotaForm.reason.trim().length < 5) {
      alert('A recorded reason (minimum 5 characters) is required for compliance.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: quotaModalUser.id,
          action: 'adjust-quota',
          quotas: {
            maxFileSizeMb: Number(quotaForm.maxFileSizeMb),
            videoLimitMb: Number(quotaForm.videoLimitMb),
            aiCredits: Number(quotaForm.aiCredits),
          },
          reason: quotaForm.reason,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        alert(d.error || 'Failed to adjust quotas');
        return;
      }

      setActionMessage(`Custom quotas adjusted for ${quotaModalUser.name}.`);
      setQuotaModalUser(null);
      loadAdminData();
    } catch {
      alert('Network error adjusting quotas.');
    }
  };

  // Promotional Access Handler
  const handleGrantPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoModalUser) return;
    if (!promoForm.reason || promoForm.reason.trim().length < 5) {
      alert('A recorded reason is mandatory for promotional access grants.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: promoModalUser.id,
          action: 'grant-promotional',
          planId: promoForm.planId,
          durationMonths: Number(promoForm.durationMonths),
          reason: promoForm.reason,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        alert(d.error || 'Failed to grant promotional access.');
        return;
      }

      setActionMessage(`Promotional ${promoForm.planId.toUpperCase()} access granted to ${promoModalUser.name}.`);
      setPromoModalUser(null);
      loadAdminData();
    } catch {
      alert('Network error granting promotional access.');
    }
  };

  // Account Status / Suspend Handler
  const handleSetStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: statusModalUser.id,
          action: 'set-status',
          accountStatus: statusForm.status,
          reason: statusForm.reason || 'Status updated by super administrator',
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        alert(d.error || 'Failed to update status');
        return;
      }

      setActionMessage(`User account status updated to ${statusForm.status}.`);
      setStatusModalUser(null);
      loadAdminData();
    } catch {
      alert('Network error updating status.');
    }
  };

  // Trigger Password Reset Link
  const handleTriggerPasswordReset = async (userId: string, email: string) => {
    if (!confirm(`Generate a secure password reset link for user ${email}? The user's existing password will not be displayed.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'trigger-reset' }),
      });

      const d = await res.json();
      if (res.ok) {
        alert(`Password reset flow generated successfully:\n\nReset URL: ${window.location.origin}${d.resetUrl}`);
        setActionMessage(`Password reset link generated for ${email}.`);
        loadAdminData();
      } else {
        alert(d.error || 'Failed to trigger reset');
      }
    } catch {
      alert('Network error triggering reset.');
    }
  };

  // Edit Profile Fields
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileModalUser) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editProfileModalUser.id,
          action: 'update-profile',
          name: editProfileForm.name,
          phone: editProfileForm.phone,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setActionMessage('User profile updated successfully.');
        setEditProfileModalUser(null);
        loadAdminData();
      } else {
        alert(d.error || 'Failed to update profile');
      }
    } catch {
      alert('Network error updating profile.');
    }
  };

  // Soft Delete / Delete User
  const handleDeleteUser = async (userId: string, email: string, mode: 'soft' | 'hard') => {
    const promptText =
      mode === 'soft'
        ? `Are you sure you want to soft-delete user "${email}"? Account will be deactivated and marked deleted while maintaining audit retention.`
        : `PERMANENT DELETION: Are you sure you want to permanently erase user "${email}" and their associated agreements? This cannot be undone.`;

    if (!confirm(promptText)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${userId}&mode=${mode}&reason=Admin+action`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (res.ok) {
        setActionMessage(`User "${email}" deleted (${mode} delete).`);
        loadAdminData();
      } else {
        alert(d.error || 'Failed to delete user.');
      }
    } catch {
      alert('Network error deleting user.');
    }
  };

  // Save Plan Configuration
  const handleSavePlanConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanEdit) return;

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanEdit.id,
          updates: {
            monthlyPrice: Number(selectedPlanEdit.monthlyPrice),
            yearlyPrice: Number(selectedPlanEdit.yearlyPrice),
            description: selectedPlanEdit.description,
            limits: selectedPlanEdit.limits,
          },
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setActionMessage(`Plan ${selectedPlanEdit.name} updated successfully.`);
        setSelectedPlanEdit(null);
        loadAdminData();
      } else {
        alert(d.error || 'Failed to update plan configuration.');
      }
    } catch {
      alert('Network error saving plan.');
    }
  };

  // Save Platform Controls & Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setActionMessage('Platform settings saved successfully.');
      }
    } catch {
      alert('Failed to save settings.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#4b49ac] mb-2" />
        <p className="text-xs text-slate-500">Checking credentials...</p>
      </div>
    );
  }

  // ==========================================================
  // LOGIN SCREEN (When not authenticated as Super Admin)
  // Uses exact brand palette (#4b49ac, #f3797e, #98dbff)
  // ==========================================================
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-2xl text-white">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4b49ac]/20 border border-[#4b49ac]/40 text-[#98dbff] mb-3 shadow-lg">
              <ShieldAlert className="h-8 w-8 text-[#98dbff]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Super Admin Control Portal
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Restricted management console for pdfkitfree.
            </p>
          </div>

          {loginError && (
            <div className="mb-5 rounded-xl border border-[#f3797e] bg-[#f3797e]/10 p-3 text-xs text-[#f3797e] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#f3797e] flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Super Admin ID / Username
              </label>
              <input
                type="text"
                required
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="habibullah"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-sm text-white focus:border-[#4b49ac] focus:outline-none focus:ring-1 focus:ring-[#4b49ac]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Master Password Key
              </label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="habib8963"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-sm text-white focus:border-[#4b49ac] focus:outline-none focus:ring-1 focus:ring-[#4b49ac]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4b49ac] py-3 px-4 text-xs font-bold text-white shadow-lg hover:bg-[#413e96] transition disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating Master Key...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Enter Super Admin Console</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
              &larr; Return to pdfkitfree Public Site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // SUPER ADMIN DASHBOARD
  // Brand palette: Primary #4b49ac, Light blue #98dbff, Supporting blue #7DA0FA, Lavender #7978e3, Coral #f3797e
  // ==========================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Master Admin Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4b49ac] text-white shadow-lg">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Super Admin Console
                </h1>
                <span className="rounded-full bg-[#4b49ac]/30 border border-[#4b49ac] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#98dbff]">
                  Full Root Authority
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Logged in as <strong className="text-white">habibullah</strong> • Multi-tier subscription &amp; platform governance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAdminData}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              View Site
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-xl bg-[#f3797e]/20 border border-[#f3797e]/40 px-3.5 py-2 text-xs font-bold text-[#f3797e] hover:bg-[#f3797e] hover:text-white transition"
            >
              Exit Console
            </button>
          </div>
        </div>

        {/* Notifications */}
        {actionMessage && (
          <div className="rounded-2xl border border-teal-500/40 bg-teal-950/40 p-4 text-xs text-teal-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-[#f3797e]/40 bg-[#f3797e]/10 p-4 text-xs text-[#f3797e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#f3797e]" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'overview', label: 'Overview & Metrics', icon: BarChart3 },
            { id: 'users', label: `Users (${userTotalCount})`, icon: Users },
            { id: 'subscriptions', label: `Subscriptions & Plans`, icon: CreditCard },
            { id: 'activity', label: 'User Activity', icon: History },
            { id: 'audit', label: 'Admin Audit Log', icon: ShieldCheck },
            { id: 'privacy', label: 'Location & Privacy', icon: Globe },
            { id: 'settings', label: 'Platform Controls', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === id
                  ? 'bg-[#4b49ac] text-white shadow-lg'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {/* ============================================================ */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Users */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
                  <Users className="h-5 w-5 text-[#98dbff]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{stats.totalUsers}</span>
                  <span className="text-xs text-[#98dbff]">({stats.verifiedUsers} verified)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Today: +{stats.newToday} • Week: +{stats.newThisWeek} • Month: +{stats.newThisMonth}
                </p>
              </div>

              {/* Card 2: Subscriptions */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Subscribers</span>
                  <CreditCard className="h-5 w-5 text-[#7DA0FA]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">
                    {stats.subscribersByPlan.pro + stats.subscribersByPlan.business}
                  </span>
                  <span className="text-xs text-[#7DA0FA]">
                    ({stats.subscribersByPlan.pro} Pro / {stats.subscribersByPlan.business} Biz)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Free tier users: {stats.subscribersByPlan.free}
                </p>
              </div>

              {/* Card 3: Revenue */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">MRR / ARR</span>
                  <DollarSign className="h-5 w-5 text-[#7978e3]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">
                    ${stats.revenueMetrics.mrr.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#7978e3]">
                    (ARR: ${stats.revenueMetrics.arr.toFixed(0)})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Total revenue collected: ${stats.revenueMetrics.totalRevenue.toFixed(2)}
                </p>
              </div>

              {/* Card 4: Processing */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Processing &amp; Storage</span>
                  <HardDrive className="h-5 w-5 text-[#98dbff]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">
                    {formatFileSize(stats.processingMetrics.totalBytesProcessed)}
                  </span>
                  <span className="text-xs text-teal-400">
                    ({stats.processingMetrics.signedRequests} NDAs)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Zero upload leaks: 100% In-RAM isolation
                </p>
              </div>
            </div>

            {/* Visual Charts Section using Brand Palette (#4b49ac, #7DA0FA, #7978e3, #98dbff, #f3797e) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: Plan Distribution */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Subscriber Plan Breakdown
                  </h3>
                  <span className="text-xs text-slate-400">Real Database State</span>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Free */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold">Free Tier ($0)</span>
                      <span className="font-mono text-slate-400">{stats.subscribersByPlan.free} users</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-[#98dbff] h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            8,
                            (stats.subscribersByPlan.free / (stats.totalUsers || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pro */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#7DA0FA] font-semibold">Pro Tier ($4.99/mo)</span>
                      <span className="font-mono text-slate-400">{stats.subscribersByPlan.pro} users</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-[#7DA0FA] h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            6,
                            (stats.subscribersByPlan.pro / (stats.totalUsers || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Business */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#4b49ac] font-semibold">Business Tier ($12/user)</span>
                      <span className="font-mono text-slate-400">{stats.subscribersByPlan.business} users</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-[#4b49ac] h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            6,
                            (stats.subscribersByPlan.business / (stats.totalUsers || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Subscription statuses:</span>
                  <span>
                    <strong className="text-teal-400">{stats.subscribersByStatus.active} Active</strong> •{' '}
                    <strong className="text-[#f3797e]">{stats.subscribersByStatus.canceled} Canceled</strong> •{' '}
                    <strong className="text-amber-400">{stats.subscribersByStatus.past_due} Past Due</strong>
                  </span>
                </div>
              </div>

              {/* Chart 2: Security & Geolocation Stream */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Recent Security Events
                  </h3>
                  <span className="text-[11px] text-teal-400 font-semibold">Zero Leaks Detected</span>
                </div>

                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {stats.securityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-white">{log.action}</p>
                        <p className="text-[11px] text-slate-400">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {stats.securityLogs.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">No security alerts.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Approximate Geolocation:</span>
                  <span>
                    {stats.locationBreakdown.map((l) => `${l.country} (${l.count})`).join(', ') || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: USER MANAGEMENT */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Registered Users Directory</h3>
                <p className="text-xs text-slate-400">
                  Search, adjust quotas, change subscriptions, suspend, or trigger password reset.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white focus:border-[#4b49ac] focus:outline-none w-56"
                  />
                </div>

                <select
                  value={userPlanFilter}
                  onChange={(e) => {
                    setUserPlanFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Plan &amp; Status</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Usage Totals</th>
                    <th className="py-3 px-4">Approx. Location</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4b49ac] text-xs font-black text-white">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.role === 'superadmin' && (
                              <span className="rounded bg-[#f3797e]/20 text-[#f3797e] px-1.5 py-0.2 text-[9px] font-black uppercase">
                                SuperAdmin
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                          {u.phone && <p className="text-[10px] text-slate-500 font-mono">{u.phone}</p>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-[#4b49ac]/20 text-[#98dbff] border border-[#4b49ac]/40">
                          {u.subscription?.planId || 'free'}
                        </span>
                        <span className="block text-[10px] text-slate-400 capitalize mt-0.5">
                          {u.subscription?.status || 'active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.accountStatus === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 text-[#f3797e] font-bold">
                            <Ban className="h-3.5 w-3.5" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-teal-400 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {u.emailVerified ? 'Email Verified' : 'Unverified'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <span>{u.usage?.pdfProcessedCount || 0} PDFs</span>
                        <span className="block text-[10px] text-slate-400">
                          {formatFileSize(u.usage?.storageBytesUsed || 0)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="block">{u.approxLocation?.country || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-500">Approximate</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => setSelectedUserModal(u)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Adjust Quotas */}
                        <button
                          type="button"
                          onClick={() => {
                            setQuotaModalUser(u);
                            setQuotaForm({
                              maxFileSizeMb: u.customQuotas?.maxFileSizeMb || 250,
                              videoLimitMb: u.customQuotas?.videoLimitMb || 800,
                              aiCredits: u.customQuotas?.aiCredits || 50,
                              reason: '',
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 text-[#98dbff] hover:bg-slate-700"
                          title="Adjust Quotas"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </button>

                        {/* Promotional Grant */}
                        <button
                          type="button"
                          onClick={() => {
                            setPromoModalUser(u);
                            setPromoForm({ planId: 'pro', durationMonths: 3, reason: '' });
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 text-[#7978e3] hover:bg-slate-700"
                          title="Grant Promotional Access"
                        >
                          <Gift className="h-3.5 w-3.5" />
                        </button>

                        {/* Suspend / Reactivate */}
                        {u.email !== 'habibullah' && (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalUser(u);
                              setStatusForm({
                                status: u.accountStatus === 'suspended' ? 'active' : 'suspended',
                                reason: '',
                              });
                            }}
                            className={`p-1.5 rounded-lg ${
                              u.accountStatus === 'suspended'
                                ? 'bg-teal-950/60 text-teal-400 hover:bg-teal-900/60'
                                : 'bg-amber-950/60 text-amber-400 hover:bg-amber-900/60'
                            }`}
                            title={u.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
                          >
                            {u.accountStatus === 'suspended' ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}

                        {/* Trigger Password Reset */}
                        <button
                          type="button"
                          onClick={() => handleTriggerPasswordReset(u.id, u.email)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                          title="Trigger Password Reset Flow"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>

                        {/* Soft Delete */}
                        {u.email !== 'habibullah' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email, 'soft')}
                            className="p-1.5 rounded-lg bg-[#f3797e]/20 text-[#f3797e] hover:bg-[#f3797e]/30"
                            title="Soft Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No users match query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>
                Showing page {userPage} of {userTotalPages} ({userTotalCount} total users)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={userPage >= userTotalPages}
                  onClick={() => setUserPage((p) => p + 1)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SUBSCRIPTIONS & PLANS CONFIGURATION */}
        {/* ============================================================ */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Payment Gateways Status & Net Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
                <span className="text-slate-400 text-xs">Net Verified Revenue</span>
                <p className="text-2xl font-black text-white">
                  ${stats?.revenueMetrics?.netRevenue?.toFixed(2) || '0.00'}
                </p>
                <span className="text-[10px] text-teal-400 block">
                  Gross: ${stats?.revenueMetrics?.totalRevenue?.toFixed(2) || '0.00'} • Fees: ${stats?.revenueMetrics?.totalFees?.toFixed(2) || '0.00'}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
                <span className="text-slate-400 text-xs">Stripe Revenue</span>
                <p className="text-2xl font-black text-[#98dbff]">
                  ${stats?.revenueMetrics?.stripeRevenue?.toFixed(2) || '0.00'}
                </p>
                <span className="text-[10px] text-slate-400 block">
                  {stats?.revenueMetrics?.subscribersByProvider?.stripe || 0} active subscribers
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
                <span className="text-slate-400 text-xs">PayPal Revenue</span>
                <p className="text-2xl font-black text-[#7DA0FA]">
                  ${stats?.revenueMetrics?.paypalRevenue?.toFixed(2) || '0.00'}
                </p>
                <span className="text-[10px] text-slate-400 block">
                  {stats?.revenueMetrics?.subscribersByProvider?.paypal || 0} active subscribers
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
                <span className="text-slate-400 text-xs">Refunds &amp; Disputes</span>
                <p className="text-2xl font-black text-[#f3797e]">
                  ${stats?.revenueMetrics?.totalRefunded?.toFixed(2) || '0.00'}
                </p>
                <span className="text-[10px] text-slate-400 block">
                  Disputes: ${stats?.revenueMetrics?.totalChargebacks?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            {/* Configurable Plans Editor */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Configurable Plan Entitlements</h3>
                  <p className="text-xs text-slate-400">
                    Adjust initial pricing ($/mo, $/yr), file limits, and feature entitlements for all 3 tiers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white capitalize">{p.name} Plan</span>
                      <span className="text-xs text-[#98dbff] font-mono">
                        ${p.monthlyPrice}/mo • ${p.yearlyPrice}/yr
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{p.description}</p>
                    <div className="text-[11px] text-slate-400 space-y-1 border-t border-slate-800 pt-2">
                      <p>• Max File: {p.limits.maxFileSizeMb} MB</p>
                      <p>• Video Limit: {p.limits.videoLimitMb} MB</p>
                      <p>• AI Credits: {p.limits.aiCreditsPerMonth} / mo</p>
                      <p>• Team Workspaces: {p.limits.teamWorkspaces ? 'Yes' : 'No'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanEdit(p)}
                      className="w-full mt-2 rounded-xl border border-[#4b49ac] bg-[#4b49ac]/20 py-2 text-xs font-bold text-[#98dbff] hover:bg-[#4b49ac] hover:text-white transition"
                    >
                      Edit Entitlements
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Billing Transactions */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Verified Billing &amp; Invoices History</h3>
                <p className="text-xs text-slate-400">
                  Audit trail of paid, refunded, or promotional subscription events.
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Invoice ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Plan &amp; Cycle</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method / Reason</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-400">{tx.id}</td>
                        <td className="py-3.5 px-4 font-medium text-white">{tx.userEmail}</td>
                        <td className="py-3.5 px-4 uppercase font-semibold text-[#98dbff]">
                          {tx.planId} ({tx.billingInterval})
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">${tx.amount.toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-slate-400">{tx.paymentMethod}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No billing transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: USER ACTIVITY LOGS */}
        {/* ============================================================ */}
        {activeTab === 'activity' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Operational Activity Log</h3>
                <p className="text-xs text-slate-400">
                  Track user authentication, subscription transitions, and tool processing outcomes.
                  No document contents or secrets are logged.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activityCategoryFilter}
                  onChange={(e) => setActivityCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="auth">Authentication</option>
                  <option value="billing">Billing &amp; Subs</option>
                  <option value="tool">Tool Execution</option>
                  <option value="security">Security</option>
                </select>

                <input
                  type="text"
                  placeholder="Filter activity..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white focus:outline-none w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{log.action}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-md truncate">{log.details}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {log.userEmail || 'System / Anon'}
                      </td>
                    </tr>
                  ))}
                  {activityLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No activity records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: ADMIN AUDIT LOG */}
        {/* ============================================================ */}
        {activeTab === 'audit' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Immutable Super Admin Audit Trail</h3>
                <p className="text-xs text-slate-400">
                  Append-only record of all administrative actions. Administrators cannot edit or delete this history.
                </p>
              </div>
              <span className="rounded-full bg-[#4b49ac]/30 border border-[#4b49ac] px-3 py-1 text-[10px] font-bold text-[#98dbff]">
                🔒 Append-Only Protection
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Recorded Reason</th>
                    <th className="py-3 px-4">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#98dbff]">{log.actorAdmin}</td>
                      <td className="py-3 px-4 font-bold text-white">{log.action}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {log.targetEmail || 'Platform'}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-sm truncate">{log.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            log.outcome === 'SUCCESS'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {log.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No admin audit logs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: LOCATION & PRIVACY */}
        {/* ============================================================ */}
        {activeTab === 'privacy' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Location Telemetry &amp; Privacy Safeguards</h3>
              <p className="text-xs text-slate-400">
                Transparent disclosure regarding approximate geolocation and surveillance prevention.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 text-xs">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#98dbff]" />
                  <span>Privacy Rules &amp; Zero GPS Policy</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  • <strong>Zero GPS or device location:</strong> pdfkitfree never requests browser geolocation permissions.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  • <strong>Country-level approximation:</strong> Telemetry is estimated only from legitimate network request headers (e.g. Cloudflare / reverse proxy IP range) for brute-force defense and DDoS mitigation.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  • <strong>No surveillance:</strong> Routine monitoring does not log document text, signing hashes, or private template contents.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  • <strong>Retention period:</strong> Operational activity logs rotate automatically and are retained for a maximum of 90 days.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 text-xs">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#7DA0FA]" />
                  <span>Approximate Geolocation Distribution</span>
                </h4>
                {stats?.locationBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-900">
                    <span className="font-semibold text-slate-200">{item.country}</span>
                    <span className="font-mono text-slate-400">{item.count} users (Approximate)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: PLATFORM CONTROLS */}
        {/* ============================================================ */}
        {activeTab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Platform Controls &amp; Security Flags</h3>
              <p className="text-xs text-slate-400">
                Adjust site-wide feature switches, rate limits, and access policies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Enforce NDA Authentication</span>
                  <input
                    type="checkbox"
                    checked={settings.enforceNdaAuth}
                    onChange={(e) => setSettings({ ...settings, enforceNdaAuth: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#4b49ac]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Protects NDA eSign workspaces by requiring sign-in before document execution.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Allow Public User Signups</span>
                  <input
                    type="checkbox"
                    checked={settings.allowPublicSignups}
                    onChange={(e) => setSettings({ ...settings, allowPublicSignups: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#4b49ac]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Allows new users to create pdfkitfree accounts freely.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <label className="block text-xs font-bold text-white">
                  Max Video Upload Limit (MB)
                </label>
                <input
                  type="number"
                  value={settings.maxVideoUploadMb}
                  onChange={(e) => setSettings({ ...settings, maxVideoUploadMb: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-xs text-white"
                />
                <p className="text-[11px] text-slate-400">
                  Browser RAM threshold warning limit for video compressor.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Require MFA for Super Admin</span>
                  <input
                    type="checkbox"
                    checked={settings.requireMfaForAdmin}
                    onChange={(e) => setSettings({ ...settings, requireMfaForAdmin: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#4b49ac]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Enforces mandatory 6-digit TOTP authenticator challenge on all administrative logins.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Security Telemetry &amp; Geo-Logging</span>
                  <input
                    type="checkbox"
                    checked={settings.telemetryEnabled}
                    onChange={(e) => setSettings({ ...settings, telemetryEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#4b49ac]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Records coarse country-level estimates from request headers for brute-force defense.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Maintenance Mode</span>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#f3797e]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Temporarily activates maintenance barrier for non-admin visitors.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-[#4b49ac] px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[#413e96] transition"
              >
                Save Platform Policies
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: VIEW USER DETAILS */}
      {/* ============================================================ */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">User Account Dossier</h3>
              <button onClick={() => setSelectedUserModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                <p>User ID: <span className="text-white">{selectedUserModal.id}</span></p>
                <p>Name: <span className="text-white">{selectedUserModal.name}</span></p>
                <p>Email: <span className="text-white">{selectedUserModal.email}</span></p>
                <p>Phone: <span className="text-white">{selectedUserModal.phone || 'Not provided'}</span></p>
                <p>Plan: <span className="text-[#98dbff] uppercase font-bold">{selectedUserModal.subscription?.planId}</span></p>
                <p>Created: <span className="text-slate-400">{new Date(selectedUserModal.createdAt).toLocaleString()}</span></p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                <p className="font-bold text-white">Usage &amp; Quotas:</p>
                <p>• PDFs Processed: {selectedUserModal.usage?.pdfProcessedCount || 0}</p>
                <p>• Custom Max File Size: {selectedUserModal.customQuotas?.maxFileSizeMb || 'Default'} MB</p>
                <p>• Custom Video Limit: {selectedUserModal.customQuotas?.videoLimitMb || 'Default'} MB</p>
                <p>• Custom AI Credits: {selectedUserModal.customQuotas?.aiCredits || 'Default'}</p>
                {selectedUserModal.customQuotas?.quotaAdjustReason && (
                  <p className="text-amber-400">Quota Reason: {selectedUserModal.customQuotas.quotaAdjustReason}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditProfileModalUser(selectedUserModal);
                  setEditProfileForm({ name: selectedUserModal.name, phone: selectedUserModal.phone || '' });
                  setSelectedUserModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
              >
                Edit Permitted Fields
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="px-4 py-2 rounded-xl bg-[#4b49ac] text-xs font-bold text-white hover:bg-[#413e96]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ADJUST QUOTAS (Requires Reason) */}
      {/* ============================================================ */}
      {quotaModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveQuotas} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">Adjust Quotas: {quotaModalUser.name}</h3>
              <button type="button" onClick={() => setQuotaModalUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Max PDF File Size (MB)</label>
                <input
                  type="number"
                  required
                  value={quotaForm.maxFileSizeMb}
                  onChange={(e) => setQuotaForm({ ...quotaForm, maxFileSizeMb: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Video Processing Limit (MB)</label>
                <input
                  type="number"
                  required
                  value={quotaForm.videoLimitMb}
                  onChange={(e) => setQuotaForm({ ...quotaForm, videoLimitMb: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">AI Document Credits</label>
                <input
                  type="number"
                  required
                  value={quotaForm.aiCredits}
                  onChange={(e) => setQuotaForm({ ...quotaForm, aiCredits: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Compliance Recorded Reason <span className="text-[#f3797e]">*Required</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Enterprise pilot grant approved per contract ref #4489"
                  value={quotaForm.reason}
                  onChange={(e) => setQuotaForm({ ...quotaForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuotaModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#4b49ac] text-xs font-bold text-white hover:bg-[#413e96]"
              >
                Record &amp; Save Quota
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: GRANT PROMOTIONAL ACCESS */}
      {/* ============================================================ */}
      {promoModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <form onSubmit={handleGrantPromo} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">Grant Promotional Access: {promoModalUser.name}</h3>
              <button type="button" onClick={() => setPromoModalUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Plan Tier</label>
                <select
                  value={promoForm.planId}
                  onChange={(e) => setPromoForm({ ...promoForm, planId: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                >
                  <option value="pro">Pro ($4.99/mo value)</option>
                  <option value="business">Business ($12/user value)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Duration (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={promoForm.durationMonths}
                  onChange={(e) => setPromoForm({ ...promoForm, durationMonths: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Recorded Business Reason <span className="text-[#f3797e]">*Required</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. VIP partner promotional access for legal trial"
                  value={promoForm.reason}
                  onChange={(e) => setPromoForm({ ...promoForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPromoModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#7978e3] text-xs font-bold text-white hover:bg-[#6362ce]"
              >
                Grant Access With Audit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: SUSPEND / REACTIVATE ACCOUNT */}
      {/* ============================================================ */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <form onSubmit={handleSetStatus} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">Account Status: {statusModalUser.name}</h3>
              <button type="button" onClick={() => setStatusModalUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Action</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as 'active' | 'suspended' })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                >
                  <option value="suspended">Suspend Account</option>
                  <option value="active">Reactivate Account</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reason / Note</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Reason for suspension or reactivation"
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white ${
                  statusForm.status === 'suspended' ? 'bg-[#f3797e] hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                Confirm Status Change
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: EDIT PROFILE FIELDS */}
      {/* ============================================================ */}
      {editProfileModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveProfile} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">Edit Permitted Profile: {editProfileModalUser.email}</h3>
              <button type="button" onClick={() => setEditProfileModalUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Phone Number (Voluntary)</label>
                <input
                  type="text"
                  placeholder="+1 555-0199"
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditProfileModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#4b49ac] text-xs font-bold text-white hover:bg-[#413e96]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: EDIT PLAN ENTITLEMENTS */}
      {/* ============================================================ */}
      {selectedPlanEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <form onSubmit={handleSavePlanConfig} className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">Configure Plan: {selectedPlanEdit.name}</h3>
              <button type="button" onClick={() => setSelectedPlanEdit(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Monthly Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedPlanEdit.monthlyPrice}
                  onChange={(e) => setSelectedPlanEdit({ ...selectedPlanEdit, monthlyPrice: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Yearly Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedPlanEdit.yearlyPrice}
                  onChange={(e) => setSelectedPlanEdit({ ...selectedPlanEdit, yearlyPrice: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Max File Size (MB)</label>
                <input
                  type="number"
                  value={selectedPlanEdit.limits.maxFileSizeMb}
                  onChange={(e) => setSelectedPlanEdit({
                    ...selectedPlanEdit,
                    limits: { ...selectedPlanEdit.limits, maxFileSizeMb: Number(e.target.value) }
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Video Limit (MB)</label>
                <input
                  type="number"
                  value={selectedPlanEdit.limits.videoLimitMb}
                  onChange={(e) => setSelectedPlanEdit({
                    ...selectedPlanEdit,
                    limits: { ...selectedPlanEdit.limits, videoLimitMb: Number(e.target.value) }
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">AI Credits / Month</label>
                <input
                  type="number"
                  value={selectedPlanEdit.limits.aiCreditsPerMonth}
                  onChange={(e) => setSelectedPlanEdit({
                    ...selectedPlanEdit,
                    limits: { ...selectedPlanEdit.limits, aiCreditsPerMonth: Number(e.target.value) }
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Max Seats Included</label>
                <input
                  type="number"
                  value={selectedPlanEdit.limits.maxSeats}
                  onChange={(e) => setSelectedPlanEdit({
                    ...selectedPlanEdit,
                    limits: { ...selectedPlanEdit.limits, maxSeats: Number(e.target.value) }
                  })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanEdit(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#4b49ac] text-xs font-bold text-white hover:bg-[#413e96]"
              >
                Save Plan Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
