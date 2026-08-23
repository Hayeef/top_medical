import React, { useState } from 'react';
import { 
  HeartPulse, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { authAPI } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('topmedicalnatekal@gmail.com');
  const [password, setPassword] = useState('Topmedical11@');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login({
        email: email.trim(),
        password: password,
      });

      if (response && response.success) {
        localStorage.setItem('tm_auth_user', JSON.stringify(response.user));
        localStorage.setItem('tm_auth_token', response.token);
        onLoginSuccess(response.user);
      } else {
        setError(response?.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const autofillCredentials = () => {
    setEmail('topmedicalnatekal@gmail.com');
    setPassword('Topmedical11@');
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #f0f9ff 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Soft Ambient decorative blobs */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(2, 132, 199, 0.08) 0%, transparent 70%)',
        top: '-100px',
        right: '-100px',
        borderRadius: '50%',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        bottom: '-100px',
        left: '-100px',
        borderRadius: '50%',
        pointerEvents: 'none'
      }}></div>

      {/* Main Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        padding: '40px 36px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04)',
        position: 'relative',
        zIndex: 10
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '58px',
            height: '58px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)'
          }}>
            <HeartPulse size={30} color="#ffffff" strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            TOP MEDICAL PHARMACY
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Point of Sale & Inventory Management System
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
            <span className="pulse-dot"></span>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>Pharmacy Server Online</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            color: '#e11d48',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Email / User ID */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Registered Email / User ID
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="#0284c7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="email"
                required
                className="input-field mono"
                style={{ paddingLeft: '42px', height: '44px', fontSize: '13.5px', background: '#f8fafc' }}
                placeholder="topmedicalnatekal@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Password
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Topmedical11@</span>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="#0284c7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field"
                style={{ paddingLeft: '42px', paddingRight: '42px', height: '44px', fontSize: '14px', background: '#f8fafc' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '11px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', height: '46px', marginTop: '6px', fontSize: '14.5px' }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Pharmacy Portal</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Quick Autofill Helper for convenience */}
        <div style={{
          marginTop: '22px',
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '11.5px', color: '#475569' }}>
            <div>User: <strong className="mono" style={{ color: '#0284c7' }}>topmedicalnatekal@gmail.com</strong></div>
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Pass: <strong className="mono">Topmedical11@</strong></div>
          </div>
          <button
            type="button"
            onClick={autofillCredentials}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            <KeyRound size={12} color="#0284c7" /> Autofill
          </button>
        </div>

        {/* Security & Compliance Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} color="#059669" /> 256-Bit Encrypted
          </span>
          <span>•</span>
          <span>DL 20B/21B Authorized</span>
        </div>
      </div>
    </div>
  );
}
