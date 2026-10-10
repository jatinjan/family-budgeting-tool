"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Spec: docs/specs/planning-sheet.md §7 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <Button
      type="button"
      size="sm"
      className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-40 gap-1 shadow-lg md:bottom-6"
      style={{ backgroundColor: "#2F6B66" }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp className="h-4 w-4" />
      Scroll to the top
    </Button>
  )
}
