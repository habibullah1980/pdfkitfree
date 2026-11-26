import crypto from 'crypto';
import { getStateBackend, StateConflictError, type LegacyUserRow } from './app-state-store';

export type PlanTier = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing';
export type AccountStatus = 'active' | 'suspended' | 'soft_deleted';

export interface UserSubscription {
  planId: PlanTier;
  status: SubscriptionStatus;
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

export interface UserApproxLocation {
  country: string;
  city?: string;
  note: string; // e.g. "Estimated from server request headers"
}

export interface UserSessionRecord {
  id: string;
  tokenHash: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface UserMfaConfig {
  enabled: boolean;
  secret?: string; // Base32 encoded TOTP secret
  recoveryCodes?: string[];
  verifiedAt?: string;
}

export interface UserPhoneConfig {
  number?: string;
  verified: boolean;
  otpHash?: string;
  otpExpires?: string;
  attemptsCount?: number;
  lastSentAt?: string;
}

export interface AiChatMessageRecord {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Array<{ pageNumber?: number; excerptSnippet: string }>;
  timestamp: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  fileName?: string;
  documentSummary?: string;
  messages: AiChatMessageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'superadmin' | 'user';
  passwordHash: string;
  salt: string;
  emailVerified: boolean;
  verificationCode: string;
  verificationExpires: string;
  resetToken: string | null;
  resetTokenExpires: string | null;
  createdAt: string;

  // Multi-Factor Authentication
  mfa?: UserMfaConfig;

  // Phone OTP Verification
  phoneConfig?: UserPhoneConfig;

  // Active Sessions
  activeSessions?: UserSessionRecord[];

  // Subscription & usage
  subscription: UserSubscription;
  usage: UserUsage;
  customQuotas?: CustomQuotas;

  // Account status & security
  accountStatus: AccountStatus;
  suspendedReason?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  approxLocation?: UserApproxLocation;
  isDeleted?: boolean;
}

export interface SigningRequest {
  id: string;
  userId: string;
  title: string;
  documentType: 'generated' | 'uploaded';
  status: 'draft' | 'signed' | 'pending';
  disclosingParty?: string;
  receivingParty?: string;
  fileName: string;
  storagePath?: string;
  fileSize: number;
  pageCount: number;
  signedAt: string | null;
  createdAt: string;
}

export interface PlanLimits {
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

export interface PlanConfig {
  id: PlanTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  badge?: string;
  features: string[];
  limits: PlanLimits;
}

export interface BillingTransaction {
  id: string;
  userId: string;
  userEmail: string;
  planId: PlanTier;
  amount: number;
  fee?: number;
  net?: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly';
  status: 'paid' | 'pending' | 'failed' | 'refunded' | 'chargeback';
  paymentMethod: string;
  provider: 'mock' | 'stripe' | 'paypal';
  transactionRef: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userEmail?: string;
  category: 'auth' | 'billing' | 'tool' | 'security' | 'admin';
  action: string;
  details: string;
  ip?: string;
  approxLocation?: string;
  timestamp: string;
}

export interface AdminAuditLog {
  id: string;
  actorAdmin: string;
  targetUserId?: string;
  targetEmail?: string;
  action: string;
  reason: string;
  outcome: 'SUCCESS' | 'FAILED';
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  allowPublicSignups: boolean;
  maxVideoUploadMb: number;
  enforceNdaAuth: boolean;
  siteBanner: string;
  requireMfaForAdmin: boolean;
  telemetryEnabled: boolean;
}

interface DatabaseSchema {
  users: User[];
  signingRequests: SigningRequest[];
  settings?: PlatformSettings;
  plans?: PlanConfig[];
  billingTransactions?: BillingTransaction[];
  activityLogs?: ActivityLog[];
  adminAuditLogs?: AdminAuditLog[];
  aiConversations?: AiConversation[];
}


export const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Essential client-side tools for individuals and quick document tasks.',
    features: [
      'Core PDF tools without mandatory signup',
      '100% browser-based PDF processing (Zero cloud upload)',
      'Basic video compression (up to 50 MB)',
      'Basic file-size limits (up to 25 MB/file)',
      'Batch conversion (up to 5 files per run)',
      'Protected NDA signing requires free login',
    ],
    limits: {
      maxFileSizeMb: 25,
      videoLimitMb: 50,
      aiCreditsPerMonth: 0,
      maxSeats: 1,
      unlimitedBatches: false,
      ocrEnabled: false,
      teamWorkspaces: false,
      multiSigners: false,
      ndaDashboardAccess: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
    badge: 'Most Popular',
    description: 'For professionals needing elevated file limits, NDA workflows, and AI credits.',
    features: [
      'Everything in Free plan',
      'High processing limits (up to 250 MB/file)',
      'Elevated video compression (up to 800 MB)',
      'Unlimited batch PDF processing',
      'Protected NDA generation & personal signing dashboard',
      '50 AI document processing credits per month',
      'Saved document templates and signing history',
      'Client-side OCR & advanced conversions',
    ],
    limits: {
      maxFileSizeMb: 250,
      videoLimitMb: 800,
      aiCreditsPerMonth: 50,
      maxSeats: 1,
      unlimitedBatches: true,
      ocrEnabled: true,
      teamWorkspaces: false,
      multiSigners: false,
      ndaDashboardAccess: true,
    },
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 12.0,
    yearlyPrice: 99.0,
    badge: 'Teams & Firms',
    description: 'Collaborative workspaces, shared NDA libraries, and multi-party signing.',
    features: [
      'Everything in Pro plan',
      'Team workspaces & centralized seat management',
      'Shared NDA & legal document templates',
      'Multi-recipient signature workflows',
      'Team activity, audit trails, and usage reports',
      'Centralized billing and organization administration',
      '200 AI document credits per seat / month',
      'Priority processing and custom quotas',
    ],
    limits: {
      maxFileSizeMb: 500,
      videoLimitMb: 2000,
      aiCreditsPerMonth: 200,
      maxSeats: 10,
      unlimitedBatches: true,
      ocrEnabled: true,
      teamWorkspaces: true,
      multiSigners: true,
      ndaDashboardAccess: true,
    },
  },
];

const DEFAULT_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  allowPublicSignups: true,
  maxVideoUploadMb: 800,
  enforceNdaAuth: true,
  siteBanner: '',
  requireMfaForAdmin: false,
  telemetryEnabled: true,
};

function emptyDb(): DatabaseSchema {
  return {
    users: [],
    signingRequests: [],
    settings: { ...DEFAULT_SETTINGS },
    plans: DEFAULT_PLANS,
    billingTransactions: [],
    activityLogs: [],
    adminAuditLogs: [],
    aiConversations: [],
  };
}

function defaultSubscription(planId: PlanTier, createdAt?: string): UserSubscription {
  return {
    planId,
    status: 'active',
    billingInterval: 'monthly',
    startDate: createdAt || new Date().toISOString(),
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    paymentProvider: 'mock',
    subscriptionId: null,
    customerId: null,
  };
}

function emptyUsage(): UserUsage {
  return {
    pdfProcessedCount: 0,
    videoProcessedCount: 0,
    aiCreditsUsed: 0,
    storageBytesUsed: 0,
    lastUsageReset: new Date().toISOString(),
  };
}

/**
 * Creates or updates the super admin from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD.
 * There are deliberately no built-in fallback credentials: without both variables
 * no account is promoted. Returns true when the state was changed.
 */
function seedSuperAdmin(db: DatabaseSchema): boolean {
  const identifier = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!identifier || !password) {
    console.warn('[auth] SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD are not set; no super admin account is provisioned.');
    return false;
  }
  if (password.length < 12) {
    console.error('[auth] SUPERADMIN_PASSWORD must be at least 12 characters; super admin was not provisioned.');
    return false;
  }

