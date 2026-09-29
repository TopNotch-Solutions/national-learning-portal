import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import {
  apiPost,
  getStoredUser,
  homePathForRole,
  setSession,
  type PortalUser,
} from '../lib/api';

type LoginResponse = {
  token: string;
  user: PortalUser;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    const token = localStorage.getItem('edu_token');
    if (user && token) {
      navigate(homePathForRole(user.role), { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await apiPost<LoginResponse>('/api/auth/login', { email, password });
      setSession(data.token, data.user);
      navigate(homePathForRole(data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in as an admin or teacher to continue.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="auth-message error" role="alert">
            {error}
          </p>
        )}

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.na"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <div className="auth-password">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="auth-toggle"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="auth-actions">
          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="auth-link-row">
            <Link className="auth-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
