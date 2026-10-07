import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { CreditCard, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-950">
      <div className="w-full max-w-md space-y-8 glass-card border border-white/5 bg-slate-900/40 p-8 rounded-3xl shadow-xl">
        <div className="flex flex-col items-center">
          <div className="p-3 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
            Sign in to <span className="text-indigo-400">ExpensePilot</span>
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Or{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
              onboard your company admin
            </Link>
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email', { required: 'Email address is required' })}
                className="block w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-400 font-semibold">{errors.email.message}</p>
              )}
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className="block w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-400 font-semibold">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <Link to="/verify-email" className="text-indigo-400 hover:text-indigo-300 hover:underline">
              Verify Account Token
            </Link>
            <span className="text-slate-500">ExpensePilot Auth</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold tracking-wide"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-white/5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quick Demo One-Click Fill</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                const emailInput = document.getElementById('email');
                const passInput = document.getElementById('password');
                if (emailInput && passInput) {
                  emailInput.value = 'admin@testcorp.com';
                  passInput.value = 'testpassword123';
                  emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                  passInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 hover:border-indigo-500/50 text-slate-300 text-[11px] transition-all"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => {
                const emailInput = document.getElementById('email');
                const passInput = document.getElementById('password');
                if (emailInput && passInput) {
                  emailInput.value = 'employee@testcorp.com';
                  passInput.value = 'employee123';
                  emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                  passInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 hover:border-indigo-500/50 text-slate-300 text-[11px] transition-all"
            >
              Employee Demo
            </button>
            <button
              type="button"
              onClick={() => {
                const emailInput = document.getElementById('email');
                const passInput = document.getElementById('password');
                if (emailInput && passInput) {
                  emailInput.value = 'hr@testcorp.com';
                  passInput.value = 'hr123';
                  emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                  passInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 hover:border-indigo-500/50 text-slate-300 text-[11px] transition-all"
            >
              HR Demo
            </button>
            <button
              type="button"
              onClick={() => {
                const emailInput = document.getElementById('email');
                const passInput = document.getElementById('password');
                if (emailInput && passInput) {
                  emailInput.value = 'auditor@testcorp.com';
                  passInput.value = 'auditor123';
                  emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                  passInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 hover:border-indigo-500/50 text-slate-300 text-[11px] transition-all"
            >
              Auditor Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
