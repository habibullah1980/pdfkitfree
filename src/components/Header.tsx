'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE_CONFIG } from '@/lib/site-config';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { EXTRA_TOOLS } from '@/lib/extra-tools';
import { 
  Menu, 
  X, 
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
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setToolsMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    setToolsMenuOpen(false);
  }, [pathname]);

  const extraActive = EXTRA_TOOLS.some((t) => pathname === t.href || pathname.startsWith(t.href.split('/').slice(0, 2).join('/') + '/'));
  const toolsMenu = (
    <div className="relative" ref={toolsMenuRef}>
      <button
        type="button"
        onClick={() => setToolsMenuOpen((o) => !o)}
        aria-expanded={toolsMenuOpen}
        aria-haspopup="true"
        aria-controls="more-tools-menu"
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors ${
          extraActive || toolsMenuOpen ? 'bg-brand-50 text-brand-600' : 'text-[#3D3B63] hover:text-brand-600'
        }`}
      >
        Video &amp; Image
        <ChevronDown className={`h-4 w-4 transition-transform ${toolsMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {toolsMenuOpen && (
        <div
          id="more-tools-menu"
          className="absolute left-1/2 top-full z-50 mt-2 w-[560px] -translate-x-1/2 rounded-3xl border border-[#ECEBF8] bg-white p-3 shadow-xl"
        >
          <ul className="grid grid-cols-2 gap-1">
            {EXTRA_TOOLS.map(({ href, label, description, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setToolsMenuOpen(false)}
                  className="flex items-start gap-3 rounded-2xl p-3 transition hover:bg-brand-50"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink">{label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#F0EFF8] bg-white/90 backdrop-blur-md pk-header">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center rounded-lg" aria-label="PDFKitFree home">
          <Logo size={38} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
          {SITE_CONFIG.navLinks.map((item, idx) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <React.Fragment key={item.href}>
              <Link
                href={item.href}
                className={`relative whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-[#3D3B63] hover:text-brand-600'
                }`}
              >
                {item.label}
              </Link>
              {idx === 0 && toolsMenu}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Desktop Auth & CTA */}
        <div className="hidden items-center gap-3 xl:flex">
          <ThemeToggle />

          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4B3FE4] text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                <span className="rounded-full bg-[#CFCBFF]/40 text-[#221A7A] px-1.5 py-0.2 text-[9px] font-black uppercase">
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
                      <span className="font-bold uppercase text-[#4B3FE4] bg-[#4B3FE4]/10 px-2 py-0.5 rounded-full">
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
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#4B3FE4] bg-[#4B3FE4]/10 hover:bg-[#4B3FE4]/20 transition mb-1"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-[#4B3FE4]" />
                      <span>Super Admin Portal</span>
                    </Link>
                  )}

                  <Link
                    href="/ai"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#4B3FE4] hover:bg-[#4B3FE4]/10 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#4B3FE4]" />
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
                    <CreditCard className="h-3.5 w-3.5 text-[#6C61EE]" />
                    <span>Manage Subscription</span>
                  </Link>

                  <Link
                    href="/nda-esign?tab=history"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    <FileSignature className="h-3.5 w-3.5 text-[#4B3FE4]" />
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
                className="inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-[#D9D7F2] px-5 text-[15px] font-bold text-ink transition hover:border-brand-600 hover:text-brand-600"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-600 px-5 text-[15px] font-bold text-white shadow-glow transition hover:bg-brand-700"
              >
                Sign up free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 xl:hidden">
          <ThemeToggle />
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
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-6 xl:hidden">
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

          <p className="mt-4 px-3 text-xs font-bold uppercase tracking-wider text-ink-muted">Video &amp; image tools</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {EXTRA_TOOLS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  pathname === href ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
                {label}
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
                  <span className="rounded-full bg-[#CFCBFF]/40 text-[#221A7A] px-2 py-0.5 text-[10px] font-black uppercase">
                    {user.subscription?.planId || 'Free'} Plan
                  </span>
                </div>
                {user.role === 'superadmin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-[#4B3FE4]/10 border border-[#4B3FE4]/30 px-4 py-2.5 text-sm font-bold text-[#4B3FE4]"
                  >
                    <ShieldAlert className="h-4 w-4 text-[#4B3FE4]" />
                    <span>Super Admin Portal</span>
                  </Link>
                )}
                <Link
                  href="/ai"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-[#4B3FE4]/10 px-4 py-2.5 text-sm font-bold text-[#4B3FE4]"
                >
                  <Sparkles className="h-4 w-4 text-[#4B3FE4]" />
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
                  <CreditCard className="h-4 w-4 text-[#6C61EE]" />
                  <span>Manage Subscription</span>
                </Link>
                <Link
                  href="/nda-esign?tab=history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800"
                >
                  <FileSignature className="h-4 w-4 text-[#4B3FE4]" />
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
                  className="flex items-center justify-center rounded-xl bg-[#4B3FE4] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#3326C4]"
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
