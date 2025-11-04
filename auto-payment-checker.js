import axios from 'axios';
import cron from 'node-cron';
import Database from 'better-sqlite3';

/**
 * Module tự động check giao dịch ngân hàng và xác nhận thanh toán
 * Hỗ trợ: TPBank, MBBank, VCB, Techcombank, ACB
 */

const db = new Database('./shop.db');

// Queries
const qOrders = {
  getPending: db.prepare("SELECT * FROM orders WHERE status='PENDING'"),
  updatePaid: db.prepare("UPDATE orders SET status='PAID', payment_ref=? WHERE id=? AND status='PENDING'"),
};

// Lưu transaction đã xử lý để tránh duplicate
const processedTransactions = new Set();

/**
 * Parse mã đơn hàng từ nội dung giao dịch
 * Tìm pattern: ORD_[số]_[số]
 */
function extractOrderId(description) {
  if (!description) return null;
  const match = description.match(/ORD_\d+_\d+/i);
  return match ? match[0] : null;
}

/**
 * Kiểm tra giao dịch và xác nhận đơn hàng
 */
async function checkAndConfirmOrder(transaction, onConfirm) {
  try {
    const { amount, description, reference, date } = transaction;
    
    // Parse order ID từ nội dung
    const orderId = extractOrderId(description);
    if (!orderId) {
      console.log(`⏭️  Skip transaction (no order ID): ${description}`);
      return false;
    }

    // Tránh xử lý trùng
    if (processedTransactions.has(reference)) {
      return false;
    }

    // Tìm order trong database
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
    if (!order) {
      console.log(`⚠️  Order not found: ${orderId}`);
      return false;
    }

    // Check status
    if (order.status !== 'PENDING') {
      console.log(`⏭️  Order ${orderId} already processed (${order.status})`);
      return false;
    }

    // Check số tiền
    if (Number(amount) !== Number(order.amount)) {
      console.log(`⚠️  Amount mismatch: Expected ${order.amount}, got ${amount}`);
      return false;
    }

    // XÁC NHẬN THANH TOÁN
    qOrders.updatePaid.run(reference || 'AUTO', orderId);
    processedTransactions.add(reference);

    console.log(`✅ AUTO-CONFIRMED: ${orderId} - ${amount.toLocaleString()}đ`);

    // Callback để gửi key
    if (onConfirm) {
      await onConfirm(order, orderId);
    }

    return true;
  } catch (e) {
    console.error('Check order error:', e);
    return false;
  }
}

/**
 * CASSO.VN API - Dùng cho production (có phí)
 * Cần đăng ký tại: https://casso.vn
 */
export async function checkCassoTransactions(onConfirm) {
  const CASSO_API_KEY = process.env.CASSO_API_KEY;
  if (!CASSO_API_KEY) {
    console.log('⚠️  CASSO_API_KEY not configured');
    return;
  }

  try {
    const response = await axios.get('https://oauth.casso.vn/v2/transactions', {
      headers: {
        'Authorization': `Apikey ${CASSO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        pageSize: 20,
        sort: 'DESC'
      }
    });

    const transactions = response.data?.data?.records || [];
    console.log(`📊 Fetched ${transactions.length} transactions from Casso`);

    for (const txn of transactions) {
      await checkAndConfirmOrder({
        amount: txn.amount,
        description: txn.description,
        reference: txn.id.toString(),
        date: txn.when
      }, onConfirm);
    }
  } catch (e) {
    console.error('Casso API error:', e.response?.data || e.message);
  }
}

/**
 * Manual check - Admin gọi API ngân hàng thủ công
 * Cần token từ mobile app/web banking
 */
export async function checkBankTransactions(bankConfig, onConfirm) {
  const { type, token, accountNo } = bankConfig;

  try {
    let transactions = [];

    if (type === 'TPBANK') {
      // TPBank API (cần token từ app)
      const response = await axios.post('https://ebank.tpb.vn/gateway/api/smart-search-presentation-service/v2/account-transactions/find', {
        pageNumber: 1,
        pageSize: 20,
        accountNo: accountNo,
        currency: 'VND',
        maxAcentrysrno: '',
        fromDate: '',
        toDate: ''
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'APP_VERSION': '2023.05.22',
          'Accept': 'application/json'
        }
      });

      transactions = response.data?.transactionInfos || [];
      transactions = transactions.map(t => ({
        amount: Math.abs(t.amount),
        description: t.description,
        reference: t.id,
        date: t.transactionDate
      }));
    }
    // Thêm các ngân hàng khác ở đây...

    console.log(`📊 Fetched ${transactions.length} transactions from ${type}`);

    for (const txn of transactions) {
      await checkAndConfirmOrder(txn, onConfirm);
    }
  } catch (e) {
    console.error(`${type} API error:`, e.response?.data || e.message);
  }
}

/**
 * Start cron job - Check mỗi 30 giây
 */
export function startAutoChecker(onConfirm) {
  console.log('🤖 Starting auto payment checker...');

  // Check ngay khi start
  if (process.env.CASSO_API_KEY) {
    checkCassoTransactions(onConfirm);
  }

  // Cron job: Check mỗi 30 giây
  cron.schedule('*/30 * * * * *', async () => {
    console.log('🔄 Checking transactions...');
    
    if (process.env.CASSO_API_KEY) {
      await checkCassoTransactions(onConfirm);
    } else {
      console.log('⚠️  No payment gateway configured. Please setup CASSO_API_KEY in .env');
    }
  });

  console.log('✅ Auto payment checker started (every 30s)');
}

export default {
  startAutoChecker,
  checkCassoTransactions,
  checkBankTransactions,
  extractOrderId
};