  let admin = db.users.find((u) => u.email.toLowerCase() === identifier && !u.isDeleted);
  if (admin && admin.role === 'superadmin' && admin.emailVerified && verifyPassword(password, admin.passwordHash, admin.salt)) {
    return false; // already in sync
  }

  const { hash, salt } = hashPassword(password);
  if (!admin) {
    admin = {
      id: crypto.randomUUID(),
      name: 'Super Admin',
      email: identifier,
      role: 'superadmin',
      passwordHash: hash,
      salt,
      emailVerified: true,
      verificationCode: '',
      verificationExpires: new Date().toISOString(),
      resetToken: null,
      resetTokenExpires: null,
      createdAt: new Date().toISOString(),
      subscription: { ...defaultSubscription('business'), billingInterval: 'yearly' },
      usage: emptyUsage(),
      accountStatus: 'active',
    };
    db.users.unshift(admin);
  } else {
    admin.role = 'superadmin';
    admin.emailVerified = true;
    admin.passwordHash = hash;
    admin.salt = salt;
    admin.accountStatus = 'active';
  }
  return true;
}

/** Imports accounts mirrored into the old Neon `users` table, so existing users keep their logins. */
function importLegacyUsers(db: DatabaseSchema, rows: LegacyUserRow[]) {
  const asIso = (v: string | Date | null) => (v ? new Date(v).toISOString() : new Date().toISOString());
  for (const r of rows) {
    if (!r.email || !r.password_hash || !r.salt) continue;
    const email = String(r.email).trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === email)) continue;
    const sub = (r.subscription && typeof r.subscription === 'object' ? r.subscription : null) as UserSubscription | null;
    db.users.push({
      id: r.id || crypto.randomUUID(),
      name: r.name || email,
      email,
      phone: r.phone || undefined,
      // Admin rights are only granted through SUPERADMIN_* env vars, never imported.
      role: 'user',
      passwordHash: r.password_hash,
      salt: r.salt,
      emailVerified: Boolean(r.email_verified),
      verificationCode: r.verification_code || '',
      verificationExpires: asIso(r.verification_expires),
      resetToken: null,
      resetTokenExpires: null,
      createdAt: asIso(r.created_at),
      subscription: sub && sub.planId ? sub : defaultSubscription('free'),
      usage: (r.usage && typeof r.usage === 'object' ? r.usage : emptyUsage()) as UserUsage,
      accountStatus: (r.account_status as AccountStatus) || 'active',
    });
  }
}

// Backfill defaults on documents written by older versions of the app (in memory only).
function normalizeDb(db: DatabaseSchema) {
  db.users = db.users || [];
  db.signingRequests = db.signingRequests || [];
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  if (!db.plans || db.plans.length === 0) db.plans = DEFAULT_PLANS;
  db.billingTransactions = db.billingTransactions || [];
  db.activityLogs = db.activityLogs || [];
  db.adminAuditLogs = db.adminAuditLogs || [];
  db.aiConversations = db.aiConversations || [];

  const demoAllowed = process.env.ENABLE_DEMO_ACCOUNT === 'true';
  for (const u of db.users) {
    if (!u.subscription) u.subscription = defaultSubscription(u.role === 'superadmin' ? 'business' : 'free', u.createdAt);
    if (!u.usage) u.usage = emptyUsage();
    if (!u.accountStatus) u.accountStatus = 'active';

    // Demo account isolation: never admin, never paid, disabled unless explicitly enabled.
    if (u.email.toLowerCase() === DEMO_EMAIL) {
      u.role = 'user';
      if (u.subscription.planId !== 'free') u.subscription.planId = 'free';
      if (!demoAllowed) {
        u.accountStatus = 'suspended';
        u.suspendedReason = DEMO_DISABLED_REASON;
      } else if (u.suspendedReason === DEMO_DISABLED_REASON) {
        u.accountStatus = 'active';
        u.suspendedReason = undefined;
      }
    }
  }
}

/** Adds the demo account only when it is enabled and given its own password. Returns true when added. */
function seedDemoAccount(db: DatabaseSchema): boolean {
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (process.env.ENABLE_DEMO_ACCOUNT !== 'true' || !password) return false;
  if (db.users.some((u) => u.email.toLowerCase() === DEMO_EMAIL)) return false;
  const { hash, salt } = hashPassword(password);
  db.users.push({
    id: 'usr_demo_pdfkitfree',
    name: 'Demo Account (Restricted)',
    email: DEMO_EMAIL,
    role: 'user',
    passwordHash: hash,
    salt,
    emailVerified: true,
    verificationCode: '',
    verificationExpires: new Date().toISOString(),
    resetToken: null,
    resetTokenExpires: null,
    createdAt: new Date().toISOString(),
    subscription: defaultSubscription('free'),
    usage: emptyUsage(),
    accountStatus: 'active',
  });
  return true;
}

const DEMO_EMAIL = 'demo@pdfkitfree.com';
const DEMO_DISABLED_REASON =
  'Demo account is disabled by default in production. Set ENABLE_DEMO_ACCOUNT=true in demo environment to enable.';

// Version of the stored document each loaded copy was read at (used for compare-and-swap writes).
const loadedVersions = new WeakMap<DatabaseSchema, number>();
// Seeding (PBKDF2 hashing) runs once per server instance, not on every request.
let seededThisInstance = false;

/** Tests only: behave like a freshly started server instance (re-run env-based seeding). */
export function resetSeedingForTests() {
  seededThisInstance = false;
}

async function loadDb(): Promise<DatabaseSchema> {
  const backend = getStateBackend();
  let row = await backend.read();

  if (!row) {
    const initial = emptyDb();
    importLegacyUsers(initial, await backend.readLegacyUsers().catch((err) => {
      console.error('[auth] Could not read legacy users table; starting without imported accounts.', err);
      return [];
    }));
    seedSuperAdmin(initial);
    seedDemoAccount(initial);
    normalizeDb(initial);
    await backend.create(initial); // false = another instance created it first; read theirs below
    row = await backend.read();
    if (!row) throw new Error('Application state could not be initialised.');
    seededThisInstance = true;
  }

  const db = row.data as DatabaseSchema;
  normalizeDb(db);
  loadedVersions.set(db, row.version);

  if (!seededThisInstance) {
    const changed = seedSuperAdmin(db) || seedDemoAccount(db);
    if (changed) {
      normalizeDb(db);
      try {
        await saveDb(db);
      } catch (err) {
        if (!(err instanceof StateConflictError)) throw err;
        return loadDb(); // someone else wrote first; seeding is retried on the fresh copy
      }
    }
    seededThisInstance = true;
  }

  return db;
}

