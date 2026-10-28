const { getPool, query } = require('./lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, secure-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verify Webhook Secret / Signature
  const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.SEPAY_API_KEY || 'DNMMO_WEBHOOK_SECRET_DEFAULT';
  const authHeader = req.headers['authorization'] || '';
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['secure-token'] || '';
  const querySecret = req.query?.secret || '';

  const incomingSecret = authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim() || apiKeyHeader || querySecret;

  if (expectedSecret && incomingSecret !== expectedSecret) {
    console.warn('[Webhook] Unauthorized webhook attempt from IP:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
    return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
  }

  try {
    const body = req.body || {};
    // Extract transaction details (supports SePay & Casso formats)
    const content = body.content || body.description || body.remark || '';
    const transferAmount = Number(body.transferAmount || body.amount || 0);
    const paymentRef = String(body.id || body.referenceCode || body.transactionId || body.code || Date.now());

    console.log(`[Webhook] Processing payment: Ref=${paymentRef}, Amount=${transferAmount}, Content="${content}"`);

    // 2. Extract Order Code from transaction content (Pattern: DN followed by 6 alphanumeric characters)
    const codeMatch = content.toUpperCase().match(/DN[2-9A-Z]{6}/);
    if (!codeMatch) {
      console.log('[Webhook] No valid DNMMO order code found in transaction content.');
      return res.status(200).json({ success: false, message: 'No valid order code found in transaction' });
    }

    const orderCode = codeMatch[0];

    // 3. Idempotency Check: check if transaction already processed
    const dupCheck = await query(`
      SELECT id, code, status 
      FROM public.orders 
      WHERE payment_ref = $1;
    `, [paymentRef]);

    if (dupCheck.rows.length > 0) {
      console.log(`[Webhook] Transaction ${paymentRef} already processed for order ${dupCheck.rows[0].code}`);
      return res.status(200).json({ success: true, message: 'Transaction already processed' });
    }

    // 4. Look up Order in DB
    const orderRes = await query(`
      SELECT o.id, o.code, o.amount, o.status, o.plan_id, p.duration_days, p.name as plan_name
      FROM public.orders o
      LEFT JOIN public.plans p ON p.id = o.plan_id
      WHERE o.code = $1;
    `, [orderCode]);

    if (orderRes.rows.length === 0) {
      console.log(`[Webhook] Order ${orderCode} not found in database.`);
      return res.status(200).json({ success: false, message: 'Order not found' });
    }

    const order = orderRes.rows[0];

    if (order.status === 'paid' || order.status === 'delivered') {
      console.log(`[Webhook] Order ${orderCode} is already in status: ${order.status}`);
      return res.status(200).json({ success: true, message: 'Order already completed' });
    }

    // 5. Verify payment amount
    if (transferAmount < order.amount) {
      console.warn(`[Webhook] Underpaid: Expected >= ${order.amount}, received ${transferAmount}`);
      // Record partial payment in audit log
      await query(`
        INSERT INTO public.audit_logs (action, target_type, target_id, detail)
        VALUES ('payment_underpaid', 'order', $1, $2);
      `, [order.id, JSON.stringify({ expected: order.amount, received: transferAmount, payment_ref: paymentRef })]);
      return res.status(200).json({ success: false, message: 'Payment amount less than order amount' });
    }

    // 6. Atomic Transaction: Mark paid, auto-deliver from inventory if available
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update order to paid
      await client.query(`
        UPDATE public.orders 
        SET status = 'paid', paid_at = now(), payment_ref = $1
        WHERE id = $2;
      `, [paymentRef, order.id]);

      // Check if inventory has available account for this plan
      const invRes = await client.query(`
        SELECT id, credentials_encrypted 
        FROM public.inventory_items
        WHERE plan_id = $1 AND status = 'available'
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
      `, [order.plan_id]);

      let autoDelivered = false;
      if (invRes.rows.length > 0) {
        const item = invRes.rows[0];
        const durationDays = order.duration_days || 30;

        // Mark inventory item sold
        await client.query(`UPDATE public.inventory_items SET status = 'sold' WHERE id = $1`, [item.id]);

        // Insert into deliveries
        await client.query(`
          INSERT INTO public.deliveries (order_id, inventory_item_id, credentials_encrypted, delivered_at)
          VALUES ($1, $2, $3, now())
          ON CONFLICT (order_id) DO UPDATE SET 
            credentials_encrypted = EXCLUDED.credentials_encrypted,
            delivered_at = now();
        `, [order.id, item.id, item.credentials_encrypted]);

        // Mark order delivered
        await client.query(`
          UPDATE public.orders 
          SET status = 'delivered', delivered_at = now(), warranty_until = now() + ($1 || ' days')::interval
          WHERE id = $2;
        `, [durationDays, order.id]);

        autoDelivered = true;
      }

      // Record audit log
      await client.query(`
        INSERT INTO public.audit_logs (action, target_type, target_id, detail)
        VALUES ($1, 'order', $2, $3);
      `, [
        autoDelivered ? 'payment_received_and_auto_delivered' : 'payment_received_awaiting_delivery',
        order.id,
        JSON.stringify({ payment_ref: paymentRef, amount: transferAmount, autoDelivered })
      ]);

      await client.query('COMMIT');

      console.log(`[Webhook] Order ${orderCode} successfully updated. Auto-delivered: ${autoDelivered}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Order paid successfully', 
        auto_delivered: autoDelivered 
      });

    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('[Webhook] Error processing payment webhook:', err);
    return res.status(500).json({ error: 'Internal server error processing webhook' });
  }
};
