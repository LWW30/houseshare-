type Status = 'paid' | 'pending' | 'late' | 'overdue'

const labels: Record<Status, string> = {
  paid: 'Paid',
  pending: 'Due soon',
  late: 'Late',
  overdue: 'Overdue',
}

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${status}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'paid' ? 'bg-green-500' :
        status === 'pending' ? 'bg-amber-500' :
        status === 'late' ? 'bg-orange-500' :
        'bg-red-500'
      }`} />
      {labels[status]}
    </span>
  )
}
