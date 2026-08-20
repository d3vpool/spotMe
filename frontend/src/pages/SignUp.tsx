import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@services/auth.service';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Card } from '@components/ui/Card';
import { useToast } from '../contexts/ToastContext';

export const SignUp: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register({ firstName, email, password });
      showToast('Account created successfully', 'success');
      navigate('/events');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dot-grid background handled by global body::before */}

      <Card className="w-full max-w-md p-8 md:p-10 bg-surface-dark/20 border-border-dark relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Create Account</h1>
          <p className="text-gray-400 text-sm">Join SpotMe today</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <Input
            label="First Name"
            type="text"
            placeholder="John Doe"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Button type="submit" className="w-full py-3.5 text-base mt-2" isLoading={loading}>
            Sign Up
          </Button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-yellow font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none rounded">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
};
