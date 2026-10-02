/* ============================================================
   ROCÈA Herbal Tea — App Logic
   ============================================================ */

/* ---------- KONFIGURASI GOOGLE APPS SCRIPT ---------- */
const GOOGLE_SCRIPT_URL = "MASUKKAN_URL_GOOGLE_APPS_SCRIPT_DI_SINI";

/* ---------- DATA PRODUK ---------- */
const PRODUCTS = [
  {
    id: "rocea-original",
    name: "ROCÈA Original",
    price: 7000,
    size: "250 ml",
    composition: "Rosella + Jeruk Nipis + Es",
    desc: "Minuman berbahan dasar rosella yang dipadukan dengan jeruk nipis dan es. Segar dengan warna merah alami yang menarik.",
    image: "assets/rocea-original.png",
    emoji: "🌺",
    badge: "Best Seller"
  },
  {
    id: "rocea-mojito",
    name: "ROCÈA Mojito",
    price: 12000,
    size: "400 ml",
    composition: "Rosella + Sprite + Es",
    desc: "Perpaduan rosella dan Sprite dengan es yang menghasilkan minuman soda rosella yang segar dan nikmat diminum dingin.",
    image: "assets/rocea-mojito.png",
    emoji: "🥤",
    badge: "New"
  }
];

/* ---------- FAQ ---------- */
const FAQS = [
  { q: "Apakah ROCÈA dibuat fresh?", a: "ROCÈA disiapkan sebagai minuman segar yang nikmat diminum dalam kondisi dingin." },
  { q: "Berapa ukuran ROCÈA Original?", a: "ROCÈA Original menggunakan botol plastik 250 ml." },
  { q: "Berapa ukuran ROCÈA Mojito?", a: "ROCÈA Mojito menggunakan cup injection plastik bening 400 ml." },
  { q: "Apakah ROCÈA Mojito menggunakan jeruk nipis?", a: "Tidak. ROCÈA Mojito hanya menggunakan rosella, Sprite, dan es." },
  { q: "Bagaimana cara memesan?", a: "Pilih produk, tentukan jumlah, masukkan ke keranjang, kemudian checkout langsung melalui website." },
  { q: "Apakah checkout dilakukan melalui WhatsApp?", a: "Tidak. Checkout dilakukan langsung melalui website. WhatsApp hanya digunakan untuk Customer Service." },
  { q: "Bagaimana cara menghubungi admin?", a: "Gunakan tombol WhatsApp Customer Service di halaman Profil atau tombol 'Hubungi Admin ROCÈA'." }
];

/* ---------- HELPERS ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

function formatRupiah(n) {
  return "Rp" + new Intl.NumberFormat("id-ID").format(n);
}

function getProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

/* ---------- LOCALSTORAGE ---------- */
const STORAGE = {
  CART: "rocea_cart",
  FAVORITES: "rocea_favs",
  ORDERS: "rocea_orders"
};

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ---------- STATE ---------- */
let cart = loadLS(STORAGE.CART, []);
let favorites = loadLS(STORAGE.FAVORITES, []);
let orders = loadLS(STORAGE.ORDERS, []);
const qtyState = {}; // qty per produk di halaman produk
PRODUCTS.forEach(p => qtyState[p.id] = 1);

