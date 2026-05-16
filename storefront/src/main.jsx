import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const CART_STORAGE_KEY = 'kartclaw_cart_items';
const SESSION_STORAGE_KEY = 'kartclaw_session_token';

function readCartItems() {
  try { return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]'); } catch { return []; }
}
function writeCartItems(items) { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); }
function countCartItems(items) { return items.reduce((total, item) => total + item.qty, 0); }
function calculateCartTotal(items) { return items.reduce((total, item) => total + item.price * item.qty, 0); }
async function apiJson(path, options) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'Request failed'), { data, status: response.status });
  return data;
}

function routeFromPath(pathname = window.location.pathname) {
  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch) return { screen: 'detail', productUuid: decodeURIComponent(productMatch[1]) };
  if (pathname === '/cart') return { screen: 'cart' };
  if (pathname === '/checkout') return { screen: 'checkout' };
  if (pathname === '/account') return { screen: 'account' };
  if (pathname === '/order-placed') return { screen: 'placed' };
  return { screen: 'list' };
}

function pathForScreen(screen, product) {
  if (screen === 'detail' && product?.uuid) return `/products/${encodeURIComponent(product.uuid)}`;
  if (screen === 'cart') return '/cart';
  if (screen === 'checkout') return '/checkout';
  if (screen === 'account') return '/account';
  if (screen === 'placed') return '/order-placed';
  return '/';
}

