import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isNeonConfigured, executeNeonQuery } from './neon-db';

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

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'freepdfkit-db.json');

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

// Seed/Ensure Super Admin Habibullah exists
function seedSuperAdmin(db: DatabaseSchema) {
  const superAdminIdentifier = process.env.SUPERADMIN_EMAIL || 'habibullah';
  const superAdminPass = process.env.SUPERADMIN_PASSWORD || 'habib8963';

  let admin = db.users.find(
    (u) =>
      u.email.toLowerCase() === superAdminIdentifier.toLowerCase() ||
      u.email.toLowerCase() === 'habibullah' ||
      u.email.toLowerCase() === 'habibullah@pdfkitfree.com' ||
      u.id === 'superadmin-habibullah'
  );

  const { hash, salt } = hashPassword(superAdminPass);

  if (!admin) {
    admin = {
      id: 'superadmin-habibullah',
      name: 'Super Admin Habibullah',
      email: 'habibullah',
      role: 'superadmin',
      passwordHash: hash,
      salt: salt,
      emailVerified: true,
      verificationCode: '',
      verificationExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      resetToken: null,
      resetTokenExpires: null,
      createdAt: new Date().toISOString(),
      subscription: {
        planId: 'business',
        status: 'active',
        billingInterval: 'yearly',
        startDate: new Date().toISOString(),
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        paymentProvider: 'mock',
        subscriptionId: 'sub_admin_lifetime',
        customerId: 'cus_admin_root',
      },
      usage: {
        pdfProcessedCount: 42,
        videoProcessedCount: 8,
        aiCreditsUsed: 5,
        storageBytesUsed: 12450000,
        lastUsageReset: new Date().toISOString(),
      },
      accountStatus: 'active',
      approxLocation: {
        country: 'United States',
        city: 'New York',
        note: 'Approximate geolocation for security monitoring',
      },
      lastLoginAt: new Date().toISOString(),
    };
    db.users.unshift(admin);
  } else {
    admin.role = 'superadmin';
    admin.emailVerified = true;
    admin.passwordHash = hash;
    admin.salt = salt;
    if (!admin.subscription) {
      admin.subscription = {
        planId: 'business',
        status: 'active',
        billingInterval: 'yearly',
        startDate: admin.createdAt || new Date().toISOString(),
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        paymentProvider: 'mock',
        subscriptionId: 'sub_admin_lifetime',
        customerId: 'cus_admin_root',
      };
    }
  }
}