/* ---------- TOAST ---------- */
function toast(msg, type = "success") {
  const wrap = $("#toastWrap");
  const el = document.createElement("div");
  el.className = "toast" + (type === "error" ? " err" : "");
  el.innerHTML = `<span class="toast-icon">${type === "error" ? "!" : "✓"}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/* ---------- NAVIGASI ---------- */
let currentPage = "home";
function navigate(page, pushState = true) {
  if (page === currentPage) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $$(".page").forEach(p => p.classList.remove("active"));
  const target = $("#page-" + page);
  if (!target) return;
  target.classList.add("active");
  currentPage = page;

  // update nav active
  $$("[data-nav]").forEach(el => {
    if (el.classList.contains("nav-link") || el.classList.contains("bn-item")) {
      el.classList.toggle("active", el.dataset.nav === page);
    }
  });

  // render konten sesuai halaman
  if (page === "cart") renderCart();
  if (page === "checkout") renderCheckout();
  if (page === "orders") renderOrders();
  if (page === "favorites") renderFavorites();
  if (page === "faq") renderFaq();
  if (page === "profile") {/* statis */}

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pushState) {
    history.pushState({ page }, "", "#" + page);
  }
}

// Event semua elemen dengan data-nav
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-nav]");
  if (el) {
    e.preventDefault();
    navigate(el.dataset.nav);
  }
});

window.addEventListener("popstate", (e) => {
  if (e.state && e.state.page) navigate(e.state.page, false);
  else navigate("home", false);
});

/* ---------- BADGE CART ---------- */
function cartCount() {
  return cart.reduce((s, i) => s + i.qty, 0);
}
function updateCartBadge() {
  const count = cartCount();
  const badge = $("#cartBadge");
  const bnav = $("#bnCartBadge");
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.classList.add("show");
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");

    bnav.textContent = count;
    bnav.classList.add("show");
  } else {
    badge.classList.remove("show");
    bnav.classList.remove("show");
  }
}

/* ---------- RENDER PRODUK CARD ---------- */
function productCardHTML(p) {
  const isFav = favorites.includes(p.id);
  const qty = qtyState[p.id] || 1;
  const subtotal = p.price * qty;
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="pc-image" data-emoji="${p.emoji}">
        <img src="${p.image}" alt="${p.name}" loading="lazy"
             onerror="this.style.display='none';this.parentElement.classList.add('placeholder')">
        ${p.badge ? `<span class="pc-badge">${p.badge}</span>` : ""}
        <button class="fav-btn ${isFav ? "active" : ""}" data-fav="${p.id}" aria-label="Favorit">
          ${isFav ? "❤️" : "🤍"}
        </button>
      </div>
      <div class="pc-body">
        <div>
          <div class="pc-name">${p.name}</div>
          <span class="pc-size">${p.size}</span>
        </div>
        <p class="pc-desc">${p.desc}</p>
        <p class="pc-compo">${p.composition}</p>
        <div class="pc-price">${formatRupiah(p.price)}</div>

        <div class="qty-row">
          <span class="qty-label">Jumlah</span>
          <div class="qty-control">
            <button class="qty-btn" data-dec="${p.id}" ${qty <= 1 ? "disabled" : ""}>−</button>
            <span class="qty-value" data-qty="${p.id}">${qty}</span>
            <button class="qty-btn" data-inc="${p.id}">+</button>
          </div>
        </div>

        <div class="pc-subtotal">
          <span>Subtotal</span>
          <strong data-subtotal="${p.id}">${formatRupiah(subtotal)}</strong>
        </div>

        <div class="pc-actions">
          <button class="btn btn-ghost" data-add="${p.id}">+ Keranjang</button>
          <button class="btn btn-primary" data-buy="${p.id}">Beli Sekarang</button>
        </div>
      </div>
    </article>
  `;
}

function renderHomeProducts() {
  $("#homeProducts").innerHTML = PRODUCTS.map(productCardHTML).join("");
}
function renderAllProducts(filter = "") {
  const q = filter.trim().toLowerCase();
  const list = q
    ? PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.composition.toLowerCase().includes(q))
    : PRODUCTS;
  $("#allProducts").innerHTML = list.map(productCardHTML).join("");
  $("#productsEmpty").classList.toggle("hidden", list.length > 0);
}

