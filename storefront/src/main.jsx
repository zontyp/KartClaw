import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const CART_STORAGE_KEY = 'kartclaw_cart_items';

function readCartItems() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeCartItems(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function countCartItems(items) {
  return items.reduce((total, item) => total + item.qty, 0);
}

function calculateCartTotal(items) {
  return items.reduce((total, item) => total + item.price * item.qty, 0);
}

function ProductArtwork({ product, darkMode, large = false }) {
  const imageUrl = product?.image_url;

  return (
    <div
      className={`flex ${large ? 'h-80' : 'h-40'} items-center justify-center overflow-hidden rounded-2xl border ${
        darkMode
          ? 'border-slate-700 bg-slate-900'
          : 'border-slate-200 bg-slate-100'
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="text-center">
          <div className={large ? 'text-7xl' : 'text-5xl'}>◈</div>
          <div
            className={`mt-3 text-xs font-medium uppercase tracking-[0.35em] ${
              darkMode ? 'text-cyan-200' : 'text-fuchsia-700'
            }`}
          >
            Tronez
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ darkMode, onToggle }) {
  return (
    <button
      type="button"
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle}
      className={`grid h-10 w-10 place-items-center rounded-[5px] border transition ${
        darkMode
          ? 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950'
      }`}
    >
      {darkMode ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function ProductCard({ product, darkMode, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`group w-full overflow-hidden rounded-[5px] border p-6 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        darkMode
          ? 'border-slate-700 bg-slate-950/70 hover:border-cyan-300'
          : 'border-slate-300 bg-white hover:border-fuchsia-400'
      }`}
    >
      <ProductArtwork product={product} darkMode={darkMode} />

      <div className="mt-5 flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight">{product.name}</h3>
        <p
          className={`rounded-[5px] border px-3 py-1 text-sm font-semibold ${
            darkMode
              ? 'border-slate-700 bg-slate-900 text-white'
              : 'border-slate-300 bg-slate-100 text-slate-950'
          }`}
        >
          {money.format(product.price)}
        </p>
      </div>

      <p className={`mt-4 min-h-20 text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
        {product.description}
      </p>
    </button>
  );
}

function ProductListScreen({ products, loading, error, darkMode, onSelectProduct }) {
  return (
    <div>
      <section className="py-10">
        <div className="mb-6">
          <h2 className={`text-[1.575rem] font-semibold leading-tight ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Products</h2>
        </div>

        {loading && <div className="rounded-3xl border border-current/10 p-10 text-center font-medium">Loading products…</div>}

        {error && !loading && (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-10 text-center font-medium text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.uuid} product={product} darkMode={darkMode} onSelect={onSelectProduct} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CartButton({ darkMode, cartCount, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ml-auto inline-flex items-center gap-2.5 rounded-[5px] border px-4 py-2 text-base font-medium transition ${
        darkMode
          ? 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950'
      }`}
    >
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8h12l-1 13H7L6 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </svg>
      <span>Cart</span>
      <span className={`ml-1 grid min-h-6 min-w-6 place-items-center rounded-[5px] border px-1.5 text-sm font-semibold ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-100 text-slate-950'}`}>
        {cartCount}
      </span>
    </button>
  );
}

function ProductDetailScreen({ product, darkMode, onBack, onAddToCart }) {
  if (!product) return null;

  return (
    <div className="py-10">
      <button
        type="button"
        onClick={onBack}
        className={`mb-8 inline-flex items-center gap-3 rounded-[5px] border px-4 py-2 text-sm font-medium transition ${
          darkMode
            ? 'border-slate-700 bg-slate-950/70 text-cyan-200 hover:border-cyan-300'
            : 'border-slate-200 bg-white text-slate-800 hover:border-fuchsia-400'
        }`}
      >
        <span className="text-xl leading-none">←</span>
        <span>Back</span>
      </button>

      <section className={`grid items-start gap-8 rounded-3xl border p-6 md:grid-cols-2 md:p-8 ${darkMode ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-white'}`}>
        <ProductArtwork product={product} darkMode={darkMode} large />

        <div className="flex flex-col justify-start">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{product.name}</h2>
          <p className={`mt-5 text-base leading-7 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {product.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className={`rounded-[5px] border px-4 py-2 text-lg font-semibold ${darkMode ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {money.format(product.price)}
            </span>
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[5px] border px-2.5 py-6 text-sm font-medium uppercase transition ${
                darkMode
                  ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Add to cart
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CartScreen({ cartItems, darkMode, onBack, onIncrease, onDecrease, onQuantityChange, onRemove }) {
  const total = calculateCartTotal(cartItems);
  const tableBorder = darkMode ? 'border-slate-700' : 'border-slate-200';
  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBorder = darkMode ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-white';
  const quantityButtonClass = darkMode ? 'border-slate-700 text-cyan-200' : 'border-slate-300 text-slate-800';
  const quantityInputClass = darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-950';
  const deleteButtonClass = darkMode
    ? 'border-red-400/40 text-red-200 hover:border-red-300'
    : 'border-red-200 text-red-700 hover:border-red-400';
  const checkoutButtonClass = darkMode
    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';

  return (
    <div className="py-10">
      <button
        type="button"
        onClick={onBack}
        className={`mb-8 inline-flex items-center gap-3 rounded-[5px] border px-4 py-2 text-sm font-medium transition ${
          darkMode
            ? 'border-slate-700 bg-slate-950/70 text-cyan-200 hover:border-cyan-300'
            : 'border-slate-200 bg-white text-slate-800 hover:border-fuchsia-400'
        }`}
      >
        <span className="text-xl leading-none">←</span>
        <span>Back</span>
      </button>

      <section className={`rounded-[5px] border p-6 ${darkMode ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-white'}`}>
        <h2 className="text-3xl font-semibold">Cart</h2>

        {cartItems.length === 0 ? (
          <p className={`mt-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Your cart is empty.</p>
        ) : (
          <>
            <div className="mt-8 hidden lg:block">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col />
                  <col className="w-56" />
                  <col className="w-36" />
                  <col className="w-24" />
                </colgroup>
                <thead>
                  <tr className={`border-b ${tableBorder}`}>
                    <th className={`p-3 text-left text-sm font-medium ${mutedText}`}>Product</th>
                    <th className={`p-3 text-left text-sm font-medium ${mutedText}`}>Quantity</th>
                    <th className={`p-3 text-left text-sm font-medium ${mutedText}`}>Price</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.uuid} className={`border-b ${tableBorder}`}>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-4">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className={`h-16 w-16 rounded-[5px] border object-contain p-2 ${
                                darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'
                              }`}
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold">{item.name}</h3>
                            <p className={mutedText}>{money.format(item.price)} each</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 pr-10 align-middle">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onDecrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>−</button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(event) => onQuantityChange(item.uuid, event.target.value)}
                            className={`h-10 w-20 rounded-[5px] border text-center ${quantityInputClass}`}
                          />
                          <button type="button" onClick={() => onIncrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>+</button>
                        </div>
                      </td>

                      <td className="p-4 text-left align-middle font-semibold tabular-nums">
                        {money.format(item.price * item.qty)}
                      </td>

                      <td className="p-4 text-right align-middle">
                        <button type="button" onClick={() => onRemove(item.uuid)} className={`w-full rounded-[5px] border px-4 py-2 text-sm font-medium ${deleteButtonClass}`}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  <tr>
                    <td className="p-4" />
                    <td className={`p-4 pr-10 text-right ${mutedText}`}>Total</td>
                    <td className="p-4 text-left font-semibold tabular-nums">{money.format(total)}</td>
                    <td className="p-4" />
                  </tr>
                  <tr>
                    <td className="p-4" />
                    <td className="p-4" />
                    <td className="p-4 text-left" colSpan={2}>
                      <button type="button" className={`w-full rounded-[5px] border px-6 py-3 text-sm font-medium uppercase transition ${checkoutButtonClass}`}>
                        Checkout
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 space-y-4 lg:hidden">
              {cartItems.map((item) => (
                <div key={item.uuid} className={`rounded-[5px] border p-4 ${cardBorder}`}>
                  <div className="flex items-start gap-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className={`h-16 w-16 rounded-[5px] border object-contain p-2 ${
                          darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'
                        }`}
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <p className={`mt-1 ${mutedText}`}>{money.format(item.price)} each</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className={`mb-2 text-sm ${mutedText}`}>Quantity</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onDecrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>−</button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(event) => onQuantityChange(item.uuid, event.target.value)}
                        className={`h-10 w-20 rounded-[5px] border text-center ${quantityInputClass}`}
                      />
                      <button type="button" onClick={() => onIncrease(item.uuid)} className={`h-10 w-10 rounded-[5px] border text-lg ${quantityButtonClass}`}>+</button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className={`mb-1 text-sm ${mutedText}`}>Row total</p>
                    <p className="font-semibold tabular-nums">{money.format(item.price * item.qty)}</p>
                  </div>

                  <button type="button" onClick={() => onRemove(item.uuid)} className={`mt-4 w-full rounded-[5px] border px-4 py-2 text-sm font-medium ${deleteButtonClass}`}>
                    Delete
                  </button>
                </div>
              ))}

              <div className={`rounded-[5px] border p-4 ${cardBorder}`}>
                <div>
                  <p className={`mb-1 text-sm ${mutedText}`}>Total</p>
                  <p className="font-semibold tabular-nums">{money.format(total)}</p>
                </div>
                <button type="button" className={`mt-4 w-full rounded-[5px] border px-6 py-3 text-sm font-medium uppercase transition ${checkoutButtonClass}`}>
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState(() => readCartItems());
  const currentScreen = showCart ? 'cart' : selectedProduct ? 'detail' : 'list';
  const cartCount = countCartItems(cartItems);

  function saveCart(nextItems) {
    setCartItems(nextItems);
    writeCartItems(nextItems);
  }

  function addProductToCart(product) {
    const existingItem = cartItems.find((item) => item.uuid === product.uuid);
    const nextItems = existingItem
      ? cartItems.map((item) => (item.uuid === product.uuid ? { ...item, qty: item.qty + 1 } : item))
      : [...cartItems, { uuid: product.uuid, name: product.name, price: product.price, image_url: product.image_url, qty: 1 }];
    saveCart(nextItems);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateCartQuantity(uuid, nextQty) {
    const qty = Math.max(1, Number.parseInt(nextQty, 10) || 1);
    saveCart(cartItems.map((item) => (item.uuid === uuid ? { ...item, qty } : item)));
  }

  function decreaseCartQuantity(uuid) {
    saveCart(cartItems.map((item) => (item.uuid === uuid ? { ...item, qty: Math.max(1, item.qty - 1) } : item)));
  }

  function increaseCartQuantity(uuid) {
    saveCart(cartItems.map((item) => (item.uuid === uuid ? { ...item, qty: item.qty + 1 } : item)));
  }

  function removeCartItem(uuid) {
    saveCart(cartItems.filter((item) => item.uuid !== uuid));
  }

  function goHome(event) {
    event.preventDefault();
    setSelectedProduct(null);
    setShowCart(false);
    window.history.pushState(null, '', '/');
  }

  useEffect(() => {
    fetch('/api/products')
      .then((response) => {
        if (!response.ok) throw new Error('API request failed');
        return response.json();
      })
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setError('Could not load products from KartClawDB.'))
      .finally(() => setLoading(false));
  }, []);

  const shellClasses = useMemo(
    () =>
      darkMode
        ? 'bg-slate-950 text-white selection:bg-cyan-300 selection:text-slate-950'
        : 'bg-slate-50 text-slate-950 selection:bg-fuchsia-300 selection:text-slate-950',
    [darkMode]
  );

  return (
    <main className={`min-h-screen overflow-hidden ${shellClasses}`}>
      <div className={`pointer-events-none fixed inset-0 ${darkMode ? 'bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:46px_46px]' : 'bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:46px_46px]'}`} />

      <div className="relative mx-auto max-w-7xl px-6 py-8 sm:py-10 lg:px-8">
        <header className="flex items-center gap-3 border-b border-current/10 pb-8">
          <a href="/" onClick={goHome} className={`text-3xl font-semibold tracking-tight ${darkMode ? 'text-cyan-300' : 'text-fuchsia-700'}`}>
            Tronez
          </a>
          <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((value) => !value)} />
          <CartButton darkMode={darkMode} cartCount={cartCount} onClick={() => setShowCart(true)} />
        </header>

        <div className={currentScreen === 'list' ? 'block' : 'hidden'}>
          <ProductListScreen products={products} loading={loading} error={error} darkMode={darkMode} onSelectProduct={(product) => { setSelectedProduct(product); setShowCart(false); }} />
        </div>

        <div className={currentScreen === 'detail' ? 'block' : 'hidden'}>
          <ProductDetailScreen product={selectedProduct} darkMode={darkMode} onBack={() => setSelectedProduct(null)} onAddToCart={addProductToCart} />
        </div>

        <div className={currentScreen === 'cart' ? 'block' : 'hidden'}>
          <CartScreen
            cartItems={cartItems}
            darkMode={darkMode}
            onBack={() => setShowCart(false)}
            onIncrease={increaseCartQuantity}
            onDecrease={decreaseCartQuantity}
            onQuantityChange={updateCartQuantity}
            onRemove={removeCartItem}
          />
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