// Backfill existing users with subscription, usage, and status defaults
function migrateUsers(db: DatabaseSchema) {
  for (const u of db.users) {
    if (!u.subscription) {
      u.subscription = {
        planId: u.role === 'superadmin' ? 'business' : 'free',
        status: 'active',
        billingInterval: 'monthly',
        startDate: u.createdAt || new Date().toISOString(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        paymentProvider: 'mock',
        subscriptionId: null,
        customerId: null,
      };
    }
    if (!u.usage) {
      u.usage = {
        pdfProcessedCount: 0,
        videoProcessedCount: 0,
        aiCreditsUsed: 0,
        storageBytesUsed: 0,
        lastUsageReset: new Date().toISOString(),
      };
    }
    if (!u.accountStatus) {
      u.accountStatus = 'active';
    }
    if (!u.approxLocation) {
      u.approxLocation = {
        country: 'United States',
        note: 'Estimated from server request headers (Approximate only)',
      };
    }
    // Strict Demo Account Security: Enforce demo@pdfkitfree.com isolation
    if (u.email.toLowerCase() === 'demo@pdfkitfree.com') {
      u.role = 'user'; // NEVER allow demo account to possess superadmin role
      // In production or when ENABLE_DEMO_ACCOUNT is not explicitly 'true', disable the demo account
      const isDemoAllowed = process.env.ENABLE_DEMO_ACCOUNT === 'true';
      if (!isDemoAllowed) {
        u.accountStatus = 'suspended';
        u.suspendedReason = 'Demo account is disabled by default in production. Set ENABLE_DEMO_ACCOUNT=true in demo environment to enable.';
      } else if (u.suspendedReason?.includes('Demo account is disabled by default')) {
        u.accountStatus = 'active';
        u.suspendedReason = undefined;
      }

      // Restrict demo account to free plan or non-paying tier; never allow real/unrestricted subscription bypass
      if (u.subscription?.planId === 'business') {
        u.subscription.planId = 'free';
      }
    }
  }

  // Ensure demo@pdfkitfree.com is present in seed data if testing environment enables it, or safely disabled
  let demoUser = db.users.find((u) => u.email.toLowerCase() === 'demo@pdfkitfree.com');
  const isDemoAllowed = process.env.ENABLE_DEMO_ACCOUNT === 'true';

  if (!demoUser) {
    const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || 'habib8963';
    const { hash: demoHash, salt: demoSalt } = hashPassword(demoPassword);
    demoUser = {
      id: 'usr_demo_pdfkitfree',
      name: 'Demo Account (Restricted)',
      email: 'demo@pdfkitfree.com',
      role: 'user', // NEVER superadmin
      passwordHash: demoHash,
      salt: demoSalt,
      emailVerified: true,
      verificationCode: '',
      verificationExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      resetToken: null,
      resetTokenExpires: null,
      createdAt: new Date().toISOString(),
      subscription: {
        planId: 'free', // Strictly free tier
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
        pdfProcessedCount: 3,
        videoProcessedCount: 1,
        aiCreditsUsed: 0,
        storageBytesUsed: 500000,
        lastUsageReset: new Date().toISOString(),
      },
      accountStatus: isDemoAllowed ? 'active' : 'suspended',
      suspendedReason: isDemoAllowed
        ? undefined
        : 'Demo account is disabled by default in production. Set ENABLE_DEMO_ACCOUNT=true in demo environment to enable.',
      approxLocation: {
        country: 'United States',
        city: 'Demo Sandbox',
        note: 'Restricted demo sandbox environment',
      },
      lastLoginAt: new Date().toISOString(),
    };
    db.users.push(demoUser);
  } else {
    demoUser.role = 'user'; // NEVER superadmin
    if (!isDemoAllowed) {
      demoUser.accountStatus = 'suspended';
      demoUser.suspendedReason =
        'Demo account is disabled by default in production. Set ENABLE_DEMO_ACCOUNT=true in demo environment to enable.';
    } else if (demoUser.suspendedReason?.includes('Demo account is disabled by default')) {
      demoUser.accountStatus = 'active';
      demoUser.suspendedReason = undefined;
    }
    if (demoUser.subscription?.planId !== 'free') {
      demoUser.subscription.planId = 'free';
    }
  }

  if (!db.plans || db.plans.length === 0) {
    db.plans = DEFAULT_PLANS;
  }

  if (!db.billingTransactions) {
    db.billingTransactions = [];
  }

  if (!db.activityLogs) {
    db.activityLogs = [
      {
        id: crypto.randomUUID(),
        category: 'auth',
        action: 'USER_LOGIN',
        details: 'Alex Mercer signed in successfully from US-East gateway',
        ip: '198.51.100.24',
        approxLocation: 'United States (Approximate)',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        category: 'tool',
        action: 'PDF_SIGN_COMPLETED',
        details: 'NDA executed: Acme & Beta Mutual NDA (Client-side verified)',
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
    ];
  }

  if (!db.adminAuditLogs) {
    db.adminAuditLogs = [
      {
        id: crypto.randomUUID(),
        actorAdmin: 'habibullah',
        action: 'SYSTEM_STARTUP',
        reason: 'Platform initialization and security subsystem verification',
        outcome: 'SUCCESS',
        timestamp: new Date().toISOString(),
      },
    ];
  }

  if (!db.aiConversations) {
    db.aiConversations = [];
  }
}

function ensureDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialData: DatabaseSchema = {
        users: [],
        signingRequests: [],
        settings: DEFAULT_SETTINGS,
        plans: DEFAULT_PLANS,
        billingTransactions: [],
        activityLogs: [],
        adminAuditLogs: [],
      };
      seedSuperAdmin(initialData);
      migrateUsers(initialData);
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.settings) parsed.settings = DEFAULT_SETTINGS;
    seedSuperAdmin(parsed);
    migrateUsers(parsed);
    return parsed;
  } catch (err) {
    console.error('Database load error, fallback to memory:', err);
    const fallback: DatabaseSchema = {
      users: [],
      signingRequests: [],
      settings: DEFAULT_SETTINGS,
      plans: DEFAULT_PLANS,
      billingTransactions: [],
      activityLogs: [],
      adminAuditLogs: [],
    };
    seedSuperAdmin(fallback);
    migrateUsers(fallback);
    return fallback;
  }
}

