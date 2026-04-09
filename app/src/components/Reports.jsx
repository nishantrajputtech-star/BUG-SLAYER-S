import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { 
  FileDown, AlertTriangle, PackageX, CheckCircle, Send, ShieldCheck, Trash2, Loader2,
} from 'lucide-react';
import { useMedicines } from '../hooks/useMedicines';
import DeleteModal from './DeleteModal';

export default function Reports() {
  const { medicines: serverMedicines, loading, refetch } = useMedicines();
  const [medicines, setMedicines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync local data with server data
  useEffect(() => {
    if (serverMedicines) {
      setMedicines(serverMedicines);
    }
  }, [serverMedicines]);

  const storedRole = localStorage.getItem('bugslayer_role') || 'Pharmacist';
  const role = storedRole.trim();
  const fullName = localStorage.getItem('bugslayer_user') || 'Staff';
  const canApprove = role === 'Nurse' || role === 'Pharmacist';
  const isDistrictOfficer = role === 'District Officer';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── FILTER LOGIC ─────────────────────────────────────────────────────────
  const expiredMeds  = medicines.filter(m => new Date(m.expiryDate) < today);
  const outOfStock   = medicines.filter(m => m.quantity === 0);
  const criticalLow  = medicines.filter(m => m.quantity > 0 && m.quantity < 20);
  const lowStock     = medicines.filter(m => m.quantity >= 20 && m.quantity <= m.minThreshold);

  // ── DELETE TRIGGER ───────────────────────────────────────────────────────
  const handleDeleteTrigger = (e, med) => {
    e.preventDefault();
    e.stopPropagation();
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
      if (!res.ok) throw new Error("Delete operation failed on server");
      
      await refetch();
      setDeleteId(null);
    } catch (err) {
      setMedicines(previousState);
      alert(`Database error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── SUBMIT TO DISTRICT OFFICER ──────────────────────────────────────────
  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      const reportData = {
        submittedBy: fullName,
        submittedByRole: role,
        expiredCount: expiredMeds.length,
        outOfStockCount: outOfStock.length,
        lowStockCount: criticalLow.length + lowStock.length,
        expiredMeds: expiredMeds.map(m => ({ name: m.name, batchNo: m.batchNo, expiryDate: m.expiryDate, quantity: m.quantity })),
        outOfStockMeds: outOfStock.map(m => ({ name: m.name, batchNo: m.batchNo, minThreshold: m.minThreshold })),
        lowStockMeds: [...criticalLow, ...lowStock].map(m => ({ name: m.name, batchNo: m.batchNo, quantity: m.quantity, minThreshold: m.minThreshold })),
      };

      const token = localStorage.getItem('bugslayer_token');
      const res = await fetch('http://127.0.0.1:5000/api/reports', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });
      
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── PDF GENERATION ──────────────────────────────────────────────────────
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("BUG SLAYER'S - DISTRICT INVENTORY REPORT", 15, 25);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Facility: Village Sujan Pura`, 15, 33);

    let y = 50;

    const generateSection = (title, items, color) => {
      if (items.length === 0) return;
      
      doc.setFillColor(...color);
      doc.rect(15, y, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(title, 20, y + 6);
      
      y += 15;
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      
      items.forEach((item, index) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${index + 1}. ${item.name} (Batch: ${item.batchNo})`, 20, y);
        doc.text(`Qty: ${item.quantity} | Threshold: ${item.minThreshold} | Exp: ${item.expiryDate}`, 120, y);
        y += 7;
      });
      y += 5;
    };

    generateSection(`EXPIRED MEDICINES (${expiredMeds.length})`, expiredMeds, [180, 0, 0]);
    generateSection(`OUT OF STOCK (${outOfStock.length})`, outOfStock, [180, 80, 0]);
    generateSection(`CRITICAL LOW STOCK < 20 (${criticalLow.length})`, criticalLow, [220, 0, 0]);
    generateSection(`REORDER NEEDED (${lowStock.length})`, lowStock, [140, 100, 0]);

    doc.save('bugslayers-district-report.pdf');
  };

  if (loading && medicines.length === 0) {
    return (
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Preparing facility intelligence reports...</p>
      </div>
    );
  }

  return (
    <div className="page-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Reports</h1>
            <span style={{ 
              background: isDistrictOfficer ? '#e0f2fe' : '#f1f5f9', 
              color: isDistrictOfficer ? '#0369a1' : '#64748b',
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid' + (isDistrictOfficer ? '#bae6fd' : '#e2e8f0')
            }}>
              {isDistrictOfficer ? '🛡️ DISTRICT OFFICER ACCESS' : '👤 STAFF ACCESS'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Secure facility health insights for professional audit as <strong>{role}</strong>.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {canApprove && (
            <button 
              onClick={handleSubmitReport} 
              disabled={submitting || submitted}
              style={{ ...btnStyle, background: submitted ? '#10b981' : 'var(--primary-dark)' }}
            >
              {submitting ? 'Submitting...' : submitted ? <><CheckCircle size={18} /> Sent to DO</> : <><ShieldCheck size={18} /> Approve & Submit</>}
            </button>
          )}
          <button onClick={handleGeneratePDF} style={btnStyle}>
            <FileDown size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', margin: '28px 0' }}>
        <SummaryCard icon={<AlertTriangle size={22} color="#b91c1c" />} label="Expired" value={expiredMeds.length} bg="#fee2e2" text="#b91c1c" />
        <SummaryCard icon={<PackageX size={22} color="#b91c1c" />}      label="Critical Low" value={criticalLow.length}  bg="#fee2e2" text="#b91c1c" />
        <SummaryCard icon={<PackageX size={22} color="#92400e" />}      label="Out of Stock"      value={outOfStock.length}  bg="#fef3c7" text="#92400e" />
        <SummaryCard icon={<CheckCircle size={22} color="#065f46" />}  label="Healthy Stock"   value={medicines.length - expiredMeds.length - outOfStock.length - criticalLow.length} bg="#d1fae5" text="#065f46" />
      </div>

      {isDistrictOfficer && <DistrictMonitor expired={expiredMeds} outOfStock={outOfStock} />}

      <ReportTable meds={expiredMeds} type="expired" onDelete={handleDeleteTrigger} isDistrictOfficer={isDistrictOfficer} />
      <ReportTable meds={outOfStock} type="empty" onDelete={handleDeleteTrigger} isDistrictOfficer={isDistrictOfficer} />
      <ReportTable meds={criticalLow} type="critical" onDelete={handleDeleteTrigger} isDistrictOfficer={isDistrictOfficer} />

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

function SummaryCard({ icon, label, value, bg, text }) {
  return (
    <div style={{ background: bg, padding: '20px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '16px', border: `1px solid ${text}20` }}>
      <div style={{ background: 'white', padding: '10px', borderRadius: '12px', display: 'flex', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '1.5rem', fontWeight: '900', color: text }}>{value}</p>
        <p style={{ fontSize: '0.8rem', color: text, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      </div>
    </div>
  );
}

function DistrictMonitor({ expired, outOfStock }) {
  return (
    <div style={{ background: 'var(--primary-dark)', color: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', color: 'white' }}>District Compliance Monitor</h3>
        <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Active oversight for Village Sujan Pura Facility.</p>
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fca5a5' }}>{expired.length}</p>
          <p style={{ fontSize: '0.7rem', opacity: 0.8 }}>Exp. Risks</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fcd34d' }}>{outOfStock.length}</p>
          <p style={{ fontSize: '0.7rem', opacity: 0.8 }}>Stockouts</p>
        </div>
      </div>
    </div>
  );
}

function ReportTable({ meds, type, onDelete, isDistrictOfficer }) {
  const titles = {
    expired: "🚨 Expired Medicines",
    empty: "📦 Out of Stock Batches",
    critical: "⚠️ Critical Low Stock (< 20 units)"
  };

  return (
    <div style={{ marginBottom: '32px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{titles[type]}</h3>
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{meds.length} Items</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: '#fbfcfd' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Medicine Name</th>
              <th style={thStyle}>Batch No</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {meds.length > 0 ? meds.map(med => (
              <tr key={med._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>{new Date(med.updatedAt || Date.now()).toLocaleDateString()}</td>
                <td style={tdStyle}><strong>{med.name}</strong></td>
                <td style={tdStyle}>{med.batchNo}</td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                    background: type === 'expired' ? '#fee2e2' : '#fef3c7', 
                    color: type === 'expired' ? '#b91c1c' : '#92400e' 
                  }}>
                    {type === 'expired' ? 'Expired' : type === 'empty' ? 'Out of Stock' : 'Low Stock'}
                  </span>
                </td>
                <td style={tdStyle}>{med.quantity}</td>
                <td style={tdStyle}>
                  {isDistrictOfficer ? (
                    <button 
                      className="delete-btn-table"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                      onClick={(e) => onDelete(e, med)}
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🔒 DO Only
                    </span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No items found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' };
const tdStyle = { padding: '16px 24px', fontSize: '0.9rem' };
const btnStyle = { 
  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
  borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', 
  color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' 
};
