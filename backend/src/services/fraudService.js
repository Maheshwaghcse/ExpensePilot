const Expense = require('../models/Expense');
const Receipt = require('../models/Receipt');
const Policy = require('../models/Policy');
const FraudCase = require('../models/FraudCase');

const detectFraud = async (expense, receiptData = null) => {
  let riskScore = 0;
  const fraudFlags = [];
  const companyId = expense.companyId;

  // 1. Check for Exact Duplicate Receipt File Upload (by fileUrl / original filename)
  if (expense.receiptId) {
    const currentReceipt = await Receipt.findById(expense.receiptId);
    if (currentReceipt && currentReceipt.fileUrl) {
      const currentFileName = currentReceipt.fileUrl.split('/').pop().replace(/^[0-9]+-[0-9]+-/, '').toLowerCase();

      const allCompanyReceipts = await Receipt.find({
        companyId,
        _id: { $ne: currentReceipt._id }
      });

      const duplicateReceipt = allCompanyReceipts.find(r => {
        if (!r.fileUrl) return false;
        const otherFileName = r.fileUrl.split('/').pop().replace(/^[0-9]+-[0-9]+-/, '').toLowerCase();
        return r.fileUrl === currentReceipt.fileUrl || (currentFileName.length >= 3 && otherFileName === currentFileName);
      });

      if (duplicateReceipt) {
        riskScore += 85;
        fraudFlags.push(`CRITICAL DUPLICATE FILE: Exact same receipt file ('${currentFileName}') was uploaded previously (Receipt ID: ${duplicateReceipt._id}).`);
      }
    }
  }

  // 2. Check for Duplicate Claim Data (Amount + Merchant + Expense Date window)
  if (expense.amount && expense.merchantName) {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const expDate = expense.expenseDate ? new Date(expense.expenseDate) : new Date();
    const start = new Date(expDate.getTime() - sevenDays);
    const end = new Date(expDate.getTime() + sevenDays);

    const escapedMerchant = expense.merchantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const duplicateExpense = await Expense.findOne({
      companyId,
      _id: { $ne: expense._id },
      amount: expense.amount,
      merchantName: { $regex: new RegExp(`^${escapedMerchant}$`, 'i') },
      expenseDate: { $gte: start, $lte: end },
      status: { $ne: 'Rejected' }
    });

    if (duplicateExpense) {
      riskScore += 80;
      const isSameEmployee = duplicateExpense.employeeId.toString() === expense.employeeId.toString();
      fraudFlags.push(
        isSameEmployee
          ? `CRITICAL DUPLICATE CLAIM: Identical claim of $${expense.amount} for '${expense.merchantName}' was already submitted previously (Expense ID: ${duplicateExpense._id}).`
          : `CRITICAL DUPLICATE CLAIM: Another employee in your company submitted an identical claim of $${expense.amount} for '${expense.merchantName}' (Expense ID: ${duplicateExpense._id}).`
      );
    }
  }

  // 3. Cross check user inputs with OCR extracted values
  if (receiptData) {
    const amountDiff = Math.abs(expense.amount - receiptData.amount);
    if (amountDiff > 1.0) {
      riskScore += 30;
      fraudFlags.push(`Amount mismatch: manually input amount (₹${expense.amount}) differs from OCR extracted amount (₹${receiptData.amount}).`);
    }

    if (receiptData.merchantName && expense.merchantName) {
      const manualMerchant = expense.merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const ocrMerchant = receiptData.merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!manualMerchant.includes(ocrMerchant) && !ocrMerchant.includes(manualMerchant)) {
        riskScore += 20;
        fraudFlags.push(`Merchant mismatch: manual merchant name '${expense.merchantName}' doesn't match OCR parsed name '${receiptData.merchantName}'.`);
      }
    }
  }

  // 4. Match against Policy limits
  const activePolicies = await Policy.find({ companyId, isActive: true });
  for (const policy of activePolicies) {
    if (policy.rules?.dailyLimit > 0 && expense.amount > policy.rules.dailyLimit) {
      riskScore += 25;
      fraudFlags.push(`Policy violation: Claim amount (₹${expense.amount}) exceeds the Daily Cap limit of ₹${policy.rules.dailyLimit}.`);
    }

    // Check allowed vendors
    if (policy.rules?.allowedVendors && policy.rules.allowedVendors.length > 0) {
      const isAllowed = policy.rules.allowedVendors.some(vendor => 
        expense.merchantName.toLowerCase().includes(vendor.toLowerCase())
      );
      if (!isAllowed) {
        riskScore += 15;
        fraudFlags.push(`Policy alert: Merchant '${expense.merchantName}' is not in the approved vendors list.`);
      }
    }
  }

  // 5. Repeated submission patterns under limits
  const thresholdMin = 48.00;
  const thresholdMax = 49.99;
  if (expense.amount >= thresholdMin && expense.amount <= thresholdMax) {
    const recentNearThreshold = await Expense.countDocuments({
      employeeId: expense.employeeId,
      amount: { $gte: thresholdMin, $lte: thresholdMax },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    if (recentNearThreshold >= 3) {
      riskScore += 20;
      fraudFlags.push(`Suspicious submission cluster: submitted ${recentNearThreshold} claims in the past 30 days between ₹${thresholdMin} and ₹${thresholdMax} (potential threshold avoidance).`);
    }
  }

  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);

  // Create or Update FraudCase entry if anomalies detected
  if (fraudFlags.length > 0) {
    const riskLevel = riskScore >= 70 ? 'High' : (riskScore >= 40 ? 'Medium' : 'Low');
    await FraudCase.findOneAndUpdate(
      { expenseId: expense._id },
      {
        companyId,
        expenseId: expense._id,
        detectedRules: fraudFlags,
        riskLevel,
        status: 'Open'
      },
      { upsert: true, new: true }
    );
  }

  return {
    riskScore,
    fraudFlags
  };
};

module.exports = {
  detectFraud
};
