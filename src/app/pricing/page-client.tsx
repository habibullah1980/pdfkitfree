'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Check,
  ShieldCheck,
  Sparkles,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';

interface PlanLimit {
  maxFileSizeMb: number;
  videoLimitMb: number;
  aiCreditsPerMonth: number;
  maxSeats: number;
  unlimitedBatches: boolean;
  ocrEnabled: boolean;
  teamWorkspaces: boolean;
  multiSigners: boolean;
  ndaDashboardAccess: boolean;
}

interface PlanItem {
  id: 'free' | 'pro' | 'business';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge?: string;
  description: string;
  features: string[];
  limits: PlanLimit;
}

export default function PricingPage() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Selected payment provider for checkout
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'paypal'>('stripe');

  // Checkout modal
  const [checkoutModal, setCheckoutModal] = useState<{
    open: boolean;
    plan?: PlanItem;
    provider?: 'stripe' | 'paypal' | 'sandbox';
    token?: string;
    sessionId?: string;
    orderId?: string;
    checkoutUrl?: string;
    isSandbox?: boolean;
    submitting?: boolean;
    successMessage?: string;
    errorMessage?: string;
  }>({ open: false });

  // Cancel subscription loading
  const [canceling, setCanceling] = useState(false);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  // FAQ open items
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/plans');
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const handleSelectPlan = async (plan: PlanItem) => {
    if (plan.id === 'free') {
      window.location.href = '/tools';
      return;
    }

    if (!isAuthenticated) {
      window.location.href = `/login?returnUrl=${encodeURIComponent('/pricing')}&reason=subscription`;
      return;
    }

    // Open checkout selection modal
    setCheckoutModal({
      open: true,
      plan,
      provider: selectedProvider,
      submitting: true,
      errorMessage: undefined,
      successMessage: undefined,
    });

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          interval: billingInterval,
          provider: selectedProvider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutModal((prev) => ({
          ...prev,
          submitting: false,
          errorMessage: data.error || 'Failed to start checkout.',
        }));
        return;
      }

      // If hosted checkout URL returned (Live Stripe Checkout or PayPal Approval URL)
      if (data.checkout?.checkoutUrl && !data.isSandbox) {
        window.location.href = data.checkout.checkoutUrl;
        return;
      }

      setCheckoutModal((prev) => ({
        ...prev,
        submitting: false,
        provider: data.checkout?.provider,
        token: data.checkout?.sandboxToken,
        sessionId: data.checkout?.sessionId,
        orderId: data.checkout?.orderId,
        checkoutUrl: data.checkout?.checkoutUrl,
        isSandbox: data.isSandbox,
      }));
    } catch {
      setCheckoutModal((prev) => ({
        ...prev,
        submitting: false,
        errorMessage: 'Network error communicating with billing gateway.',
      }));
    }
  };

  const handleChangeProvider = async (newProvider: 'stripe' | 'paypal') => {
    setSelectedProvider(newProvider);
    if (!checkoutModal.plan) return;

    setCheckoutModal((prev) => ({
      ...prev,
      submitting: true,
      errorMessage: undefined,
      provider: newProvider,
    }));

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutModal.plan.id,
          interval: billingInterval,
          provider: newProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutModal((prev) => ({
          ...prev,
          submitting: false,
          errorMessage: data.error || 'Failed to switch provider.',
        }));
        return;
      }

      if (data.checkout?.checkoutUrl && !data.isSandbox) {
        window.location.href = data.checkout.checkoutUrl;
        return;
      }

      setCheckoutModal((prev) => ({
        ...prev,
        submitting: false,
        provider: data.checkout?.provider,
        token: data.checkout?.sandboxToken,
        sessionId: data.checkout?.sessionId,
        orderId: data.checkout?.orderId,
        checkoutUrl: data.checkout?.checkoutUrl,
        isSandbox: data.isSandbox,
      }));
    } catch {
      setCheckoutModal((prev) => ({
        ...prev,
        submitting: false,
        errorMessage: 'Failed to update payment method.',
      }));
    }
  };

  const handleConfirmSandboxPayment = async () => {
    if (!checkoutModal.token) return;

    setCheckoutModal((prev) => ({ ...prev, submitting: true, errorMessage: undefined }));

    try {
      const res = await fetch('/api/billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: checkoutModal.token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCheckoutModal((prev) => ({
          ...prev,
          submitting: false,
          errorMessage: data.error || 'Payment verification failed.',
        }));
        return;
      }

      await refreshUser();

      setCheckoutModal((prev) => ({
        ...prev,
        submitting: false,
        successMessage: `Your subscription to ${checkoutModal.plan?.name} has been verified and activated!`,
      }));
    } catch {
      setCheckoutModal((prev) => ({
        ...prev,
        submitting: false,
        errorMessage: 'Network error verifying transaction.',
      }));
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your paid subscription? You will retain access until the end of the billing period.'
      )
    ) {
      return;
    }

    setCanceling(true);
    setCancelNotice(null);

    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setCancelNotice('Your subscription was canceled and will expire at the end of the current period.');
      } else {
        alert(data.error || 'Failed to cancel subscription.');
      }
    } catch {
      alert('Network error canceling subscription.');
    } finally {
      setCanceling(false);
    }
  };

  const currentPlanId = user?.subscription?.planId || 'free';
  const isCanceled = user?.subscription?.cancelAtPeriodEnd;

  const faqs = [
    {
      q: 'Do I need an account to use the basic PDF tools?',
      a: 'No. pdfkitfree offers core PDF tools (merge, split, rotate, convert, basic compress) with zero registration required. All basic file manipulation takes place directly inside your web browser via WebAssembly and HTML5 Canvas.',
    },
    {
      q: 'Which payment methods are supported?',
      a: 'We support all major Credit and Debit Cards (Visa, MasterCard, American Express, Discover) via Stripe Checkout, as well as PayPal Checkout. All transactions are processed through official hosted gateways, meaning no payment credentials ever touch our servers.',
    },
    {
      q: 'What is the Zero-Upload Privacy Guarantee?',
      a: 'Unlike traditional cloud conversion websites that transfer your sensitive PDF contracts or confidential tax files to remote servers, pdfkitfree executes processing in your local browser memory (RAM). Your files never touch external storage unless you explicitly initiate an NDA signature request.',
    },
    {
      q: 'How does billing work for Pro and Business plans?',
      a: 'Subscriptions can be billed monthly or annually. When choosing annual billing, you receive a discount equivalent to approximately 33% off the monthly rate. You can upgrade, downgrade, or cancel your subscription at any time without hidden fees.',
    },
    {
      q: 'What are AI Document Credits?',
      a: 'AI Document Credits allow subscribers to perform OCR extraction, contract summarization, structured field extraction, and intelligent discrepancy checks across large PDF documents. Pro accounts receive 50 credits/month; Business accounts receive 200 credits/user/month.',
    },
    {
      q: 'How does the test/sandbox payment workflow function?',
      a: 'In deployment environments where production payment credentials have not yet been provisioned, pdfkitfree runs in verified sandbox mode. Upgrade events are cryptographically authenticated via signed tokens so users and administrators can test plan transitions securely without charging actual cards.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. You can cancel your subscription from your billing settings or this page with one click. Your access will remain active until the end of your prepaid billing period.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#98dbff] bg-[#98dbff]/15 px-3.5 py-1 text-xs font-bold text-[#4b49ac]">
            <Sparkles className="h-4 w-4 text-[#7978e3]" />
            <span>Transparent, Fair Pricing for Private PDF Tools</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            Simple Plans for Every Workflow
          </h1>

          <p className="text-base text-slate-600 leading-relaxed">
            Standard PDF tools remain <strong className="text-slate-900">100% free forever without signup</strong>.
            Upgrade for high file limits, verified NDA workflows, and team collaboration.
          </p>

          {/* Billing Interval Switcher */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center rounded-xl bg-slate-200/80 p-1 border border-slate-300">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-[#4b49ac] text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                  billingInterval === 'yearly'
                    ? 'bg-[#4b49ac] text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="rounded-full bg-[#98dbff] px-2 py-0.5 text-[10px] font-extrabold text-[#4b49ac]">
                  Save ~33%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* User Active Subscription Banner */}
        {isAuthenticated && user?.subscription && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Plan:</span>
                <span className="rounded-full bg-[#4b49ac]/10 px-2.5 py-0.5 text-xs font-bold text-[#4b49ac] uppercase">
                  {user.subscription.planId}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                    user.subscription.status === 'active'
                      ? 'bg-teal-50 text-teal-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {user.subscription.status}
                </span>
                {user.subscription.paymentProvider && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    via {user.subscription.paymentProvider === 'stripe' ? 'Stripe (Card)' : user.subscription.paymentProvider === 'paypal' ? 'PayPal' : 'Sandbox'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isCanceled
                  ? `Access expires on ${new Date(user.subscription.renewalDate).toLocaleDateString()}`
                  : `Next renewal: ${new Date(user.subscription.renewalDate).toLocaleDateString()} (${user.subscription.billingInterval})`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/settings?tab=billing"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Billing History
              </Link>
              {currentPlanId !== 'free' && !isCanceled && (
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                >
                  {canceling ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </div>
        )}

        {cancelNotice && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>{cancelNotice}</span>
          </div>
        )}

        {/* Pricing Cards Grid */}
        {loadingPlans ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#4b49ac]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 max-w-7xl mx-auto items-stretch">
            {plans.map((plan) => {
              const isCurrent = currentPlanId === plan.id;
              const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              const isPopular = plan.id === 'pro';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all ${
                    isPopular
                      ? 'border-2 border-[#4b49ac] bg-white shadow-2xl scale-[1.02] z-10'
                      : 'border border-slate-200 bg-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-[#4b49ac] px-4 py-1 text-xs font-black tracking-wide text-white uppercase shadow-md">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="mt-1 text-xs text-slate-500 min-h-[32px]">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900">
                        ${price.toFixed(price % 1 === 0 ? 0 : 2)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {plan.id === 'free'
                          ? '/ forever'
                          : plan.id === 'business'
                          ? `/ user / ${billingInterval === 'yearly' ? 'yr' : 'mo'}`
                          : `/ ${billingInterval === 'yearly' ? 'year' : 'month'}`}
                      </span>
                    </div>

                    {billingInterval === 'yearly' && plan.monthlyPrice > 0 && (
                      <p className="text-[11px] font-semibold text-[#4b49ac]">
                        Billed annually (${plan.yearlyPrice}/yr) • Saves 33%
                      </p>
                    )}

                    <div className="border-t border-slate-100 pt-6 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Included Features:</p>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8 mt-6 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : isPopular
                          ? 'bg-[#4b49ac] text-white hover:bg-[#413e96] shadow-md'
                          : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {isCurrent ? (
                        <span>Current Plan</span>
                      ) : plan.id === 'free' ? (
                        <>
                          <span>Use Free Tools</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <span>Upgrade to {plan.name}</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    {plan.id !== 'free' && (
                      <p className="text-[10px] text-center text-slate-400">
                        Stripe &amp; PayPal accepted • Cancel anytime
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Comparison Table */}
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900">Detailed Plan Comparison</h2>
            <p className="text-xs text-slate-500 mt-1">
              Complete specifications and quotas across Free, Pro, and Business tiers
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Feature / Limit</th>
                  <th className="py-3 px-4 text-center">Free ($0)</th>
                  <th className="py-3 px-4 text-center text-[#4b49ac]">Pro ($4.99/mo)</th>
                  <th className="py-3 px-4 text-center text-[#7978e3]">Business ($12/user)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Standard Browser Tools (Merge, Split, Rotate)</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Unlimited</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Unlimited</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Maximum File Size Limit</td>
                  <td className="py-3.5 px-4 text-center">25 MB</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#4b49ac]">200 MB</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#7978e3]">1,000 MB (1 GB)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Video Compression File Size Limit</td>
                  <td className="py-3.5 px-4 text-center">50 MB</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#4b49ac]">500 MB</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#7978e3]">2,000 MB (2 GB)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Protected NDA Generation &amp; eSigning</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Personal Dashboard</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Multi-Party Team Flow</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">AI Document Analysis Credits</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#4b49ac]">50 / month</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#7978e3]">200 / user / mo</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Team Workspaces &amp; Shared Templates</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Included (10 seats)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Multi-Recipient Signing Flow</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Included</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">OCR Text Extraction</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Supported</td>
                  <td className="py-3.5 px-4 text-center text-teal-600 font-bold">Supported</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing FAQs Accordion */}
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 mt-1">
              Have questions about payment options, privacy, or billing intervals?
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-900 focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <span className="text-[#4b49ac] font-bold text-lg">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA & Privacy Banner */}
        <div className="mx-auto max-w-5xl rounded-3xl bg-[#4b49ac] p-8 sm:p-12 text-white shadow-xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-sm">
            <Lock className="h-3.5 w-3.5 text-[#98dbff]" />
            <span>Zero Data Extraction Guarantee</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black">
            Ready to experience confidential document workflows?
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            pdfkitfree was engineered from the ground up for legal counsels, freelancers, and security-minded teams.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tools"
              className="rounded-xl bg-white px-6 py-3 text-xs font-bold text-[#4b49ac] shadow hover:bg-slate-100 transition"
            >
              Explore Free PDF Tools
            </Link>
            <Link
              href="/nda-esign"
              className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              Launch NDA eSign
            </Link>
          </div>
        </div>
      </div>

      {/* Checkout Modal / Provider Selector */}
      {checkoutModal.open && checkoutModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4b49ac] text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black">Secure Checkout</h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutModal({ open: false })}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Order Summary */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Plan:</span>
                  <span className="font-bold text-slate-900">{checkoutModal.plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Interval:</span>
                  <span className="font-bold capitalize">{billingInterval}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    $
                    {(billingInterval === 'yearly'
                      ? checkoutModal.plan.yearlyPrice
                      : checkoutModal.plan.monthlyPrice
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm">
                  <span>Total Due Today:</span>
                  <span className="text-[#4b49ac]">
                    $
                    {(billingInterval === 'yearly'
                      ? checkoutModal.plan.yearlyPrice
                      : checkoutModal.plan.monthlyPrice
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Payment Method:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChangeProvider('stripe')}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                      selectedProvider === 'stripe'
                        ? 'border-[#4b49ac] bg-[#4b49ac]/10 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <CreditCard className="h-4 w-4 text-[#4b49ac]" />
                      <span>Cards / Stripe</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Visa, MC, Amex</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeProvider('paypal')}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                      selectedProvider === 'paypal'
                        ? 'border-[#7DA0FA] bg-[#7DA0FA]/15 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="font-black text-[#003087]">P</span>
                      <span>PayPal</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">PayPal Checkout</span>
                  </button>
                </div>
              </div>

              {/* Sandbox notice when live API keys are not supplied */}
              {checkoutModal.isSandbox && (
                <div className="rounded-xl border border-[#98dbff] bg-[#98dbff]/20 p-3.5 text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#2f2d66]">
                    <ShieldCheck className="h-4 w-4 text-[#4b49ac]" />
                    <span>Verified Sandbox Gateway Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Live production keys for {selectedProvider === 'paypal' ? 'PayPal' : 'Stripe'} are not set in the environment.
                    The checkout flow is cryptographically signed via HMAC-SHA256 and confirmed by the server without charging your card.
                  </p>
                </div>
              )}

              {checkoutModal.errorMessage && (
                <div className="rounded-xl border border-[#f3797e] bg-red-50 p-3 text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#f3797e] flex-shrink-0" />
                  <span>{checkoutModal.errorMessage}</span>
                </div>
              )}

              {checkoutModal.successMessage && (
                <div className="rounded-xl border border-teal-300 bg-teal-50 p-3 text-teal-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
                  <span>{checkoutModal.successMessage}</span>
                </div>
              )}

              {!checkoutModal.successMessage ? (
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleConfirmSandboxPayment}
                    disabled={checkoutModal.submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#4b49ac] py-3 text-xs font-bold text-white shadow-md hover:bg-[#413e96] transition disabled:opacity-50"
                  >
                    {checkoutModal.submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying with Gateway...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          {checkoutModal.isSandbox
                            ? 'Complete Sandbox Verification'
                            : `Proceed to ${selectedProvider === 'paypal' ? 'PayPal' : 'Stripe'} Checkout`}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    🔒 Zero raw card numbers or CVV are stored on pdfkitfree servers.
                  </p>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutModal({ open: false });
                      window.location.reload();
                    }}
                    className="w-full rounded-xl bg-[#4b49ac] py-2.5 text-xs font-bold text-white shadow"
                  >
                    Close &amp; Return to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
