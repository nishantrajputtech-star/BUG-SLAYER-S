import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { useMedicines } from '../hooks/useMedicines';

// Returns color info based on days remaining
function getExpiryStatus(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { label: 'Expired', dot: '#ef4444', bg: '#fee2e2', text: '#b91c1c', daysLeft };
  } else if (daysLeft <= 30) {
    return { label: `${daysLeft}d left`, dot: '#ef4444', bg: '#fee2e2', text: '#b91c1c', daysLeft };
  } else if (daysLeft <= 90) {
    return { label: `${daysLeft}d left`, dot: '#f59e0b', bg: '#fef3c7', text: '#92400e', daysLeft };
  } else {
    return { label: `${daysLeft}d left`, dot: '#10b981', bg: '#d1fae5', text: '#065f46', daysLeft };
  }
}

export default function ExpiryAlerts() {
  const { medicines, loading } = useMedicines();

  if (loading) return <div>Loading...</div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort by expiry date ascending (most urgent first)
  const allMeds = [...medicines].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  const redMeds    = allMeds.filter(m => { const d = Math.floor((new Date(m.expiryDate) - today) / 86400000); return d <= 30; });
  const yellowMeds = allMeds.filter(m => { const d = Math.floor((new Date(m.expiryDate) - today) / 86400000); return d > 30 && d <= 90; });
  const greenMeds  = allMeds.filter(m => { const d = Math.floor((new Date(m.expiryDate) - today) / 86400000); return d > 90; });

  const renderTable = (meds) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Medicine Name</th>
          <th style={thStyle}>Batch No</th>
          <th style={thStyle}>Expiry Date</th>
          <th style={thStyle}>Days Left</th>
        </tr>
      </thead>
      <tbody>
        {meds.map(med => {
          const status = getExpiryStatus(med.expiryDate);
          return (
            <tr key={med._id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '14px 24px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: status.bg, color: status.text,
                  padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.dot, display: 'inline-block' }} />
                  {status.label}
                </span>
              </td>
              <td style={tdStyle}><strong>{med.name}</strong></td>
              <td style={tdStyle}>{med.batchNo}</td>
              <td style={{ ...tdStyle, color: status.text, fontWeight: '600' }}>{med.expiryDate}</td>
              <td style={{ ...tdStyle, color: status.text, fontWeight: '700' }}>
                {status.daysLeft < 0 ? `${Math.abs(status.daysLeft)}d ago` : `${status.daysLeft} days`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="page-header">
      <h1>Expiry Alerts</h1>
      <p>All medicines color-coded by urgency of expiry.</p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { dot: '#ef4444', bg: '#fee2e2', text: '#b91c1c', label: '🔴 Expired / ≤ 1 month — Urgent' },
          { dot: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: '🟡 1–3 months — Warning' },
          { dot: '#10b981', bg: '#d1fae5', text: '#065f46', label: '🟢 3+ months — Safe' },
        ].map(({ dot, bg, text, label }) => (
          <span key={label} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: bg, color: text, padding: '6px 14px', borderRadius: '20px',
            fontSize: '0.85rem', fontWeight: '600'
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Red Section — Urgent */}
      {redMeds.length > 0 && (
        <div style={{ marginBottom: '28px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '2px solid #ef4444', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', background: '#fee2e2', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertOctagon color="#ef4444" size={20} />
            <h2 style={{ color: '#b91c1c', fontSize: '1.1rem' }}>🔴 Critical — Expired or Expiring within 1 Month ({redMeds.length})</h2>
          </div>
          {renderTable(redMeds)}
        </div>
      )}

      {/* Yellow Section — Warning */}
      {yellowMeds.length > 0 && (
        <div style={{ marginBottom: '28px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '2px solid #f59e0b', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', background: '#fef3c7', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ color: '#92400e', fontSize: '1.1rem' }}>🟡 Warning — Expiring within 1–3 Months ({yellowMeds.length})</h2>
          </div>
          {renderTable(yellowMeds)}
        </div>
      )}

      {/* Green Section — Safe */}
      {greenMeds.length > 0 && (
        <div style={{ marginBottom: '28px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '2px solid #10b981', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', background: '#d1fae5', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ color: '#065f46', fontSize: '1.1rem' }}>🟢 Safe — More than 3 Months Remaining ({greenMeds.length})</h2>
          </div>
          {renderTable(greenMeds)}
        </div>
      )}

      {medicines.length === 0 && (
        <div style={{ marginTop: '24px', padding: '24px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
          <strong>No medicines in the inventory.</strong>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '12px 24px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '2px solid var(--border)', background: '#fafafa', fontSize: '0.85rem' };
const tdStyle = { padding: '14px 24px', color: 'var(--text-main)' };
