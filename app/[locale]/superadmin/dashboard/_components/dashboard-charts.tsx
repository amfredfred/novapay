// app/[locale]/superadmin/dashboard/_components/dashboard-charts.tsx
'use client'

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RevenuePoint { month: string; revenue: number; tx_count: number }
interface BalancePoint  { currency: string; total_balance: number; account_count: number }

interface Props {
  revenueData:  RevenuePoint[]
  balanceData:  BalancePoint[]
  userCount:    number
}

const PIE_COLORS = ['#74b9ff', '#3dd68c', '#ffd166', '#ff6b6b', '#a29bfe', '#fd79a8', '#55efc4', '#fdcb6e']

function fmt(v: number) {
  return v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `€${(v / 1_000).toFixed(0)}K` : `€${v}`
}

export function DashboardCharts({ revenueData, balanceData, userCount }: Props) {
  return (
    <div className="space-y-6">
      {/* Revenue trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue trend (EUR)</CardTitle>
          <p className="text-xs text-muted-foreground">Transaction volume by month</p>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No transaction data yet — import some via History Generator
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmt(v), 'Volume']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Balance by currency */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Balance by currency</CardTitle>
            <p className="text-xs text-muted-foreground">Total funds under management</p>
          </CardHeader>
          <CardContent>
            {balanceData.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">No accounts yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={balanceData} dataKey="total_balance" nameKey="currency" cx="50%" cy="50%" outerRadius={60} label={({ currency }) => currency}>
                    {balanceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmt(v), 'Balance']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Currency breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 pt-1">
              {balanceData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : balanceData.map(({ currency, total_balance, account_count }) => {
                const total = balanceData.reduce((s, b) => s + b.total_balance, 0)
                const pct = total > 0 ? (total_balance / total) * 100 : 0
                return (
                  <div key={currency}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-semibold">{currency}</span>
                      <span className="text-muted-foreground">{fmt(total_balance)} · {account_count} accts</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct.toFixed(1)}%`, background: PIE_COLORS[balanceData.indexOf(balanceData.find(b => b.currency === currency)!) % PIE_COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
