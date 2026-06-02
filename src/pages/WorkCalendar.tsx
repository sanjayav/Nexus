import { Calendar } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'

/**
 * Calendar — placeholder route.
 *
 * The v1 month-grid that lived here plotted assignment due dates, but it
 * never gained the event-management features (drag-to-reschedule, ICS sync,
 * meeting overlays) needed to justify keeping it as a primary surface.
 * Rather than 404 existing bookmarks, we keep the route and ship a
 * "coming soon" pointer at the real source of truth — MyTasks.
 *
 * When calendar functionality returns it should reuse this URL.
 */
export default function WorkCalendar() {
  const navigate = useNavigate()
  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: 'Work', to: '/' },
          { label: 'Calendar' },
        ]}
        title="Calendar"
      />
      <EmptyState
        icon={Calendar}
        title="Calendar view coming soon"
        body="In the meantime, see all your due dates and overdue items in My Tasks."
        cta={{ label: 'Open My Tasks', onClick: () => navigate('/my-tasks') }}
      />
    </div>
  )
}
