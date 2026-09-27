import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useCart } from '../store/cartStore';

const primaryLinks = [
  ['/', 'Home'],
  ['/products', 'Products'],
  ['/markets', 'Markets'],
  ['/farmers', 'Farmers'],
  ['/about', 'About'],
  ['/contact', 'Contact']
];

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const nav = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const accountPath = user?.role === 'admin' ? '/admin' : user?.role === 'farmer' ? '/farmer' : '/dashboard';
  const cartCount = items.reduce((sum, item) => sum + Number(item.cartQty || 1), 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  function signout() {
    logout();
    setMenuOpen(false);
    nav('/');
  }

  return (
    <div className="app-shell">
      <ScrollManager />
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
        <Link className="brand brand-lockup" to="/" aria-label="MarketLink home">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span className="brand-word">Market<span>Link</span></span>
        </Link>

        <nav id="primary-navigation" className={menuOpen ? 'mobile-open' : ''} aria-label="Primary navigation">
          {primaryLinks.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
          <div className="mobile-account-links">
            {user ? (
              <>
                <Link to={accountPath}>Open dashboard</Link>
                {user.role === 'customer' && <Link to="/dashboard/favorites">Favorites</Link>}
                <Link to="/ai-assistant">AI assistant</Link>
                <button type="button" onClick={signout}>Logout</button>
              </>
            ) : (
              <><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></>
            )}
          </div>
        </nav>

        <div className="actions desktop-actions">
          {user ? (
            <>
              <Link to={accountPath} className="account-chip" aria-label={`Open ${user.role} dashboard`}>
                <span className="account-avatar">{String(user.name || 'U').slice(0, 1).toUpperCase()}</span>
                <span><small>{user.role}</small><b>{user.name}</b></span>
              </Link>
              <Link className="icon-action" to="/ai-assistant" aria-label="AI assistant" title="AI assistant">✦</Link>
              {user.role === 'customer' && <Link className="icon-action" to="/dashboard/favorites" aria-label="Favorites" title="Favorites">♡</Link>}
              <button className="icon-action logout-action" onClick={signout} aria-label="Logout" title="Logout">↗</button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login">Sign in</Link>
              <Link className="button small nav-join" to="/register">Join MarketLink</Link>
            </>
          )}
          <Link className="cart premium-cart" to="/cart" aria-label={`Basket with ${cartCount} items`}>
            <span aria-hidden="true">Bag</span><b>{cartCount}</b>
          </Link>
        </div>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span /><span />
        </button>
      </header>

      <main id="main-content" tabIndex="-1" className="page-stage" key={location.pathname}>{children}</main>

      <footer className="premium-footer">
        <div className="footer-brand-column">
          <Link className="brand brand-lockup footer-lockup" to="/">
            <span className="brand-mark" aria-hidden="true"><i /><i /></span>
            <span className="brand-word">Market<span>Link</span></span>
          </Link>
          <p>Fresh local food, transparent sourcing, and stronger connections between farmers and communities.</p>
          <span className="footer-note">Farm-to-market infrastructure for modern local commerce.</span>
        </div>
        <div><h4>Marketplace</h4><Link to="/products">Products</Link><Link to="/markets">Markets</Link><Link to="/farmers">Farmers</Link></div>
        <div><h4>Company</h4><Link to="/about">About</Link><Link to="/contact">Contact</Link>{user && <Link to="/ai-assistant">AI assistant</Link>}</div>
        <div><h4>Your account</h4><Link to={user ? accountPath : '/login'}>{user ? 'Dashboard' : 'Sign in'}</Link>{user?.role === 'customer' && <><Link to="/dashboard/orders">Orders</Link><Link to="/dashboard/favorites">Favorites</Link></>}<Link to="/cart">Basket</Link></div>
      </footer>
    </div>
  );
}
