const parseReceipt = async (fileUrl) => {
  // Simulate OCR API network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const categories = ['Travel', 'Food', 'Accommodation', 'Fuel', 'Office Supplies', 'Training'];
  const merchants = {
    Food: ['Starbucks', 'McDonalds', 'Sweetgreen', 'Uber Eats', 'Chipotle'],
    Travel: ['Uber', 'Delta Airlines', 'Lyft', 'Amtrak', 'United Airlines'],
    Accommodation: ['Hilton', 'Airbnb', 'Marriott', 'Sheraton', 'Hyatt'],
    Fuel: ['Shell', 'Chevron', 'ExxonMobil', 'BP', 'Speedway'],
    'Office Supplies': ['Staples', 'Office Depot', 'Amazon Business', 'Target'],
    Training: ['Coursera', 'Udemy', 'Pluralsight', 'Frontend Masters']
  };

  // Clean filename to extract deterministic seed (strips timestamp prefix if present)
  const cleanFilename = (fileUrl || 'receipt.pdf')
    .split('/')
    .pop()
    .replace(/^[0-9]+-[0-9]+-/, '')
    .toLowerCase();

  // Create deterministic positive integer hash from clean filename
  let hash = 0;
  for (let i = 0; i < cleanFilename.length; i++) {
    hash = ((hash << 5) - hash) + cleanFilename.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash) || 12345;

  const categoryIndex = seed % categories.length;
  const selectedCategory = categories[categoryIndex];
  const merchantList = merchants[selectedCategory] || ['Generic Merchant'];
  const merchantIndex = Math.floor(seed / 7) % merchantList.length;
  const merchantName = merchantList[merchantIndex];

  // Deterministic amount between $25.00 and $380.00 based on file seed
  const amount = parseFloat((25 + (seed % 35500) / 100).toFixed(2));

  return {
    amount,
    currency: 'USD',
    merchantName,
    date: new Date(),
    category: selectedCategory,
    rawText: `
      --- INVOICE / RECEIPT ---
      ${merchantName.toUpperCase()}
      Date: ${new Date().toLocaleDateString()}
      Transaction ID: TXN-${seed}
      -------------------------
      Subtotal:   $${(amount * 0.9).toFixed(2)}
      Tax (10%):  $${(amount * 0.1).toFixed(2)}
      -------------------------
      TOTAL PAID: $${amount.toFixed(2)} USD
      Card: VISA ************4421
      -------------------------
      Approved. Thank you!
    `.trim()
  };
};

module.exports = {
  parseReceipt
};
