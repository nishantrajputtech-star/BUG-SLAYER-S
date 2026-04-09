import React, { useState, useEffect } from 'react';
import { AlertTriangle, PackageX, Loader2, Trash2 } from 'lucide-react';
import { useMedicines } from '../hooks/useMedicines';
import DeleteModal from './DeleteModal';

export default function ExecutiveAlerts() {
  const { medicines: serverMedicines, loading, refetch } = useMedicines();
  const [medicines, setMedicines] = useState([]);
  
  // Modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (serverMedicines) setMedicines(serverMedicines);
  }, [serverMedicines]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── FILTER CRITICAL DATA ONLY ───────────────────────────────────────────
  const expiredMeds = medicines.filter(m => new Date(m.expiryDate) < today);
  const outOfStock = medicines.filter(m => m.quantity === 0);

  const handleDeleteTrigger = (med) => {
    setDeleteId(med._id);
    setDeleteName(med.name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const previousState = [...medicines];
    setMedicines(prev => prev.filter(m => m._id !== deleteId));

    try {
      const token = localStorage.getItem('bugslayer_token');
      const res = await fetch(`http://127.0.0.1:5000/api/inventory/${deleteId}`, { 
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Delete failed");
      await refetch();
      setDeleteId(null);
    } catch (err) {
      setMedicines(previousState);
      alert(`Critical Deletion Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && medicines.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading Executive Intel...</p>
      </div>
    );
  }

  return (
    <div className="page-header" style={{ paddingTop: '24px' }}>
      <h1>Executive Priority Alerts</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
        Immediate action required for high-risk inventory items.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <ExecutiveCard 
          icon={<AlertTriangle size={24} color="#dc2626" />} 
          label="Expired Batches" 
          value={expiredMeds.length} 
          borderColor="#fee2e2"
        />
        <ExecutiveCard 
          icon={<PackageX size={24} color="#d97706" />} 
          label="Empty Stock Alert" 
          value={outOfStock.length} 
          borderColor="#fef3c7"
        />
      </div>

      <AlertSection title="🔴 Expired Medicines (Immediate Removal Needed)" items={expiredMeds} type="expired" onAction={handleDeleteTrigger} />
      <AlertSection title="📦 Out of Stock Batches" items={outOfStock} type="empty" onAction={handleDeleteTrigger} />

      <DeleteModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        itemName={deleteName}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function ExecutiveCard({ icon, label, value, borderColor }) {
  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', border: `2px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '50%' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>{label}</p>
      </div>
    </div>
  );
}

function AlertSection({ title, items, type, onAction }) {
  return (
    <div style={{ marginBottom: '32px', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{title}</h2>
      </div>
      <div style={{ padding: items.length > 0 ? '0' : '32px' }}>
        {items.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f1f5f9' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Batch</th>
                <th style={thStyle}>{type === 'expired' ? 'Expiry Date' : 'Current Qty'}</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}><strong>{item.name}</strong></td>
                  <td style={tdStyle}>{item.batchNo}</td>
                  <td style={{ ...tdStyle, color: '#dc2626', fontWeight: 'bold' }}>{type === 'expired' ? item.expiryDate : item.quantity}</td>
                  <td style={tdStyle}>
                    <button 
                      onClick={() => onAction(item)}
                      style={actionBtn}
                    >
                      <Trash2 size={16} /> Discard & Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>✅ No critical issues found in this category.</p>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: '12px 24px', fontSize: '0.85rem', color: '#64748b' };
const tdStyle = { padding: '16px 24px', fontSize: '0.95rem' };
const actionBtn = { background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' };
