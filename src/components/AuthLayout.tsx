import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import './Auth.css';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <div className="auth-bg" aria-hidden="true" />
        <div className="auth-scrim" aria-hidden="true" />
        <div className="auth-hero-content">
          <Link to="/login" className="auth-brand-mark">
            Edu Learning Namibia
          </Link>
          <p className="auth-hero-line">Learning that reaches every classroom.</p>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel-inner">
          <header className="auth-heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
