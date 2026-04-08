import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { FileDown, AlertTriangle, PackageX, CheckCircle, Send, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
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

  const role = localStorage.getItem('clinicsync_role') || 'Pharmacist';
  const fullName = localStorage.getItem('clinicsync_user') || 'Staff';
  const canApprove = role === 'Nurse' || role === 'Pharmacist';

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
      const res = await fetch(`http://localhost:5000/api/inventory/${deleteId}`, { 
        method: 'DELETE'
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

      const res = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (err) {
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePDF = () => {
    if (loading) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('ClinicSync — District Health Report', 14, 18);
    doc.setFontSize(11);
    doc.text(`Facility: Village Sujan Pura, Bhind (M.P.)`, 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
    let y = 48;

    const generateSection = (title, rows, color) => {
      if (rows.length === 0) return;
      doc.setFontSize(13); doc.setTextColor(...color);
      doc.text(title, 14, y); y += 2;
      doc.line(14, y, 196, y); y += 7;
      doc.setTextColor(0, 0, 0); doc.setFontSize(10);
      rows.forEach(med => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(med.name, 14, y);
        doc.text(med.batchNo, 90, y);
        doc.text(med.expiryDate || '—', 130, y);
        doc.text(`Qty: ${med.quantity}`, 168, y);
        y += 8;
      });
      y += 8;
    };

    generateSection(`EXPIRED MEDICINES (${expiredMeds.length})`, expiredMeds, [180, 0, 0]);
    generateSection(`OUT OF STOCK (${outOfStock.length})`, outOfStock, [180, 80, 0]);
    generateSection(`CRITICAL LOW STOCK < 20 (${criticalLow.length})`, criticalLow, [220, 0, 0]);
    generateSection(`REORDER NEEDED (${lowStock.length})`, lowStock, [140, 100, 0]);

    doc.save('clinicsync-district-report.pdf');
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
          <h1>Reports</h1>
          <p style={{ color: 'var(--text-muted)' }}>Secure facility health insights for professional district audit.</p>
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

      <ReportSection 
        title="🔴 Expired Medicines" 
        color="#b91c1c" bg="#fee2e2" border="#ef4444" 
        empty="✅ No expired medicines currently in stock."
      >
        {expiredMeds.length > 0 && (
          <ReportTable meds={expiredMeds} type="expired" onDelete={handleDeleteTrigger} />
        )}
      </ReportSection>

      <ReportSection 
        title="💥 Critical Low Alert (Quantity < 20)" 
        color="#b91c1c" bg="#fee2e2" border="#ef4444" 
        empty="✅ All items maintain safe operational levels."
      >
        {criticalLow.length > 0 && (
          <ReportTable meds={criticalLow} type="critical" onDelete={handleDeleteTrigger} />
        )}
      </ReportSection>

      <ReportSection 
        title="📦 Out of Stock" 
        color="#92400e" bg="#fef3c7" border="#f59e0b" 
        empty="✅ Full inventory availability detected."
      >
        {outOfStock.length > 0 && (
          <ReportTable meds={outOfStock} type="empty" onDelete={handleDeleteTrigger} />
        )}
      </ReportSection>

      <ReportSection 
        title="⚠️ Regular Reorder List (Below Threshold)" 
        color="#0369a1" bg="#e0f2fe" border="#38bdf8" 
        empty="✅ No supplementary reorders required."
      >
        {lowStock.length > 0 && (
          <ReportTable meds={lowStock} type="low" onDelete={handleDeleteTrigger} />
        )}
      </ReportSection>

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

// ── SHARED COMPONENTS ──────────────────────────────────────────────────────

function ReportTable({ meds, type, onDelete }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Medicine Name</th>
            <th style={thStyle}>Batch No</th>
            {type === 'expired' ? <th style={thStyle}>Expired Date</th> : <th style={thStyle}>Qty</th>}
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {meds.map(med => {
            return (
              <tr key={med._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}><strong>{med.name}</strong></td>
                <td style={tdStyle}>{med.batchNo}</td>
                <td style={{ ...tdStyle, color: (type === 'expired' || type === 'critical') ? '#dc2626' : 'inherit', fontWeight: 'bold' }}>
                  {type === 'expired' ? med.expiryDate : med.quantity}
                </td>
                <td style={tdStyle}>
                  <button 
                    onClick={(e) => onDelete(e, med)}
                    style={{ 
                      background: type === 'expired' ? '#ef4444' : '#f59e0b', 
                      color: 'white', border: 'none',
                      padding: '8px 16px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Trash2 size={14} />
                    {type === 'expired' ? 'REMOVE NOW' : 'DISCARD'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({ icon, label, value, bg, text }) {
  return (
    <div style={{ background: bg, borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ background: 'white', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '2.2rem', fontWeight: '900', color: text, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '0.85rem', color: text, opacity: 0.8, marginTop: 4, fontWeight: '600' }}>{label}</p>
      </div>
    </div>
  );
}

function ReportSection({ title, color, bg, border, empty, children }) {
  const hasContent = React.Children.toArray(children).some(c => c);
  return (
    <div style={{ marginBottom: '32px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: `1px solid ${border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', background: bg, borderBottom: `1px solid ${border}` }}>
        <h2 style={{ color, fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: hasContent ? '0' : '24px' }}>
        {hasContent ? children : <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center' }}>{empty}</p>}
      </div>
    </div>
  );
}

const btnStyle = { padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thStyle = { padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '2px solid var(--border)', background: '#f8fafc', fontSize: '0.85rem' };
const tdStyle = { padding: '16px 24px', color: 'var(--text-main)', fontSize: '0.95rem' };
