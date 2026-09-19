import { Link } from 'react-router'
import EmptyState from '../components/EmptyState'

export default function NotFound() {
  return (
    <main className="container">
      <EmptyState title="Page not found">
        <p>That page doesn’t exist, or the board is private.</p>
        <Link to="/feed">Go to the feed</Link>
      </EmptyState>
    </main>
  )
}
