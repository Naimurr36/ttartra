// Vercel serverless function: validates the order, recalculates prices on the server,
// then sends it to your Telegram bot as an instant order alert.
// Env vars (set in Vercel): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
const PRODUCTS = {
  android: { name: 'Android Only', price: 1099 },
  both: { name: 'Android + iPhone', price: 1299 },
};
const DELIVERY = { dhaka: 80, outside: 120 };
const recent = new Map(); // best-effort duplicate guard (per server instance)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const genNumber = () => {
  const d = new Date(Date.now() + 6 * 3600 * 1000); // Bangladesh time
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  return 'ORD-' + ymd + '-' + String(Math.floor(Math.random() * 9000) + 1000);
};

async function toTelegram(o) {
  const text =
    '🛒 <b>নতুন অর্ডার!</b>\n' +
    '🔢 ' + esc(o.orderNumber) + '\n\n' +
    '📱 মডেল: <b>' + esc(o.device) + '</b>\n' +
    '📦 পরিমাণ: ' + o.qty + ' পিস\n' +
    '👤 নাম: ' + esc(o.name) + '\n' +
    '📞 ফোন: ' + esc(o.phone) + '\n' +
    '📍 ঠিকানা: ' + esc(o.address) + '\n\n' +
    '🚚 ডেলিভারি: ৳' + o.delivery + '\n' +
    '💰 <b>সর্বমোট (COD): ৳' + o.total + '</b>';
  const r = await fetch('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
  });
  if (!r.ok) throw new Error('telegram: ' + r.status + ' ' + (await r.text()));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (b.website) return res.status(200).json({ ok: true, orderNumber: 'ORD-0000' }); // honeypot (bots)
    const p = PRODUCTS[b.product];
    const qty = parseInt(b.qty, 10);
    const name = String(b.name || '').trim().slice(0, 100);
    const phone = String(b.phone || '').replace(/\s/g, '');
    const address = String(b.address || '').trim().slice(0, 300);
    const dc = DELIVERY[b.zone];
    if (!p || dc === undefined || !(qty >= 1 && qty <= 99) || name.length < 2 || address.length < 5 || !/^01[3-9][0-9]{8}$/.test(phone))
      return res.status(400).json({ ok: false, error: 'invalid' });

    const o = { device: p.name, name, phone, address, qty, delivery: dc, total: p.price * qty + dc };

    const key = phone + '|' + b.product + '|' + qty;
    const seen = recent.get(key);
    if (seen && Date.now() - seen.t < 600000) return res.status(200).json({ ok: true, orderNumber: seen.n, total: o.total });

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) throw new Error('Telegram env vars missing');
    o.orderNumber = genNumber();
    await toTelegram(o);

    recent.set(key, { n: o.orderNumber, t: Date.now() });
    return res.status(200).json({ ok: true, orderNumber: o.orderNumber, total: o.total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'server' });
  }
};
