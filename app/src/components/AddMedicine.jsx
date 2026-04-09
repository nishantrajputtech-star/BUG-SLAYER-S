import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ScanLine, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AddMedicine() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    batchNo: '',
    expiryDate: '',
    quantity: '',
    minThreshold: '10'
  });

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
      scanner.render(
        (decodedText) => {
          try {
            const parts = decodedText.split('-');
            if (parts.length >= 3) {
              setFormData({ ...formData, name: parts[0], batchNo: parts[1], expiryDate: parts.slice(2).join('-') });
            } else {
              setFormData({ ...formData, batchNo: decodedText });
            }
          } catch(e) {}
          scanner.clear();
          setIsScanning(false);
          alert('Scanned successfully!');
        },
        (error) => { /* handle errors internally */ }
      );
      return () => { scanner.clear().catch(e => console.log(e)); };
    }
  }, [isScanning]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('bugslayer_token');
      await fetch('http://127.0.0.1:5000/api/inventory', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          batchNo: formData.batchNo,
          expiryDate: formData.expiryDate,
          quantity: parseInt(formData.quantity, 10),
          minThreshold: parseInt(formData.minThreshold, 10)
        })
      });
      alert('Transferred to database securely!');
      navigate('/inventory');
    } catch (err) {
      alert('Error connecting to Backend API');
    }
  };

  return (
    <div className="page-header">
      <h1>Add Online Record</h1>
      <p>Scan a barcode or enter details manually.</p>
      
      <div style={{ display: 'flex', gap: '24px', marginTop: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px', background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <ScanLine color="var(--primary)" />
            <h2>Barcode Scanner</h2>
          </div>
          {!isScanning ? (
            <button style={btnStyle} onClick={() => setIsScanning(true)}>Start Scanner</button>
          ) : (
             <div>
               <div id="reader" width="100%"></div>
               <button style={{...btnStyle, background: 'var(--danger)', marginTop: '12px'}} onClick={() => setIsScanning(false)}>Cancel Scan</button>
             </div>
          )}
        </div>

        <div style={{ flex: '1.5', minWidth: '300px', background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ marginBottom: '16px' }}>Manual Entry</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={inputGroup}>
              <label>Medicine Name</label>
              <input required style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={inputGroup}>
                <label>Batch No.</label>
                <input required style={inputStyle} value={formData.batchNo} onChange={e => setFormData({...formData, batchNo: e.target.value})} type="text" />
              </div>
              <div style={inputGroup}>
                <label>Expiry Date</label>
                <input required style={inputStyle} value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} type="date" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={inputGroup}>
                <label>Quantity</label>
                <input required style={inputStyle} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} type="number" />
              </div>
              <div style={inputGroup}>
                <label>Min Restock Level</label>
                <input required style={inputStyle} value={formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: e.target.value})} type="number" />
              </div>
            </div>
            <button style={{...btnStyle, display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px'}} type="submit">
               <Save size={20} /> Save to Database
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' };
const inputStyle = { padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '1rem' };
const btnStyle = { padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', width: '100%' };
