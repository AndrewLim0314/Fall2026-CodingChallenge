import { NavLink } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import LogoutButton from './LogoutButton'

/** Only rendered on protected pages, so a user is always present. */
export default function Header() {
  const { user } = useAuth()
  const className = ({ isActive }: { isActive: boolean }) => (isActive ? 'is-active' : '')

  return (
    <nav className="nav">
      <NavLink to="/feed" className={className}>
        Feed
      </NavLink>
      <NavLink to="/search" className={className}>
        Search
      </NavLink>
      <NavLink to="/boards" className={className}>
        Boards
      </NavLink>
      <span className="nav__user spacer">{user?.username}</span>
      <LogoutButton />
    </nav>
  )
}