/* ---------- RENDER CART ---------- */
function renderCart() {
  const wrap = $("#cartContent");
  if (cart.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Keranjang kamu masih kosong.</h3>
        <p>Yuk pilih minuman ROCÈA favoritmu.</p>
        <button class="btn btn-primary" data-nav="products">Mulai Belanja</button>
      </div>`;
    return;
  }

  const itemsHTML = cart.map(item => {
    const p = getProduct(item.id);
    if (!p) return "";
    const sub = p.price * item.qty;
    return `
      <div class="cart-item" data-id="${p.id}">
        <div class="ci-img" data-emoji="${p.emoji}">
          <img src="${p.image}" alt="${p.name}"
               onerror="this.style.display='none';this.parentElement.classList.add('placeholder')">
        </div>
        <div class="ci-info">
          <div class="ci-name">${p.name}</div>
          <div class="ci-price">${p.size} • ${formatRupiah(p.price)}</div>
          <div class="ci-row">
            <div class="qty-control">
              <button class="qty-btn" data-cart-dec="${p.id}" ${item.qty <= 1 ? "disabled" : ""}>−</button>
              <span class="qty-value">${item.qty}</span>
              <button class="qty-btn" data-cart-inc="${p.id}">+</button>
            </div>
            <div class="ci-sub" data-cart-sub="${p.id}">${formatRupiah(sub)}</div>
          </div>
          <button class="ci-remove" data-remove="${p.id}">Hapus</button>
        </div>
      </div>`;
  }).join("");

  const subtotal = cart.reduce((s, i) => {
    const p = getProduct(i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  wrap.innerHTML = `
    <div class="cart-layout">
      <div>${itemsHTML}</div>
      <aside class="cart-summary">
        <h3>Ringkasan</h3>
        <div class="sum-row"><span>Subtotal</span><span>${formatRupiah(subtotal)}</span></div>
        <div class="sum-row"><span>Total Item</span><span>${cartCount()} item</span></div>
        <div class="sum-row total"><span>Total Pesanan</span><strong>${formatRupiah(subtotal)}</strong></div>
        <button class="btn btn-primary btn-block" style="margin-top:14px" data-nav="checkout">Lanjut ke Checkout</button>
      </aside>
    </div>`;
}

/* ---------- RENDER CHECKOUT ---------- */
function renderCheckout() {
  const wrap = $("#checkoutItems");
  if (!wrap) return;
  if (cart.length === 0) {
    $("#page-checkout").classList.remove("active");
    navigate("cart");
    return;
  }
  const itemsHTML = cart.map(item => {
    const p = getProduct(item.id);
    const sub = p.price * item.qty;
    return `
      <div class="chk-item">
        <div class="chk-name">${p.name}<small>${item.qty} × ${formatRupiah(p.price)}</small></div>
        <div class="chk-price">${formatRupiah(sub)}</div>
      </div>`;
  }).join("");
  wrap.innerHTML = itemsHTML;
  $("#checkoutTotal").textContent = formatRupiah(cartTotal());
}

function cartTotal() {
  return cart.reduce((s, i) => {
    const p = getProduct(i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
}

/* ---------- RENDER ORDERS ---------- */
function renderOrders() {
  const wrap = $("#ordersContent");
  if (orders.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Belum ada pesanan.</h3>
        <p>Pesanan yang kamu buat akan muncul di sini.</p>
        <button class="btn btn-primary" data-nav="products">Mulai Belanja</button>
      </div>`;
    return;
  }
  // Urut terbaru dulu
  const list = [...orders].reverse();
  wrap.innerHTML = list.map(o => {
    const statusClass = statusClassOf(o.status);
    const itemsPreview = o.items.map(i => `${i.name} ×${i.qty}`).join(", ");
    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <div class="order-id">${o.orderId}</div>
            <div class="order-date">${o.date} • ${o.time}</div>
          </div>
          <span class="status-badge ${statusClass}">${o.status}</span>
        </div>
        <div class="order-body">
          <div class="ord-line"><span>Produk</span><span>${itemsPreview}</span></div>
          <div class="ord-line"><span>Pembayaran</span><span>${o.payment}</span></div>
        </div>
        <div class="order-foot">
          <div class="order-total">${formatRupiah(o.total)}</div>
          <button class="detail-btn" data-detail="${o.orderId}">Lihat Detail</button>
        </div>
      </div>`;
  }).join("");
}

function statusClassOf(s) {
  if (s.startsWith("Menunggu")) return "status-Menunggu";
  if (s === "Diproses") return "status-Diproses";
  if (s === "Siap Diambil") return "status-Siap";
  if (s === "Selesai") return "status-Selesai";
  if (s === "Dibatalkan") return "status-Dibatalkan";
  return "status-Menunggu";
}

/* ---------- ORDER DETAIL ---------- */
function renderOrderDetail(orderId) {
  const o = orders.find(x => x.orderId === orderId);
  if (!o) { navigate("orders"); return; }
  const itemsHTML = o.items.map(i => `
    <div class="detail-prod">
      <div class="dp-name">${i.name}<small>${i.qty} × ${formatRupiah(i.price)}</small></div>
      <div class="dp-price">${formatRupiah(i.qty * i.price)}</div>
    </div>`).join("");

  $("#orderDetailContent").innerHTML = `
    <div class="detail-card">
      <h3>Info Pesanan</h3>
      <div class="detail-row"><span>ID Pesanan</span><span>${o.orderId}</span></div>
      <div class="detail-row"><span>Tanggal</span><span>${o.date} • ${o.time}</span></div>
      <div class="detail-row"><span>Status</span><span><span class="status-badge ${statusClassOf(o.status)}">${o.status}</span></span></div>
    </div>
    <div class="detail-card">
      <h3>Data Pembeli</h3>
      <div class="detail-row"><span>Nama</span><span>${o.customer.name}</span></div>
      <div class="detail-row"><span>WhatsApp</span><span>${o.customer.phone}</span></div>
      <div class="detail-row"><span>Alamat</span><span>${o.customer.address}</span></div>
      <div class="detail-row"><span>Catatan</span><span>${o.customer.note || "-"}</span></div>
    </div>
    <div class="detail-card">
      <h3>Produk</h3>
      ${itemsHTML}
    </div>
    <div class="detail-card">
      <h3>Pembayaran</h3>
      <div class="detail-row"><span>Metode</span><span>${o.payment}</span></div>
      <div class="detail-row"><span>Total</span><span style="color:var(--rosella);font-family:var(--ff-display);font-size:18px">${formatRupiah(o.total)}</span></div>
    </div>
  `;
  navigate("order-detail");
}

/* ---------- FAVORITES ---------- */
function renderFavorites() {
  const list = PRODUCTS.filter(p => favorites.includes(p.id));
  $("#favoriteProducts").innerHTML = list.map(productCardHTML).join("");
  $("#favoritesEmpty").classList.toggle("hidden", list.length > 0);
  $("#favoriteProducts").classList.toggle("hidden", list.length === 0);
}

/* ---------- FAQ ---------- */
function renderFaq() {
  const wrap = $("#faqList");
  wrap.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" data-faq="${i}">
      <button class="faq-q">
        <span>${f.q}</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-a"><p>${f.a}</p></div>
    </div>`).join("");
}

/* ---------- AKSI PRODUK ---------- */
function changeQty(id, delta) {
  const p = getProduct(id);
  if (!p) return;
  let q = (qtyState[id] || 1) + delta;
  if (q < 1) q = 1;
  qtyState[id] = q;

  // Update UI di semua card yang menampilkan produk ini
  $$(`[data-qty="${id}"]`).forEach(el => {
    el.textContent = q;
    el.animate([{transform:"scale(1)"},{transform:"scale(1.2)"},{transform:"scale(1)"}], {duration:250});
  });
  $$(`[data-subtotal="${id}"]`).forEach(el => {
    el.textContent = formatRupiah(p.price * q);
  });
  $$(`[data-dec="${id}"]`).forEach(el => {
    el.disabled = q <= 1;
  });
}

function addToCart(id, customQty) {
  const p = getProduct(id);
  if (!p) return;
  const qty = customQty || qtyState[id] || 1;
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id, qty });
  }
  saveLS(STORAGE.CART, cart);
  updateCartBadge();
  toast(`${p.name} ×${qty} berhasil ditambahkan ke keranjang.`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveLS(STORAGE.CART, cart);
  updateCartBadge();
  renderCart();
  toast("Produk dihapus dari keranjang.");
}

function changeCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) item.qty = 1;
  saveLS(STORAGE.CART, cart);
  updateCartBadge();
  renderCart();
  toast("Jumlah produk diperbarui.");
}

function toggleFavorite(id) {
  const p = getProduct(id);
  const idx = favorites.indexOf(id);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    toast(`${p.name} dihapus dari favorit.`);
  } else {
    favorites.push(id);
    toast(`${p.name} ditambahkan ke favorit ❤️`);
  }
  saveLS(STORAGE.FAVORITES, favorites);
  // Update semua tombol fav untuk produk ini
  $$(`[data-fav="${id}"]`).forEach(btn => {
    const isFav = favorites.includes(id);
    btn.classList.toggle("active", isFav);
    btn.textContent = isFav ? "❤️" : "🤍";
    btn.animate([{transform:"scale(1)"},{transform:"scale(1.3)"},{transform:"scale(1)"}], {duration:350});
  });
  if (currentPage === "favorites") renderFavorites();
}

/* ---------- EVENT DELEGATION ---------- */
document.addEventListener("click", (e) => {
  const t = e.target;

  // Qty +/-
  const inc = t.closest("[data-inc]");
  if (inc) { changeQty(inc.dataset.inc, +1); return; }
  const dec = t.closest("[data-dec]");
  if (dec) { changeQty(dec.dataset.dec, -1); return; }

  // Qty cart
  const cInc = t.closest("[data-cart-inc]");
  if (cInc) { changeCartQty(cInc.dataset.cartInc, +1); return; }
  const cDec = t.closest("[data-cart-dec]");
  if (cDec) { changeCartQty(cDec.dataset.cartDec, -1); return; }

  // Add to cart
  const add = t.closest("[data-add]");
  if (add) { addToCart(add.dataset.add); return; }

  // Buy now
  const buy = t.closest("[data-buy]");
  if (buy) {
    addToCart(buy.dataset.buy);
    navigate("checkout");
    return;
  }

  // Remove
  const rem = t.closest("[data-remove]");
  if (rem) { removeFromCart(rem.dataset.remove); return; }

  // Fav
  const fav = t.closest("[data-fav]");
  if (fav) { toggleFavorite(fav.dataset.fav); return; }

  // FAQ toggle
  const faq = t.closest(".faq-q");
  if (faq) {
    const item = faq.parentElement;
    item.classList.toggle("open");
    return;
  }

  // Detail pesanan
  const det = t.closest("[data-detail]");
  if (det) { renderOrderDetail(det.dataset.detail); return; }
});