async function saveDb(db: DatabaseSchema): Promise<void> {
  const version = loadedVersions.get(db);
  if (version === undefined) throw new Error('saveDb called with a state object that was not loaded by loadDb.');
  const next = await getStateBackend().write(db, version);
  if (next === null) throw new StateConflictError();
  loadedVersions.set(db, next);
}

/** Re-runs a read-modify-write operation on fresh state when another request saved first. */
function withDbRetry<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn(...args);
      } catch (err) {
        if (!(err instanceof StateConflictError) || attempt >= 6) throw err;
        await new Promise((r) => setTimeout(r, 15 * attempt + Math.random() * 25));
      }
    }
  };
}

/** Appends an activity log entry to an already-loaded state (saved together with the caller's change). */
function pushActivity(db: DatabaseSchema, entry: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
  const log: ActivityLog = { id: crypto.randomUUID(), ...entry, timestamp: new Date().toISOString() };
  db.activityLogs = [log, ...(db.activityLogs || [])].slice(0, 500);
  return log;
}

/** Appends an admin audit entry to an already-loaded state (saved together with the caller's change). */
function pushAdminAction(
  db: DatabaseSchema,
  actorAdmin: string,
  targetUserId: string | undefined,
  targetEmail: string | undefined,
  action: string,
  reason: string,
  outcome: 'SUCCESS' | 'FAILED',
  details?: Record<string, unknown>
): AdminAuditLog {
  const log: AdminAuditLog = {
    id: crypto.randomUUID(),
    actorAdmin,
    targetUserId,
    targetEmail,
    action,
    reason,
    outcome,
    details,
    timestamp: new Date().toISOString(),
  };
  db.adminAuditLogs = [log, ...(db.adminAuditLogs || [])].slice(0, 1000);
  return log;
}


// Password hashing with PBKDF2
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  const stored = Buffer.from(hash || '', 'hex');
  return stored.length === checkHash.length && crypto.timingSafeEqual(stored, checkHash);
}

// Generate 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// User CRUD & queries
export async function findUserByEmail(identifier: string): Promise<User | undefined> {
  const db = await loadDb();
  const cleanId = identifier.trim().toLowerCase();

  return db.users.find(
    (u) =>
      !u.isDeleted &&
      u.email.toLowerCase() === cleanId
  );
}

function isPrimaryAdmin(user: User): boolean {
  const primary = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(primary) && user.email.toLowerCase() === primary;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await loadDb();
  return db.users.find((u) => u.id === id && !u.isDeleted);
}

async function createUser__impl(name: string, email: string, password: string, phone?: string): Promise<User> {
  const db = await loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.users.find((u) => !u.isDeleted && u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('An account with this email or username already exists.');
  }

  const { hash, salt } = hashPassword(password);
  const code = generateVerificationCode();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // New accounts are never admins; the super admin comes only from SUPERADMIN_* env vars.
  const isSuper = false;

  const newUser: User = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : undefined,
    role: isSuper ? 'superadmin' : 'user',
    passwordHash: hash,
    salt,
    emailVerified: isSuper,
    verificationCode: isSuper ? '' : code,
    verificationExpires: expires,
    resetToken: null,
    resetTokenExpires: null,
    createdAt: new Date().toISOString(),
    subscription: {
      planId: isSuper ? 'business' : 'free',
      status: 'active',
      billingInterval: 'monthly',
      startDate: new Date().toISOString(),
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      paymentProvider: 'mock',
      subscriptionId: null,
      customerId: null,
    },
    usage: {
      pdfProcessedCount: 0,
      videoProcessedCount: 0,
      aiCreditsUsed: 0,
      storageBytesUsed: 0,
      lastUsageReset: new Date().toISOString(),
    },
    accountStatus: 'active',
    approxLocation: {
      country: 'United States',
      note: 'Estimated from server request headers (Approximate only)',
    },
  };

  db.users.push(newUser);

  pushActivity(db, {
    userId: newUser.id,
    userEmail: newUser.email,
    category: 'auth',
    action: 'USER_REGISTERED',
    details: `User registered with ${newUser.subscription.planId.toUpperCase()} tier`,
  });

  await saveDb(db);
  return newUser;
}
export const createUser = withDbRetry(createUser__impl);

async function recordUserLogin__impl(userId: string, ip?: string, _userAgent?: string) {
  const db = await loadDb();
  const u = db.users.find((user) => user.id === userId);
  if (u) {
    u.lastLoginAt = new Date().toISOString();
    if (ip) u.lastLoginIp = ip;
    pushActivity(db, {
      userId: u.id,
      userEmail: u.email,
      category: 'auth',
      action: 'USER_LOGIN',
      details: `Successful authentication from client IP: ${ip || 'internal'}`,
      ip,
    });
    await saveDb(db);
  }
}
export const recordUserLogin = withDbRetry(recordUserLogin__impl);

async function verifyUserEmail__impl(userId: string, code: string): Promise<boolean> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;

  if (user.verificationCode === code.trim()) {
    user.emailVerified = true;
    user.verificationCode = '';

    pushActivity(db, {
      userId: user.id,
      userEmail: user.email,
      category: 'auth',
      action: 'EMAIL_VERIFIED',
      details: 'User verified email address via verification code',
    });

    await saveDb(db);
    return true;
  }
  return false;
}
export const verifyUserEmail = withDbRetry(verifyUserEmail__impl);

async function createPasswordResetToken__impl(email: string): Promise<{ user: User; token: string } | null> {
  const db = await loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find((u) => !u.isDeleted && u.email.toLowerCase() === cleanEmail);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PASSWORD_RESET_REQUESTED',
    details: 'User requested password reset token',
  });

  await saveDb(db);
  return { user, token };
}
export const createPasswordResetToken = withDbRetry(createPasswordResetToken__impl);

async function resetUserPassword__impl(token: string, newPassword: string): Promise<boolean> {
  const db = await loadDb();
  const user = db.users.find(
    (u) =>
      u.resetToken === token &&
      u.resetTokenExpires &&
      new Date(u.resetTokenExpires).getTime() > Date.now()
  );
  if (!user) return false;

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.resetToken = null;
  user.resetTokenExpires = null;

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PASSWORD_RESET_COMPLETED',
    details: 'Password was updated successfully with PBKDF2 hash',
  });

  await saveDb(db);
  return true;
}
export const resetUserPassword = withDbRetry(resetUserPassword__impl);

async function refreshVerificationCode__impl(userId: string): Promise<string | null> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;

  const code = generateVerificationCode();
  user.verificationCode = code;
  user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await saveDb(db);
  return code;
}

