import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import {
  getAllUsersAdmin,
  deleteUserAdmin,
  softDeleteUserAdmin,
  toggleUserVerificationAdmin,
  updateUserRoleAdmin,
  updateUserProfileAdmin,
  adjustUserQuotaAdmin,
  grantPromotionalAccessAdmin,
  setUserAccountStatusAdmin,
  triggerPasswordResetAdmin,
  PlanTier,
  AccountStatus,
} from '@/lib/server/auth-store';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const role = searchParams.get('role') || undefined;
  const plan = searchParams.get('plan') || undefined;
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const result = getAllUsersAdmin({ search, role, plan, status, page, limit });
  return NextResponse.json({ success: true, ...result });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    const mode = searchParams.get('mode') || 'soft';
    const reason = searchParams.get('reason') || 'Administrative cleanup';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (mode === 'soft') {
      softDeleteUserAdmin(session.user.name || 'habibullah', userId, reason);
      return NextResponse.json({ success: true, message: 'User soft-deleted.' });
    } else {
      deleteUserAdmin(userId);
      return NextResponse.json({ success: true, message: 'User permanently deleted.' });
    }
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to delete user.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, action, role, reason, name, phone, quotas, planId, durationMonths, accountStatus } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const adminActor = session.user.name || 'habibullah';

    switch (action) {
      case 'toggle-verification': {
        toggleUserVerificationAdmin(userId);
        return NextResponse.json({ success: true, message: 'Verification status toggled.' });
      }

      case 'update-role': {
        if (role === 'superadmin' || role === 'user') {
          updateUserRoleAdmin(userId, role);
          return NextResponse.json({ success: true, message: 'User role updated.' });
        }
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
      }

      case 'update-profile': {
        const updated = updateUserProfileAdmin(adminActor, userId, { name, phone });
        return NextResponse.json({ success: true, user: updated, message: 'Profile fields updated.' });
      }

      case 'adjust-quota': {
        if (!reason || reason.trim().length < 5) {
          return NextResponse.json(
            { error: 'A recorded reason (at least 5 characters) is required to adjust quotas.' },
            { status: 400 }
          );
        }
        const updated = adjustUserQuotaAdmin(adminActor, userId, quotas || {}, reason);
        return NextResponse.json({ success: true, user: updated, message: 'User quotas adjusted.' });
      }

      case 'grant-promotional': {
        if (!planId || !['free', 'pro', 'business'].includes(planId)) {
          return NextResponse.json({ error: 'Valid plan tier is required.' }, { status: 400 });
        }
        if (!reason || reason.trim().length < 5) {
          return NextResponse.json(
            { error: 'A documented reason is required to grant promotional access.' },
            { status: 400 }
          );
        }
        const updated = grantPromotionalAccessAdmin(
          adminActor,
          userId,
          planId as PlanTier,
          durationMonths || 1,
          reason
        );
        return NextResponse.json({ success: true, user: updated, message: 'Promotional access granted.' });
      }

      case 'set-status': {
        if (!accountStatus || !['active', 'suspended', 'soft_deleted'].includes(accountStatus)) {
          return NextResponse.json({ error: 'Valid account status required.' }, { status: 400 });
        }
        const updated = setUserAccountStatusAdmin(
          adminActor,
          userId,
          accountStatus as AccountStatus,
          reason || 'Status updated by super administrator'
        );
        return NextResponse.json({ success: true, user: updated, message: `Account status updated to ${accountStatus}.` });
      }

      case 'trigger-reset': {
        const result = triggerPasswordResetAdmin(adminActor, userId);
        return NextResponse.json({
          success: true,
          resetUrl: result.resetUrl,
          message: 'Password reset link generated securely for user.',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400 });
    }
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to update user.' }, { status: 500 });
  }
}
