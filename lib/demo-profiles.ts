// Registry of bundled sample inboxes shown in the "Use Demo Data" picker.
// Each is a real InboxEvent[] fixture — same shape a user's own export
// would be — just pre-supplied so the tool can be explored without data.

import rahulEvents from '@/data/demo-rahul.json'
import karanEvents from '@/data/demo-karan.json'
import priyaEvents from '@/data/demo-priya.json'
import type { InboxEvent } from './engine'

export interface DemoProfile {
  id: string
  name: string
  tagline: string
  bank: string
  events: InboxEvent[]
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'rahul',
    name: 'Rahul',
    tagline: 'Working professional, multi-app spender',
    bank: 'PNB · HDFC · ICICI',
    events: rahulEvents as InboxEvent[],
  },
  {
    id: 'karan',
    name: 'Karan',
    tagline: 'Student, entertainment & fitness subs',
    bank: 'SBI',
    events: karanEvents as InboxEvent[],
  },
  {
    id: 'priya',
    name: 'Priya',
    tagline: 'Young professional, health & delivery apps',
    bank: 'ICICI',
    events: priyaEvents as InboxEvent[],
  },
]