function saveDb(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Database save error:', err);
  }

  // Non-blocking sync to Neon Lakebase Postgres when configured
  if (isNeonConfigured()) {
    Promise.resolve().then(async () => {
      try {
        // Sync latest user count or mutations
        const lastUser = data.users[data.users.length - 1];
        if (lastUser) {
          await executeNeonQuery(
            `INSERT INTO users (
              id, name, email, phone, role, password_hash, salt,
              email_verified, verification_code, verification_expires,
              account_status, subscription, usage, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              role = EXCLUDED.role,
              subscription = EXCLUDED.subscription,
              usage = EXCLUDED.usage,
              email_verified = EXCLUDED.email_verified,
              account_status = EXCLUDED.account_status;`,
            [
              lastUser.id,
              lastUser.name,
              lastUser.email,
              lastUser.phone || null,
              lastUser.role,
              lastUser.passwordHash,
              lastUser.salt,
              Boolean(lastUser.emailVerified),
              lastUser.verificationCode || '',
              lastUser.verificationExpires || null,
              lastUser.accountStatus || 'active',
              JSON.stringify(lastUser.subscription || {}),
              JSON.stringify(lastUser.usage || {}),
              lastUser.createdAt || new Date().toISOString(),
            ]
          );
        }
      } catch (err) {
        // Silent catch for non-blocking background sync
        console.warn('Neon background sync notification:', (err as Error).message);
      }
    });
  }
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
  const checkHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return checkHash === hash;
}

// Generate 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// User CRUD & queries
export function findUserByEmail(identifier: string): User | undefined {
  const db = ensureDb();
  const cleanId = identifier.trim().toLowerCase();

  return db.users.find(
    (u) =>
      !u.isDeleted &&
      (u.email.toLowerCase() === cleanId ||
        (cleanId === 'habibullah' && u.email === 'habibullah@pdfkitfree.com') ||
        (cleanId === 'habibullah@pdfkitfree.com' && u.email === 'habibullah'))
  );
}

export function findUserById(id: string): User | undefined {
  const db = ensureDb();
  return db.users.find((u) => u.id === id && !u.isDeleted);
}

export function createUser(name: string, email: string, password: string, phone?: string): User {
  const db = ensureDb();
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error('An account with this email or username already exists.');
  }

  const { hash, salt } = hashPassword(password);
  const code = generateVerificationCode();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const isSuper = email.trim().toLowerCase() === 'habibullah';

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

  logActivity({
    userId: newUser.id,
    userEmail: newUser.email,
    category: 'auth',
    action: 'USER_REGISTERED',
    details: `User registered with ${newUser.subscription.planId.toUpperCase()} tier`,
  });

  saveDb(db);
  return newUser;
}

export function recordUserLogin(userId: string, ip?: string, _userAgent?: string) {
  const db = ensureDb();
  const u = db.users.find((user) => user.id === userId);
  if (u) {
    u.lastLoginAt = new Date().toISOString();
    if (ip) u.lastLoginIp = ip;
    saveDb(db);

    logActivity({
      userId: u.id,
      userEmail: u.email,
      category: 'auth',
      action: 'USER_LOGIN',
      details: `Successful authentication from client IP: ${ip || 'internal'}`,
      ip,
    });
  }
}

export function verifyUserEmail(userId: string, code: string): boolean {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;

  if (user.verificationCode === code.trim()) {
    user.emailVerified = true;
    user.verificationCode = '';

    logActivity({
      userId: user.id,
      userEmail: user.email,
      category: 'auth',
      action: 'EMAIL_VERIFIED',
      details: 'User verified email address via verification code',
    });

    saveDb(db);
    return true;
  }
  return false;
}