// Safe user profile (never exposes passwords, salts, tokens, or raw payment details)
export const refreshVerificationCode = withDbRetry(refreshVerificationCode__impl);

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role || 'user',
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    subscription: user.subscription,
    usage: user.usage,
    customQuotas: user.customQuotas,
    accountStatus: user.accountStatus || 'active',
    suspendedReason: user.suspendedReason,
    lastLoginAt: user.lastLoginAt,
    approxLocation: user.approxLocation,
    // Shown only on local dev servers (no email provider); never sent to browsers in production.
    devVerificationCode:
      process.env.NODE_ENV !== 'production' && !user.emailVerified ? user.verificationCode : undefined,
    mfaEnabled: user.mfa?.enabled || false,
    phoneVerified: user.phoneConfig?.verified || false,
    activeSessionsCount: user.activeSessions?.length || 1,
  };
}

// Signing Requests CRUD
export async function getSigningRequestsByUserId(userId: string): Promise<SigningRequest[]> {
  const db = await loadDb();
  return db.signingRequests
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function createSigningRequest__impl(
  userId: string,
  data: {
    title: string;
    documentType: 'generated' | 'uploaded';
    status: 'draft' | 'signed' | 'pending';
    disclosingParty?: string;
    receivingParty?: string;
    fileName: string;
    storagePath?: string;
    fileSize: number;
    pageCount: number;
  }
): Promise<SigningRequest> {
  const db = await loadDb();
  const newRecord: SigningRequest = {
    id: crypto.randomUUID(),
    userId,
    title: data.title,
    documentType: data.documentType,
    status: data.status,
    disclosingParty: data.disclosingParty,
    receivingParty: data.receivingParty,
    fileName: data.fileName,
    storagePath: data.storagePath,
    fileSize: data.fileSize,
    pageCount: data.pageCount,
    signedAt: data.status === 'signed' ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  db.signingRequests.push(newRecord);

  // Update user usage
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    if (!user.usage) {
      user.usage = {
        pdfProcessedCount: 0,
        videoProcessedCount: 0,
        aiCreditsUsed: 0,
        storageBytesUsed: 0,
        lastUsageReset: new Date().toISOString(),
      };
    }
    user.usage.pdfProcessedCount += 1;
    user.usage.storageBytesUsed += data.fileSize || 0;
  }

  pushActivity(db, {
    userId,
    category: 'tool',
    action: data.status === 'signed' ? 'PDF_SIGNED' : 'NDA_CREATED',
    details: `NDA document executed: ${data.title} (${data.documentType})`,
  });

  await saveDb(db);
  return newRecord;
}
export const createSigningRequest = withDbRetry(createSigningRequest__impl);

async function deleteSigningRequest__impl(userId: string, requestId: string): Promise<boolean> {
  const db = await loadDb();
  const index = db.signingRequests.findIndex((r) => r.id === requestId && r.userId === userId);
  if (index === -1) return false;
  db.signingRequests.splice(index, 1);
  await saveDb(db);
  return true;
}

// Activity Logging (Privacy Protected: no sensitive text, signatures, passwords or tokens)
export const deleteSigningRequest = withDbRetry(deleteSigningRequest__impl);

async function logActivity__impl(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
  const db = await loadDb();
  if (!db.activityLogs) db.activityLogs = [];

  const log: ActivityLog = {
    id: crypto.randomUUID(),
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Keep last 500 records
  db.activityLogs.unshift(log);
  if (db.activityLogs.length > 500) {
    db.activityLogs = db.activityLogs.slice(0, 500);
  }

  await saveDb(db);
  return log;
}
export const logActivity = withDbRetry(logActivity__impl);

export async function getActivityLogs(category?: string, search?: string): Promise<ActivityLog[]> {
  const db = await loadDb();
  let logs = db.activityLogs || [];
  if (category && category !== 'all') {
    logs = logs.filter((l) => l.category === category);
  }
  if (search && search.trim()) {
    const q = search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        (l.userEmail && l.userEmail.toLowerCase().includes(q))
    );
  }
  return logs;
}

// Append-only Admin Audit Logging
async function logAdminAction__impl(
  actorAdmin: string,
  targetUserId: string | undefined,
  targetEmail: string | undefined,
  action: string,
  reason: string,
  outcome: 'SUCCESS' | 'FAILED',
  details?: Record<string, unknown>
): Promise<AdminAuditLog> {
  const db = await loadDb();
  if (!db.adminAuditLogs) db.adminAuditLogs = [];

  const log: AdminAuditLog = {
    id: crypto.randomUUID(),
    actorAdmin,
    targetUserId,
    targetEmail,
    action,
    reason,
    outcome,
    details,
    timestamp: new Date().toISOString(),
  };

  db.adminAuditLogs.unshift(log);
  if (db.adminAuditLogs.length > 1000) {
    db.adminAuditLogs = db.adminAuditLogs.slice(0, 1000);
  }

  await saveDb(db);
  return log;
}
export const logAdminAction = withDbRetry(logAdminAction__impl);

export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  const db = await loadDb();
  return db.adminAuditLogs || [];
}

// Plans & Entitlements configuration
export async function getPlansConfig(): Promise<PlanConfig[]> {
  const db = await loadDb();
  return db.plans || DEFAULT_PLANS;
}

async function updatePlanConfigAdmin__impl(
  adminActor: string,
  planId: PlanTier,
  updates: Partial<PlanConfig>
): Promise<PlanConfig> {
  const db = await loadDb();
  if (!db.plans) db.plans = DEFAULT_PLANS;

  const idx = db.plans.findIndex((p) => p.id === planId);
  if (idx === -1) {
    throw new Error(`Plan tier '${planId}' not found.`);
  }

  db.plans[idx] = {
    ...db.plans[idx],
    ...updates,
    limits: {
      ...db.plans[idx].limits,
      ...(updates.limits || {}),
    },
  };

  pushAdminAction(db, 
    adminActor,
    undefined,
    undefined,
    'UPDATE_PLAN_CONFIG',
    `Updated pricing and limits for plan: ${planId}`,
    'SUCCESS',
    { planId, updates }
  );

  await saveDb(db);
  return db.plans[idx];
}

// Billing transactions
export const updatePlanConfigAdmin = withDbRetry(updatePlanConfigAdmin__impl);

export async function getBillingTransactions(): Promise<BillingTransaction[]> {
  const db = await loadDb();
  return db.billingTransactions || [];
}

async function recordBillingTransaction__impl(
  tx: Omit<BillingTransaction, 'id' | 'createdAt'>
): Promise<BillingTransaction> {
  const db = await loadDb();
  const newTx = pushBillingTransaction(db, tx);
  await saveDb(db);
  return newTx;
}

function pushBillingTransaction(db: DatabaseSchema, tx: Omit<BillingTransaction, 'id' | 'createdAt'>): BillingTransaction {
  const newTx: BillingTransaction = {
    id: `inv_${crypto.randomUUID().slice(0, 12)}`,
    ...tx,
    createdAt: new Date().toISOString(),
  };
  db.billingTransactions = [newTx, ...(db.billingTransactions || [])];
  return newTx;
}

