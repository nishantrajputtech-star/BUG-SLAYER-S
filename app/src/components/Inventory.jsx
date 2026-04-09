import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, Loader2 } from 'lucide-react';
import { useMedicines } from '../hooks/useMedicines';
import DeleteModal from './DeleteModal';
import { useSearchParams } from 'react-router-dom';

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const { medicines: serverMedicines, refetch, loading } = useMedicines();
  const [medicines, setMedicines] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightedRowRef = useRef(null);
  
  // Modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state
  useEffect(() => {
    if (serverMedicines) setMedicines(serverMedicines);
  }, [serverMedicines]);

  // When coming from Dashboard search, highlight the first match
  useEffect(() => {
    const paramSearch = searchParams.get('search');
    if (paramSearch && medicines.length > 0) {
      const match = medicines.find(m => m.name.toLowerCase() === paramSearch.toLowerCase());
      if (match) {
        setHighlightedId(match._id);
        // Scroll to highlighted row after render
        setTimeout(() => {
          if (highlightedRowRef.current) {
            highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
        // Remove highlight after 2.5s
        setTimeout(() => setHighlightedId(null), 2500);
      }
    }
  }, [medicines, searchParams]);

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
      const token = localStorage.getItem('bugslayer_token');
      const res = await fetch(`http://127.0.0.1:5000/api/inventory/${deleteId}`, { 
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
          <p>All medicines are here</p>
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
               const isHighlighted = med._id === highlightedId;
               
               return (
                <tr
                  key={med._id}
                  ref={isHighlighted ? highlightedRowRef : null}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.4s ease',
                    background: isHighlighted ? '#e0f2fe' : 'transparent',
                    boxShadow: isHighlighted ? 'inset 0 0 0 2px #0ea5e9' : 'none',
                  }}
                >
                  <td style={tdStyle}><strong>{med.name}</strong>{isHighlighted && <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#0ea5e9', color: 'white', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>Found</span>}</td>
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
