import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser } from '../lib/api';
import './PortalShell.css';

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
};

type PortalShellProps = {
  title: string;
  nav: NavItem[];
};

function initialsFromName(name?: string) {
  if (!name?.trim()) return 'U';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'U';
}

function NavIcon({ path }: { path: string }) {
  if (path.endsWith('/admin') || path.endsWith('/teacher')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (path.includes('/admins') || path.includes('/teachers')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M16 19v-1.2A3.8 3.8 0 0 0 12.2 14H7.8A3.8 3.8 0 0 0 4 17.8V19M14.5 8.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm5.5 10.5v-.9A3.1 3.1 0 0 0 17 14.6m0-8.1a2.5 2.5 0 0 1 0 4.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (path.includes('/content')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M14 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (path.includes('/quizzes')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 9.5a3 3 0 1 1 4.2 2.75c-.8.4-1.2.95-1.2 1.75M12 17h.01M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (path.includes('/exams')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 9h6M9 13h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function PortalShell({ title, nav }: PortalShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();
  const initials = initialsFromName(user?.name);
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((open) => !open);
  }

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');

    function syncDesktop(matches: boolean) {
      if (matches) closeMenu();
    }

    syncDesktop(media.matches);
    const onChange = (event: MediaQueryListEvent) => syncDesktop(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('shell-nav-locked');

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('shell-nav-locked');
    };
  }, [menuOpen]);

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className={`shell${menuOpen ? ' is-nav-open' : ''}`}>
      <header className="shell-topbar">
        <div className="shell-topbar-brand">
          <div className="shell-brand-mark" aria-hidden="true">
            EL
          </div>
          <div className="shell-brand-copy">
            <p className="shell-brand-name">Edu Learning</p>
            <p className="shell-brand-area">{title}</p>
          </div>
        </div>
        <button
          className="shell-menu-btn"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="shell-sidebar"
          onClick={toggleMenu}
        >
          <span className="shell-menu-btn-bars" aria-hidden="true" />
        </button>
      </header>

      <button
        type="button"
        className="shell-backdrop"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <aside id="shell-sidebar" className="shell-sidebar">
        <div className="shell-brand">
          <div className="shell-brand-mark" aria-hidden="true">
            EL
          </div>
          <div className="shell-brand-copy">
            <p className="shell-brand-name">Edu Learning</p>
            <p className="shell-brand-area">{title}</p>
          </div>
          <button
            className="shell-sidebar-close"
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            ×
          </button>
        </div>

        <nav className="shell-nav" aria-label="Portal navigation">
          <p className="shell-nav-label">Menu</p>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'shell-nav-link active' : 'shell-nav-link'
              }
              onClick={closeMenu}
            >
              <span className="shell-nav-icon">
                <NavIcon path={item.to} />
              </span>
              <span className="shell-nav-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-user">
          <div className="shell-user-card">
            <div className="shell-user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="shell-user-copy">
              <p className="shell-user-name">{user?.name}</p>
              <p className="shell-user-meta">{user?.email}</p>
            </div>
          </div>
          <button className="shell-logout" type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
