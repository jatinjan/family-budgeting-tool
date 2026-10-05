import type { Metadata } from "next"
import Link from "next/link"
import { APP_CONFIG } from "@/lib/config"

export const metadata: Metadata = {
  title: `Terms of Service · ${APP_CONFIG.APP_NAME}`,
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <h1 className="font-[Nunito] text-2xl font-bold">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: 5 October 2026</p>
      <p>
        These terms cover use of {APP_CONFIG.APP_NAME}, a family budgeting tool for households in{" "}
        {APP_CONFIG.LOCATION}.
      </p>
      <h2 className="font-[Nunito] text-lg font-semibold">Your account</h2>
      <p>
        You must keep your sign-in details private. If a coach created your login, they may share a temporary
        password with you for the first consult. After you set your own password, that temporary password no
        longer works.
      </p>
      <h2 className="font-[Nunito] text-lg font-semibold">Coach access</h2>
      <p>
        Authorised coaches and admins may view your budget, including in-progress entries, for support and
        consultation. That access is part of the service and cannot be turned off in the app. A coach only
        writes to your budget when you have not yet set your own password (setup) or after you accept a help
        request on your device (assist).
      </p>
      <h2 className="font-[Nunito] text-lg font-semibold">Acceptable use</h2>
      <p>
        Use the app for your household&apos;s budgeting. Do not try to access another family&apos;s data or
        interfere with the service.
      </p>
      <h2 className="font-[Nunito] text-lg font-semibold">Contact</h2>
      <p>
        Questions about these terms: use the contact details on{" "}
        <a href="https://www.mybalancedfamilyfinances.com.au" className="underline underline-offset-4">
          mybalancedfamilyfinances.com.au
        </a>
        .
      </p>
      <p>
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  )
}
