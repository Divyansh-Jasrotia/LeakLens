import { Dashboard } from '@/components/dashboard'
import { analyzeInbox, type InboxEvent } from '@/lib/engine'
import { toDashboard } from '@/lib/ui-adapter'
import inboxEvents from '@/data/inbox.json'

export default function Page() {
  const result = analyzeInbox(inboxEvents as InboxEvent[])
  const data = toDashboard(result)

  return <Dashboard data={data} />
}
