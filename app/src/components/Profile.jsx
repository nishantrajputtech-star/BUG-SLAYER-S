import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Save, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile({ onUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: ''
  });

  const roles = ['Pharmacist', 'Nurse', 'Store Manager', 'District Officer'];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const rawEmail = localStorage.getItem('bugslayer_email');
    if (!rawEmail) {
      setError('No user session found. Please log in again.');
      setLoading(false);
      return;
    }
    const email = rawEmail.trim();

    try {
      const token = localStorage.getItem('bugslayer_token');
      const res = await fetch(`http://127.0.0.1:5000/api/auth/profile/${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (data.success) {
        setFormData(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    const oldEmailRaw = localStorage.getItem('bugslayer_email');
    const oldEmail = oldEmailRaw ? oldEmailRaw.trim() : '';

    try {
      const token = localStorage.getItem('bugslayer_token');
      const res = await fetch(`http://127.0.0.1:5000/api/auth/profile/${encodeURIComponent(oldEmail)}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        // Update localStorage
        localStorage.setItem('bugslayer_user', data.data.fullName);
        localStorage.setItem('bugslayer_role', data.data.role);
        localStorage.setItem('bugslayer_email', data.data.email);
        
        if (onUpdate) onUpdate(); // Refresh App global state
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Profile Save Error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading your profile details...</p>
      </div>
    );
  }

  return (
    <div className="page-header" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} className="back-btn" style={backBtnStyle}>
          <ArrowLeft size={20} />
        </button>
        <h1>Manage Profile</h1>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* Profile Banner */}
        <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', height: '120px', position: 'relative' }}>
          <div style={avatarWrapperStyle}>
            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : <User />}
          </div>
        </div>

        <div style={{ padding: '60px 32px 32px' }}>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '24px' }}>
            
            <div style={inputGroupStyle}>
               <label style={labelStyle}><User size={16} /> Full Name</label>
               <input 
                 type="text" 
                 className="search-input" 
                 value={formData.fullName}
                 onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                 placeholder="Enter your full name"
                 style={{ width: '100%', padding: '12px 16px' }}
                 required
               />
            </div>

            <div style={inputGroupStyle}>
               <label style={labelStyle}><Mail size={16} /> Email Address</label>
               <input 
                 type="email" 
                 className="search-input" 
                 value={formData.email}
                 onChange={(e) => setFormData({...formData, email: e.target.value})}
                 placeholder="yourname@example.com"
                 style={{ width: '100%', padding: '12px 16px' }}
                 required
               />
            </div>

            <div style={inputGroupStyle}>
               <label style={labelStyle}><Shield size={16} /> Role & Permissions</label>
               <div style={roleGridStyle}>
                  {roles.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({...formData, role: r})}
                      style={{
                        ...roleCardStyle,
                        borderColor: formData.role === r ? 'var(--primary)' : 'var(--border)',
                        background: formData.role === r ? 'var(--primary-light)' : 'transparent',
                        color: formData.role === r ? 'var(--primary-dark)' : 'var(--text-muted)'
                      }}
                    >
                      {r === 'District Officer' && '🛡️ '}
                      {r}
                    </button>
                  ))}
               </div>
               <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Changing your role will immediately update your facility access level.
               </p>
            </div>

            {error && (
              <div style={errorBannerStyle}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {success && (
              <div style={successBannerStyle}>
                <CheckCircle size={18} /> Profile updated successfully!
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={saving}
                className="blue-submit-btn" 
                style={{ width: 'auto', minWidth: '180px' }}
              >
                {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const avatarWrapperStyle = {
  position: 'absolute',
  bottom: '-40px',
  left: '32px',
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  background: 'white',
  border: '4px solid white',
  boxShadow: 'var(--shadow-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  fontWeight: '900',
  color: 'var(--primary)',
  background: '#f8fafc'
};

const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' };
const backBtnStyle = { background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.2s' };

const roleGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '4px' };
const roleCardStyle = { 
  padding: '12px', borderRadius: 'var(--radius-md)', border: '2px solid', 
  cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', transition: 'all 0.2s',
  textAlign: 'center'
};

const errorBannerStyle = { padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' };
const successBannerStyle = { padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' };
