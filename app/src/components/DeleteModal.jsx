import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeleteModal({ isOpen, onClose, onConfirm, itemName, isDeleting }) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={iconBg}>
            <AlertTriangle color="#dc2626" size={24} />
          </div>
          <button onClick={onClose} style={closeBtn} disabled={isDeleting}>
            <X size={20} />
          </button>
        </div>

        <div style={contentStyle}>
          <h2 style={titleStyle}>Remove Medicine?</h2>
          <p style={descStyle}>
            Are you sure you want to permanently delete <strong>{itemName}</strong>? 
            This action cannot be undone and will remove all records from the database.
          </p>
        </div>

        <div style={footerStyle}>
          <button 
            onClick={onClose} 
            style={cancelBtn} 
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            style={confirmBtn} 
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  animation: 'fadeIn 0.2s ease-out'
};

const modalStyle = {
  backgroundColor: 'white',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '440px',
  padding: '24px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  position: 'relative'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px'
};

const iconBg = {
  backgroundColor: '#fee2e2',
  padding: '12px',
  borderRadius: '12px',
  display: 'inline-flex'
};

const closeBtn = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '6px',
  transition: 'all 0.2s'
};

const contentStyle = {
  marginBottom: '28px'
};

const titleStyle = {
  fontSize: '1.25rem',
  fontWeight: '700',
  color: '#0f172a',
  marginBottom: '8px'
};

const descStyle = {
  fontSize: '0.95rem',
  color: '#64748b',
  lineHeight: '1.5'
};

const footerStyle = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end'
};

const cancelBtn = {
  padding: '10px 20px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  backgroundColor: 'white',
  color: '#475569',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const confirmBtn = {
  padding: '10px 20px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#dc2626',
  color: 'white',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
  transition: 'all 0.2s'
};
