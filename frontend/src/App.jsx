import React, { Component, Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './store/authStore';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import { Loading } from './components/UI';
import {
  Home,
  Products,
  ProductDetails,
  Markets,
  MarketDetails,
  Farmers,
  FarmerDetails,
  About,
  Contact,
  AIAssistant
} from './pages/Public';

import './index.css';

const lazyNamed = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })));

const Login = lazyNamed(() => import('./pages/Auth'), 'Login');
const Register = lazyNamed(() => import('./pages/Auth'), 'Register');

const Dashboard = lazyNamed(() => import('./pages/Customer'), 'Dashboard');
const Cart = lazyNamed(() => import('./pages/Customer'), 'Cart');
const Checkout = lazyNamed(() => import('./pages/Customer'), 'Checkout');
const Orders = lazyNamed(() => import('./pages/Customer'), 'Orders');
const Favorites = lazyNamed(() => import('./pages/Customer'), 'Favorites');

const FarmerDashboard = lazyNamed(() => import('./pages/Farmer'), 'FarmerDashboard');
const FarmerProducts = lazyNamed(() => import('./pages/Farmer'), 'FarmerProducts');
const FarmerWeeklyStock = lazyNamed(() => import('./pages/Farmer'), 'FarmerWeeklyStock');
const FarmerOrders = lazyNamed(() => import('./pages/Farmer'), 'FarmerOrders');
const FarmerProfile = lazyNamed(() => import('./pages/Farmer'), 'FarmerProfile');
const FarmerPickupSlots = lazyNamed(() => import('./pages/Farmer'), 'FarmerPickupSlots');
const FarmerReviews = lazyNamed(() => import('./pages/Farmer'), 'FarmerReviews');

const Admin = lazyNamed(() => import('./pages/Admin'), 'Admin');
const AdminUsers = lazyNamed(() => import('./pages/Admin'), 'AdminUsers');
const AdminCategories = lazyNamed(() => import('./pages/Admin'), 'AdminCategories');
const AdminReports = lazyNamed(() => import('./pages/Admin'), 'AdminReports');
const AdminMarkets = lazyNamed(() => import('./pages/Admin'), 'AdminMarkets');
const AdminModeration = lazyNamed(() => import('./pages/Admin'), 'AdminModeration');
const AdminAnnouncements = lazyNamed(() => import('./pages/Admin'), 'AdminAnnouncements');

function Guard({ roles, children }) {
  const { user, loading } = useAuth();

  if (!user && loading) return <Loading label="Verifying your MarketLink session…" />;
  if (!user) return <Navigate to="/login" replace />;

  const currentRole = String(user?.role || '').toLowerCase();
  if (roles && !roles.map((role) => String(role).toLowerCase()).includes(currentRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('MarketLink render error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-state" role="alert">
          <div className="fatal-state-card">
            <span className="eyebrow">MARKETLINK · RECOVERY</span>
            <h1>We could not render this screen.</h1>
            <p>{this.state.error.message || 'An unexpected frontend error occurred.'}</p>
            <button className="button" onClick={() => window.location.reload()}>Reload MarketLink</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading label="Preparing your workspace…" />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:id" element={<MarketDetails />} />
        <Route path="/farmers" element={<Farmers />} />
        <Route path="/farmers/:id" element={<FarmerDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/ai-assistant" element={<Guard roles={['customer', 'farmer', 'admin']}><AIAssistant /></Guard>} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<Guard roles={['customer']}><Dashboard /></Guard>} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Guard roles={['customer']}><Checkout /></Guard>} />
        <Route path="/orders" element={<Guard roles={['customer']}><Orders /></Guard>} />
        <Route path="/favorites" element={<Guard roles={['customer']}><Favorites /></Guard>} />
        <Route path="/dashboard/orders" element={<Guard roles={['customer']}><Orders /></Guard>} />
        <Route path="/dashboard/favorites" element={<Guard roles={['customer']}><Favorites /></Guard>} />

        <Route path="/farmer" element={<Guard roles={['farmer']}><FarmerDashboard /></Guard>} />
        <Route path="/farmer/products" element={<Guard roles={['farmer']}><FarmerProducts /></Guard>} />
        <Route path="/farmer/weekly-stock" element={<Guard roles={['farmer']}><FarmerWeeklyStock /></Guard>} />
        <Route path="/farmer/orders" element={<Guard roles={['farmer']}><FarmerOrders /></Guard>} />
        <Route path="/farmer/profile" element={<Guard roles={['farmer']}><FarmerProfile /></Guard>} />
        <Route path="/farmer/pickup-slots" element={<Guard roles={['farmer']}><FarmerPickupSlots /></Guard>} />
        <Route path="/farmer/reviews" element={<Guard roles={['farmer']}><FarmerReviews /></Guard>} />

        <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        <Route path="/admin/users" element={<Guard roles={['admin']}><AdminUsers /></Guard>} />
        <Route path="/admin/categories" element={<Guard roles={['admin']}><AdminCategories /></Guard>} />
        <Route path="/admin/reports" element={<Guard roles={['admin']}><AdminReports /></Guard>} />
        <Route path="/admin/markets" element={<Guard roles={['admin']}><AdminMarkets /></Guard>} />
        <Route path="/admin/moderation" element={<Guard roles={['admin']}><AdminModeration /></Guard>} />
        <Route path="/admin/announcements" element={<Guard roles={['admin']}><AdminAnnouncements /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <SplashScreen />
        <Layout>
          <AppRoutes />
        </Layout>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