export function createPasswordResetToken(email: string): { user: User; token: string } | null {
  const db = ensureDb();
  const user = findUserByEmail(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PASSWORD_RESET_REQUESTED',
    details: 'User requested password reset token',
  });

  saveDb(db);
  return { user, token };
}

export function resetUserPassword(token: string, newPassword: string): boolean {
  const db = ensureDb();
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

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PASSWORD_RESET_COMPLETED',
    details: 'Password was updated successfully with PBKDF2 hash',
  });

  saveDb(db);
  return true;
}

export function refreshVerificationCode(userId: string): string | null {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;

  const code = generateVerificationCode();
  user.verificationCode = code;
  user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  saveDb(db);
  return code;
}

// Safe user profile (never exposes passwords, salts, tokens, or raw payment details)
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
    devVerificationCode: !user.emailVerified ? user.verificationCode : undefined,
    mfaEnabled: user.mfa?.enabled || false,
    phoneVerified: user.phoneConfig?.verified || false,
    activeSessionsCount: user.activeSessions?.length || 1,
  };
}

// Signing Requests CRUD
export function getSigningRequestsByUserId(userId: string): SigningRequest[] {
  const db = ensureDb();
  return db.signingRequests
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createSigningRequest(
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
): SigningRequest {
  const db = ensureDb();
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

  logActivity({
    userId,
    category: 'tool',
    action: data.status === 'signed' ? 'PDF_SIGNED' : 'NDA_CREATED',
    details: `NDA document executed: ${data.title} (${data.documentType})`,
  });

  saveDb(db);
  return newRecord;
}

export function deleteSigningRequest(userId: string, requestId: string): boolean {
  const db = ensureDb();
  const index = db.signingRequests.findIndex((r) => r.id === requestId && r.userId === userId);
  if (index === -1) return false;
  db.signingRequests.splice(index, 1);
  saveDb(db);
  return true;
}

// Activity Logging (Privacy Protected: no sensitive text, signatures, passwords or tokens)
export function logActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
  const db = ensureDb();
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

  saveDb(db);
  return log;
}

export function getActivityLogs(category?: string, search?: string): ActivityLog[] {
  const db = ensureDb();
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
export function logAdminAction(
  actorAdmin: string,
  targetUserId: string | undefined,
  targetEmail: string | undefined,
  action: string,
  reason: string,
  outcome: 'SUCCESS' | 'FAILED',
  details?: Record<string, unknown>
): AdminAuditLog {
  const db = ensureDb();
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

  saveDb(db);
  return log;
}

export function getAdminAuditLogs(): AdminAuditLog[] {
  const db = ensureDb();
  return db.adminAuditLogs || [];
}

// Plans & Entitlements configuration
export function getPlansConfig(): PlanConfig[] {
  const db = ensureDb();
  return db.plans || DEFAULT_PLANS;
}

export function updatePlanConfigAdmin(
  adminActor: string,
  planId: PlanTier,
  updates: Partial<PlanConfig>
): PlanConfig {
  const db = ensureDb();
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

  logAdminAction(
    adminActor,
    undefined,
    undefined,
    'UPDATE_PLAN_CONFIG',
    `Updated pricing and limits for plan: ${planId}`,
    'SUCCESS',
    { planId, updates }
  );

  saveDb(db);
  return db.plans[idx];
}

// Billing transactions
export function getBillingTransactions(): BillingTransaction[] {
  const db = ensureDb();
  return db.billingTransactions || [];
}

export function recordBillingTransaction(
  tx: Omit<BillingTransaction, 'id' | 'createdAt'>
): BillingTransaction {
  const db = ensureDb();
  if (!db.billingTransactions) db.billingTransactions = [];

  const newTx: BillingTransaction = {
    id: `inv_${crypto.randomUUID().slice(0, 12)}`,
    ...tx,
    createdAt: new Date().toISOString(),
  };

  db.billingTransactions.unshift(newTx);
  saveDb(db);
  return newTx;
}

// User Subscription Workflows (Upgrade, Downgrade, Cancel)
export function changeUserSubscription(
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
): UserSubscription {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  const plans = getPlansConfig();
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

    recordBillingTransaction({
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

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'billing',
    action: 'SUBSCRIPTION_CHANGED',
    details: `Subscription set to ${plan.name} (${interval}) via ${provider.toUpperCase()} - Price: $${price}`,
  });

  saveDb(db);
  return user.subscription;
}

export function getTransactionsForUser(userId: string): BillingTransaction[] {
  const db = ensureDb();
  if (!db.billingTransactions) return [];
  return db.billingTransactions.filter((t) => t.userId === userId);
}

export function refundBillingTransactionAdmin(
  adminActor: string,
  txId: string,
  reason: string
): BillingTransaction {
  const db = ensureDb();
  if (!db.billingTransactions) throw new Error('No transactions found.');

  const tx = db.billingTransactions.find((t) => t.id === txId);
  if (!tx) throw new Error(`Transaction ${txId} not found.`);

  tx.status = 'refunded';

  logAdminAction(
    adminActor,
    tx.userId,
    tx.userEmail,
    'REFUND_TRANSACTION',
    reason,
    'SUCCESS',
    { txId, amount: tx.amount }
  );

  saveDb(db);
  return tx;
}

export function cancelUserSubscription(userId: string): UserSubscription {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  if (user.subscription) {
    user.subscription.cancelAtPeriodEnd = true;
    user.subscription.canceledAt = new Date().toISOString();
    user.subscription.status = 'canceled';
  }

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'billing',
    action: 'SUBSCRIPTION_CANCELED',
    details: 'User initiated subscription cancellation at period end',
  });

  saveDb(db);
  return user.subscription;
}

