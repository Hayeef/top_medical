import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle
} from 'lucide-react';
import PharmacyLogo from '../components/PharmacyLogo';
import { authAPI } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both your User ID / Email and Password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login({
        email: identifier.trim(),
        password: password,
      });

      if (response && response.success) {
        localStorage.setItem('tm_auth_user', JSON.stringify(response.user));
        localStorage.setItem('tm_auth_token', response.token);
        onLoginSuccess(response.user);
      } else {
        setError(response?.error || 'Invalid credentials. Access denied.');
      }
    } catch (err) {
      setError(err.message || 'Invalid User ID or Password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #f0f9ff 100%)',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(2, 132, 199, 0.08) 0%, transparent 70%)',
        top: '-80px',
        right: '-80px',
        borderRadius: '50%',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        bottom: '-80px',
        left: '-80px',
        borderRadius: '50%',
        pointerEvents: 'none'
      }}></div>

      {/* Unified Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '430px',
        padding: '36px 28px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04)',
        position: 'relative',
        zIndex: 10
      }}>
        
        {/* Brand Header with New Pharmacy Logo */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.2)'
          }}>
            <PharmacyLogo size={52} />
          </div>

          <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            TOP MEDICAL PHARMACY
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Authorized Personnel Login
          </p>
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
            marginBottom: '18px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* User ID / Email Input */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              User ID / Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="#0284c7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="text"
                required
                autoComplete="username"
                className="input-field"
                style={{ paddingLeft: '42px', height: '44px', fontSize: '14px', background: '#f8fafc', borderColor: '#cbd5e1' }}
                placeholder="Enter User ID or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="#0284c7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="input-field"
                style={{ paddingLeft: '42px', paddingRight: '42px', height: '44px', fontSize: '14px', background: '#f8fafc', borderColor: '#cbd5e1' }}
                placeholder="Enter Password"
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

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', height: '46px', marginTop: '6px', fontSize: '14.5px' }}
          >
            {loading ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div style={{
          marginTop: '22px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11.5px',
          color: '#64748b'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#059669" /> Secure POS Terminal
          </span>
          <span>•</span>
          <span>DL 20B/21B</span>
        </div>
      </div>
    </div>
  );
}
