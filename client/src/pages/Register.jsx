import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import GoogleSignInButton from '../components/common/GoogleSignInButton';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { register, googleLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Registration failed. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setIsGoogleLoading(true);
    setError('');

    try {
      await googleLogin(credential);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Google registration failed. Please try again.',
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (errorMsg) => {
    setError(errorMsg);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-brand-light via-brand-soft/30 to-brand-primary/20">
      <div className="w-full max-w-md bg-brand-light border border-brand-primary/30 rounded-2xl shadow-lg p-6 sm:p-8 text-left">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-brand-dark flex items-center justify-center text-brand-light font-bold text-2xl mx-auto shadow-sm mb-3.5">
            W
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-dark tracking-tight">Create an Account</h2>
          <p className="text-sm sm:text-base text-brand-dark/75 mt-1.5">
            Start tracking and syncing your daily work logs effortlessly
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-brand-soft border border-brand-dark/30 text-sm font-semibold text-brand-dark flex items-center gap-2.5">
            <svg className="w-5 h-5 text-brand-dark shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-brand-dark/60 hover:text-brand-dark text-sm p-1 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={isLoading || isGoogleLoading}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading || isGoogleLoading}
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading || isGoogleLoading}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading || isGoogleLoading}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            disabled={isGoogleLoading}
          >
            Create Account
          </Button>
        </form>

        {/* GIS Google Sign-In Button */}
        <GoogleSignInButton
          text="signup_with"
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          isLoading={isGoogleLoading}
          disabled={isLoading}
        />

        {/* Navigation to Login */}
        <div className="mt-6 text-center text-sm sm:text-base text-brand-dark/75 border-t border-brand-primary/20 pt-4">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-brand-dark hover:underline ml-1"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
