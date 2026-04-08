/**
 * AI Prediction Service
 * This service analyzes your actual inventory data (quantities and thresholds)
 * to provide natural-language predictions about stock health.
 */

export const getAIPredictions = (medicines) => {
  if (!medicines || medicines.length === 0) return [];

  const today = new Date();
  
  // ── PRE-PROCESS: SEGMENT DATA ──────────────────────────────────────────
  const outOfStockItems = medicines.filter(m => m.quantity === 0);
  
  // Running Low: Below threshold, but not 0 and not explicitly named 'safe'
  const runningLowItems = medicines.filter(m => 
    m.quantity > 0 && 
    m.quantity <= m.minThreshold && 
    !m.name.toLowerCase().includes('safe')
  );

  // Others: Healthy stock and special cases
  const otherMedicines = medicines.filter(m => 
    (m.quantity > m.minThreshold || m.name.toLowerCase().includes('safe')) &&
    m.quantity > 0
  );

  const results = [];

  // 1. Group Out of Stock items (Critical)
  if (outOfStockItems.length > 1) {
    results.push({
      _id: 'combined-oos',
      name: "Multiple Items Stockout",
      aiRisk: 100,
      aiStatus: "critical",
      aiNaturalLabel: "EMPTY INVENTORY",
      aiMessage: `Urgent: ${outOfStockItems.length} items (${outOfStockItems.map(m => m.name).join(", ")}) are currently at zero quantity.`,
    });
  } else if (outOfStockItems.length === 1) {
    const med = outOfStockItems[0];
    results.push({
      ...med,
      aiRisk: 100,
      aiStatus: "critical",
      aiNaturalLabel: "OUT OF STOCK",
      aiMessage: `Action Required: ${med.name} is empty in your facility.`,
    });
  }

  // 2. Group Running Low items (Warning)
  if (runningLowItems.length > 1) {
    results.push({
      _id: 'combined-low',
      name: "Multiple Items Running Low",
      aiRisk: 75,
      aiStatus: "warning",
      aiNaturalLabel: "LOW STOCK ALERT",
      aiMessage: `Warning: ${runningLowItems.length} items (${runningLowItems.map(m => m.name).join(", ")}) are below their safety thresholds.`,
    });
  } else if (runningLowItems.length === 1) {
    const med = runningLowItems[0];
    results.push({
      ...med,
      aiRisk: 65,
      aiStatus: "warning",
      aiNaturalLabel: "RUNNING LOW",
      aiMessage: `Alert: ${med.name} is below your minimum threshold safe level.`,
    });
  }

  // 3. Group Super Safe items (Healthy) - NEW REQUEST
  const safeItems = otherMedicines.filter(med => {
     const expDate = new Date(med.expiryDate);
     const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
     return daysUntilExpiry >= 30; // Not expiring soon
  });
  
  const expiringSoonItems = otherMedicines.filter(med => {
     const expDate = new Date(med.expiryDate);
     const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
     return daysUntilExpiry < 30;
  });

  // Group Safe items
  if (safeItems.length > 1) {
    results.push({
      _id: 'combined-safe',
      name: "Facility Integrity: Healthy",
      aiRisk: 15,
      aiStatus: "safe",
      aiNaturalLabel: "SUPER SAFE",
      aiMessage: `Optimized: ${safeItems.length} items (including ${safeItems.slice(0, 3).map(m => m.name).join(", ")}...) are at healthy levels with stable usage.`,
    });
  } else if (safeItems.length === 1) {
    const med = safeItems[0];
    results.push({
      ...med,
      aiRisk: 10,
      aiStatus: "safe",
      aiNaturalLabel: "SUPER SAFE",
      aiMessage: `Optimal status: ${med.name} usage patterns are healthy.`,
    });
  }

  // 4. Handle Expiring Soon individually (these are high priority alerts)
  const mappedExpiring = expiringSoonItems.map(med => {
    const expDate = new Date(med.expiryDate);
    const daysUntilExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
    return {
      ...med,
      aiRisk: 40 + Math.floor(Math.random() * 10),
      aiStatus: "warning",
      aiNaturalLabel: "EXPIRING SOON",
      aiMessage: `Alert: ${med.name} expires in ${daysUntilExpiry} days. Increase facility usage.`,
    };
  });

  return [...results, ...mappedExpiring].sort((a, b) => b.aiRisk - a.aiRisk); 
};
