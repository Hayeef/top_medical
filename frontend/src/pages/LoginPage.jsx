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
  CheckCircle2,
  Shield,
  UserCheck,
  ShoppingCart
} from 'lucide-react';
import { authAPI } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [roleMode, setRoleMode] = useState('ADMIN'); // 'ADMIN' or 'CASHIER'
  const [email, setEmail] = useState('admin@topmedical.com');
  const [password, setPassword] = useState('AdminTopMedical11@');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectRole = (role) => {
    setRoleMode(role);
    setError(null);
    if (role === 'ADMIN') {
      setEmail('admin@topmedical.com');
      setPassword('AdminTopMedical11@');
    } else {
      setEmail('topmedicalnatekal@gmail.com');
      setPassword('Topmedical11@');
    }
  };

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
      {/* Soft Ambient decorative glow */}
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
        maxWidth: '480px',
        padding: '36px 32px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04)',
        position: 'relative',
        zIndex: 10
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)'
          }}>
            <HeartPulse size={28} color="#ffffff" strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            TOP MEDICAL PHARMACY
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
            Point of Sale & Inventory Management Portal
          </p>
        </div>

        {/* Role Selector Tabs (Admin vs Cashier) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: '#f8fafc',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => selectRole('ADMIN')}
            style={{
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              background: roleMode === 'ADMIN' ? '#ffffff' : 'transparent',
              color: roleMode === 'ADMIN' ? '#0284c7' : '#64748b',
              fontWeight: roleMode === 'ADMIN' ? 800 : 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: roleMode === 'ADMIN' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={15} color={roleMode === 'ADMIN' ? '#0284c7' : '#64748b'} />
            <span>Admin Access</span>
          </button>

          <button
            type="button"
            onClick={() => selectRole('CASHIER')}
            style={{
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              background: roleMode === 'CASHIER' ? '#ffffff' : 'transparent',
              color: roleMode === 'CASHIER' ? '#059669' : '#64748b',
              fontWeight: roleMode === 'CASHIER' ? 800 : 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: roleMode === 'CASHIER' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ShoppingCart size={15} color={roleMode === 'CASHIER' ? '#059669' : '#64748b'} />
            <span>Billing Staff</span>
          </button>
        </div>

        {/* Role Privileges Banner */}
        <div style={{
          padding: '8px 12px',
          background: roleMode === 'ADMIN' ? '#f0f9ff' : '#ecfdf5',
          border: `1px solid ${roleMode === 'ADMIN' ? '#bae6fd' : '#a7f3d0'}`,
          borderRadius: '8px',
          fontSize: '11.5px',
          color: roleMode === 'ADMIN' ? '#0369a1' : '#047857',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Sparkles size={14} />
          <span>
            {roleMode === 'ADMIN' 
              ? 'Admin: Full access, Inventory, AI Supplier Bill Inward, Reports & Settings'
              : 'Billing Staff: High-speed POS Billing, Patient Dispensing & Bill Reprinting'}
          </span>
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
          
          {/* Email / User ID */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              {roleMode === 'ADMIN' ? 'Admin Email / User ID' : 'Cashier User ID / Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="#0284c7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="email"
                required
                className="input-field mono"
                style={{ paddingLeft: '42px', height: '44px', fontSize: '13.5px', background: '#f8fafc' }}
                placeholder={roleMode === 'ADMIN' ? 'admin@topmedical.com' : 'topmedicalnatekal@gmail.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Password
            </label>
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
            className={`btn ${roleMode === 'ADMIN' ? 'btn-primary' : 'btn-emerald'} btn-lg`}
            style={{ width: '100%', height: '46px', marginTop: '6px', fontSize: '14.5px' }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In as {roleMode === 'ADMIN' ? 'Administrator' : 'Billing Staff'}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials Info Box */}
        <div style={{
          marginTop: '20px',
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          fontSize: '11.5px',
          color: '#475569'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Admin: <strong className="mono" style={{ color: '#0284c7' }}>admin@topmedical.com</strong></span>
            <span className="mono">AdminTopMedical11@</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Cashier: <strong className="mono" style={{ color: '#059669' }}>topmedicalnatekal@gmail.com</strong></span>
            <span className="mono">Topmedical11@</span>
          </div>
        </div>

        {/* Security & Compliance Footer */}
        <div style={{
          marginTop: '20px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} color="#059669" /> Role-Protected Access
          </span>
          <span>•</span>
          <span>DL 20B/21B Authorized</span>
        </div>
      </div>
    </div>
  );
}
