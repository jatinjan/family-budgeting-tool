import {
  RouteError,
  appUrl,
  getServiceClient,
  requireAdmin,
  routeErrorResponse,
} from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RESEND_COOLDOWN_MS = 60_000

/** Sends (or resends) the "set your password" email to a coach-created family. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await requireAdmin(request)
    const { id: familyId } = await params
    const service = getServiceClient()

    const { data: profile } = await service
      .from('profiles')
      .select('id, email, family_name, claimed_at, created_by_coach_id')
      .eq('id', familyId)
      .maybeSingle()
    if (!profile) throw new RouteError(404, 'Family not found.')
    if (!profile.created_by_coach_id) {
      throw new RouteError(409, 'This family created their own account.')
    }
    if (profile.claimed_at) {
      throw new RouteError(409, 'This family has already signed in.')
    }

    const since = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString()
    const { count } = await service
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', familyId)
      .eq('event_type', 'coach_invite_sent')
      .gte('created_at', since)
    if ((count ?? 0) > 0) {
      throw new RouteError(429, 'An invite was just sent. Wait a minute before resending.')
    }

    const { error: mailError } = await service.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${appUrl(request)}/auth/set-password`,
    })
    if (mailError) {
      throw new RouteError(
        502,
        /rate/i.test(mailError.message)
          ? 'The email service is rate-limited. Try again later or set up custom SMTP.'
          : 'Could not send the invite email.',
      )
    }

    await service.from('activity_log').insert({
      user_id: familyId,
      family_name: profile.family_name || profile.email,
      event_type: 'coach_invite_sent',
      message: `Invite sent to ${profile.email}`,
      metadata: { actor_id: caller.userId },
    })

    return Response.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error)
  }
}