function ProductArtwork({ product, darkMode, large = false }) {
  const imageUrl = product?.image_url;
  return (
    <div className={`flex ${large ? 'h-80' : 'h-40'} items-center justify-center overflow-hidden rounded-[5px] border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>
      {imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105" /> : (
        <div className="text-center"><div className={large ? 'text-7xl' : 'text-5xl'}>◈</div><div className={`mt-3 text-xs font-medium uppercase tracking-[0.35em] ${darkMode ? 'text-cyan-200' : 'text-fuchsia-700'}`}>Tronez</div></div>
      )}
    </div>
  );
}

function ThemeToggle({ darkMode, onToggle }) {
  // 🎨 SVGs inherit currentColor, so the theme icon matches the cart icon exactly.
  const icon = darkMode ? (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ) : (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );

  return <button type="button" aria-label="Toggle theme" onClick={onToggle} className={`grid h-10 w-10 place-items-center rounded-[5px] border transition ${darkMode ? 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950'}`}>{icon}</button>;
}

function ProductCard({ product, darkMode, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(product)} className={`group w-full overflow-hidden rounded-[5px] border p-6 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl ${darkMode ? 'border-slate-700 bg-slate-950/70 hover:border-cyan-300' : 'border-slate-300 bg-white hover:border-fuchsia-400'}`}>
      <ProductArtwork product={product} darkMode={darkMode} />
      <div className="mt-5 flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight">{product.name}</h3>
        <p className={`rounded-[5px] border px-3 py-1 text-sm font-semibold ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-100 text-slate-950'}`}>{money.format(product.price)}</p>
      </div>
      <p className={`mt-4 min-h-20 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{product.description}</p>
    </button>
  );
}

function ProductListScreen({ products, loading, error, darkMode, onSelectProduct }) {
  return <section className="py-10"><h2 className={`mb-6 text-[1.575rem] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Products</h2>{loading && <div className="rounded-3xl border border-current/10 p-10 text-center font-medium">Loading products…</div>}{error && !loading && <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-10 text-center font-medium text-red-300">{error}</div>}{!loading && !error && <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.uuid} product={product} darkMode={darkMode} onSelect={onSelectProduct} />)}</div>}</section>;
}

function CartButton({ darkMode, cartCount, onClick }) {
  return <button type="button" onClick={onClick} className={`ml-auto inline-flex items-center gap-2.5 rounded-[5px] border px-4 py-2 text-base font-medium transition ${darkMode ? 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950'}`}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57L21.8 7H5.12" /></svg><span>Cart</span><span className={`ml-1 grid min-h-6 min-w-6 place-items-center rounded-[5px] border px-1.5 text-sm font-semibold ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-100 text-slate-950'}`}>{cartCount}</span></button>;
}

function AccountButton({ darkMode, onClick }) {
  return <button type="button" onClick={onClick} aria-label="Account and past orders" title="Account and past orders" className={`inline-flex h-10 w-10 items-center justify-center rounded-[5px] border transition ${darkMode ? 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950'}`}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg></button>;
}

function ProductDetailScreen({ product, darkMode, onBack, onAddToCart }) {
  if (!product) return null;
  return <div className="py-10"><BackButton darkMode={darkMode} onClick={onBack} /><section className="grid items-start gap-8 p-6 md:grid-cols-2 md:p-8"><ProductArtwork product={product} darkMode={darkMode} large /><div><h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{product.name}</h2><p className={`mt-5 text-base leading-7 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{product.description}</p><div className="mt-8 flex flex-wrap items-center gap-4"><span className={`rounded-[5px] border px-4 py-2 text-lg font-semibold ${darkMode ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{money.format(product.price)}</span><button type="button" onClick={() => onAddToCart(product)} className={`inline-flex h-10 w-full items-center justify-center rounded-[5px] border px-2.5 py-6 text-sm font-medium uppercase transition ${darkMode ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>Add to cart</button></div></div></section></div>;
}

function BackButton({ darkMode, onClick, label = 'Back' }) {
  return <button type="button" onClick={onClick} className={`mb-8 inline-flex items-center gap-3 rounded-[5px] border px-4 py-2 text-sm font-medium transition ${darkMode ? 'border-slate-700 bg-slate-950/70 text-cyan-200 hover:border-cyan-300' : 'border-slate-200 bg-white text-slate-800 hover:border-fuchsia-400'}`}><span className="text-xl leading-none">←</span><span>{label}</span></button>;
}

function Notice({ children, tone = 'info', darkMode }) {
  const classes = tone === 'error' ? 'border-red-400/40 bg-red-500/10 text-red-200' : tone === 'success' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : darkMode ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100' : 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800';
  return <div className={`rounded-[5px] border p-4 text-sm leading-6 ${classes}`}>{children}</div>;
}

function CartScreen({ cartItems, darkMode, cartErrors, checkingOut, onBack, onIncrease, onDecrease, onQuantityChange, onRemove, onCheckout }) {
  const total = calculateCartTotal(cartItems);
  const tableBorder = darkMode ? 'border-slate-700' : 'border-slate-200';
  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBorder = darkMode ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-white';
  const quantityButtonClass = darkMode ? 'border-slate-700 text-cyan-200' : 'border-slate-300 text-slate-800';
  const quantityInputClass = darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-950';
  const deleteButtonClass = darkMode ? 'border-red-400/40 text-red-200 hover:border-red-300' : 'border-red-200 text-red-700 hover:border-red-400';
  const checkoutButtonClass = darkMode ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';

  return <div className="py-10"><BackButton darkMode={darkMode} onClick={onBack} /><section className="p-6"><h2 className="text-3xl font-semibold">Cart</h2>{cartErrors.length > 0 && <div className="mt-6"><Notice tone="error" darkMode={darkMode}><strong>Please fix your cart before checkout:</strong><ul className="mt-2 list-disc pl-5">{cartErrors.map((error, index) => <li key={`${error.code}-${index}`}>{error.message || error.code}</li>)}</ul></Notice></div>}{cartItems.length === 0 ? <p className={`mt-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Your cart is empty.</p> : <><div className={`mt-8 hidden overflow-hidden rounded-[5px] border lg:block ${tableBorder}`}><table className="w-full table-fixed border-collapse"><colgroup><col /><col className="w-56" /><col className="w-36" /><col className="w-24" /></colgroup><thead><tr className={`border-b ${tableBorder}`}><th className={`p-3 text-left text-sm font-medium ${mutedText}`}>Product</th><th className={`p-3 text-left text-sm font-medium ${mutedText}`}>Quantity</th><th className={`p-3 text-left text-sm font-medium ${mutedText}`}>Price</th><th className="p-3" /></tr></thead><tbody>{cartItems.map((item) => <tr key={item.uuid} className={`border-b ${tableBorder}`}><td className="p-4 align-middle"><div className="flex items-center gap-4">{item.image_url && <img src={item.image_url} alt={item.name} className={`h-16 w-16 rounded-[5px] border object-contain p-2 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'}`} />}<div><h3 className="text-lg font-semibold">{item.name}</h3><p className={mutedText}>{money.format(item.price)} each</p></div></div></td><td className="p-4 pr-10 align-middle"><div className="flex items-center gap-2"><button type="button" onClick={() => onDecrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>−</button><input type="number" min="1" value={item.qty} onChange={(event) => onQuantityChange(item.uuid, event.target.value)} className={`h-10 w-20 rounded-[5px] border text-center ${quantityInputClass}`} /><button type="button" onClick={() => onIncrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>+</button></div></td><td className="p-4 text-left align-middle font-semibold tabular-nums">{money.format(item.price * item.qty)}</td><td className="p-4 text-right align-middle"><button type="button" onClick={() => onRemove(item.uuid)} className={`w-full rounded-[5px] border px-4 py-2 text-sm font-medium ${deleteButtonClass}`}>Delete</button></td></tr>)}<tr><td className="p-4" /><td className={`p-4 pr-10 text-right ${mutedText}`}>Total</td><td className="p-4 text-left font-semibold tabular-nums">{money.format(total)}</td><td className="p-4" /></tr><tr><td className="p-4" /><td className="p-4" /><td className="p-4 text-left" colSpan={2}><button type="button" disabled={checkingOut} onClick={onCheckout} className={`w-full rounded-[5px] border px-6 py-3 text-sm font-medium uppercase transition disabled:opacity-60 ${checkoutButtonClass}`}>{checkingOut ? 'Validating…' : 'Checkout'}</button></td></tr></tbody></table></div><div className={`mt-8 space-y-4 rounded-[5px] border p-4 lg:hidden ${tableBorder}`}>{cartItems.map((item) => <div key={item.uuid} className={`rounded-[5px] border p-4 ${cardBorder}`}><div className="flex items-start gap-4">{item.image_url && <img src={item.image_url} alt={item.name} className={`h-16 w-16 rounded-[5px] border object-contain p-2 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'}`} />}<div><h3 className="text-lg font-semibold">{item.name}</h3><p className={`mt-1 ${mutedText}`}>{money.format(item.price)} each</p></div></div><div className="mt-4"><p className={`mb-2 text-sm ${mutedText}`}>Quantity</p><div className="flex items-center gap-2"><button type="button" onClick={() => onDecrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>−</button><input type="number" min="1" value={item.qty} onChange={(event) => onQuantityChange(item.uuid, event.target.value)} className={`h-10 w-20 rounded-[5px] border text-center ${quantityInputClass}`} /><button type="button" onClick={() => onIncrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>+</button></div></div><div className="mt-4"><p className={`mb-1 text-sm ${mutedText}`}>Row total</p><p className="font-semibold tabular-nums">{money.format(item.price * item.qty)}</p></div><button type="button" onClick={() => onRemove(item.uuid)} className={`mt-4 w-full rounded-[5px] border px-4 py-2 text-sm font-medium ${deleteButtonClass}`}>Delete</button></div>)}<div className={`rounded-[5px] border p-4 ${cardBorder}`}><p className={`mb-1 text-sm ${mutedText}`}>Total</p><p className="font-semibold tabular-nums">{money.format(total)}</p><button type="button" disabled={checkingOut} onClick={onCheckout} className={`mt-4 w-full rounded-[5px] border px-6 py-3 text-sm font-medium uppercase transition disabled:opacity-60 ${checkoutButtonClass}`}>{checkingOut ? 'Validating…' : 'Checkout'}</button></div></div></>}</section></div>;
}

function CheckoutScreen({ darkMode, checkout, onBackToCart, onOrderPlaced, onLogin }) {
  const [step, setStep] = useState('payment');
  const [methods, setMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [phone, setPhone] = useState('+91');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(SESSION_STORAGE_KEY) || '');
  const [loggedInPhone, setLoggedInPhone] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState('shipping');
  const [address, setAddress] = useState({ recipientName: '', phone: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: 'IN' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { apiJson('/api/checkout/payment-methods').then((data) => setMethods(data.methods || [])).catch((err) => setError(err.message)); }, []);
  useEffect(() => {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) return;
    apiJson('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        if (!data.loggedIn) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setSessionToken('');
          return;
        }
        setSessionToken(token);
        setLoggedInPhone(data.user.phone_e164);
        setPhone(data.user.phone_e164);
        if (data.latestAddress) {
          setAddress({
            recipientName: data.latestAddress.recipient_name || '',
            phone: data.latestAddress.phone_e164 || data.user.phone_e164,
            line1: data.latestAddress.line1 || '',
            line2: data.latestAddress.line2 || '',
            city: data.latestAddress.city || '',
            region: data.latestAddress.region || '',
            postalCode: data.latestAddress.postal_code || '',
            country: data.latestAddress.country || 'IN'
          });
        }
      })
      .catch(() => localStorage.removeItem(SESSION_STORAGE_KEY));
  }, []);
  const card = darkMode ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-white';
  const input = darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-950';
  const primary = darkMode ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';

  async function sendOtp() {
    setBusy(true); setError('');
    try { const data = await apiJson('/api/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone }) }); setChallengeId(data.challengeId); setStep('otp'); }
    catch (err) { setError(err.data?.qrRequired ? `${err.message} Open /api/whatsapp/status to scan the QR code.` : err.message); }
    finally { setBusy(false); }
  }
  async function verifyOtp() {
    setBusy(true); setError('');
    try { const data = await apiJson('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ challengeId, otp }) }); localStorage.setItem(SESSION_STORAGE_KEY, data.sessionToken); onLogin?.(data.sessionToken); setSessionToken(data.sessionToken); setLoggedInPhone(data.user.phone_e164); setAddress((a) => data.latestAddress ? ({ recipientName: data.latestAddress.recipient_name || '', phone: data.latestAddress.phone_e164 || data.user.phone_e164, line1: data.latestAddress.line1 || '', line2: data.latestAddress.line2 || '', city: data.latestAddress.city || '', region: data.latestAddress.region || '', postalCode: data.latestAddress.postal_code || '', country: data.latestAddress.country || 'IN' }) : ({ ...a, phone: data.user.phone_e164 })); setStep('address'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function placeOrder() {
    setBusy(true); setError('');
    try {
      const data = await apiJson(`/api/checkout/session/${checkout.checkoutToken}/order`, { method: 'POST', body: JSON.stringify({ sessionToken, paymentMethod, fulfillmentType, address }) });
      onOrderPlaced(data.orderId);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function continueFromPayment() {
    setError('');
    if (paymentMethod !== 'cod') { setError('Online payments are coming soon. Please choose Cash on Delivery for now.'); return; }
    setStep(sessionToken ? 'address' : 'phone');
  }

  return <div className="py-10"><BackButton darkMode={darkMode} onClick={onBackToCart} label="Back to cart" /><section className={`rounded-[5px] border p-6 ${card}`}><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h2 className="text-3xl font-semibold">Checkout</h2><p className={`mt-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Total: <strong>{money.format(checkout?.total || 0)}</strong></p></div><div className={`rounded-[5px] border p-4 text-sm ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{checkout?.items?.length || 0} item types</div></div>{error && <div className="mt-6"><Notice tone="error" darkMode={darkMode}>{error}</Notice></div>}
    {step === 'payment' && <div className="mt-8"><h3 className="text-xl font-semibold">Choose payment method</h3><p className={`mt-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>COD is available now. GPay and Card are shown so buyers know online payments are coming.</p>{loggedInPhone && <div className="mt-4"><Notice tone="success" darkMode={darkMode}>Logged in as {loggedInPhone}. We’ll skip phone OTP and use your saved address if available.</Notice></div>}<div className="mt-5 grid gap-3 md:grid-cols-3">{methods.map((method) => <button key={method.id} type="button" onClick={() => setPaymentMethod(method.id)} className={`rounded-[5px] border p-4 text-left transition ${paymentMethod === method.id ? 'border-emerald-300 bg-emerald-400/10' : darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}><div className="font-semibold">{method.label}</div><div className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{method.description}</div>{!method.availableNow && <div className="mt-3 text-xs uppercase tracking-wide text-amber-300">Coming soon</div>}</button>)}</div><button type="button" onClick={continueFromPayment} className={`mt-6 rounded-[5px] border px-6 py-3 text-sm font-medium uppercase ${primary}`}>Continue</button></div>}
    {step === 'phone' && <div className="mt-8 max-w-xl"><h3 className="text-xl font-semibold">Verify WhatsApp phone</h3><p className={`mt-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>We’ll send your checkout OTP using WhatsApp.</p><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" className={`mt-5 w-full rounded-[5px] border px-4 py-3 ${input}`} /><button type="button" disabled={busy} onClick={sendOtp} className={`mt-4 rounded-[5px] border px-6 py-3 text-sm font-medium uppercase disabled:opacity-60 ${primary}`}>{busy ? 'Sending…' : 'Send OTP'}</button></div>}
    {step === 'otp' && <div className="mt-8 max-w-xl"><h3 className="text-xl font-semibold">Enter OTP</h3><input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6 digit code" className={`mt-5 w-full rounded-[5px] border px-4 py-3 ${input}`} /><button type="button" disabled={busy} onClick={verifyOtp} className={`mt-4 rounded-[5px] border px-6 py-3 text-sm font-medium uppercase disabled:opacity-60 ${primary}`}>{busy ? 'Verifying…' : 'Verify OTP'}</button></div>}
    {step === 'address' && <div className="mt-8"><h3 className="text-xl font-semibold">Delivery details</h3><div className="mt-4 flex gap-3"><button type="button" onClick={() => setFulfillmentType('shipping')} className={`rounded-[5px] border px-4 py-2 ${fulfillmentType === 'shipping' ? 'border-emerald-300 bg-emerald-400/10' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Shipping</button><button type="button" onClick={() => setFulfillmentType('pickup')} className={`rounded-[5px] border px-4 py-2 ${fulfillmentType === 'pickup' ? 'border-emerald-300 bg-emerald-400/10' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Pickup</button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><input value={address.recipientName} onChange={(e) => setAddress({ ...address, recipientName: e.target.value })} placeholder={fulfillmentType === 'pickup' ? 'Pickup contact name' : 'Recipient name'} className={`rounded-[5px] border px-4 py-3 ${input}`} />{fulfillmentType === 'shipping' && <><input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="Phone" className={`rounded-[5px] border px-4 py-3 ${input}`} /><input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Address line 1" className={`rounded-[5px] border px-4 py-3 ${input}`} /><input value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Address line 2 optional" className={`rounded-[5px] border px-4 py-3 ${input}`} /><input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" className={`rounded-[5px] border px-4 py-3 ${input}`} /><input value={address.region} onChange={(e) => setAddress({ ...address, region: e.target.value })} placeholder="State / region" className={`rounded-[5px] border px-4 py-3 ${input}`} /><input value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} placeholder="Pincode" className={`rounded-[5px] border px-4 py-3 ${input}`} /><input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} placeholder="Country" className={`rounded-[5px] border px-4 py-3 ${input}`} /></>}</div><button type="button" disabled={busy} onClick={placeOrder} className={`mt-6 rounded-[5px] border px-6 py-3 text-sm font-medium uppercase disabled:opacity-60 ${primary}`}>{busy ? 'Placing order…' : paymentMethod === 'cod' ? 'Place COD order' : 'Pay now'}</button></div>}
  </section></div>;
}

function OrderPlacedScreen({ darkMode, orderId, onHome }) {
  return <div className="py-16"><section className={`mx-auto max-w-2xl rounded-[5px] border p-8 text-center ${darkMode ? 'border-emerald-300/30 bg-emerald-400/10' : 'border-emerald-200 bg-emerald-50'}`}><div className="text-5xl">✅</div><h2 className="mt-4 text-3xl font-semibold">Order placed</h2><p className={`mt-3 ${darkMode ? 'text-emerald-100' : 'text-emerald-800'}`}>Your 5-digit order id is</p><p className="mt-3 text-5xl font-bold tracking-widest">{orderId}</p><p className={`mt-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>We also sent the order confirmation to you on WhatsApp.</p><button type="button" onClick={onHome} className={`mt-8 rounded-[5px] border px-6 py-3 text-sm font-medium uppercase ${darkMode ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100' : 'border-fuchsia-200 bg-white text-fuchsia-800'}`}>Continue shopping</button></section></div>;
}

function AccountScreen({ darkMode, onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const card = darkMode ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-white';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    apiJson('/api/orders/mine', { headers: { Authorization: `Bearer ${token || ''}` } })
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return <div className="py-10"><BackButton darkMode={darkMode} onClick={onBack} /><section className="p-6"><h2 className="text-3xl font-semibold">Account</h2><p className={`mt-2 ${muted}`}>Past orders</p>{loading && <div className={`mt-8 rounded-[5px] border p-6 ${card}`}>Loading orders…</div>}{error && <div className="mt-8"><Notice tone="error" darkMode={darkMode}>{error}</Notice></div>}{!loading && !error && orders.length === 0 && <div className={`mt-8 rounded-[5px] border p-6 ${card}`}>No past orders yet.</div>}{!loading && !error && orders.length > 0 && <div className="mt-8 space-y-5">{orders.map((order) => <article key={order.uuid} className={`rounded-[5px] border p-5 ${card}`}><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h3 className="text-xl font-semibold">Order #{order.orderId}</h3><p className={`mt-1 text-sm ${muted}`}>{new Date(order.createdAt).toLocaleString()}</p></div><div className="text-left md:text-right"><p className="font-semibold capitalize">{order.status}</p><p className={`mt-1 text-sm ${muted}`}>{order.paymentMethod?.toUpperCase()} · {order.fulfillmentType}</p><p className="mt-2 text-lg font-bold">{money.format(order.total)}</p></div></div><div className="mt-5 space-y-3">{order.items.map((item) => <div key={`${order.uuid}-${item.productUuid}`} className={`flex items-center justify-between gap-4 rounded-[5px] border p-3 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}><div><p className="font-medium">{item.name}</p><p className={`text-sm ${muted}`}>{item.qty} × {money.format(item.unitPrice)}</p></div><p className="font-semibold">{money.format(item.rowTotal)}</p></div>)}</div></article>)}</div>}</section></div>;
}

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const initialRoute = routeFromPath();
  const [darkMode, setDarkMode] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pendingProductUuid, setPendingProductUuid] = useState(initialRoute.productUuid || '');
  const [screen, setScreen] = useState(initialRoute.screen);
  const [cartItems, setCartItems] = useState(() => readCartItems());
  const [cartErrors, setCartErrors] = useState([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [orderId, setOrderId] = useState('');
  const [userSessionToken, setUserSessionToken] = useState(() => localStorage.getItem(SESSION_STORAGE_KEY) || '');
  const cartCount = countCartItems(cartItems);

  function saveCart(nextItems) { setCartItems(nextItems); writeCartItems(nextItems); setCartErrors([]); }
  function addProductToCart(product) { const existingItem = cartItems.find((item) => item.uuid === product.uuid); const nextItems = existingItem ? cartItems.map((item) => (item.uuid === product.uuid ? { ...item, qty: item.qty + 1 } : item)) : [...cartItems, { uuid: product.uuid, name: product.name, price: product.price, image_url: product.image_url, qty: 1 }]; saveCart(nextItems); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function updateCartQuantity(uuid, nextQty) { const qty = Math.max(1, Number.parseInt(nextQty, 10) || 1); saveCart(cartItems.map((item) => (item.uuid === uuid ? { ...item, qty } : item))); }
  function decreaseCartQuantity(uuid) { saveCart(cartItems.map((item) => (item.uuid === uuid ? { ...item, qty: Math.max(1, item.qty - 1) } : item))); }
  function increaseCartQuantity(uuid) { saveCart(cartItems.map((item) => (item.uuid === uuid ? { ...item, qty: item.qty + 1 } : item))); }
  function removeCartItem(uuid) { saveCart(cartItems.filter((item) => item.uuid !== uuid)); }
  function navigateTo(nextScreen, product = null, { replace = false } = {}) { const nextPath = pathForScreen(nextScreen, product); const currentIndex = window.history.state?.kartClawIndex ?? 0; const nextState = { screen: nextScreen, kartClawIndex: replace ? currentIndex : currentIndex + 1 }; setScreen(nextScreen); if (product) { setSelectedProduct(product); setPendingProductUuid(product.uuid); } else if (nextScreen !== 'detail') { setSelectedProduct(null); setPendingProductUuid(''); } if (replace) window.history.replaceState(nextState, '', nextPath); else window.history.pushState(nextState, '', nextPath); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function goBack(fallbackScreen = 'list') { const currentIndex = window.history.state?.kartClawIndex ?? 0; if (currentIndex > 0) { window.history.back(); return; } navigateTo(fallbackScreen, null, { replace: true }); }
  function goHome(event) { event?.preventDefault?.(); setSelectedProduct(null); setPendingProductUuid(''); setScreen('list'); window.history.replaceState({ screen: 'list', kartClawIndex: 0 }, '', '/'); }
  async function beginCheckout() { setCheckingOut(true); setCartErrors([]); try { const data = await apiJson('/api/checkout/validate-cart', { method: 'POST', body: JSON.stringify({ items: cartItems }) }); setCheckout(data); navigateTo('checkout'); } catch (err) { setCartErrors(err.data?.errors || [{ message: err.message }]); navigateTo('cart'); } finally { setCheckingOut(false); } }
  function finishOrder(placedOrderId) { setUserSessionToken(localStorage.getItem(SESSION_STORAGE_KEY) || userSessionToken); setOrderId(placedOrderId); saveCart([]); setCheckout(null); navigateTo('placed'); }

  useEffect(() => { fetch('/api/products').then((response) => { if (!response.ok) throw new Error('API request failed'); return response.json(); }).then((data) => setProducts(data.products ?? [])).catch(() => setError('Could not load products from KartClawDB.')).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (typeof window.history.state?.kartClawIndex !== 'number') window.history.replaceState({ screen, kartClawIndex: 0 }, '', window.location.pathname); }, []);
  useEffect(() => { const onPopState = () => { const route = routeFromPath(); setScreen(route.screen); setPendingProductUuid(route.productUuid || ''); if (route.screen !== 'detail') setSelectedProduct(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }; window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, []);
  useEffect(() => { if (screen !== 'detail' || !pendingProductUuid || products.length === 0) return; const product = products.find((item) => item.uuid === pendingProductUuid); if (product) setSelectedProduct(product); }, [screen, pendingProductUuid, products]);
  const shellClasses = useMemo(() => darkMode ? 'bg-slate-950 text-white selection:bg-cyan-300 selection:text-slate-950' : 'bg-slate-50 text-slate-950 selection:bg-fuchsia-300 selection:text-slate-950', [darkMode]);

  return <main className={`min-h-screen overflow-hidden ${shellClasses}`}><div className={`pointer-events-none fixed inset-0 ${darkMode ? 'bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:46px_46px]' : 'bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:46px_46px]'}`} /><div className="relative mx-auto max-w-7xl px-6 py-8 sm:py-10 lg:px-8"><header className="flex items-center gap-3 border-b border-current/10 pb-8"><a href="/" onClick={goHome} className={`text-3xl font-semibold tracking-tight ${darkMode ? 'text-cyan-300' : 'text-fuchsia-700'}`}>Tronez</a><ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((value) => !value)} /><CartButton darkMode={darkMode} cartCount={cartCount} onClick={() => navigateTo('cart')} />{userSessionToken && <AccountButton darkMode={darkMode} onClick={() => navigateTo('account')} />}</header>{screen === 'list' && <ProductListScreen products={products} loading={loading} error={error} darkMode={darkMode} onSelectProduct={(product) => navigateTo('detail', product)} />}{screen === 'detail' && <ProductDetailScreen product={selectedProduct} darkMode={darkMode} onBack={goBack} onAddToCart={addProductToCart} />}{screen === 'cart' && <CartScreen cartItems={cartItems} darkMode={darkMode} cartErrors={cartErrors} checkingOut={checkingOut} onBack={() => goBack('list')} onIncrease={increaseCartQuantity} onDecrease={decreaseCartQuantity} onQuantityChange={updateCartQuantity} onRemove={removeCartItem} onCheckout={beginCheckout} />}{screen === 'checkout' && <CheckoutScreen darkMode={darkMode} checkout={checkout} onBackToCart={() => goBack('cart')} onOrderPlaced={finishOrder} onLogin={setUserSessionToken} />}{screen === 'account' && <AccountScreen darkMode={darkMode} onBack={() => goBack('list')} />}{screen === 'placed' && <OrderPlacedScreen darkMode={darkMode} orderId={orderId} onHome={goHome} />}</div></main>;
}

createRoot(document.getElementById('root')).render(<App />);
