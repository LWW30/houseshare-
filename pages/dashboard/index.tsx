import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../lib/useAuth'
import { getProperties, getRentPayments, getSharedBills, signOut, type Property, type RentPayment, type SharedBill } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { format, differenceInDays, isPast, addDays, isWithinInterval } from 'date-fns'
import { Building2, PoundSterling, Bell, ChevronRight, LogOut, AlertTriangle, Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'

const categoryEmoji: Record<string, string> = {
    broadband: 'Wifi', council_tax: 'Tax', electricity: 'Elec', gas: 'Gas', water: 'Water', other: 'Other',
}

function greeting() {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return 'Good morning'
    if (h >= 12 && h < 17) return 'Good afternoon'
    return 'Good evening'
}

export default function Dashboard() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [properties, setProperties] = useState<Property[]>([])
    const [payments, setPayments] = useState<RentPayment[]>([])
    const [bills, setBills] = useState<SharedBill[]>([])
    const [tenantCount, setTenantCount] = useState(0)
    const [roomCount, setRoomCount] = useState(0)
    const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
        if (!user) return
        loadDashboard()
  }, [user])

  const loadDashboard = async () => {
        if (!user) return
        setDataLoading(true)
        try {
                const props = await getProperties(user.id)
                setProperties(props)
                if (props.length === 0) { setDataLoading(false); return }

          const propIds = props.map(p => p.id)
                const month = format(new Date(), 'yyyy-MM')

          const [pays, bs] = await Promise.all([
                    getRentPayments(propIds, month),
                    getSharedBills(propIds),
                  ])
                setPayments(pays)
                setBills(bs)

          const { count: tc } = await supabase
                  .from('tenants').select('*', { count: 'exact', head: true })
                  .in('property_id', propIds).eq('status', 'active')
                setTenantCount(tc || 0)

          const { count: rc } = await supabase
                  .from('rooms').select('*', { count: 'exact', head: true })
                  .in('property_id', propIds)
                setRoomCount(rc || 0)
        } catch (e) { console.error(e) }
        setDataLoading(false)
  }

  const month = format(new Date(), 'yyyy-MM')
    const monthLabel = format(new Date(), 'MMMM yyyy')
    const occupiedRooms = tenantCount
    const vacantRooms = Math.max(0, roomCount - occupiedRooms)
    const occupancyRate = roomCount > 0 ? Math.round((occupiedRooms / roomCount) * 100) : 0
    const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
    const totalRent = payments.reduce((s, p) => s + p.amount, 0)
    const unpaidBills = bills.filter(b => !b.paid)
    const attention = payments.filter(p => p.status === 'overdue').length + unpaidBills.length

  const [complianceDocs, setComplianceDocs] = useState<any[]>([])
    useEffect(() => {
          if (!user) return
          supabase.from('documents')
            .select('*, property:properties(address)')
            .eq('user_id', user.id)
            .order('expires_at', { ascending: true })
            .then(({ data }) => setComplianceDocs(data || []))
    }, [user])

  const expiredDocs = complianceDocs.filter(d => d.expires_at && isPast(new Date(d.expires_at)))
    const expiringSoon = complianceDocs.filter(d => {
          if (!d.expires_at) return false
          const exp = new Date(d.expires_at)
          return !isPast(exp) && isWithinInterval(exp, { start: new Date(), end: addDays(new Date(), 30) })
    })

  const handleSignOut = async () => {
        await signOut()
        router.push('/login')
  }

  if (loading) return null

  return (
        <Layout>
              <div className="p-8 max-w-5xl">
                      <div className="flex items-center justify-between mb-8">
                                <div>
                                            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                                              {greeting()}
                                            </h1>h1>
                                            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                              {monthLabel} - portfolio snapshot
                                            </p>p>
                                </div>div>
                                <button onClick={handleSignOut} className="btn-ghost flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <LogOut size={14} />
                                            Sign out
                                </button>button>
                      </div>div>
              
                {(expiredDocs.length > 0 || expiringSoon.length > 0) && (
                    <Link href="/dashboard/documents">
                                <div className="mb-6 flex items-center justify-between px-4 py-3 round</Layout>