// ==========================================================
// SUPER ADMIN QUERIES & MUTATIONS
// ==========================================================

export function getAllUsersAdmin(options?: {
  search?: string;
  role?: string;
  plan?: string;
  status?: string;
  page?: number;
  limit?: number;
}): {
  users: ReturnType<typeof sanitizeUser>[];
  total: number;
  page: number;
  totalPages: number;
} {
  const db = ensureDb();
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

export function updateUserProfileAdmin(
  adminActor: string,
  userId: string,
  updates: { name?: string; phone?: string }
): ReturnType<typeof sanitizeUser> {
  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId && !u.isDeleted);
  if (!target) throw new Error('Target user not found.');

  if (updates.name) target.name = updates.name.trim();
  if (updates.phone !== undefined) target.phone = updates.phone.trim();

  logAdminAction(
    adminActor,
    target.id,
    target.email,
    'UPDATE_PROFILE',
    'Admin updated permissible user profile fields',
    'SUCCESS',
    updates
  );

  saveDb(db);
  return sanitizeUser(target);
}

export function adjustUserQuotaAdmin(
  adminActor: string,
  userId: string,
  quotas: { maxFileSizeMb?: number; videoLimitMb?: number; aiCredits?: number },
  reason: string
): ReturnType<typeof sanitizeUser> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A recorded reason (at least 5 characters) is strictly required to adjust quotas.');
  }

  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId && !u.isDeleted);
  if (!target) throw new Error('Target user not found.');

  target.customQuotas = {
    ...target.customQuotas,
    ...quotas,
    quotaAdjustReason: reason.trim(),
    quotaAdjustedAt: new Date().toISOString(),
    quotaAdjustedBy: adminActor,
  };

  logAdminAction(
    adminActor,
    target.id,
    target.email,
    'ADJUST_QUOTA',
    reason.trim(),
    'SUCCESS',
    quotas
  );

  saveDb(db);
  return sanitizeUser(target);
}

export function grantPromotionalAccessAdmin(
  adminActor: string,
  userId: string,
  planId: PlanTier,
  durationMonths: number,
  reason: string
): ReturnType<typeof sanitizeUser> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A documented reason is required to grant promotional access.');
  }

  const db = ensureDb();
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

  recordBillingTransaction({
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

  logAdminAction(
    adminActor,
    target.id,
    target.email,
    'GRANT_PROMOTIONAL_ACCESS',
    reason.trim(),
    'SUCCESS',
    { planId, durationMonths, renewalDate }
  );

  saveDb(db);
  return sanitizeUser(target);
}

export function setUserAccountStatusAdmin(
  adminActor: string,
  userId: string,
  status: AccountStatus,
  reason: string
): ReturnType<typeof sanitizeUser> {
  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) throw new Error('Target user not found.');

  if (target.email === 'habibullah') {
    throw new Error('Primary Super Admin account status cannot be altered.');
  }

  target.accountStatus = status;
  if (status === 'suspended') {
    target.suspendedReason = reason;
  } else {
    target.suspendedReason = undefined;
  }

  logAdminAction(
    adminActor,
    target.id,
    target.email,
    status === 'suspended' ? 'SUSPEND_ACCOUNT' : 'REACTIVATE_ACCOUNT',
    reason,
    'SUCCESS',
    { status }
  );

  saveDb(db);
  return sanitizeUser(target);
}

