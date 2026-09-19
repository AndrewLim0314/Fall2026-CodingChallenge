import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthProvider'
import AcceptInvite from './pages/AcceptInvite'
import BoardDetail from './pages/BoardDetail'
import Boards from './pages/Boards'
import Discover from './pages/Discover'
import DiscoverBoards from './pages/DiscoverBoards'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import PhotoDetail from './pages/PhotoDetail'
import Register from './pages/Register'
import Search from './pages/Search'
import SharedBoard from './pages/SharedBoard'

// AuthProvider sits inside the router so pages under it can navigate, and
// outside Routes so the session is fetched once rather than per route.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Public: holding the slug is its own grant to view. */}
          <Route path="/b/:shareSlug" element={<SharedBoard />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/feed" element={<Discover />} />
            <Route path="/search" element={<Search />} />
            <Route path="/boards" element={<Boards />} />
            <Route path="/discover-boards" element={<DiscoverBoards />} />
            <Route path="/boards/:id" element={<BoardDetail />} />
            <Route path="/boards/:boardId/photos/:photoId" element={<PhotoDetail />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
