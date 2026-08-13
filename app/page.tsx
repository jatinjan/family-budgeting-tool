import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { Leaf, Target, Compass, Heart } from "lucide-react"

export default function BalancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pb-24">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader />

        {/* Intro */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-base leading-relaxed text-foreground text-balance">
              A gentle, clear and easy way to understand your family&apos;s spending. Make intentional choices and create more space for what truly matters to you and your family.
            </p>
            <div className="mt-6 space-y-3">
              <Button asChild size="lg">
                <Link href="/signup">Start planning</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary underline underline-offset-4 hover:text-primary/80">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* A clearer picture of your year */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Leaf className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-foreground">A clearer picture of your year</h2>
            </div>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              See all your expenses in one place and understand where your money is really going. No judgment — just clarity that helps you feel more in control.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                See your full year at a glance
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                Explore needs vs. wants with confidence
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                Find small changes that bring more balance
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Plan with purpose */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-foreground">Plan with purpose</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Every family has goals — a holiday, school fees, a home project, or simply building a safety buffer. Set what you're working toward, and watch how simple and thoughtful adjustments to your current habits help you move towards your goals.
            </p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Compass className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-foreground">How it works</h2>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                Enter expenses for household, adults, and children across key categories.
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                Review your total family spending in the Dashboard.
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                Explore where adjustments can help in the Planning sheet.
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">4</span>
                See your potential savings and the impact of your choices.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Designed for real families */}
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-foreground">Designed for real families</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Life is busy, and decisions about your children's expenses can feel especially heavy. This app gives you a calm, supportive space to understand those costs and make informed choices that bring more balance and peace of mind to you and your family.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg">
            <Link href="/signup">Start planning</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
