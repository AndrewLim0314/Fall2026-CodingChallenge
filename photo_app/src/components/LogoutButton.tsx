import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'

export default function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    setBusy(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy}>
      {busy ? 'Logging out…' : 'Log out'}
    </button>
  )
}
