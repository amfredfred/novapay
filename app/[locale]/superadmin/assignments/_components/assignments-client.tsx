// app/[locale]/superadmin/assignments/_components/assignments-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Users, UserCheck, Search, X, Loader2, ChevronDown, ChevronUp,
  Shield, UserPlus, UserMinus, ShieldOff,
} from 'lucide-react'
import { assignUsersToAdmin, unassignUserFromAdmin, promoteToAdmin, demoteFromAdmin, lookupUserByEmail, toggleAdminCanCreateUsers } from '@/actions/admin-assignments'

async function assign(adminId: string, userId: string) {
  const result = await assignUsersToAdmin({ adminId, userIds: [userId] })
  if (!result?.success) throw new Error(result?.error)
}

async function unassign(adminId: string, userId: string) {
  const result = await unassignUserFromAdmin(adminId, userId)
  if (!result?.success) throw new Error(result?.error)
}

interface Admin  { id: string; name: string; email: string; canCreateUsers?: boolean }
interface Client { id: string; name: string; email: string; kyc: string; status: string }

interface Props {
  admins:             Admin[]
  clients:            Client[]
  initialAssignments: Record<string, string[]>
}

function AdminPanel({
  admin, clients, assignedIds, onToggle, onDemote, onToggleCreateUsers,
}: {
  admin:                Admin
  clients:              Client[]
  assignedIds:          Set<string>
  onToggle:             (userId: string, doAssign: boolean) => void
  onDemote:             (adminId: string) => void
  onToggleCreateUsers:  (val: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch]     = useState('')
  const [isPending, start]      = useTransition()

  const filtered   = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()),
  )
  const assigned   = clients.filter(c => assignedIds.has(c.id))
  const unassigned = filtered.filter(c => !assignedIds.has(c.id))

  function toggle(userId: string, currentlyAssigned: boolean) {
    start(async () => {
      try {
        if (currentlyAssigned) {
          await unassign(admin.id, userId)
          onToggle(userId, false)
          toast.success('User unassigned')
        } else {
          await assign(admin.id, userId)
          onToggle(userId, true)
          toast.success('User assigned')
        }
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleDemote() {
    start(async () => {
      try {
        const result = await demoteFromAdmin(admin.id)
        if (result?.success) {
        onDemote(admin.id)
        toast.success(`${admin.name} demoted to client`)
        } else {
        toast.error(result?.error)
        }
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{admin.name}</p>
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            assigned.length > 0
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}>
            {assigned.length} assigned
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {assigned.length > 0 && (
            <div className="p-4 border-b border-border/50 bg-primary/5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Assigned ({assigned.length})
              </p>
              <div className="space-y-2">
                {assigned.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <button
                      onClick={() => toggle(c.id, true)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0 dark:bg-red-950/30 dark:border-red-900"
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Add users
            </p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            {unassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? 'No matching unassigned users' : 'All clients assigned to this admin'}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unassigned.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <button
                      onClick={() => toggle(c.id, false)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-3 bg-muted/20 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => onToggleCreateUsers(!admin.canCreateUsers)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${admin.canCreateUsers ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${admin.canCreateUsers ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-muted-foreground">Can create users</span>
            </label>
            <button
              onClick={handleDemote}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
              Demote to client
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Promote panel ─────────────────────────────────────────────────────────────

function PromotePanel({
  onPromote,
}: {
  onPromote: (client: Client) => void
}) {
  const [email, setEmail]       = useState('')
  const [found, setFound]       = useState<Client | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isPending, start]      = useTransition()

  function handleLookup() {
    if (!email.trim()) return
    setFound(null)
    setNotFound(false)
    start(async () => {
      try {
        const result = await lookupUserByEmail(email.trim())
        if (!result?.success) {
        setNotFound(true)
        toast.error(result?.error)
        } else {
        setFound({ ...result?.data, kyc: '', status: 'active' })
        }
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  function handlePromote() {
    if (!found) return
    start(async () => {
      try {
        const result = await promoteToAdmin(found.id)
        if (result?.success) {
        onPromote(found)
        toast.success(`${found.name} promoted to admin`)
        setEmail('')
        setFound(null)
        } else {
        toast.error(result?.error)
        }
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="border border-dashed border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-sm">Promote user to admin</p>
          <p className="text-xs text-muted-foreground">Enter exact email to look up a user before granting admin access</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Email lookup */}
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setFound(null); setNotFound(false) }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="user@example.com"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            onClick={handleLookup}
            disabled={isPending || !email.trim()}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 shrink-0"
          >
            {isPending && !found ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Find
          </button>
        </div>

        {/* Not found state */}
        {notFound && (
          <p className="text-sm text-destructive">No user found with that email address.</p>
        )}

        {/* Found — show confirmation card */}
        {found && (
          <div className="flex items-center justify-between gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{found.name}</p>
              <p className="text-xs text-muted-foreground truncate">{found.email}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Current role: <span className="font-medium capitalize">{found.kyc || 'client'}</span>
              </p>
            </div>
            <button
              onClick={handlePromote}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50 shrink-0 dark:text-amber-400"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
              Confirm promote
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AssignmentsClient({ admins: initialAdmins, clients: initialClients, initialAssignments }: Props) {
  const [admins, setAdmins]   = useState(initialAdmins)
  const [clients, setClients] = useState(initialClients)

  const [assignments, setAssignments] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {}
    // Seed from ALL admin IDs present in the current admin list
    for (const adminId of initialAdmins.map(a => a.id)) {
      map[adminId] = new Set(initialAssignments[adminId] ?? [])
    }
    // Also include any assignment keys not in the current admin list
    // (prevents losing DB assignments when get_admin_users() has stale data)
    for (const adminId of Object.keys(initialAssignments)) {
      if (!map[adminId]) {
        map[adminId] = new Set(initialAssignments[adminId] ?? [])
      }
    }
    return map
  })

  function handleToggle(adminId: string, userId: string, doAssign: boolean) {
    setAssignments(prev => {
      const next = { ...prev }
      const set  = new Set(next[adminId] ?? [])
      doAssign ? set.add(userId) : set.delete(userId)
      next[adminId] = set
      return next
    })
  }

  function handlePromote(client: Client) {
    setAdmins(prev => [...prev, { id: client.id, name: client.name, email: client.email }])
    setClients(prev => prev.filter(c => c.id !== client.id))
    setAssignments(prev => ({ ...prev, [client.id]: new Set() }))
  }

  function handleDemote(adminId: string) {
    const admin = admins.find(a => a.id === adminId)
    if (admin) {
      setClients(prev => [...prev, {
        id: admin.id, name: admin.name, email: admin.email, kyc: '', status: 'active',
      }])
    }
    setAdmins(prev => prev.filter(a => a.id !== adminId))
    setAssignments(prev => {
      const next = { ...prev }
      delete next[adminId]
      return next
    })
  }

  function handleToggleCreateUsers(adminId: string, val: boolean) {
    start(async () => {
      try {
        const result = await toggleAdminCanCreateUsers(adminId, val)
        if (!result?.success) { toast.error(result?.error); return }
        setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, canCreateUsers: val } : a))
        toast.success(val ? 'User creation enabled for this admin' : 'User creation disabled')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  const totalAssigned   = Object.values(assignments).reduce((s, set) => s + set.size, 0)
  const unassignedCount = clients.filter(c =>
    !Object.values(assignments).some(set => set.has(c.id)),
  ).length

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Admin agents',     value: admins.length,    color: 'text-primary' },
          { label: 'Assigned users',   value: totalAssigned,    color: 'text-green-600' },
          { label: 'Unassigned users', value: unassignedCount,  color: unassignedCount > 0 ? 'text-amber-600' : 'text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {unassignedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-3">
          <Users className="h-4 w-4 shrink-0" />
          {unassignedCount} customer{unassignedCount !== 1 ? 's are' : ' is'} not assigned to any admin
        </div>
      )}

      {/* Promote panel */}
      <PromotePanel onPromote={handlePromote} />

      {/* Admin panels */}
      {admins.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">No admin users yet</p>
          <p className="text-sm text-muted-foreground">
            Use the panel above to promote a user to admin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => (
            <AdminPanel
              key={admin.id}
              admin={admin}
              clients={clients}
              assignedIds={assignments[admin.id] ?? new Set()}
              onToggle={(userId, doAssign) => handleToggle(admin.id, userId, doAssign)}
              onDemote={handleDemote}
              onToggleCreateUsers={(val) => handleToggleCreateUsers(admin.id, val)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