// User Subscription Workflows (Upgrade, Downgrade, Cancel)
export const recordBillingTransaction = withDbRetry(recordBillingTransaction__impl);

async function changeUserSubscription__impl(
  userId: string,
  planId: PlanTier,
  interval: 'monthly' | 'yearly',
  provider: 'mock' | 'stripe' | 'paypal' = 'mock',
  details?: {
    subscriptionId?: string;
    customerId?: string;
    transactionRef?: string;
    receiptUrl?: string;
    paymentMethod?: string;
    fee?: number;
  }
): Promise<UserSubscription> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  const plans = db.plans || DEFAULT_PLANS;
  const plan = plans.find((p) => p.id === planId);
  if (!plan) throw new Error('Invalid plan selected.');

  if (user.email.toLowerCase() === 'demo@pdfkitfree.com' && planId !== 'free') {
    throw new Error('Demo account cannot be subscribed to paid tiers.');
  }

  const price = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const daysToAdd = interval === 'yearly' ? 365 : 30;

  user.subscription = {
    planId,
    status: 'active',
    billingInterval: interval,
    startDate: new Date().toISOString(),
    renewalDate: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    paymentProvider: provider,
    subscriptionId: details?.subscriptionId || `sub_${crypto.randomUUID().slice(0, 10)}`,
    customerId: details?.customerId || user.subscription?.customerId || `cus_${crypto.randomUUID().slice(0, 10)}`,
  };

  if (price > 0) {
    const fee = details?.fee ?? (provider === 'stripe' ? parseFloat((price * 0.029 + 0.3).toFixed(2)) : provider === 'paypal' ? parseFloat((price * 0.0349 + 0.49).toFixed(2)) : 0);
    const net = parseFloat((price - fee).toFixed(2));

    pushBillingTransaction(db, {
      userId: user.id,
      userEmail: user.email,
      planId,
      amount: price,
      fee,
      net,
      currency: 'USD',
      billingInterval: interval,
      status: 'paid',
      paymentMethod: details?.paymentMethod || (provider === 'paypal' ? 'PayPal Account / Express' : provider === 'stripe' ? 'Debit/Credit Card (Stripe)' : 'Credit Card (•••• 4242)'),
      provider,
      transactionRef: details?.transactionRef || `tx_${crypto.randomUUID().slice(0, 12)}`,
      receiptUrl: details?.receiptUrl,
    });
  }

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'billing',
    action: 'SUBSCRIPTION_CHANGED',
    details: `Subscription set to ${plan.name} (${interval}) via ${provider.toUpperCase()} - Price: $${price}`,
  });

  await saveDb(db);
  return user.subscription;
}
export const changeUserSubscription = withDbRetry(changeUserSubscription__impl);

export async function getTransactionsForUser(userId: string): Promise<BillingTransaction[]> {
  const db = await loadDb();
  if (!db.billingTransactions) return [];
  return db.billingTransactions.filter((t) => t.userId === userId);
}

async function refundBillingTransactionAdmin__impl(
  adminActor: string,
  txId: string,
  reason: string
): Promise<BillingTransaction> {
  const db = await loadDb();
  if (!db.billingTransactions) throw new Error('No transactions found.');

  const tx = db.billingTransactions.find((t) => t.id === txId);
  if (!tx) throw new Error(`Transaction ${txId} not found.`);

  tx.status = 'refunded';

  pushAdminAction(db, 
    adminActor,
    tx.userId,
    tx.userEmail,
    'REFUND_TRANSACTION',
    reason,
    'SUCCESS',
    { txId, amount: tx.amount }
  );

  await saveDb(db);
  return tx;
}
export const refundBillingTransactionAdmin = withDbRetry(refundBillingTransactionAdmin__impl);

async function cancelUserSubscription__impl(userId: string): Promise<UserSubscription> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  if (user.subscription) {
    user.subscription.cancelAtPeriodEnd = true;
    user.subscription.canceledAt = new Date().toISOString();
    user.subscription.status = 'canceled';
  }

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'billing',
    action: 'SUBSCRIPTION_CANCELED',
    details: 'User initiated subscription cancellation at period end',
  });

  await saveDb(db);
  return user.subscription;
}

// ==========================================================
// SUPER ADMIN QUERIES & MUTATIONS
// ==========================================================
export const cancelUserSubscription = withDbRetry(cancelUserSubscription__impl);

export async function getAllUsersAdmin(options?: {
  search?: string;
  role?: string;
  plan?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  users: ReturnType<typeof sanitizeUser>[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const db = await loadDb();
  let list = db.users.filter((u) => !u.isDeleted);

  if (options?.search) {
    const q = options.search.toLowerCase();
    list = list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
    );
  }

  if (options?.role && options.role !== 'all') {
    list = list.filter((u) => u.role === options.role);
  }

  if (options?.plan && options.plan !== 'all') {
    list = list.filter((u) => u.subscription?.planId === options.plan);
  }

  if (options?.status && options.status !== 'all') {
    list = list.filter((u) => u.accountStatus === options.status);
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = list.length;
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const startIndex = (page - 1) * limit;
  const paginated = list.slice(startIndex, startIndex + limit);

  return {
    users: paginated.map((u) => sanitizeUser(u)),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async function updateUserProfileAdmin__impl(
  adminActor: string,
  userId: string,
  updates: { name?: string; phone?: string }
): Promise<ReturnType<typeof sanitizeUser>> {
  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId && !u.isDeleted);
  if (!target) throw new Error('Target user not found.');

  if (updates.name) target.name = updates.name.trim();
  if (updates.phone !== undefined) target.phone = updates.phone.trim();

  pushAdminAction(db, 
    adminActor,
    target.id,
    target.email,
    'UPDATE_PROFILE',
    'Admin updated permissible user profile fields',
    'SUCCESS',
    updates
  );

  await saveDb(db);
  return sanitizeUser(target);
}
export const updateUserProfileAdmin = withDbRetry(updateUserProfileAdmin__impl);

async function adjustUserQuotaAdmin__impl(
  adminActor: string,
  userId: string,
  quotas: { maxFileSizeMb?: number; videoLimitMb?: number; aiCredits?: number },
  reason: string
): Promise<ReturnType<typeof sanitizeUser>> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A recorded reason (at least 5 characters) is strictly required to adjust quotas.');
  }

  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId && !u.isDeleted);
  if (!target) throw new Error('Target user not found.');

  target.customQuotas = {
    ...target.customQuotas,
    ...quotas,
    quotaAdjustReason: reason.trim(),
    quotaAdjustedAt: new Date().toISOString(),
    quotaAdjustedBy: adminActor,
  };

  pushAdminAction(db, 
    adminActor,
    target.id,
    target.email,
    'ADJUST_QUOTA',
    reason.trim(),
    'SUCCESS',
    quotas
  );

  await saveDb(db);
  return sanitizeUser(target);
}
export const adjustUserQuotaAdmin = withDbRetry(adjustUserQuotaAdmin__impl);

