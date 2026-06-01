import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useStore } from './context/StoreContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import ListPage from './pages/ListPage.jsx'
import CartPage from './pages/CartPage.jsx'
import MorePage from './pages/MorePage.jsx'
import ProfilePhotoPage from './pages/ProfilePhotoPage.jsx'
import StorePage from './pages/StorePage.jsx'
import ProductPage from './pages/ProductPage.jsx'
import ManagerLoginPage from './pages/ManagerLoginPage.jsx'
import ManagerHomePage from './pages/ManagerHomePage.jsx'
import ConnectionsPage from './pages/ConnectionsPage.jsx'
import FloorplanEditorPage from './pages/FloorplanEditorPage.jsx'
import CatalogPage from './pages/CatalogPage.jsx'
import { isCustomerSession } from './lib/security.js'

function AppShell() {
  const { isLoggedIn } = useStore()
  if (!isLoggedIn || !isCustomerSession()) return <Navigate to="/login" replace />

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-surface pb-24 shadow-[0_0_60px_rgba(76,29,149,0.08)] ring-1 ring-black/5">
      <Outlet />
      <BottomNav />
    </div>
  )
}

function ManagerShell() {
  const { isManagerLoggedIn } = useStore()
  if (!isManagerLoggedIn) return <Navigate to="/manage/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/manage/login" element={<ManagerLoginPage />} />
      <Route element={<ManagerShell />}>
        <Route path="/manage" element={<ManagerHomePage />} />
        <Route path="/manage/connections" element={<ConnectionsPage />} />
        <Route path="/manage/floorplan" element={<FloorplanEditorPage />} />
        <Route path="/manage/catalog" element={<CatalogPage />} />
      </Route>

      <Route element={<AppShell />}>
        <Route index element={<ListPage />} />
        <Route path="list" element={<ListPage />} />
        <Route path="lijst" element={<Navigate to="/" replace />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="mandje" element={<Navigate to="/cart" replace />} />
        <Route path="more" element={<MorePage />} />
        <Route path="profiel" element={<Navigate to="/more" replace />} />
        <Route path="profile-photo" element={<ProfilePhotoPage />} />
        <Route path="profiel-foto" element={<Navigate to="/profile-photo" replace />} />
        <Route path="store/:id" element={<StorePage />} />
        <Route path="store/:id/product/:pid" element={<ProductPage />} />
      </Route>

      <Route path="/staff" element={<Navigate to="/login" replace />} />
      <Route path="/staff/*" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
