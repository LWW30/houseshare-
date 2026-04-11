import Layout from '../../../components/Layout'
import { useRouter } from 'next/router'
import { Landmark, Clock, CheckCircle } from 'lucide-react'

export default function DirectDebitPage() {
  const router = useRouter()

  return (
    <Layout>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Direct Debit</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Automated rent collection via GoCardless</p>
        </div>

        <div className="card p-8 text-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Landmark size={28} className="text-gray-400" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium mb-4">
            <Clock size={11} />
            Coming soon
          </div>
          <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Automated rent collection
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Collect rent automatically via GoCardless BACS Direct Debit. Tenants authorise once and rent is collected on your schedule — no chasing, no late payments.
          </p>
          <button
            onClick={() => router.push('/dashboard/billing')}
            className="btn-primary px-6 py-2.5"
          >
            Upgrade to Pro to get early access
          </button>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Available to Pro subscribers when launched
          </p>
        </div>

        <div className="card p-6">
          <h3 className="font-medium text-sm mb-4" style={{ color: 'var(--text-primary)' }}>What you will get</h3>
          <div className="space-y-3">
            {[
              'Tenants authorise via a simple online link — no paperwork',
              'Rent collected automatically on your chosen date each month',
              'Instant notification when payments succeed or fail',
              'Full payment history and reconciliation built in',
              'GoCardless BACS — the same system used by major UK banks',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
