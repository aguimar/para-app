"use client"

import { useMemo, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { FullScreenCalendar, type CalendarData, type CalendarLabels } from "@/components/ui/fullscreen-calendar"
import { CalendarBlank, X } from "@/components/ui/icons"
import { useTranslation } from "@/lib/i18n-client"

/** Parse a date string/Date into a local-midnight Date to avoid timezone shift.
 *  "2026-03-27T00:00:00.000Z" in UTC would become Mar 26 in UTC-3 — this fixes that. */
function parseLocalDate(d: string | Date): Date {
  const s = typeof d === "string" ? d : d.toISOString()
  const [y, m, day] = s.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, day)
}

interface NoteWithDates {
  id: string
  title: string
  status: string
  dueDate: string | Date | null
  startDate: string | Date | null
}

interface ProjectCalendarProps {
  notes: NoteWithDates[]
  projectId: string
  workspaceId: string
  locale?: "pt-BR" | "en-US"
}

function CalendarModal({
  data,
  projectTitle,
  locale,
  labels,
  timelineLabel,
  onClose,
  onNewEvent,
}: {
  data: CalendarData[]
  projectTitle: string
  locale?: "pt-BR" | "en-US"
  labels: CalendarLabels
  timelineLabel: string
  onClose: () => void
  onNewEvent: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        transition: "opacity 200ms ease-out",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-md"
        onClick={handleClose}
      />

      <div
        className="relative z-10 flex flex-1 flex-col m-3 md:m-6 rounded-2xl bg-surface-container-lowest overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.35)]"
        style={{
          transition: "transform 200ms ease-out, opacity 200ms ease-out",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.97) translateY(8px)",
          opacity: visible ? 1 : 0,
        }}
      >
        <div className="flex shrink-0 items-center gap-4 border-b border-outline-variant/10 px-6 py-3.5">
          <CalendarBlank size={18} weight="duotone" className="text-primary" />
          <div className="flex-1 min-w-0">
            <h2 className="font-headline text-sm font-bold text-on-surface truncate">
              {projectTitle}
            </h2>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              {timelineLabel}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FullScreenCalendar data={data} onNewEvent={onNewEvent} locale={locale} labels={labels} />
        </div>
      </div>
    </div>,
    document.body
  )
}

export function ProjectCalendarButton({
  notes,
  projectId,
  projectTitle,
  workspaceId,
  locale,
}: ProjectCalendarProps & { projectTitle: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const t = useTranslation()

  const calendarLabels: CalendarLabels = useMemo(() => ({
    today: t.calendar?.today ?? "Today",
    newNote: t.calendar?.newNote ?? "New Note",
    more: t.calendar?.more ?? "+ {count} more",
    weekdays: t.calendar?.weekdays ?? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  }), [t])

  const timelineLabel = t.calendar?.timeline ?? "Timeline"

  const calendarData: CalendarData[] = useMemo(() => {
    const dayMap = new Map<string, CalendarData>()

    for (const note of notes) {
      const dates: { date: Date; label: string }[] = []

      if (note.dueDate) {
        dates.push({ date: parseLocalDate(note.dueDate), label: "Due" })
      }
      if (note.startDate) {
        dates.push({ date: parseLocalDate(note.startDate), label: "Start" })
      }

      for (const { date, label } of dates) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        if (!dayMap.has(key)) {
          dayMap.set(key, { day: date, events: [] })
        }
        dayMap.get(key)!.events.push({
          id: `${note.id}-${label}`,
          name: note.title || "Untitled",
          time: label,
          datetime: date.toISOString(),
        })
      }
    }

    return Array.from(dayMap.values())
  }, [notes])

  const eventCount = calendarData.reduce((sum, d) => sum + d.events.length, 0)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-primary-container/40 px-4 py-2 font-label text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary-container/70 transition-colors"
      >
        <CalendarBlank size={14} weight="duotone" />
        {timelineLabel}
        {eventCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-label text-[9px] font-bold text-on-primary">
            {eventCount}
          </span>
        )}
      </button>

      {open && (
        <CalendarModal
          data={calendarData}
          projectTitle={projectTitle}
          locale={locale}
          labels={calendarLabels}
          timelineLabel={timelineLabel}
          onClose={() => setOpen(false)}
          onNewEvent={() => {
            setOpen(false)
            router.push(`/note/new?projectId=${projectId}&workspaceId=${workspaceId}`)
          }}
        />
      )}
    </>
  )
}
