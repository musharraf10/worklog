import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import GoogleSignInButton from '../components/common/GoogleSignInButton';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login, googleLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Login failed. Please check your credentials.',
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
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Google authentication failed. Please try again.',
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-dark tracking-tight">Sign in to WorkLog</h2>
          <p className="text-sm sm:text-base text-brand-dark/75 mt-1.5">
            Welcome back! Please enter your details.
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

        {/* Traditional Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
            Sign In
          </Button>
        </form>

        {/* GIS Google Sign-In Button */}
        <GoogleSignInButton
          text="signin_with"
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          isLoading={isGoogleLoading}
          disabled={isLoading}
        />

        {/* Navigation to Register */}
        <div className="mt-6 text-center text-sm sm:text-base text-brand-dark/75 border-t border-brand-primary/20 pt-4">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-bold text-brand-dark hover:underline ml-1"
          >
            Sign up now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
