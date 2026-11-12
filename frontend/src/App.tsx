import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import OrderSuccess from './pages/OrderSuccess'
import Profile from './pages/Profile'
import Register from './pages/Register'
import Search from './pages/Search'
import StoreDetail from './pages/StoreDetail'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminStores from './pages/admin/AdminStores'
import AdminUsers from './pages/admin/AdminUsers'
import DriverDashboard from './pages/driver/DriverDashboard'
import DriverHistory from './pages/driver/DriverHistory'
import DriverTaskDetail from './pages/driver/DriverTaskDetail'
import DriverTasks from './pages/driver/DriverTasks'
import SellerDashboard from './pages/seller/SellerDashboard'
import SellerOrders from './pages/seller/SellerOrders'
import SellerProducts from './pages/seller/SellerProducts'
import SellerStoreProfile from './pages/seller/SellerStoreProfile'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Umum + pelanggan */}
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="stores/:storeId" element={<StoreDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="orders/:orderId/success" element={<OrderSuccess />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="profile" element={<Profile />} />

          {/* Penjual (RoleGuard ditambahkan di Task 3) */}
          <Route path="seller">
            <Route index element={<SellerDashboard />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="store" element={<SellerStoreProfile />} />
          </Route>

          {/* Kurir */}
          <Route path="driver">
            <Route index element={<DriverDashboard />} />
            <Route path="tasks" element={<DriverTasks />} />
            <Route path="tasks/:orderId" element={<DriverTaskDetail />} />
            <Route path="history" element={<DriverHistory />} />
          </Route>

          {/* Admin */}
          <Route path="admin">
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="stores" element={<AdminStores />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
