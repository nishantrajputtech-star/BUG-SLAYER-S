import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Pill, LayoutDashboard, PlusCircle, AlertTriangle, FileText, LogOut, User, Bell, X, Check, Award } from 'lucide-react';

import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import AddMedicine from './components/AddMedicine';
import ExpiryAlerts from './components/ExpiryAlerts';
import Reports from './components/Reports';
import ExecutiveAlerts from './components/ExecutiveAlerts';
import Auth from './components/Auth';

function Sidebar({ onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const username = localStorage.getItem('clinicsync_user') || 'Staff';
  const role = localStorage.getItem('clinicsync_role') || 'Guest';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{background: 'var(--primary-light)', padding: '8px', borderRadius: '8px'}}>
          <Pill className="logo-icon" color="var(--primary)" />
        </div>
        <h2>ClinicSync</h2>
      </div>
      
      <div style={{ padding: '24px 16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{background: 'var(--border)', padding: '8px', borderRadius: '50%'}}>
           <User size={18} color="var(--text-muted)" />
        </div>
        <div>
           <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{role}</p>
           <strong style={{fontSize: '0.9rem'}}>{username}</strong>
        </div>
      </div>

      <nav className="sidebar-nav" style={{flex: 1}}>
        {role === 'District Officer' && (
          <Link to="/executive-alerts" className={`nav-item ${isActive('/executive-alerts') ? 'active' : ''}`} style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', fontWeight: 'bold', marginBottom: '16px' }}>
            <Award className="nav-icon" /> Executive Alerts
          </Link>
        )}
        <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
          <LayoutDashboard className="nav-icon" /> Dashboard
        </Link>
        <Link to="/inventory" className={`nav-item ${isActive('/inventory') ? 'active' : ''}`}>
          <Pill className="nav-icon" /> Inventory
        </Link>
        <Link to="/add" className={`nav-item ${isActive('/add') ? 'active' : ''}`}>
          <PlusCircle className="nav-icon" /> Add Medicine
        </Link>
        <Link to="/alerts" className={`nav-item ${isActive('/alerts') ? 'active' : ''}`}>
          <AlertTriangle className="nav-icon" /> Expiry Alerts
        </Link>
        <Link to="/reports" className={`nav-item ${isActive('/reports') ? 'active' : ''}`}>
          <FileText className="nav-icon" /> Reports
        </Link>
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <button onClick={onLogout} className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}>
          <LogOut className="nav-icon" /> Log Out
        </button>
      </div>
    </aside>
  );
}

function Layout({ onLogout }) {
  const [notification, setNotification] = useState(null);
  const role = localStorage.getItem('clinicsync_role');

  // Check for new reports for District Officer
  useEffect(() => {
    if (role !== 'District Officer') return;

    const checkReports = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/reports/unread');
        const data = await res.json();
        if (data.success && data.reports.length > 0) {
          setNotification(data.reports[0]); // Show the latest one
        }
      } catch (err) {
        console.error("Failed to fetch reports");
      }
    };

    checkReports();
    const interval = setInterval(checkReports, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [role]);

  const closeNotification = async (markAsRead = false) => {
    if (markAsRead && notification) {
      await fetch(`http://localhost:5000/api/reports/${notification._id}/read`, { method: 'PATCH' });
    }
    setNotification(null);
  };

  return (
    <div className="app-layout">
      <Sidebar onLogout={onLogout} />
      <main className="main-content">
        <header className="mobile-header" style={{ justifyContent: 'space-between' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <Pill className="logo-icon" />
            <h2>ClinicSync</h2>
          </div>
          <button onClick={onLogout} style={{background:'transparent', border:'none', color:'var(--danger)'}}>
            <LogOut size={20} />
          </button>
        </header>

        {/* ── DISTRICT OFFICER NOTIFICATION POPUP ─────────────────────────── */}
        {notification && (
          <div style={notifOverlay}>
            <div style={notifModal}>
              <div style={notifHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell color="#b91c1c" size={20} />
                  <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>NEW REPORT SUBMITTED</span>
                </div>
                <button onClick={() => closeNotification(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ marginBottom: '12px' }}>A new inventory report has been submitted by <strong>{notification.submittedBy}</strong> ({notification.submittedByRole}).</p>
                <div style={notifStatsGrid}>
                  <div style={notifStatItem}><strong>{notification.expiredCount}</strong> Expired</div>
                  <div style={notifStatItem}><strong>{notification.outOfStockCount}</strong> Out of Stock</div>
                  <div style={notifStatItem}><strong>{notification.lowStockCount}</strong> Low Stock</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <Link to="/reports" onClick={() => closeNotification(true)} style={notifViewBtn}>
                    View Detailed Report &rarr;
                  </Link>
                  <button onClick={() => closeNotification(true)} style={notifAckBtn}>
                    <Check size={16} /> Acknowledge
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ── Notification Styles ──────────────────────────────────────────────────
const notifOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const notifModal = { background: 'white', borderRadius: 'var(--radius-lg)', width: '420px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' };
const notifHeader = { padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const notifStatsGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)' };
const notifStatItem = { fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' };
const notifViewBtn = { flex: 1, textAlign: 'center', background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: 'bold' };
const notifAckBtn = { background: '#f1f5f9', color: 'var(--text-main)', padding: '10px 16px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' };

function App() {
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem('clinicsync_auth');
    if (authStatus === 'true') {
      setIsAuth(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear(); // Clear all (auth, user, role)
    setIsAuth(false);
  };

  if (!isAuth) {
    return <Auth onLogin={setIsAuth} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout onLogout={handleLogout} />}>
        <Route index element={
          localStorage.getItem('clinicsync_role') === 'District Officer'
            ? <Navigate to="/reports" replace />
            : <Dashboard />
        } />
        <Route path="inventory" element={<Inventory />} />
        <Route path="add" element={<AddMedicine />} />
        <Route path="alerts" element={<ExpiryAlerts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="executive-alerts" element={<ExecutiveAlerts />} />
      </Route>
    </Routes>
  );
}

export default App;
