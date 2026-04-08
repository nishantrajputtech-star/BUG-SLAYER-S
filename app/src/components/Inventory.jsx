import React, { useState, useEffect } from 'react';
import { Search, Trash2, Loader2 } from 'lucide-react';
import { useMedicines } from '../hooks/useMedicines';
import DeleteModal from './DeleteModal';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { medicines: serverMedicines, refetch, loading } = useMedicines();
  const [medicines, setMedicines] = useState([]);
  
  // Modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state
  useEffect(() => {
    if (serverMedicines) setMedicines(serverMedicines);
  }, [serverMedicines]);

  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.batchNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTrigger = (med) => {
    setDeleteId(med._id);
    setDeleteName(med.name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    console.log(`🚀 Attempting database deletion for: ${deleteName} (${deleteId})`);

    // 🚀 OPTIMISTIC UPDATE
    const previousMedicines = [...medicines];
    setMedicines(prev => prev.filter(m => m._id !== deleteId));

    try {
      const res = await fetch(`http://localhost:5000/api/inventory/${deleteId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.message || "Server Error");
      }
      
      console.log(`✅ Deletion confirmed by server for: ${deleteName}`);
      await refetch(); // Sync exactly with database
      setDeleteId(null);
    } catch (err) {
      console.error("❌ Deletion failed:", err);
      setMedicines(previousMedicines); // ROLLBACK
      alert(`Could not delete medicine from database: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && medicines.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Synchronizing with database...</p>
      </div>
    );
  }

  return (
    <div className="page-header">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <div>
          <h1>Inventory Management</h1>
          <p>Database synchronization active (MongoDB Online).</p>
        </div>
        <div style={{position: 'relative'}}>
          <Search style={{position: 'absolute', left: '12px', top: '10px'}} color="var(--text-muted)" size={18} />
          <input 
            type="text" 
            placeholder="Search name or batch..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none', width: '280px', fontSize: '1rem' }}
          />
        </div>
      </div>
      
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={thStyle}>Medicine Name</th>
              <th style={thStyle}>Batch No</th>
              <th style={thStyle}>Expiry Date</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedicines.length === 0 ? (
               <tr><td colSpan="5" style={{padding: '24px', textAlign: 'center', color: 'var(--text-muted)'}}>No medicines found in database.</td></tr>
            ) : filteredMedicines.map(med => {
               const isLowStock = med.quantity <= med.minThreshold;
               const isExpired = new Date(med.expiryDate) < new Date();
               
               return (
                <tr key={med._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}><strong>{med.name}</strong></td>
                  <td style={tdStyle}>{med.batchNo}</td>
                  <td style={{...tdStyle, color: isExpired ? 'var(--danger)' : 'inherit'}}>
                    {med.expiryDate} {isExpired && ' (Expired)'}
                  </td>
                  <td style={{...tdStyle, color: isLowStock ? 'var(--warning)' : 'inherit', fontWeight: isLowStock ? 'bold' : 'normal'}}>
                    {med.quantity}
                  </td>
                  <td style={tdStyle}>
                    <button 
                      style={actionBtn} 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTrigger(med); }}
                    >
                      <Trash2 size={18} color="var(--danger)" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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

const thStyle = { padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '2px solid var(--border)', background: '#fafafa' };
const tdStyle = { padding: '16px 24px', color: 'var(--text-main)' };
const actionBtn = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', transition: 'transform 0.2s ease' };