async function grantPromotionalAccessAdmin__impl(
  adminActor: string,
  userId: string,
  planId: PlanTier,
  durationMonths: number,
  reason: string
): Promise<ReturnType<typeof sanitizeUser>> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A documented reason is required to grant promotional access.');
  }

  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId && !u.isDeleted);
  if (!target) throw new Error('Target user not found.');

  if (target.email.toLowerCase() === 'demo@pdfkitfree.com' && planId !== 'free') {
    throw new Error('Demo account cannot be granted paid promotional access.');
  }

  const renewalDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

  target.subscription = {
    planId,
    status: 'active',
    billingInterval: 'monthly',
    startDate: new Date().toISOString(),
    renewalDate,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    paymentProvider: 'mock',
    subscriptionId: `promo_${crypto.randomUUID().slice(0, 8)}`,
    customerId: target.subscription?.customerId || `cus_${crypto.randomUUID().slice(0, 8)}`,
  };

  pushBillingTransaction(db, {
    userId: target.id,
    userEmail: target.email,
    planId,
    amount: 0,
    currency: 'USD',
    billingInterval: 'monthly',
    status: 'paid',
    paymentMethod: `Promotional Grant (${reason.trim()})`,
    provider: 'mock',
    transactionRef: `promo_${crypto.randomUUID().slice(0, 10)}`,
  });

  pushAdminAction(db, 
    adminActor,
    target.id,
    target.email,
    'GRANT_PROMOTIONAL_ACCESS',
    reason.trim(),
    'SUCCESS',
    { planId, durationMonths, renewalDate }
  );

  await saveDb(db);
  return sanitizeUser(target);
}
export const grantPromotionalAccessAdmin = withDbRetry(grantPromotionalAccessAdmin__impl);

async function setUserAccountStatusAdmin__impl(
  adminActor: string,
  userId: string,
  status: AccountStatus,
  reason: string
): Promise<ReturnType<typeof sanitizeUser>> {
  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) throw new Error('Target user not found.');

  if (isPrimaryAdmin(target)) {
    throw new Error('Primary Super Admin account status cannot be altered.');
  }

  target.accountStatus = status;
  if (status === 'suspended') {
    target.suspendedReason = reason;
  } else {
    target.suspendedReason = undefined;
  }

  pushAdminAction(db, 
    adminActor,
    target.id,
    target.email,
    status === 'suspended' ? 'SUSPEND_ACCOUNT' : 'REACTIVATE_ACCOUNT',
    reason,
    'SUCCESS',
    { status }
  );

  await saveDb(db);
  return sanitizeUser(target);
}
export const setUserAccountStatusAdmin = withDbRetry(setUserAccountStatusAdmin__impl);

async function softDeleteUserAdmin__impl(
  adminActor: string,
  userId: string,
  reason: string
): Promise<boolean> {
  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) throw new Error('User not found.');

  if (isPrimaryAdmin(target)) {
    throw new Error('Primary Super Admin account cannot be deleted.');
  }

  target.isDeleted = true;
  target.accountStatus = 'soft_deleted';

  pushAdminAction(db, 
    adminActor,
    target.id,
    target.email,
    'SOFT_DELETE_USER',
    reason,
    'SUCCESS'
  );

  await saveDb(db);
  return true;
}
export const softDeleteUserAdmin = withDbRetry(softDeleteUserAdmin__impl);

async function triggerPasswordResetAdmin__impl(
  adminActor: string,
  userId: string
): Promise<{ resetUrl: string; token: string }> {
  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId && !u.isDeleted);
  if (!target) throw new Error('User not found.');

  const token = crypto.randomBytes(32).toString('hex');
  target.resetToken = token;
  target.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  pushAdminAction(db, 
    adminActor,
    target.id,
    target.email,
    'TRIGGER_PASSWORD_RESET',
    'Admin dispatched password reset token link for user without viewing password',
    'SUCCESS'
  );

  await saveDb(db);

  return {
    token,
    resetUrl: `/reset-password?token=${token}`,
  };
}
export const triggerPasswordResetAdmin = withDbRetry(triggerPasswordResetAdmin__impl);

async function deleteUserAdmin__impl(userId: string): Promise<boolean> {
  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (target && isPrimaryAdmin(target)) {
    throw new Error('Primary Super Admin account cannot be deleted.');
  }

  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;

  db.users.splice(idx, 1);
  db.signingRequests = db.signingRequests.filter((r) => r.userId !== userId);
  await saveDb(db);
  return true;
}
export const deleteUserAdmin = withDbRetry(deleteUserAdmin__impl);

async function toggleUserVerificationAdmin__impl(userId: string): Promise<boolean> {
  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return false;

  target.emailVerified = !target.emailVerified;
  await saveDb(db);
  return true;
}
export const toggleUserVerificationAdmin = withDbRetry(toggleUserVerificationAdmin__impl);

async function updateUserRoleAdmin__impl(userId: string, role: 'superadmin' | 'user'): Promise<boolean> {
  const db = await loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return false;

  if (target.email.toLowerCase() === 'demo@pdfkitfree.com' && role === 'superadmin') {
    throw new Error('Demo account cannot be granted Super Administrator privileges.');
  }

  target.role = role;
  await saveDb(db);
  return true;
}
export const updateUserRoleAdmin = withDbRetry(updateUserRoleAdmin__impl);

