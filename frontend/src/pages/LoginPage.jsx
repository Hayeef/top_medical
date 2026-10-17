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
import '../utils/styles/LoginPage.css';

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
    <div className="login-page-container">
      {/* Background ambient lighting */}
      <div className="login-ambient-1"></div>
      <div className="login-ambient-2"></div>

      {/* Unified Login Card */}
      <div className="login-card">
        
        {/* Brand Header with New Pharmacy Logo */}
        <div className="login-header">
          <div className="login-logo-container">
            <PharmacyLogo size={52} />
          </div>

          <h2 className="login-title">
            TOP MEDICAL PHARMACY
          </h2>
          <p className="login-subtitle">
            Authorized Personnel Login
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          
          {/* User ID / Email Input */}
          <div>
            <label className="login-label">
              User ID / Email
            </label>
            <div className="login-input-wrapper">
              <Mail size={17} color="#0284c7" className="login-input-icon" />
              <input
                type="text"
                required
                autoComplete="username"
                className="input-field login-input"
                placeholder="Enter User ID or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="login-label">
              Password
            </label>
            <div className="login-input-wrapper">
              <Lock size={17} color="#0284c7" className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="input-field login-input has-toggle"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
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
            className="btn btn-primary btn-lg login-submit-btn"
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
        <div className="login-footer">
          <span className="login-footer-badge">
            <ShieldCheck size={14} color="#059669" /> Secure POS Terminal
          </span>
          <span>•</span>
          <span>DL 20B/21B</span>
        </div>
      </div>
    </div>
  );
}
