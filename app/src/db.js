import Dexie from 'dexie';

// Initialize the offline database
export const db = new Dexie('ClinicSyncDB');

// Define database schema
// We need indexes for expiryDate and quantity for fast queries on the dashboard
db.version(1).stores({
  medicines: '++id, name, batchNo, expiryDate, quantity, minThreshold'
});

db.version(2).stores({
  medicines: '++id, name, batchNo, expiryDate, quantity, minThreshold',
  users: '++id, username, password, role'
});

db.on('populate', async () => {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 10);
  const nearFutureDate = new Date(today);
  nearFutureDate.setDate(today.getDate() + 20);
  const futureDate = new Date(today);
  futureDate.setFullYear(today.getFullYear() + 1);

  const formatDate = (date) => date.toISOString().split('T')[0];

  await db.medicines.bulkAdd([
    { name: 'Paracetamol 500mg', batchNo: 'B-101', expiryDate: formatDate(futureDate), quantity: 500, minThreshold: 100 },
    { name: 'Amoxicillin 250mg', batchNo: 'B-102', expiryDate: formatDate(nearFutureDate), quantity: 50, minThreshold: 200 },
    { name: 'Ibuprofen 400mg', batchNo: 'B-103', expiryDate: formatDate(pastDate), quantity: 20, minThreshold: 50 },
    { name: 'Cetirizine 10mg', batchNo: 'B-104', expiryDate: formatDate(futureDate), quantity: 15, minThreshold: 30 }
  ]);
  
  await db.users.bulkAdd([
    { username: 'staff', password: 'password123', role: 'clinic_staff' }
  ]);
});
