import React, { useMemo, useState } from 'react';
import { AlertCircle, PackageX, PackageSearch, AlertTriangle, Sparkles, Zap, Search, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMedicines } from '../hooks/useMedicines';
import { getAIPredictions } from '../services/AIPredictionService';

export default function Dashboard() {
  const { medicines, loading } = useMedicines();
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  const handleMedicineClick = (medName) => {
    setShowSearch(false);
    setSearchQuery('');
    navigate(`/inventory?search=${encodeURIComponent(medName)}`);
  };
  
  const aiInsights = useMemo(() => {
    return getAIPredictions(medicines).slice(0, 3);
  }, [medicines]);

  const handleStartScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setShowResults(true);
    }, 2500); 
  };

  if (loading) return <div className="page-header">Connecting to facility database...</div>;

  const today = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(today.getDate() + 90);
  
  const criticalExpiring = medicines.filter(m => new Date(m.expiryDate) < today);
  const expiringSoon = medicines.filter(m => {
    const expDate = new Date(m.expiryDate);
    return expDate >= today && expDate <= ninetyDaysFromNow;
  });
  
  const criticalLowAlerts = medicines.filter(m => m.quantity > 0 && m.quantity < 20);
  const outOfStock = medicines.filter(m => m.quantity === 0);
  const lowStockThreshold = medicines.filter(m => m.quantity > 0 && m.quantity <= m.minThreshold);
  
  const totalMedicinesCount = medicines.length;

  const searchResults = searchQuery.trim().length > 0
    ? medicines.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="page-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p>Real-time status of Village Sujan Pura facility.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* ── SEARCH BAR ── */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '2px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 16px', gap: '8px', transition: 'border-color 0.2s', ...(showSearch ? { borderColor: 'var(--primary)' } : {}) }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search medicine..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                style={{ border: 'none', outline: 'none', fontSize: '0.95rem', width: '220px', background: 'transparent', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}>✕</button>
              )}
            </div>
            {/* Dropdown Results */}
            {showSearch && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden', minWidth: '280px' }}>
                {searchResults.map(med => (
                  <div
                    key={med._id}
                    style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    onMouseDown={() => handleMedicineClick(med.name)}
                  >
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>{med.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batch: {med.batchNo} &nbsp;·&nbsp; Tap to view in Inventory →</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: med.quantity === 0 ? '#fee2e2' : med.quantity < 20 ? '#fef3c7' : '#d1fae5', color: med.quantity === 0 ? '#dc2626' : med.quantity < 20 ? '#92400e' : '#065f46' }}>
                      Qty: {med.quantity}
                    </span>
                  </div>
                ))}
                <Link to="/inventory" style={{ display: 'block', textAlign: 'center', padding: '10px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none', background: '#f8fafc' }}
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                >
                  View All in Inventory →
                </Link>
              </div>
            )}
            {showSearch && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', boxShadow: 'var(--shadow-lg)', zIndex: 100 }}>
                No medicines found for "{searchQuery}"
              </div>
            )}
          </div>
          <Link to="/add" style={{ background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            + Add New Entry
          </Link>
        </div>
      </div>

      {/* ── INTERACTIVE AI SCAN ─────────────────────────────────────────── */}
      <div className="scan-wrapper">
        {!showResults ? (
          <div className="scan-prompt-card" onClick={handleStartScan}>
            {isScanning && <div className="scanning-line" />}
            <h2 style={{ fontStyle: 'italic', fontWeight: '500' }}>
              "Do you want AI help for low stock prediction on your past days and smart expiry alert?"
            </h2>
            <button className="scan-cta-button">
              {isScanning ? <><Search className="pulse-ai" size={20} /> Analyzing Records...</> : <><Zap size={20} /> Yes, Get AI Predictions</>}
            </button>
          </div>
        ) : (
          <div className="ai-results-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ background: '#7c3aed', padding: '10px', borderRadius: '12px' }}><Sparkles color="white" size={24} /></div>
                 <div>
                    <h2 style={{ color: '#1e1b4b', fontSize: '1.4rem', marginBottom: '2px' }}>Inventory Intelligence Scan</h2>
                    <p style={{ fontSize: '0.85rem', color: '#6366f1' }}>Strategic predictive insights for proactive inventory management.</p>
                 </div>
              </div>
              <button onClick={() => setShowResults(false)} style={{ background: 'transparent', border: '1px solid #7c3aed', color: '#7c3aed', padding: '8px 20px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>Reset Scan</button>
            </div>

            {/* ── COLOR LEGEND — NATURAL EXPLANATION ──────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px', background: '#f8faff', padding: '16px', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
               <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></div>
                 <span><strong>AI Red</strong>: Means Stockout Risk (Running out in 1-2 days).</span>
               </div>
               <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#8b5cf6' }}></div>
                 <span><strong>Orange/Purple</strong>: Means Alert (Reorder or Expiry is close).</span>
               </div>
               <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }}></div>
                 <span><strong>Super Safe</strong>: Normal usage patterns detected. All clear.</span>
               </div>
            </div>

            <div className="ai-grid-vibrant">
              {aiInsights.map((insight, idx) => (
                <div key={idx} className="ai-card-vibrant">
                  <div className="ring-vibrant-bg">
                    <svg viewBox="0 0 36 36" width="80" height="80">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                      <circle 
                        className={insight.aiStatus === 'critical' ? 'stroke-vibrant-red' : insight.aiStatus === 'warning' ? 'stroke-vibrant-purp' : 'stroke-vibrant-green'}
                        cx="18" cy="18" r="16" fill="none" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${insight.aiRisk} 100`}
                      />
                    </svg>
                    <span className="ring-vibrant-percent" style={{ color: insight.aiStatus === 'critical' ? '#ef4444' : insight.aiStatus === 'warning' ? '#8b5cf6' : '#10b981' }}>
                      {insight.aiRisk}%
                    </span>
                  </div>
                  <div className="forecast-details">
                    <h4>{insight.name}</h4>
                    <p style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {insight.aiNaturalLabel}
                    </p>
                    <div className="forecast-msg">
                       {insight.aiMessage}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px' }} />
      {/* ── Manual Alerts Footer ────────────────────────────────────────── */}
      {(criticalLowAlerts.length > 0 || criticalExpiring.length > 0 || outOfStock.length > 0) && (
        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ background: '#e2e8f0', borderRadius: '50%', padding: '10px' }}>
            <Info color="var(--text-muted)" size={24} />
          </div>
          <div>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '1.1rem' }}>General Facility Status</h2>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <li>🔴 <strong>{criticalExpiring.length}</strong> items expired</li>
              <li>📦 <strong>{outOfStock.length}</strong> items out of stock</li>
              <li>⚠️ <strong>{criticalLowAlerts.length}</strong> items under 20 quantity</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '24px' }}>
        <StatCard 
          to="/inventory"
          icon={<PackageSearch color="var(--primary)" size={28} />} 
          label="Total Inventory Items" 
          value={totalMedicinesCount} 
        />
        <StatCard 
          to="/alerts"
          icon={<AlertCircle color="#b91c1c" size={28} />} 
          label="Expired Items" 
          value={criticalExpiring.length} 
          danger={criticalExpiring.length > 0} 
        />
        <StatCard 
          to="/inventory"
          icon={<AlertTriangle color="#f59e0b" size={28} />} 
          label="Low Stock Alert" 
          value={lowStockThreshold.length} 
          warning={lowStockThreshold.length > 0} 
        />
        <StatCard 
          to="/inventory"
          icon={<PackageX color="#92400e" size={28} />} 
          label="Out of Stock" 
          value={outOfStock.length} 
        />
      </div>

    </div>
  );
}

function StatCard({ icon, label, value, danger, warning, to }) {
  const bgColor = danger ? '#fee2e2' : warning ? '#fef3c7' : 'var(--surface)';
  const border = danger ? '1px solid #ef4444' : warning ? '1px solid #f59e0b' : 'none';
  
  return (
    <Link to={to} className="stat-card-link" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="stat-card" style={{ ...cardStyle, background: bgColor, border: border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          {icon}
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{label}</h3>
        </div>
        <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</p>
        <div style={{ marginTop: 'auto', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
           View Details &rarr;
        </div>
      </div>
    </Link>
  );
}

const cardStyle = { 
  padding: '24px', 
  borderRadius: 'var(--radius-lg)', 
  boxShadow: 'var(--shadow-md)', 
  display: 'flex', 
  flexDirection: 'column',
  height: '100%',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'pointer'
};