export function softDeleteUserAdmin(
  adminActor: string,
  userId: string,
  reason: string
): boolean {
  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) throw new Error('User not found.');

  if (target.email === 'habibullah') {
    throw new Error('Primary Super Admin account cannot be deleted.');
  }

  target.isDeleted = true;
  target.accountStatus = 'soft_deleted';

  logAdminAction(
    adminActor,
    target.id,
    target.email,
    'SOFT_DELETE_USER',
    reason,
    'SUCCESS'
  );

  saveDb(db);
  return true;
}

export function triggerPasswordResetAdmin(
  adminActor: string,
  userId: string
): { resetUrl: string; token: string } {
  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId && !u.isDeleted);
  if (!target) throw new Error('User not found.');

  const token = crypto.randomBytes(32).toString('hex');
  target.resetToken = token;
  target.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  logAdminAction(
    adminActor,
    target.id,
    target.email,
    'TRIGGER_PASSWORD_RESET',
    'Admin dispatched password reset token link for user without viewing password',
    'SUCCESS'
  );

  saveDb(db);

  return {
    token,
    resetUrl: `/reset-password?token=${token}`,
  };
}

export function deleteUserAdmin(userId: string): boolean {
  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId);
  if (target && target.email === 'habibullah') {
    throw new Error('Primary Super Admin account cannot be deleted.');
  }

  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;

  db.users.splice(idx, 1);
  db.signingRequests = db.signingRequests.filter((r) => r.userId !== userId);
  saveDb(db);
  return true;
}

export function toggleUserVerificationAdmin(userId: string): boolean {
  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return false;

  target.emailVerified = !target.emailVerified;
  saveDb(db);
  return true;
}

export function updateUserRoleAdmin(userId: string, role: 'superadmin' | 'user'): boolean {
  const db = ensureDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return false;

  if (target.email.toLowerCase() === 'demo@pdfkitfree.com' && role === 'superadmin') {
    throw new Error('Demo account cannot be granted Super Administrator privileges.');
  }

  target.role = role;
  saveDb(db);
  return true;
}

