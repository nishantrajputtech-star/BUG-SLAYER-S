import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, MapPin, Mail, ShieldCheck, Send } from 'lucide-react';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState('Pharmacist');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = ['Pharmacist', 'Nurse', 'Store Manager', 'District Officer'];

  // ── Step 1: Send OTP ─────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setInfo('✅ OTP sent! Check your inbox (or see your server terminal).');
      } else {
        setError(data.message || 'Could not send OTP');
      }
    } catch {
      setError('Cannot reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP + Reset ────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/auth/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsResetMode(false); setOtpSent(false); setIsLogin(true);
        setOtp(''); setPassword(''); setEmail('');
        setInfo('🎉 Password reset! You can now log in with your new password.');
      } else {
        setError(data.message || 'Reset failed');
      }
    } catch {
      setError('Cannot reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ── Login / Signup ─────────────────────────────────────────────────
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      if (isLogin) {
        // Login with email + password
        const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('bugslayer_token', data.token);
          localStorage.setItem('bugslayer_user', data.fullName || data.username || email);
          localStorage.setItem('bugslayer_role', data.role);
          localStorage.setItem('bugslayer_email', data.email);
          localStorage.setItem('bugslayer_auth', 'true');
          onLogin(true);
        } else {
          setError(data.message || 'Invalid login credentials');
        }
      } else {
        // Signup — email is used as username
        const res = await fetch('http://127.0.0.1:5000/api/auth/signup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, email, password, fullName, role }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('bugslayer_token', data.token);
          localStorage.setItem('bugslayer_user', fullName || email);
          localStorage.setItem('bugslayer_role', role);
          localStorage.setItem('bugslayer_email', email);
          localStorage.setItem('bugslayer_auth', 'true');
          onLogin(true);
        } else {
          setError(data.message || 'Sign up failed');
        }
      }
    } catch {
      setError('Cannot reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setIsResetMode(false); setOtpSent(false); setIsLogin(true);
    setError(''); setInfo(''); setOtp(''); setPassword(''); setEmail('');
  };

  const heading = isResetMode
    ? (otpSent ? 'Enter OTP & New Password' : 'Forgot Password')
    : (isLogin ? 'Staff Login' : 'Staff Registration');
  const subtext = isResetMode
    ? (otpSent ? 'Verify the OTP sent to your email' : 'Enter your registered email to receive an OTP')
    : 'Access your inventory & health dashboard';

  return (
    <div className="auth-wrapper">
      <div className="auth-box">

        <div className="location-badge">
          <MapPin size={16} />
          <span>Inventory of Village Sujan Pura, Bhind (M.P.)</span>
        </div>

        <div className="auth-header-text">
          <h1>{heading}</h1>
          <p>{subtext}</p>
        </div>

        {error && <div className="auth-error-msg">{error}</div>}
        {info  && <div className="auth-info-msg">{info}</div>}

        {/* ══════════════ RESET FLOW ══════════════ */}
        {isResetMode ? (
          <form onSubmit={otpSent ? handleReset : handleSendOtp} className="auth-form-body">

            <div className="otp-steps">
              <div className={`otp-step ${!otpSent ? 'active' : 'done'}`}>
                <span>1</span> Verify Email
              </div>
              <div className="otp-step-line" />
              <div className={`otp-step ${otpSent ? 'active' : ''}`}>
                <span>2</span> Set New Password
              </div>
            </div>

            {/* Email — always shown */}
            <div className="input-block">
              <label>REGISTERED EMAIL</label>
              <div className="input-with-icon">
                <Mail size={18} className="icon-left" />
                <input
                  type="email" placeholder="name@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required disabled={otpSent}
                />
              </div>
            </div>

            {/* Step 2: OTP + New Password */}
            {otpSent && (
              <>
                <div className="input-block">
                  <label>6-DIGIT OTP</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={18} className="icon-left" />
                    <input
                      type="text" placeholder="e.g. 482910"
                      maxLength={6} value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>

                <div className="input-block">
                  <label>NEW PASSWORD</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="icon-left" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="icon-right-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="password-strength">
                      <div className="strength-bars">
                        <div className={`bar ${password.length > 4 ? 'active' : ''}`}></div>
                        <div className={`bar ${password.length > 8 ? 'active' : ''}`}></div>
                        <div className={`bar ${password.length > 12 ? 'active' : ''}`}></div>
                      </div>
                      <span className="strength-text">
                        {password.length > 12 ? 'Strong' : password.length > 8 ? 'Good' : password.length > 4 ? 'Fair' : 'Weak'}
                      </span>
                    </div>
                  )}
                </div>

                <button type="button" className="resend-otp-btn"
                  onClick={() => { setOtpSent(false); setOtp(''); setInfo(''); setError(''); }}>
                  ↩ Wrong email? Go back
                </button>
              </>
            )}

            <button type="submit" className="blue-submit-btn" disabled={loading}>
              {loading ? 'Please wait…' : otpSent
                ? <><ShieldCheck size={16} style={{marginRight:6}}/>Verify & Reset Password</>
                : <><Send size={16} style={{marginRight:6}}/>Send OTP to Email</>
              }
            </button>
          </form>

        ) : (
        /* ══════════════ LOGIN / SIGNUP FLOW ══════════════ */
          <form onSubmit={handleAuthSubmit} className="auth-form-body">

            {/* Full Name — signup only */}
            {!isLogin && (
              <div className="input-block">
                <label>FULL NAME</label>
                <div className="input-with-icon">
                  <User size={18} className="icon-left" />
                  <input type="text" placeholder="E.g. Nishant Rajput"
                    value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>
            )}

            {/* Email — always shown */}
            <div className="input-block">
              <label>EMAIL ADDRESS</label>
              <div className="input-with-icon">
                <Mail size={18} className="icon-left" />
                <input type="email" placeholder="name@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            {/* Password */}
            <div className="input-block">
              <label>PASSWORD</label>
              <div className="input-with-icon">
                <Lock size={18} className="icon-left" />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="icon-right-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password.length > 0 && !isLogin && (
                <div className="password-strength">
                  <div className="strength-bars">
                    <div className={`bar ${password.length > 4 ? 'active' : ''}`}></div>
                    <div className={`bar ${password.length > 8 ? 'active' : ''}`}></div>
                    <div className={`bar ${password.length > 12 ? 'active' : ''}`}></div>
                  </div>
                  <span className="strength-text">
                    {password.length > 12 ? 'Strong' : password.length > 8 ? 'Good' : password.length > 4 ? 'Fair' : 'Weak'}
                  </span>
                </div>
              )}
            </div>

            {/* Role — signup only */}
            {!isLogin && (
              <div className="input-block">
                <label>ROLE</label>
                <div className="role-grid">
                  {roles.map(r => (
                    <button type="button" key={r}
                      className={`role-btn ${role === r ? 'selected' : ''}`}
                      onClick={() => setRole(r)}>{r}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="auth-actions">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              {isLogin && (
                <a href="#" className="forgot-pwd"
                  onClick={(e) => { e.preventDefault(); setIsResetMode(true); setError(''); setInfo(''); }}>
                  Forgot password?
                </a>
              )}
            </div>

            <button type="submit" className="blue-submit-btn" disabled={loading}>
              {loading ? 'Please wait…' : isLogin ? 'Sign in to dashboard' : 'Register Account'}
            </button>
          </form>
        )}

        <div className="toggle-auth-mode">
          {isResetMode ? (
            <p>Remembered it? <span onClick={resetAll}>Back to Login</span></p>
          ) : (
            <p>
              {isLogin ? "Don't have an account? " : 'Already registered? '}
              <span onClick={() => { setIsLogin(!isLogin); setError(''); setInfo(''); }}>
                {isLogin ? 'Sign up' : 'Log in'}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
