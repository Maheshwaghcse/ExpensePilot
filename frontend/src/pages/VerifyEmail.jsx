import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const tokenFromUrl = searchParams.get('token') || '';
  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [status, setStatus] = useState('idle'); // 'idle' | 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const executeVerification = async (tokenToVerify) => {
    if (!tokenToVerify) {
      setStatus('error');
      setMessage('Please enter a valid verification token.');
      return;
    }

    setStatus('verifying');
    setMessage('');

    try {
      const res = await api.post('/auth/verify-email', { token: tokenToVerify });
      setStatus('success');
      setMessage(res.data.message || 'Email verified successfully! You can now log in.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to verify email. The token may be invalid or expired.');
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      executeVerification(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    executeVerification(tokenInput);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-950">
      <div className="w-full max-w-md space-y-8 glass-card border border-white/5 bg-slate-900/40 p-8 rounded-3xl shadow-xl text-center">
        <div className="flex flex-col items-center">
          <div className="p-3.5 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-white tracking-tight">
            Account Verification
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Verify your ExpensePilot account to enable system access
          </p>
        </div>

        {status === 'verifying' && (
          <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs font-semibold">Verifying your account token with server...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-4">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <p className="text-xs font-bold leading-relaxed">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-gradient w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            <XCircle className="w-8 h-8 mx-auto text-rose-400 mb-2" />
            <p>{message}</p>
          </div>
        )}

        {status !== 'success' && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <div>
              <label htmlFor="token" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Verification Token
              </label>
              <input
                id="token"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste token here if not filled"
                className="block w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'verifying' || !tokenInput}
              className="btn-gradient w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'verifying' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verify Account Token'
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-white/5">
          <Link to="/login" className="text-xs text-slate-400 hover:text-white font-semibold transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
