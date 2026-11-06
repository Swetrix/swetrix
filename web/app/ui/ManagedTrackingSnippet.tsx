import CopyButton from '~/ui/CopyButton'
import { getManagedTrackingSnippet } from '~/utils/managed-tracker'

const ManagedTrackingSnippet = ({ projectId }: { projectId: string }) => {
  const snippet = getManagedTrackingSnippet(projectId)

  return (
    <div className='flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950'>
      <code className='min-w-0 flex-1 self-center font-mono text-xs leading-relaxed wrap-anywhere text-gray-800 dark:text-gray-200'>
        {snippet}
      </code>
      <CopyButton value={snippet} className='shrink-0' />
    </div>
  )
}

export default ManagedTrackingSnippet