export async function getAllSigningRequestsAdmin(): Promise<(SigningRequest & { userName?: string; userEmail?: string })[]> {
  const db = await loadDb();
  return db.signingRequests
    .map((req) => {
      const owner = db.users.find((u) => u.id === req.userId);
      return {
        ...req,
        userName: owner?.name || 'Unknown User',
        userEmail: owner?.email || 'N/A',
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function deleteSigningRequestAdmin__impl(requestId: string): Promise<boolean> {
  const db = await loadDb();
  const idx = db.signingRequests.findIndex((r) => r.id === requestId);
  if (idx === -1) return false;

  db.signingRequests.splice(idx, 1);
  await saveDb(db);
  return true;
}
export const deleteSigningRequestAdmin = withDbRetry(deleteSigningRequestAdmin__impl);

export async function getComprehensiveAdminStats() {
  const db = await loadDb();
  const activeUsers = db.users.filter((u) => !u.isDeleted);
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const totalUsers = activeUsers.length;
  const verifiedUsers = activeUsers.filter((u) => u.emailVerified).length;
  const activeStatusUsers = activeUsers.filter((u) => u.accountStatus === 'active').length;
  const suspendedUsers = activeUsers.filter((u) => u.accountStatus === 'suspended').length;

  const newToday = activeUsers.filter((u) => new Date(u.createdAt).getTime() >= oneDayAgo).length;
  const newThisWeek = activeUsers.filter((u) => new Date(u.createdAt).getTime() >= oneWeekAgo).length;
  const newThisMonth = activeUsers.filter((u) => new Date(u.createdAt).getTime() >= oneMonthAgo).length;

  // Plan subscriptions
  const subscribersByPlan = {
    free: activeUsers.filter((u) => !u.subscription || u.subscription.planId === 'free').length,
    pro: activeUsers.filter((u) => u.subscription?.planId === 'pro').length,
    business: activeUsers.filter((u) => u.subscription?.planId === 'business').length,
  };

  // Subscription status
  const subscribersByStatus = {
    active: activeUsers.filter((u) => u.subscription?.status === 'active').length,
    canceled: activeUsers.filter((u) => u.subscription?.status === 'canceled').length,
    expired: activeUsers.filter((u) => u.subscription?.status === 'expired').length,
    past_due: activeUsers.filter((u) => u.subscription?.status === 'past_due').length,
  };

  // Billing and Revenue metrics (from actual verified transactions)
  const transactions = db.billingTransactions || [];
  const paidTransactions = transactions.filter((t) => t.status === 'paid');
  const totalRevenue = paidTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Calculate MRR / ARR from verified active paid subscriptions
  const plans = db.plans || DEFAULT_PLANS;
  const proPlan = plans.find((p) => p.id === 'pro');
  const bizPlan = plans.find((p) => p.id === 'business');

  let mrr = 0;
  for (const u of activeUsers) {
    if (u.subscription && u.subscription.status === 'active') {
      if (u.subscription.planId === 'pro') {
        mrr += u.subscription.billingInterval === 'yearly' ? (proPlan?.yearlyPrice || 39.99) / 12 : (proPlan?.monthlyPrice || 4.99);
      } else if (u.subscription.planId === 'business') {
        mrr += u.subscription.billingInterval === 'yearly' ? (bizPlan?.yearlyPrice || 99) / 12 : (bizPlan?.monthlyPrice || 12);
      }
    }
  }
  const arr = mrr * 12;

  // Processing counts & failures
  const totalRequests = db.signingRequests.length;
  const signedRequests = db.signingRequests.filter((r) => r.status === 'signed').length;
  const totalBytesProcessed = db.signingRequests.reduce((acc, r) => acc + (r.fileSize || 0), 0);
  const totalVideoProcessed = activeUsers.reduce((acc, u) => acc + (u.usage?.videoProcessedCount || 0), 0);

  // Security events
  const securityLogs = (db.activityLogs || []).filter(
    (l) => l.category === 'security' || l.category === 'auth'
  ).slice(0, 10);

  // Geolocation aggregation (approximate only)
  const locationCounts: Record<string, number> = {};
  for (const u of activeUsers) {
    const loc = u.approxLocation?.country || 'Unknown / Not Disclosed';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  }
  const locationBreakdown = Object.entries(locationCounts).map(([country, count]) => ({ country, count }));

  return {
    totalUsers,
    verifiedUsers,
    activeStatusUsers,
    suspendedUsers,
    newToday,
    newThisWeek,
    newThisMonth,
    subscribersByPlan,
    subscribersByStatus,
    revenueMetrics: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      mrr: parseFloat(mrr.toFixed(2)),
      arr: parseFloat(arr.toFixed(2)),
      transactionCount: paidTransactions.length,
      stripeRevenue: parseFloat(paidTransactions.filter((t) => t.provider === 'stripe').reduce((acc, t) => acc + t.amount, 0).toFixed(2)),
      paypalRevenue: parseFloat(paidTransactions.filter((t) => t.provider === 'paypal').reduce((acc, t) => acc + t.amount, 0).toFixed(2)),
      sandboxRevenue: parseFloat(paidTransactions.filter((t) => t.provider === 'mock').reduce((acc, t) => acc + t.amount, 0).toFixed(2)),
      totalRefunded: parseFloat(transactions.filter((t) => t.status === 'refunded').reduce((acc, t) => acc + t.amount, 0).toFixed(2)),
      totalChargebacks: parseFloat(transactions.filter((t) => t.status === 'chargeback').reduce((acc, t) => acc + t.amount, 0).toFixed(2)),
      totalFees: parseFloat(transactions.reduce((acc, t) => acc + (t.fee || 0), 0).toFixed(2)),
      netRevenue: parseFloat((totalRevenue - transactions.reduce((acc, t) => acc + (t.fee || 0), 0) - transactions.filter((t) => t.status === 'refunded').reduce((acc, t) => acc + t.amount, 0)).toFixed(2)),
      subscribersByProvider: {
        stripe: activeUsers.filter((u) => u.subscription?.status === 'active' && u.subscription?.paymentProvider === 'stripe').length,
        paypal: activeUsers.filter((u) => u.subscription?.status === 'active' && u.subscription?.paymentProvider === 'paypal').length,
        sandbox: activeUsers.filter((u) => u.subscription?.status === 'active' && u.subscription?.paymentProvider === 'mock').length,
      },
    },
    processingMetrics: {
      totalPdfRequests: totalRequests,
      signedRequests,
      totalBytesProcessed,
      totalVideoProcessed,
      processingFailures: 0,
    },
    superAdminCount: activeUsers.filter((u) => u.role === 'superadmin').length,
    securityLogs,
    locationBreakdown,
    dbLastUpdated: new Date().toISOString(),
  };
}

export async function getPlatformStatsAdmin() {
  return getComprehensiveAdminStats();
}

export async function getPlatformSettingsAdmin(): Promise<PlatformSettings> {
  const db = await loadDb();
  return db.settings || DEFAULT_SETTINGS;
}

async function updatePlatformSettingsAdmin__impl(newSettings: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const db = await loadDb();
  db.settings = { ...(db.settings || DEFAULT_SETTINGS), ...newSettings };
  await saveDb(db);
  return db.settings;
}

// =========================================================================
// AI CONVERSATION & HISTORY METHODS
// =========================================================================
export const updatePlatformSettingsAdmin = withDbRetry(updatePlatformSettingsAdmin__impl);

export async function getAiConversationsByUser(userId: string): Promise<AiConversation[]> {
  const db = await loadDb();
  if (!db.aiConversations) return [];
  return db.aiConversations
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getAiConversationById(userId: string, conversationId: string): Promise<AiConversation | null> {
  const db = await loadDb();
  if (!db.aiConversations) return null;
  return db.aiConversations.find((c) => c.id === conversationId && c.userId === userId) || null;
}

async function saveAiConversation__impl(
  userId: string,
  data: {
    id?: string;
    title: string;
    fileName?: string;
    documentSummary?: string;
    messages: AiChatMessageRecord[];
  }
): Promise<AiConversation> {
  const db = await loadDb();
  if (!db.aiConversations) db.aiConversations = [];

  const existingIdx = data.id ? db.aiConversations.findIndex((c) => c.id === data.id && c.userId === userId) : -1;
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const existing = db.aiConversations[existingIdx];
    existing.title = data.title;
    existing.fileName = data.fileName ?? existing.fileName;
    existing.documentSummary = data.documentSummary ?? existing.documentSummary;
    existing.messages = data.messages;
    existing.updatedAt = now;
    await saveDb(db);
    return existing;
  } else {
    const newConv: AiConversation = {
      id: data.id || crypto.randomUUID(),
      userId,
      title: data.title,
      fileName: data.fileName,
      documentSummary: data.documentSummary,
      messages: data.messages,
      createdAt: now,
      updatedAt: now,
    };
    db.aiConversations.unshift(newConv);
    await saveDb(db);
    return newConv;
  }
}
export const saveAiConversation = withDbRetry(saveAiConversation__impl);

async function deleteAiConversation__impl(userId: string, conversationId: string): Promise<boolean> {
  const db = await loadDb();
  if (!db.aiConversations) return false;
  const initialLen = db.aiConversations.length;
  db.aiConversations = db.aiConversations.filter((c) => !(c.id === conversationId && c.userId === userId));
  const changed = db.aiConversations.length !== initialLen;
  if (changed) await saveDb(db);
  return changed;
}
export const deleteAiConversation = withDbRetry(deleteAiConversation__impl);

async function deleteAllAiConversationsForUser__impl(userId: string): Promise<number> {
  const db = await loadDb();
  if (!db.aiConversations) return 0;
  const count = db.aiConversations.filter((c) => c.userId === userId).length;
  db.aiConversations = db.aiConversations.filter((c) => c.userId !== userId);
  if (count > 0) await saveDb(db);
  return count;
}
export const deleteAllAiConversationsForUser = withDbRetry(deleteAllAiConversationsForUser__impl);

async function incrementUserAiCredits__impl(userId: string, count: number = 1): Promise<number> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return 0;
  if (!user.usage) {
    user.usage = {
      pdfProcessedCount: 0,
      videoProcessedCount: 0,
      aiCreditsUsed: 0,
      storageBytesUsed: 0,
      lastUsageReset: new Date().toISOString(),
    };
  }
  user.usage.aiCreditsUsed = (user.usage.aiCreditsUsed || 0) + count;
  await saveDb(db);
  return user.usage.aiCreditsUsed;
}

// =========================================================================
// PHONE OTP VERIFICATION METHODS
// =========================================================================
export const incrementUserAiCredits = withDbRetry(incrementUserAiCredits__impl);

async function setPhoneOtpForUser__impl(userId: string, phone: string, otpCode: string): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');

  // Hash OTP with SHA-256
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  user.phone = phone;
  user.phoneConfig = {
    number: phone,
    verified: false,
    otpHash,
    otpExpires: expires,
    attemptsCount: 0,
    lastSentAt: new Date().toISOString(),
  };

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PHONE_OTP_DISPATCHED',
    details: `SMS OTP token requested for phone ${phone.slice(0, 4)}***`,
  });

  await saveDb(db);
}
export const setPhoneOtpForUser = withDbRetry(setPhoneOtpForUser__impl);