export function getAllSigningRequestsAdmin(): (SigningRequest & { userName?: string; userEmail?: string })[] {
  const db = ensureDb();
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

export function deleteSigningRequestAdmin(requestId: string): boolean {
  const db = ensureDb();
  const idx = db.signingRequests.findIndex((r) => r.id === requestId);
  if (idx === -1) return false;

  db.signingRequests.splice(idx, 1);
  saveDb(db);
  return true;
}

export function getComprehensiveAdminStats() {
  const db = ensureDb();
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
  const plans = getPlansConfig();
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

export function getPlatformStatsAdmin() {
  return getComprehensiveAdminStats();
}

export function getPlatformSettingsAdmin(): PlatformSettings {
  const db = ensureDb();
  return db.settings || DEFAULT_SETTINGS;
}

export function updatePlatformSettingsAdmin(newSettings: Partial<PlatformSettings>): PlatformSettings {
  const db = ensureDb();
  db.settings = { ...(db.settings || DEFAULT_SETTINGS), ...newSettings };
  saveDb(db);
  return db.settings;
}

// =========================================================================
// AI CONVERSATION & HISTORY METHODS
// =========================================================================

export function getAiConversationsByUser(userId: string): AiConversation[] {
  const db = ensureDb();
  if (!db.aiConversations) return [];
  return db.aiConversations
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getAiConversationById(userId: string, conversationId: string): AiConversation | null {
  const db = ensureDb();
  if (!db.aiConversations) return null;
  return db.aiConversations.find((c) => c.id === conversationId && c.userId === userId) || null;
}

export function saveAiConversation(
  userId: string,
  data: {
    id?: string;
    title: string;
    fileName?: string;
    documentSummary?: string;
    messages: AiChatMessageRecord[];
  }
): AiConversation {
  const db = ensureDb();
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
    saveDb(db);
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
    saveDb(db);
    return newConv;
  }
}

export function deleteAiConversation(userId: string, conversationId: string): boolean {
  const db = ensureDb();
  if (!db.aiConversations) return false;
  const initialLen = db.aiConversations.length;
  db.aiConversations = db.aiConversations.filter((c) => !(c.id === conversationId && c.userId === userId));
  const changed = db.aiConversations.length !== initialLen;
  if (changed) saveDb(db);
  return changed;
}

export function deleteAllAiConversationsForUser(userId: string): number {
  const db = ensureDb();
  if (!db.aiConversations) return 0;
  const count = db.aiConversations.filter((c) => c.userId === userId).length;
  db.aiConversations = db.aiConversations.filter((c) => c.userId !== userId);
  if (count > 0) saveDb(db);
  return count;
}

export function incrementUserAiCredits(userId: string, count: number = 1): number {
  const db = ensureDb();
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
  saveDb(db);
  return user.usage.aiCreditsUsed;
}

// =========================================================================
// PHONE OTP VERIFICATION METHODS
// =========================================================================

export function setPhoneOtpForUser(userId: string, phone: string, otpCode: string): void {
  const db = ensureDb();
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

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PHONE_OTP_DISPATCHED',
    details: `SMS OTP token requested for phone ${phone.slice(0, 4)}***`,
  });

  saveDb(db);
}

export function verifyPhoneOtpForUser(userId: string, inputCode: string): boolean {
  const db = ensureDb();
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
    saveDb(db);
    return false;
  }

  // Verified successfully
  cfg.verified = true;
  cfg.otpHash = undefined;
  cfg.otpExpires = undefined;
  cfg.attemptsCount = 0;

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'auth',
    action: 'PHONE_VERIFIED',
    details: 'User phone number verified successfully via SMS OTP',
  });

  saveDb(db);
  return true;
}

// =========================================================================
// MFA CONFIGURATION METHODS
// =========================================================================

export function setUserMfaSecret(userId: string, secret: string, recoveryCodes: string[]): void {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');

  user.mfa = {
    enabled: false,
    secret,
    recoveryCodes,
  };
  saveDb(db);
}

export function enableUserMfa(userId: string): void {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !user.mfa || !user.mfa.secret) throw new Error('MFA setup incomplete');

  user.mfa.enabled = true;
  user.mfa.verifiedAt = new Date().toISOString();

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'security',
    action: 'MFA_ENABLED',
    details: 'TOTP Multi-Factor Authentication successfully enabled on account',
  });

  saveDb(db);
}

export function disableUserMfa(userId: string): void {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');

  user.mfa = {
    enabled: false,
    secret: undefined,
    recoveryCodes: [],
  };

  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'security',
    action: 'MFA_DISABLED',
    details: 'TOTP Multi-Factor Authentication disabled on account',
  });

  saveDb(db);
}

// =========================================================================
// SESSION MANAGEMENT METHODS
// =========================================================================

export function registerUserSession(userId: string, token: string, ip?: string, userAgent?: string): void {
  const db = ensureDb();
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

  saveDb(db);
}

export function revokeAllSessionsForUser(userId: string): void {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;

  user.activeSessions = [];
  logActivity({
    userId: user.id,
    userEmail: user.email,
    category: 'security',
    action: 'ALL_SESSIONS_REVOKED',
    details: 'User revoked all active browser sessions',
  });
  saveDb(db);
}

export function revokeUserSessionById(userId: string, sessionId: string): boolean {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !user.activeSessions) return false;

  const initialLen = user.activeSessions.length;
  user.activeSessions = user.activeSessions.filter((s) => s.id !== sessionId);
  const changed = user.activeSessions.length !== initialLen;
  if (changed) saveDb(db);
  return changed;
}