/* ---------- SEARCH ---------- */
$("#searchToggle").addEventListener("click", () => {
  const bar = $("#searchBar");
  bar.classList.toggle("open");
  if (bar.classList.contains("open")) {
    setTimeout(() => $("#searchInput").focus(), 150);
  }
});
$("#searchClose").addEventListener("click", () => {
  $("#searchBar").classList.remove("open");
  $("#searchInput").value = "";
  if (currentPage === "products") renderAllProducts("");
});
$("#searchInput").addEventListener("input", (e) => {
  const q = e.target.value;
  navigate("products");
  renderAllProducts(q);
});

/* ---------- CUSTOMER SERVICE MODAL ---------- */
$("#openCsBtn").addEventListener("click", () => $("#csModal").classList.add("open"));
$("#profileCs").addEventListener("click", () => $("#csModal").classList.add("open"));
$("#csModal").addEventListener("click", (e) => {
  if (e.target.closest("[data-close-modal]")) {
    $("#csModal").classList.remove("open");
  }
});

/* ---------- CHECKOUT SUBMIT ---------- */
$("#checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const name = $("#fName").value.trim();
  const phone = $("#fPhone").value.trim();
  const address = $("#fAddress").value.trim();
  const note = $("#fNote").value.trim();
  const payment = ($('input[name="payment"]:checked') || {}).value || "";
  const confirm = $("#fConfirm").checked;

  let ok = true;
  if (!name) { showErr("fName", "Nama tidak boleh kosong."); ok = false; }
  if (!phone) { showErr("fPhone", "Nomor WhatsApp tidak boleh kosong."); ok = false; }
  else if (!/^[0-9+\-\s]{8,}$/.test(phone)) { showErr("fPhone", "Format nomor tidak valid.
