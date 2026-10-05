import {
  RouteError,
  getServiceClient,
  requireAdmin,
  routeErrorResponse,
} from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Coach creates a family login with a temporary password so she can sign in as
 * them for the first consult. No email is sent. No setup lease is started.
 * Spec: docs/specs/coach-editing.md §2.1
 */
export async function POST(request: Request) {
  try {
    const caller = await requireAdmin(request)
    const body = (await request.json().catch(() => null)) as
      | { family_name?: unknown; email?: unknown; password?: unknown }
      | null
    const familyName = String(body?.family_name ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')

    if (!familyName || familyName.length > 80) {
      throw new RouteError(400, 'Enter a family name (up to 80 characters).')
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new RouteError(400, 'Enter a valid email address.')
    }
    if (password.length < 8) {
      throw new RouteError(400, 'Password must be at least 8 characters.')
    }
    if (password.length > 128) {
      throw new RouteError(400, 'Password is too long.')
    }

    const service = getServiceClient()
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { family_name: familyName },
    })
    if (createError || !created.user) {
      const exists =
        createError?.status === 422 ||
        /already|exists|registered/i.test(createError?.message || '')
      throw new RouteError(
        exists ? 409 : 500,
        exists ? 'That email already has an account.' : 'Could not create the family login.',
      )
    }

    const familyId = created.user.id
    const rollback = async () => {
      await service.auth.admin.deleteUser(familyId).catch(() => undefined)
    }

    const { error: profileError } = await service.from('profiles').upsert({
      id: familyId,
      email,
      family_name: familyName,
      promo_code_used: null,
      created_by_coach_id: caller.userId,
      claimed_at: null,
    })
    if (profileError) {
      await rollback()
      throw new RouteError(500, 'Could not prepare the family profile.')
    }

    await service.from('activity_log').insert({
      user_id: familyId,
      family_name: familyName,
      event_type: 'coach_family_created',
      message: `${familyName} was created by a coach`,
      metadata: { actor_id: caller.userId },
    })

    return Response.json({ user_id: familyId }, { status: 201 })
  } catch (error) {
    return routeErrorResponse(error)
  }
}