async function verifyPhoneOtpForUser__impl(userId: string, inputCode: string): Promise<boolean> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !user.phoneConfig) return false;

  const cfg = user.phoneConfig;
  if (cfg.verified) return true;

  // Max 5 attempts
  if ((cfg.attemptsCount || 0) >= 5) {
    throw new Error('Too many failed OTP attempts. Please request a new code.');
  }

  // Check expiration
  if (!cfg.otpExpires || new Date(cfg.otpExpires).getTime() < Date.now()) {
    throw new Error('Verification code has expired. Please request a new code.');
  }

  const hash = crypto.createHash('sha256').update(inputCode.trim()).digest('hex');
  if (hash !== cfg.otpHash) {
    cfg.attemptsCount = (cfg.attemptsCount || 0) + 1;
    await saveDb(db);
    return false;
  }

  // Verified successfully
  cfg.verified = true;
  cfg.otpHash = undefined;
  cfg.otpExpires = undefined;
  cfg.attemptsCount = 0;

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PHONE_VERIFIED',
    details: 'User phone number verified successfully via SMS OTP',
  });

  await saveDb(db);
  return true;
}

// =========================================================================
// MFA CONFIGURATION METHODS
// =========================================================================
export const verifyPhoneOtpForUser = withDbRetry(verifyPhoneOtpForUser__impl);

async function setUserMfaSecret__impl(userId: string, secret: string, recoveryCodes: string[]): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');

  user.mfa = {
    enabled: false,
    secret,
    recoveryCodes,
  };
  await saveDb(db);
}
export const setUserMfaSecret = withDbRetry(setUserMfaSecret__impl);

async function enableUserMfa__impl(userId: string): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !user.mfa || !user.mfa.secret) throw new Error('MFA setup incomplete');

  user.mfa.enabled = true;
  user.mfa.verifiedAt = new Date().toISOString();

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'security',
    action: 'MFA_ENABLED',
    details: 'TOTP Multi-Factor Authentication successfully enabled on account',
  });

  await saveDb(db);
}
export const enableUserMfa = withDbRetry(enableUserMfa__impl);

async function disableUserMfa__impl(userId: string): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');

  user.mfa = {
    enabled: false,
    secret: undefined,
    recoveryCodes: [],
  };

  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'security',
    action: 'MFA_DISABLED',
    details: 'TOTP Multi-Factor Authentication disabled on account',
  });

  await saveDb(db);
}

// =========================================================================
// SESSION MANAGEMENT METHODS
// =========================================================================
export const disableUserMfa = withDbRetry(disableUserMfa__impl);

async function registerUserSession__impl(userId: string, token: string, ip?: string, userAgent?: string): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;

  if (!user.activeSessions) user.activeSessions = [];

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = new Date().toISOString();

  // Deduplicate by tokenHash or keep max 10
  const existingIdx = user.activeSessions.findIndex((s) => s.tokenHash === tokenHash);
  if (existingIdx >= 0) {
    user.activeSessions[existingIdx].lastActiveAt = now;
  } else {
    user.activeSessions.unshift({
      id: crypto.randomUUID(),
      tokenHash,
      ip,
      userAgent: userAgent ? userAgent.slice(0, 150) : undefined,
      createdAt: now,
      lastActiveAt: now,
    });
    if (user.activeSessions.length > 10) {
      user.activeSessions = user.activeSessions.slice(0, 10);
    }
  }

  await saveDb(db);
}
export const registerUserSession = withDbRetry(registerUserSession__impl);

async function revokeAllSessionsForUser__impl(userId: string): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;

  user.activeSessions = [];
  pushActivity(db, {
    userId: user.id,
    userEmail: user.email,
    category: 'security',
    action: 'ALL_SESSIONS_REVOKED',
    details: 'User revoked all active browser sessions',
  });
  await saveDb(db);
}
export const revokeAllSessionsForUser = withDbRetry(revokeAllSessionsForUser__impl);

async function revokeUserSessionById__impl(userId: string, sessionId: string): Promise<boolean> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !user.activeSessions) return false;

  const initialLen = user.activeSessions.length;
  user.activeSessions = user.activeSessions.filter((s) => s.id !== sessionId);
  const changed = user.activeSessions.length !== initialLen;
  if (changed) await saveDb(db);
  return changed;
}
export const revokeUserSessionById = withDbRetry(revokeUserSessionById__impl);

