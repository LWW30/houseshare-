import Layout from '../../../components/Layout'
import { ExternalLink, User, Shield, Clock } from 'lucide-react'

const PROVIDERS = [
  {
    name: 'OpenRent Referencing',
    description: 'Full reference including credit check, employment and previous landlord. From £20 per tenant.',
    price: 'From £20/tenant',
    speed: '24-48 hours',
    href: 'https://www.openrent.co.uk/tenant-referencing',
    rating: '★★★★★',
    highlight: 'Most popular with independent landlords'
  },
  {
    name: 'Vouch',
    description: 'Digital referencing platform. Tenants complete online. Includes Right to Rent check.',
    price: 'From £18/tenant',
    speed: '24 hours',
    href: 'https://www.vouch.co.uk',
    rating: '★★★★★',
    highlight: 'Fastest turnaround'
  },
  {
    name: 'Let Alliance',
    description: 'Comprehensive referencing with rent guarantee insurance option. Trusted by thousands of landlords.',
    price: 'From £27/tenant',
    speed: '2-3 days',
    href: 'https://www.letalliance.co.uk',
    rating: '★★★★☆',
    highlight: 'Best with rent guarantee add-on'
  },
  {
    name: 'HomeLet',
    description: 'One of the UK's largest referencing providers. Includes income verification and credit history.',
    price: 'From £22/tenant',
    speed: '2-3 days',
    href: 'https://www.homelet.co.uk/landlord-insurance/tenant-referencing',
    rating: '★★★★☆',
    highlight: 'Most established provider'
  },
]

export default function ReferencingPage() {
  return (
    <Layout>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-1">
          <User size={22} style={{ color: 'var(--text-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tenant Referencing</h1>
        </div>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Run credit checks and employment references before a tenant moves in. We recommend these UK providers.</p>
        <div className="flex items-start gap-2 p-3 rounded-xl mb-8 text-sm" style={{ background: 'var(--color-background-secondary)', color: 'var(--text-secondary)' }}>
          <Shield size={15} className="flex-shrink-0 mt-0.5" />
          <span>Always reference tenants before signing an agreement. Under the Renters Rights Act 2025, a thorough referencing process protects you if you later need to recover possession.</span>
        </div>

        <div className="space-y-4">
          {PROVIDERS.map(p => (
            <div key={p.name} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">{p.highlight}</span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Shield size={11} />{p.price}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{p.speed}</span>
                    <span>{p.rating}</span>
                  </div>
                </div>
                <a href={p.href} target="_blank" rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-1.5 text-sm flex-shrink-0 whitespace-nowrap">
                  Visit <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-xl text-sm" style={{ background: 'var(--color-background-secondary)', color: 'var(--text-secondary)' }}>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>What to check</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Credit history — CCJs, bankruptcies, missed payments</li>
            <li>Employment and income — verify they earn 2.5x the monthly rent</li>
            <li>Previous landlord reference — check rent payment history</li>
            <li>Right to Rent — legally required for all tenants in England</li>
            <li>Identity documents — passport or driving licence</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}