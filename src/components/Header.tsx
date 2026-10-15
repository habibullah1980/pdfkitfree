'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE_CONFIG } from '@/lib/site-config';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, 
  Menu, 
  X, 
  ShieldCheck, 
  ShieldAlert,
  LogOut, 
  FileSignature, 
  CheckCircle2, 
  ChevronDown,
  CreditCard,
  Sparkles,
  Settings
} from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4b49ac] text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              pdfkit<span className="text-[#4b49ac]">free</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {SITE_CONFIG.navLinks.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#4b49ac]/10 text-[#4b49ac] font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth & CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-1.5 rounded-full border border-[#98dbff] bg-[#98dbff]/15 px-3 py-1 text-xs font-semibold text-[#2f2d66]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#4b49ac]" />
            <span>100% In-Browser Privacy</span>
          </div>

          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4b49ac] text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                <span className="rounded-full bg-[#98dbff]/40 text-[#2f2d66] px-1.5 py-0.2 text-[9px] font-black uppercase">
                  {user.subscription?.planId || 'Free'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase text-[#4b49ac] bg-[#4b49ac]/10 px-2 py-0.5 rounded-full">
                        {user.subscription?.planId || 'Free'} Plan
                      </span>
                      {user.emailVerified ? (
                        <span className="text-teal-700 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <Link
                          href="/verify-email"
                          onClick={() => setUserDropdownOpen(false)}
                          className="text-amber-600 hover:underline font-semibold"
                        >
                          Verify Email &rarr;
                        </Link>
                      )}
                    </div>
                  </div>

                  {user.role === 'superadmin' && (
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#4b49ac] bg-[#4b49ac]/10 hover:bg-[#4b49ac]/20 transition mb-1"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-[#4b49ac]" />
                      <span>Super Admin Portal</span>
                    </Link>
                  )}

                  <Link
                    href="/ai"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#4b49ac] hover:bg-[#4b49ac]/10 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#4b49ac]" />
                    <span>AI Document Assistant</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    <span>Account & Security</span>
                  </Link>

                  <Link
                    href="/pricing"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-[#7978e3]" />
                    <span>Manage Subscription</span>
                  </Link>

                  <Link
                    href="/nda-esign?tab=history"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    <FileSignature className="h-3.5 w-3.5 text-[#4b49ac]" />
                    <span>My NDA Agreements</span>
                  </Link>

                  <button
                    type="button"
                    onClick={async () => {
                      setUserDropdownOpen(false);
                      await logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#f3797e] hover:bg-[#f3797e]/10 transition"
                  >
                    <LogOut className="h-3.5 w-3.5 text-[#f3797e]" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-[#4b49ac] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#413e96] transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-6 md:hidden">
          <div className="space-y-1">
            {SITE_CONFIG.navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-base font-medium ${
                  pathname === item.href
                    ? 'bg-brand-50 text-brand-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="px-3 py-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-[#98dbff]/40 text-[#2f2d66] px-2 py-0.5 text-[10px] font-black uppercase">
                    {user.subscription?.planId || 'Free'} Plan
                  </span>
                </div>
                {user.role === 'superadmin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-[#4b49ac]/10 border border-[#4b49ac]/30 px-4 py-2.5 text-sm font-bold text-[#4b49ac]"
                  >
                    <ShieldAlert className="h-4 w-4 text-[#4b49ac]" />
                    <span>Super Admin Portal</span>
                  </Link>
                )}
                <Link
                  href="/ai"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-[#4b49ac]/10 px-4 py-2.5 text-sm font-bold text-[#4b49ac]"
                >
                  <Sparkles className="h-4 w-4 text-[#4b49ac]" />
                  <span>AI Document Assistant</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800"
                >
                  <Settings className="h-4 w-4 text-slate-600" />
                  <span>Account & Security</span>
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800"
                >
                  <CreditCard className="h-4 w-4 text-[#7978e3]" />
                  <span>Manage Subscription</span>
                </Link>
                <Link
                  href="/nda-esign?tab=history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800"
                >
                  <FileSignature className="h-4 w-4 text-[#4b49ac]" />
                  <span>My NDA Agreements</span>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[#f3797e] hover:bg-[#f3797e]/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-[#4b49ac] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#413e96]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
