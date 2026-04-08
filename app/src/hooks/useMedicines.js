import { useState, useEffect } from 'react';

export function useMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMedicines = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      const json = await res.json();
      if (json.success) {
        setMedicines(json.data);
      }
    } catch (e) {
      console.error("Error fetching from MongoDB:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  return { medicines, loading, refetch: fetchMedicines };
}
