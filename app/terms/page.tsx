import type { Metadata } from "next"
import Link from "next/link"
import { APP_CONFIG } from "@/lib/config"

export const metadata: Metadata = {
  title: `App Terms and Conditions · ${APP_CONFIG.APP_NAME}`,
}

function Clause({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-medium">{n} </span>
      {children}
    </p>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-[Nunito] text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-[15px] leading-7 text-foreground">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          My Balanced Family Finances
        </p>
        <h1 className="font-[Nunito] text-3xl font-bold">App Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground">Effective date: October 2026 · Version 1.0</p>
      </header>

      <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
        <h2 className="font-[Nunito] text-lg font-semibold">Important</h2>
        <p>
          These terms govern registration for and use of the MyBFF web and mobile application. The app is a
          household planning, forecasting and coaching-support tool. It does not provide personal financial
          advice and does not guarantee savings or achievement of your goals.
        </p>
      </div>

      <Section title="1. Agreement and related documents">
        <Clause n="1.1">
          These App Terms and Conditions (App Terms) form a binding agreement between you and MyBFF when you
          register for, access or use the My Balanced Family Finances application, including any web app,
          progressive web app, mobile app, dashboard, planning sheet, calculator, family profile or related
          feature (App).
        </Clause>
        <Clause n="1.2">
          By selecting “I agree”, creating an account, redeeming an access code or continuing to use the App
          after being presented with these App Terms, you confirm that you have read and accepted them.
        </Clause>
        <Clause n="1.3">
          These App Terms incorporate the{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          , any plan or offer description shown before purchase, and any specific beta or promotional terms
          accepted by you. Coaching is governed by a separate Coaching Services Agreement.
        </Clause>
        <Clause n="1.4">
          If documents conflict, the following priority applies: mandatory law; specific written offer or order
          details; these App Terms; Website Terms; then general promotional material.
        </Clause>
      </Section>

      <Section title="2. Provider and contact details">
        <Clause n="2.1">
          My Balanced Family Finances and MyBFF are trading names used by My Balanced Family Finances ABN 36 638
          505 950 (MyBFF, we, us or our).
        </Clause>
        <Clause n="2.2">
          General support:{" "}
          <a href="mailto:hello@mybalancedff.com.au" className="underline underline-offset-4">
            hello@mybalancedff.com.au
          </a>
          . Privacy and complaints:{" "}
          <a href="mailto:hello@mybalancedff.com.au" className="underline underline-offset-4">
            hello@mybalancedff.com.au
          </a>
          .
        </Clause>
        <Clause n="2.3">
          App URL and authorised distribution channels:{" "}
          <a href="https://mybalancedfamilyfinances.com/" className="underline underline-offset-4">
            https://mybalancedfamilyfinances.com/
          </a>
          .
        </Clause>
      </Section>

      <Section title="3. Eligibility and household authority">
        <Clause n="3.1">
          You must be at least 18 years old and legally capable of entering a contract to hold an account.
        </Clause>
        <Clause n="3.2">
          If you create a household profile or enter information about a partner, child, dependant or other
          household member, you confirm that you are authorised to do so and that collection and use through
          the App is appropriate. You must not use the App to monitor, control or expose another person’s
          finances without lawful authority and their knowledge where required.
        </Clause>
        <Clause n="3.3">
          Children must not create accounts or independently use the App. A parent or legal guardian controls
          any information about a child and remains responsible for its accuracy, appropriateness and access.
        </Clause>
        <Clause n="3.4">
          Where more than one adult uses a household, each adult should have their own authorised access. The
          primary account holder is responsible for invitations, permissions and removing access when
          relationships or household arrangements change.
        </Clause>
      </Section>

      <Section title="4. Purpose and scope of the App">
        <Clause n="4.1">
          The App helps users organise estimated and known household expenses, view spending by adult, child or
          household, distinguish needs and wants, explore “what if” adjustments, forecast upcoming costs and
          connect possible adjustments to self-selected goals.
        </Clause>
        <Clause n="4.2">
          The App may calculate annualised amounts, averages, scenario totals and indicative savings based on
          information and assumptions supplied by users.
        </Clause>
        <Clause n="4.3">
          The App is a decision-support and coaching aid. It is not an accounting ledger, bank account, payment
          service, credit provider, financial product comparison service or substitute for professional advice.
        </Clause>
        <Clause n="4.4">
          Unless expressly introduced later with separate terms, the App does not execute transactions, move
          money, access bank login credentials, lodge tax returns or implement financial decisions for you.
        </Clause>
      </Section>

      <Section title="5. Financial coaching and advice boundary">
        <Clause n="5.1">
          App prompts, labels, dashboards, calculations, educational material, scenarios and automated outputs
          are general information and tools only. They do not take into account all of your objectives,
          financial situation or needs.
        </Clause>
        <Clause n="5.2">
          MyBFF does not, through the App, recommend that you acquire, dispose of, vary or retain a particular
          financial product, credit product, insurance policy, investment, superannuation interest or payment
          arrangement.
        </Clause>
        <Clause n="5.3">
          The App does not provide financial product advice, personal financial advice, credit assistance,
          investment advice, taxation advice, legal advice or accounting advice.
        </Clause>
        <Clause n="5.4">
          You should independently verify important information and obtain advice from an appropriately
          qualified and, where required, licensed professional before making a material financial decision.
        </Clause>
        <Clause n="5.5">
          We may restrict a feature or decline to respond where a request may cross the boundary from education
          or coaching into regulated advice.
        </Clause>
      </Section>

      <Section title="6. Accounts and security">
        <Clause n="6.1">
          You must provide accurate registration information and keep it current. You must maintain a secure
          password, use available authentication controls and keep codes and credentials confidential.
        </Clause>
        <Clause n="6.2">
          You must not share your password with a coach, support person or household member. Use only the
          permissions made available within the App.
        </Clause>
        <Clause n="6.3">
          You are responsible for activity performed through your credentials unless caused by our breach of
          law or failure to take reasonable care. Notify us promptly of suspected unauthorised access or
          compromised credentials.
        </Clause>
        <Clause n="6.4">
          We may require identity or authority verification before changing account ownership, granting access,
          exporting data or responding to a sensitive request.
        </Clause>
        <Clause n="6.5">
          We may suspend access while investigating a suspected security incident, misuse or competing claims
          to a household account.
        </Clause>
      </Section>

      <Section title="7. Information you enter">
        <Clause n="7.1">
          You decide what information to enter, subject to required fields. Information may include names or
          labels for household members, ages or relationships, goals, income assumptions, known expenses,
          estimated expenses, spending categories, notes and planned adjustments.
        </Clause>
        <Clause n="7.2">
          You must not enter passwords, online banking credentials, tax file numbers, full payment card
          details, government identifiers or information that is unnecessary for the App’s stated purpose.
        </Clause>
        <Clause n="7.3">
          You are responsible for the accuracy, completeness, currency and lawfulness of information you
          enter. Estimates should be reviewed and updated as circumstances change.
        </Clause>
        <Clause n="7.4">
          If information concerns another person, you must have authority to provide it and must respect that
          person’s privacy. Family relationship, separation or parenting disputes must be resolved outside the
          App.
        </Clause>
        <Clause n="7.5">
          We may remove content that is unlawful, harmful, irrelevant, technically unsafe or infringes another
          person’s rights.
        </Clause>
      </Section>

      <Section title="8. App outputs, estimates and user decisions">
        <Clause n="8.1">
          Outputs depend on user inputs, selected periods, assumptions, rounding, categorisation and software
          rules. An output may not reflect taxation, inflation, interest, eligibility rules, contractual
          commitments, emergencies or future price changes unless expressly included.
        </Clause>
        <Clause n="8.2">
          A projected saving is the mathematical difference between scenarios, not money already saved and not
          a promise that the change can or will be implemented.
        </Clause>
        <Clause n="8.3">
          Needs-versus-wants classifications are reflective prompts. MyBFF does not decide what is essential
          for your family.
        </Clause>
        <Clause n="8.4">
          You must review outputs for obvious errors, check assumptions and decide whether an action is
          suitable. You remain responsible for every financial and household decision.
        </Clause>
        <Clause n="8.5">
          No outcome is guaranteed. Failure to achieve a goal does not by itself establish that the App is
          defective or that MyBFF failed to provide the service.
        </Clause>
      </Section>

      <Section title="9. Coach and administrator access">
        <Clause n="9.1">
          MyBFF personnel and authorised service providers may have technical or administrative capability to
          access accounts where reasonably necessary to operate, secure, maintain, troubleshoot, investigate
          misuse, comply with law or respond to a request. Access is role-based, limited to purpose and
          handled under applicable privacy and security obligations.
        </Clause>
        <Clause n="9.2">Administrative capability does not mean that a coach routinely reviews your data.</Clause>
        <Clause n="9.3">
          If you select an app-and-coaching option or activate “Need coaching”, you authorise the nominated
          coach to view and, where the feature permits, enter or amend information for the coaching purpose
          described to you.
        </Clause>
        <Clause n="9.4">
          You may withdraw optional coaching access using the available control or by contacting us. Withdrawal
          stops future coaching access within a reasonable implementation period but does not undo access
          already lawfully provided or records we must retain.
        </Clause>
        <Clause n="9.5">
          A coach must not request your password. Coach-entered data should be reviewed by you. You remain
          responsible for confirming its accuracy and for all implementation decisions.
        </Clause>
        <Clause n="9.6">
          MyBFF may preserve limited access logs and records of consent, changes and support activity for
          security, accountability, dispute management and legal compliance.
        </Clause>
      </Section>

      <Section title="10. Family sharing and access changes">
        <Clause n="10.1">
          Sharing features can expose household information to authorised users. Before inviting another
          person, consider whether all visible information is appropriate to share.
        </Clause>
        <Clause n="10.2">
          You may remove an authorised user through available controls. Removal may not delete information that
          person previously supplied, viewed or lawfully retained.
        </Clause>
        <Clause n="10.3">
          If household members separate, disagree or allege unauthorised access, we may temporarily restrict
          access, require evidence of authority, permit data export where lawful, or require separate
          accounts. We will not determine property, parenting or relationship rights.
        </Clause>
        <Clause n="10.4">
          Do not use shared access where doing so may expose a person to family violence, coercion, financial
          abuse or other risk. Seek appropriate support and use a safe device and account where necessary.
        </Clause>
      </Section>

      <Section title="11. Plans, free access and feature limits">
        <Clause n="11.1">
          Available plans, features, user limits, storage, coaching inclusions and prices will be displayed
          before registration or purchase. Proposed categories may include a free child-only plan, paid
          multiple-child plan and paid family or household plan, but only the plan description presented at
          sign-up forms part of your agreement.
        </Clause>
        <Clause n="11.2">
          Free plans may not save data, may have limited features or may be withdrawn on reasonable notice. We
          will clearly disclose material limits before use.
        </Clause>
        <Clause n="11.3">
          We may introduce, retire or change features. A material adverse change to a paid plan during a
          prepaid term will be managed in accordance with clause 20 and applicable law.
        </Clause>
        <Clause n="11.4">
          Access codes, founding-family places and beta offers are personal, subject to stated limits and may
          be withdrawn if misused.
        </Clause>
      </Section>

      <Section title="12. Beta and founding-family participation">
        <Clause n="12.1">
          A beta or soft-launch version may contain incomplete, experimental or changing features. Known
          limitations and any special conditions will be disclosed when reasonably practicable.
        </Clause>
        <Clause n="12.2">
          Beta participants may be asked to provide feedback and participate in check-ins. Unless specifically
          stated, feedback is voluntary and no positive testimonial is required.
        </Clause>
        <Clause n="12.3">
          We may use de-identified or aggregated feedback to improve the App. We require separate permission
          before publishing an identifiable testimonial, case study, image or video.
        </Clause>
        <Clause n="12.4">
          Beta access may be time-limited. We will clearly tell you before free access converts to a paid
          subscription, and no charge will be made without valid payment authority and the required
          disclosures.
        </Clause>
      </Section>

      <Section title="13. Subscriptions and recurring payments">
        <Clause n="13.1">
          Unless the checkout states that a plan is fixed-term and non-renewing, a paid subscription renews
          for the billing period disclosed at checkout until cancelled.
        </Clause>
        <Clause n="13.2">
          By subscribing, you authorise our payment provider to charge the nominated payment method on the
          disclosed billing dates. We do not require you to provide card details directly to a coach.
        </Clause>
        <Clause n="13.3">
          We will provide reasonable advance notice of a material price increase and, where practicable, of an
          annual renewal or conversion from a free or discounted period to paid access.
        </Clause>
        <Clause n="13.4">Prices are in Australian dollars and exclude GST as identified at checkout.</Clause>
        <Clause n="13.5">
          If payment fails, we may retry the payment, notify you, restrict paid features or suspend access. We
          will not charge an undisclosed late fee.
        </Clause>
      </Section>

      <Section title="14. Cancellation">
        <Clause n="14.1">
          You may cancel a renewing subscription at any time through by contacting{" "}
          <a href="mailto:hello@mybalancedff.com.au" className="underline underline-offset-4">
            hello@mybalancedff.com.au
          </a>
          .
        </Clause>
        <Clause n="14.2">
          Unless required otherwise by law or the checkout states a more generous policy, cancellation stops
          future renewal and access continues until the end of the paid billing period.
        </Clause>
        <Clause n="14.3">
          Deleting the App, ceasing use or removing a payment method does not necessarily cancel a
          subscription. Follow the cancellation process and retain confirmation.
        </Clause>
        <Clause n="14.4">
          Where a subscription was purchased through an app store, cancellation may need to be completed
          through that store. The applicable store terms and statutory rights will apply.
        </Clause>
        <Clause n="14.5">
          We may cancel a plan on reasonable notice or immediately for material breach, fraud, security risk
          or unlawful use. If we cancel a prepaid plan for convenience, we will provide an appropriate
          pro-rata refund for unused access.
        </Clause>
      </Section>

      <Section title="15. Refunds and consumer guarantees">
        <Clause n="15.1">
          Nothing in these App Terms excludes, restricts or modifies a consumer guarantee, right or remedy
          under the Australian Consumer Law or another law that cannot lawfully be excluded, restricted or
          modified.
        </Clause>
        <Clause n="15.2">
          The App service will be provided with due care and skill, be fit for any purpose that you expressly
          make known and we agree to, and be supplied within a reasonable time where no time is fixed, to the
          extent those statutory guarantees apply.
        </Clause>
        <Clause n="15.3">
          A refund is not automatically owed because you change your mind, forget to cancel, do not use the
          App, enter incomplete or inaccurate information, do not implement an adjustment, experience
          circumstances outside our control or do not achieve a goal. This does not affect remedies for a
          failure to meet a consumer guarantee.
        </Clause>
        <Clause n="15.4">
          For a major failure with a service, the Australian Consumer Law may permit cancellation and a refund
          for the unused portion or compensation for reduced value. For a non-major failure, we may be entitled
          to a reasonable opportunity to remedy the issue.
        </Clause>
        <Clause n="15.5">
          To request a remedy, contact{" "}
          <a href="mailto:hello@mybalancedff.com.au" className="underline underline-offset-4">
            hello@mybalancedff.com.au
          </a>{" "}
          with account details, purchase date, description of the issue and requested outcome. We may
          reasonably investigate usage, error and payment records.
        </Clause>
        <Clause n="15.6">
          Any voluntary change-of-mind or introductory guarantee will apply only if clearly stated at checkout
          and will operate in addition to statutory rights.
        </Clause>
      </Section>

      <Section title="16. Privacy and data handling">
        <Clause n="16.1">
          Our{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          explains what personal information we collect, why we collect it, how it is used and disclosed,
          storage and overseas disclosure arrangements, access and correction rights, retention, complaints and
          data-breach response.
        </Clause>
        <Clause n="16.2">
          The project design currently contemplates an Australian-hosted Supabase database, role-based
          permissions and user capability to view, edit and delete data.
        </Clause>
        <Clause n="16.3">
          We will only use App information for purposes described at collection, in the Privacy Policy,
          reasonably expected for service delivery, authorised by you or required or permitted by law.
        </Clause>
        <Clause n="16.4">
          If applicable privacy law does not legally bind MyBFF because of an exemption, we may nevertheless
          adopt stated privacy commitments contractually. Those commitments do not represent that every privacy
          statute necessarily applies.
        </Clause>
        <Clause n="16.5">
          The Western Australian Privacy and Responsible Information Sharing Act 2024 principally regulates WA
          public sector entities. It may affect MyBFF if contractual privacy obligations are imposed through a
          WA government contract. The Privacy Policy will identify applicable obligations rather than implying
          that the Act automatically regulates all private businesses.
        </Clause>
      </Section>

      <Section title="17. Security and incidents">
        <Clause n="17.1">
          We will take reasonable technical and organisational steps appropriate to the nature of the
          information and service to protect personal information from misuse, interference, loss and
          unauthorised access, modification or disclosure.
        </Clause>
        <Clause n="17.2">
          No system is completely secure. You acknowledge ordinary internet and device risks, but this does not
          relieve us of obligations imposed by law.
        </Clause>
        <Clause n="17.3">
          We may use access controls, logging, encryption, backups, monitoring, incident response procedures
          and service-provider safeguards as appropriate. Security descriptions are not guarantees that an
          incident cannot occur.
        </Clause>
        <Clause n="17.4">
          Report suspected incidents promptly to{" "}
          <a href="mailto:hello@mybalancedff.com.au" className="underline underline-offset-4">
            hello@mybalancedff.com.au
          </a>
          . We may require password reset, session termination or other protective action.
        </Clause>
        <Clause n="17.5">
          We will assess and notify eligible data breaches as required by applicable law and may notify users
          of other significant incidents where appropriate.
        </Clause>
      </Section>

      <Section title="18. Data access, export, correction and deletion">
        <Clause n="18.1">
          Subject to technical capability, legal requirements and the Privacy Policy, you may view and correct
          information through the App and request access, correction, export or deletion.
        </Clause>
        <Clause n="18.2">
          Account deletion may remove active access and schedule personal information for deletion or
          de-identification, but limited records may be retained where reasonably necessary for legal
          compliance, fraud prevention, security, dispute resolution, backups or proof of consent and
          transactions.
        </Clause>
        <Clause n="18.3">
          Deletion requests concerning shared household information may affect other authorised users. We may
          need to balance competing rights and preserve information independently provided by another user.
        </Clause>
        <Clause n="18.4">
          You should export information you wish to retain before cancellation or deletion. The App is not
          intended to be your sole permanent financial record.
        </Clause>
        <Clause n="18.5">Our Privacy Policy will state applicable response processes and contact details.</Clause>
      </Section>

      <Section title="19. Third-party services">
        <Clause n="19.1">
          The App may rely on hosting, database, authentication, analytics, email, payment, scheduling and
          app-store providers. Their systems may have separate terms and privacy practices.
        </Clause>
        <Clause n="19.2">Payments will be processed through a third-party payment provider.</Clause>
        <Clause n="19.3">
          We are responsible for selecting and managing providers as required by applicable law, but we are
          not responsible for a third-party service outside our control to the extent liability can lawfully be
          excluded.
        </Clause>
        <Clause n="19.4">
          We may replace providers where this does not materially reduce the paid service or privacy
          protections promised to you.
        </Clause>
      </Section>

      <Section title="20. Changes, maintenance and availability">
        <Clause n="20.1">
          We may maintain, update or modify the App to improve security, functionality, compliance or user
          experience. Planned maintenance may temporarily interrupt access.
        </Clause>
        <Clause n="20.2">
          We do not guarantee uninterrupted or error-free operation. We will use reasonable care in providing
          paid services and addressing verified defects.
        </Clause>
        <Clause n="20.3">
          If we materially reduce a core paid feature during a prepaid term, we will provide reasonable notice
          and, where appropriate, an alternative, service credit, pro-rata refund or other remedy having regard
          to the circumstances and applicable law.
        </Clause>
        <Clause n="20.4">
          We may discontinue the App on reasonable notice. We will provide a reasonable opportunity to export
          available user data and an appropriate pro-rata refund for unused prepaid access, unless
          discontinuation is caused by a matter outside our reasonable control and law permits another
          outcome.
        </Clause>
      </Section>

      <Section title="21. Acceptable use">
        <Clause n="21.1">
          You must not misuse the App, attempt unauthorised access, interfere with security, introduce
          malicious code, scrape or reverse engineer the App except where law permits, create fraudulent
          accounts, use another person’s information without authority, resell access or use the App to
          harass, coerce or financially control another person.
        </Clause>
        <Clause n="21.2">
          You must not use App outputs as professional advice to third parties or represent that MyBFF
          endorses your services.
        </Clause>
        <Clause n="21.3">
          Reasonable household use is permitted. Automated, high-volume or commercial extraction is prohibited
          without written consent.
        </Clause>
      </Section>

      <Section title="22. Intellectual property and licence">
        <Clause n="22.1">
          We grant you a limited, personal, non-exclusive, non-transferable, revocable licence to use the App
          during your authorised access period in accordance with these App Terms.
        </Clause>
        <Clause n="22.2">
          We or our licensors own the App, software, interfaces, branding, templates, methods and content. You
          retain ownership of original information you enter.
        </Clause>
        <Clause n="22.3">
          You grant us a limited licence to host, process, reproduce and technically modify your content only
          as reasonably required to provide, secure, support and improve the service, comply with law and
          exercise rights under these App Terms.
        </Clause>
        <Clause n="22.4">
          We may use properly de-identified and aggregated information for analytics, product improvement and
          reporting where individuals are not reasonably identifiable, subject to applicable law and the
          Privacy Policy.
        </Clause>
      </Section>

      <Section title="23. Suspension and termination">
        <Clause n="23.1">
          We may suspend or terminate access for material breach, unlawful use, fraud, security risk,
          non-payment, infringement or conduct that risks harm to users, systems or MyBFF.
        </Clause>
        <Clause n="23.2">
          Where reasonable, we will give notice and an opportunity to remedy. Immediate restriction may occur
          for security, safety or legal compliance.
        </Clause>
        <Clause n="23.3">You may terminate by cancelling any subscription and requesting account closure.</Clause>
        <Clause n="23.4">
          On termination, the licence ends. Accrued payment obligations and clauses concerning data,
          intellectual property, liability, complaints and governing law survive as necessary.
        </Clause>
      </Section>

      <Section title="24. Liability">
        <Clause n="24.1">
          To the maximum extent permitted by law, we exclude conditions, warranties and representations not
          expressly stated or imposed by a law that cannot be excluded.
        </Clause>
        <Clause n="24.2">
          To the maximum extent permitted by law, we are not liable for indirect, special or consequential
          loss, loss of anticipated savings or opportunity, or loss caused by decisions made without checking
          inputs, assumptions and suitability.
        </Clause>
        <Clause n="24.3">
          Nothing excludes liability for fraud, wilful misconduct, death or personal injury caused by
          negligence, breach of a non-excludable consumer guarantee or another liability that cannot lawfully
          be excluded or limited.
        </Clause>
        <Clause n="24.4">
          Where liability for services can lawfully be limited, our liability may be limited, at our option, to
          supplying the affected service again or paying the reasonable cost of having it supplied again. This
          does not apply where law gives a different non-excludable remedy.
        </Clause>
        <Clause n="24.5">
          You must take reasonable steps to mitigate loss and promptly report a material issue so it can be
          investigated and, where appropriate, remedied.
        </Clause>
      </Section>

      <Section title="25. Complaints and disputes">
        <Clause n="25.1">
          Send App, billing or privacy complaints to{" "}
          <a href="mailto:hello@mybalancedff.com.au" className="underline underline-offset-4">
            hello@mybalancedff.com.au
          </a>{" "}
          with your name, account email, relevant dates, description and desired outcome.
        </Clause>
        <Clause n="25.2">
          We will assess complaints in good faith and may request information reasonably needed to investigate.
        </Clause>
        <Clause n="25.3">
          Before court proceedings, the parties should attempt direct resolution and may agree to mediation in
          Western Australia. This does not prevent urgent relief or exercise of a statutory right.
        </Clause>
        <Clause n="25.4">
          You may contact an applicable consumer or privacy regulator or obtain independent legal advice.
        </Clause>
      </Section>

      <Section title="26. Changes and general terms">
        <Clause n="26.1">
          We may update these App Terms for legal, security, technical or operational reasons. The current
          version and effective date will be made available in the App.
        </Clause>
        <Clause n="26.2">
          Material changes affecting an existing paid subscription will be notified reasonably in advance and
          will not retrospectively remove accrued rights.
        </Clause>
        <Clause n="26.3">
          These App Terms are governed by the laws of Western Australia and the Commonwealth of Australia.
          Subject to non-excludable rights, the parties submit to courts in Western Australia and appellate
          courts.
        </Clause>
        <Clause n="26.4">
          If a provision is invalid, it is read down or severed and the balance continues. Delay is not waiver.
          You may not assign your account; we may transfer the agreement as part of a genuine business
          restructure or sale subject to law and privacy protections.
        </Clause>
        <Clause n="26.5">
          These App Terms do not create a partnership, employment, fiduciary or adviser-client relationship.
        </Clause>
      </Section>

      <p className="border-t pt-6 text-sm text-muted-foreground">
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
