import type { Metadata } from "next"
import Link from "next/link"
import { APP_CONFIG } from "@/lib/config"

export const metadata: Metadata = {
  title: `Privacy Policy · ${APP_CONFIG.APP_NAME}`,
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <h1 className="font-[Nunito] text-2xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 5 October 2026</p>
      <p>
        {APP_CONFIG.APP_NAME} stores the information you enter so you can plan your household budget. That
        includes your email, family name, household members, and budget figures.
      </p>
      <h2 className="font-[Nunito] text-lg font-semibold">Who can see your budget</h2>
      <p>
        You can see your own data when you are signed in. Authorised coaches and admins may also view your
        budget, including in-progress entries, for support and consultation. They do not need a separate
        in-app consent toggle; that access is part of the service.
      </p>
      <h2 className="font-[Nunito] text-lg font-semibold">How we store it</h2>
      <p>
        Account and budget data is stored with our hosting and database providers so the app can sync across
        your devices. We do not sell your information.
      </p>
      <h2 className="font-[Nunito] text-lg font-semibold">Contact</h2>
      <p>
        Privacy questions: use the contact details on{" "}
        <a href="https://www.mybalancedfamilyfinances.com.au" className="underline underline-offset-4">
          mybalancedfamilyfinances.com.au
        </a>
        .
      </p>
      <p>
        <Link href="/terms" className="underline underline-offset-4">
          Terms and Conditions
        </Link>
        {" · "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  )
}
