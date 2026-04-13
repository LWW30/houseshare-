import Layout from '../../../components/Layout'
import { FileText } from 'lucide-react'
import Link from 'next/link'

export default function AgreementsPage() {
  return (
    <Layout>
      <div className="p-8">
        <FileText size={22} />
        <h1>Tenancy Agreements</h1>
        <p>Coming soon</p>
        <Link href="/dashboard">Back</Link>
      </div>
    </Layout>
  )
}