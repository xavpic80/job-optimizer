import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Zap } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form.email, form.password, form.fullName);
      navigate('/cv');
    } catch (err) {
      setError(err.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">JobOptimizer 3000</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-white">Create account</h2>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3">{error}</p>}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full name</label>
            <input
              type="text" value={form.fullName} onChange={set('fullName')} required
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email" value={form.email} onChange={set('email')} required
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input
              type="password" value={form.password} onChange={set('password')} required minLength={8}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-center text-sm text-slate-400">
            Already have one?{' '}
            <Link to="/login" className="text-cyan-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
