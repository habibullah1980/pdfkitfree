'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  KeyRound,
  Download,
  AlertCircle,
  CheckCircle2,
  Laptop,
  LogOut,
} from 'lucide-react';

interface ActiveSession {
  id: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  lastActiveAt: string;
}

export default function AccountSettingsPage() {
  const { user, refreshUser } = useAuth();

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'otp_sent'>('idle');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  // MFA state
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [_sessionsLoading, setSessionsLoading] = useState(false);

  // Profile fields state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Account deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Invoices & Billing state
  const [invoices, setInvoices] = useState<
    Array<{
      id: string;
      planId: string;
      billingInterval: string;
      amount: number;
      paymentMethod: string;
      provider: string;
      status: string;
      createdAt: string;
    }>
  >([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'security' | 'privacy' | 'sessions' | 'billing'>('security');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setPhoneNumber(user.phone || '');
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch('/api/billing/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') {
      loadInvoices();
    }
  }, [activeTab]);

  const handleOpenStripePortal = async () => {
    setBillingPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Customer portal unavailable in test mode. Manage plan directly from this dashboard.');
      }
    } catch {
      setError('Failed to launch Stripe billing portal.');
    } finally {
      setBillingPortalLoading(false);
    }
  };

  const handleCancelUserSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your paid subscription? You will retain access until the current period ends.')) return;
    setCancelingSubscription(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        alert('Subscription scheduled for cancellation at the end of the billing period.');
      } else {
        alert(data.error || 'Failed to cancel subscription.');
      }
    } catch {
      setError('Network error canceling subscription.');
    } finally {
      setCancelingSubscription(false);
    }
  };

  // Dispatch Phone OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneMsg(null);
    setPhoneLoading(true);

    try {
      const res = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch SMS code');

      setPhoneStep('otp_sent');
      setPhoneMsg('Verification code dispatched via SMS.');
      if (data.devOtpPreview) {
        setDevOtpPreview(data.devOtpPreview);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setPhoneLoading(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneLoading(true);

    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect code');

      setPhoneMsg('Phone verified successfully!');
      setPhoneStep('idle');
      setPhoneOtp('');
      await refreshUser();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setPhoneLoading(false);
    }
  };

  // Initiate MFA setup
  const handleStartMfaSetup = async () => {
    setMfaLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start MFA setup');

      setMfaSecret(data.secret);
      setMfaRecoveryCodes(data.recoveryCodes || []);
      setMfaMsg('Enter the 6-digit code from your authenticator app to confirm activation.');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setMfaLoading(false);
    }
  };

  // Confirm MFA token
  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mfaCode, action: 'enable' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');

      setMfaMsg('Two-Factor Authentication is now enabled on your account.');
      setMfaSecret(null);
      setMfaCode('');
      await refreshUser();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setMfaLoading(false);
    }
  };

  // Disable MFA
  const handleDisableMfa = async () => {
    if (!confirm('Are you sure you want to disable Multi-Factor Authentication?')) return;
    setMfaLoading(true);
    try {
      await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      });
      setMfaMsg('MFA has been disabled.');
      await refreshUser();
    } finally {
      setMfaLoading(false);
    }
  };

  // Revoke Session
  const handleRevokeSession = async (id: string) => {
    try {
      await fetch(`/api/auth/sessions?id=${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Sign out from all other active devices?')) return;
    try {
      await fetch('/api/auth/sessions?all=true', { method: 'DELETE' });
      loadSessions();
    } catch {
      setError('Failed to revoke sessions');
    }
  };

  // Update Profile Name or Password
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    setError(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          currentPassword: currentPass || undefined,
          newPassword: newPass || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setProfileMsg('Profile updated successfully.');
      setCurrentPass('');
      setNewPass('');
      await refreshUser();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setProfileLoading(false);
    }
  };

  // GDPR Data Export
  const handleExportData = async () => {
    try {
      const res = await fetch('/api/user/data');
      if (res.ok) {
        const data = await res.json();
        const jsonStr = JSON.stringify(data.exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdfkitfree-Account-Export-${user?.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Export failed');
    }
  };

  // Delete Account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      setError('Please type DELETE MY ACCOUNT to confirm.');
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch('/api/user/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      if (res.ok) {
        window.location.href = '/';
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Deletion failed');
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-md my-16 text-center space-y-4">
        <p className="text-sm text-slate-600">Please sign in to view your account settings.</p>
        <Link href="/login?returnUrl=/settings" className="inline-block rounded-xl bg-[#4b49ac] px-5 py-2 text-xs font-bold text-white">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Account & Security Settings
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Manage your credentials, Multi-Factor Authentication, SMS OTP verification, and privacy data.
          </p>
        </div>

        {/* Plan badge */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#4b49ac]/10 px-3 py-1 text-xs font-bold uppercase text-[#4b49ac]">
            {user.subscription?.planId || 'Free'} Tier
          </span>
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Manage Billing
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('security')}
          className={`py-2.5 px-4 border-b-2 transition ${
            activeTab === 'security'
              ? 'border-[#4b49ac] text-[#4b49ac]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Authentication &amp; MFA
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`py-2.5 px-4 border-b-2 transition ${
            activeTab === 'sessions'
              ? 'border-[#4b49ac] text-[#4b49ac]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Active Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`py-2.5 px-4 border-b-2 transition ${
            activeTab === 'billing'
              ? 'border-[#4b49ac] text-[#4b49ac]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Billing &amp; Invoices
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`py-2.5 px-4 border-b-2 transition ${
            activeTab === 'privacy'
              ? 'border-[#4b49ac] text-[#4b49ac]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Privacy, Exports &amp; Data
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: AUTHENTICATION & SECURITY */}
      {/* ============================================================ */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email & Phone Verification Cards */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900">Contact & Verification Status</h3>

            {/* Email Status */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Email Address:</span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                    <CheckCircle2 className="h-3 w-3 text-teal-600" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <Link
                    href="/verify-email"
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 hover:bg-amber-100"
                  >
                    <span>Unverified • Verify Now</span>
                  </Link>
                )}
              </div>
              <p className="font-mono text-slate-800 font-medium">{user.email}</p>
            </div>

            {/* Phone Verification */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Mobile Phone Number:</span>
                {user.phoneVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                    <CheckCircle2 className="h-3 w-3 text-teal-600" />
                    <span>Verified (SMS OTP)</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">Unverified</span>
                )}
              </div>

              {phoneMsg && <p className="text-teal-700 font-medium">{phoneMsg}</p>}

              {devOtpPreview && (
                <div className="p-2 rounded-lg bg-[#98dbff]/30 text-[#2f2d66] text-[11px] font-mono">
                  Sandbox SMS OTP Preview: <strong>{devOtpPreview}</strong>
                </div>
              )}

              {phoneStep === 'idle' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+14155552671"
                      className="flex-1 rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={phoneLoading}
                      className="rounded-xl bg-[#4b49ac] px-4 py-2 text-xs font-bold text-white hover:bg-[#413e96] disabled:opacity-50"
                    >
                      {phoneLoading ? 'Sending...' : 'Send SMS OTP'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    E.164 format with country code. Used for login challenges and account alerts.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      placeholder="123456"
                      className="flex-1 rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono text-center tracking-widest text-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={phoneLoading}
                      className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {phoneLoading ? 'Verifying...' : 'Confirm OTP'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhoneStep('idle')}
                    className="text-[11px] text-slate-500 underline"
                  >
                    Change phone number
                  </button>
                </form>
              )}
            </div>

            {/* Update Profile Name / Password */}
            <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <h4 className="font-bold text-slate-900">Update Profile Details</h4>
              {profileMsg && <p className="text-teal-700 font-medium">{profileMsg}</p>}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Change Password (Current required)
                </label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900 mb-2"
                />
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="New password (min. 8 chars)"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="rounded-xl bg-[#4b49ac] px-4 py-2 font-bold text-white hover:bg-[#413e96] disabled:opacity-50"
                >
                  {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* MFA Authenticator Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Two-Factor Authentication (TOTP)</h3>
              {user.mfaEnabled ? (
                <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  Disabled
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Add an extra layer of protection to your account using any standard authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, or Authy).
            </p>

            {mfaMsg && <p className="text-xs text-teal-700 font-medium">{mfaMsg}</p>}

            {!user.mfaEnabled && !mfaSecret && (
              <button
                type="button"
                onClick={handleStartMfaSetup}
                disabled={mfaLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4b49ac] py-2.5 text-xs font-bold text-white hover:bg-[#413e96]"
              >
                <KeyRound className="h-4 w-4" />
                <span>{mfaLoading ? 'Generating Secret...' : 'Set Up Two-Factor Authentication'}</span>
              </button>
            )}

            {mfaSecret && (
              <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block">1. Authenticator Setup Key</span>
                  <p className="font-mono text-xs bg-white p-2 rounded-lg border border-slate-200 select-all font-bold text-[#4b49ac]">
                    {mfaSecret}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    Enter this manual key into your mobile authenticator app.
                  </span>
                </div>

                {mfaRecoveryCodes.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 block">2. Backup Recovery Codes (Save these!)</span>
                    <div className="grid grid-cols-2 gap-1 bg-white p-2 rounded-lg border border-slate-200 font-mono text-[10px]">
                      {mfaRecoveryCodes.map((c, i) => (
                        <span key={i} className="text-slate-700 font-semibold">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleConfirmMfa} className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 block">3. Confirm 6-Digit Code</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      className="flex-1 rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono text-center tracking-widest text-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={mfaLoading}
                      className="rounded-xl bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {mfaLoading ? 'Enabling...' : 'Activate MFA'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {user.mfaEnabled && (
              <div className="space-y-3 p-4 rounded-2xl bg-teal-50/60 border border-teal-200 text-xs">
                <div className="flex items-center gap-2 text-teal-800 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <span>Your account is protected with Two-Factor Authentication.</span>
                </div>
                <p className="text-[11px] text-teal-700">
                  A verification code is required during sign in.
                </p>
                <button
                  type="button"
                  onClick={handleDisableMfa}
                  disabled={mfaLoading}
                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Disable MFA
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ACTIVE SESSIONS */}
      {/* ============================================================ */}
      {activeTab === 'sessions' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Login Sessions</h3>
              <p className="text-xs text-slate-500">
                Review devices and locations currently signed in to your account.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllSessions}
                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
              >
                Sign Out All Other Devices
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {sessions.map((s, idx) => (
              <div key={s.id || idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {s.userAgent || 'Browser Session'} {idx === 0 && <span className="text-teal-600 font-bold">(Current Device)</span>}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      IP: {s.ip || '127.0.0.1'} • Last active: {new Date(s.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {idx !== 0 && (
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                    title="Sign out this session"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: BILLING & INVOICES */}
      {/* ============================================================ */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription Overview Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 capitalize">
                    {user.subscription?.planId || 'Free'} Plan
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                      user.subscription?.status === 'active'
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {user.subscription?.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Payment Gateway:{' '}
                  <strong className="text-slate-800">
                    {user.subscription?.paymentProvider === 'stripe'
                      ? 'Stripe (Debit / Credit Cards)'
                      : user.subscription?.paymentProvider === 'paypal'
                      ? 'PayPal Checkout'
                      : 'Verified Test / Sandbox'}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/pricing"
                  className="rounded-xl bg-[#4b49ac] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#413e96] transition"
                >
                  Change Plan / Upgrade
                </Link>
                {user.subscription?.planId !== 'free' && !user.subscription?.cancelAtPeriodEnd && (
                  <button
                    type="button"
                    onClick={handleCancelUserSubscription}
                    disabled={cancelingSubscription}
                    className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                  >
                    {cancelingSubscription ? 'Canceling...' : 'Cancel Subscription'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                <span className="text-slate-500">Billing Interval</span>
                <p className="text-sm font-bold text-slate-900 capitalize">
                  {user.subscription?.billingInterval || 'Monthly'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                <span className="text-slate-500">Next Renewal Date</span>
                <p className="text-sm font-bold text-slate-900">
                  {user.subscription?.renewalDate
                    ? new Date(user.subscription.renewalDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                <span className="text-slate-500">Auto-Renewal Status</span>
                <p className="text-sm font-bold text-slate-900">
                  {user.subscription?.cancelAtPeriodEnd ? (
                    <span className="text-amber-600">Cancels at Period End</span>
                  ) : (
                    <span className="text-teal-600">Active (Auto-renews)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Provider Portal Action */}
            {user.subscription?.paymentProvider === 'stripe' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-900">Manage Stripe Payment Methods</p>
                  <p className="text-slate-500">
                    Update credit card details or view Stripe-hosted VAT receipts in Stripe Customer Portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenStripePortal}
                  disabled={billingPortalLoading}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  {billingPortalLoading ? 'Opening Portal...' : 'Open Stripe Customer Portal'}
                </button>
              </div>
            )}
          </div>

          {/* Payment History & Receipts */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Payment History &amp; Receipts</h3>
              <p className="text-xs text-slate-500">
                Downloadable transaction logs and verified payment confirmations.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice / Ref</th>
                    <th className="py-3 px-4">Plan &amp; Interval</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{inv.id}</td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-[#4b49ac]">
                        {inv.planId} ({inv.billingInterval})
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ${inv.amount?.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {inv.paymentMethod} ({inv.provider})
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {loadingInvoices ? 'Loading invoice records...' : 'No invoices on record for this account.'}
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
      {/* TAB 3: PRIVACY & DATA EXPORT */}
      {/* ============================================================ */}
      {activeTab === 'privacy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Data Portability (GDPR / CCPA)</h3>
            <p className="text-slate-600 leading-relaxed">
              You can export a full copy of all personal account data, subscription records, eSign audit histories, and AI conversation transcripts in machine-readable JSON format.
            </p>
            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4b49ac] px-4 py-2.5 font-bold text-white hover:bg-[#413e96]"
            >
              <Download className="h-4 w-4" />
              <span>Export Account Data (JSON)</span>
            </button>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50/40 p-6 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-red-900">Right to Erasure (Delete Account)</h3>
            <p className="text-red-800 leading-relaxed">
              Permanently close your pdfkitfree account and remove all personal information and AI chat history. This action cannot be reversed.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-red-900 mb-1">
                  Type &quot;DELETE MY ACCOUNT&quot; to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full rounded-xl border border-red-300 py-2 px-3 text-xs bg-white text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={deleteLoading || deleteConfirmation !== 'DELETE MY ACCOUNT'}
                className="w-full rounded-xl bg-red-600 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Processing Erasure...' : 'Permanently Delete My Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
