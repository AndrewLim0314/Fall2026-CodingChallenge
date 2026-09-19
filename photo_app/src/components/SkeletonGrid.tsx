/** Placeholder tiles that hold the grid's shape while photos load. */
export default function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  )
}
