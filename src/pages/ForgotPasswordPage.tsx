import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { apiPost } from '../lib/api';

type ForgotResponse = {
  message: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const data = await apiPost<ForgotResponse>('/api/auth/forgot-password', { email });
      setSuccess(data.message);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we’ll send reset instructions if an account exists."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="auth-message error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="auth-message success" role="status">
            {success}
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

        <div className="auth-actions">
          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
          <div className="auth-link-row">
            <Link className="auth-link" to="/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
