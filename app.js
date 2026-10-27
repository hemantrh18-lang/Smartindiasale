(() => {
"use strict";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const K = {
  p: "msSaleProductsV4",
  c: "msSaleCartV4",
  o: "msSaleOrdersV1",
  pay: "msSalePaymentSettingsV2"
};

const PIN = "2468";
const placeholder = "https://placehold.co/600x750/f7edf6/9f2089?text=Product";

const defaults = [
  [1,"Women's Printed Kurti","Women",199,399,"BESTSELLER","https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=650&q=80","Printed everyday kurti."],
  [2,"Makeup Combo","Beauty",149,299,"TRENDING","https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=650&q=80","Everyday beauty essentials."],
  [3,"Men's T-Shirt","Men",249,499,"HOT DEAL","https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=650&q=80","Casual daily T-shirt."],
  [4,"Home Organizer","Home",199,399,"POPULAR","https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=650&q=80","Organize everyday essentials."],
  [5,"Women's Handbag","Accessories",299,599,"NEW","https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=650&q=80","Everyday handbag."],
  [6,"Floral Dress","Women",249,549,"TRENDING","https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=650&q=80","Lightweight floral outfit."],
  [7,"Skincare Essentials","Beauty",199,449,"DEAL","https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=650&q=80","Skincare essentials."],
  [8,"Men's Casual Shirt","Men",299,699,"BESTSELLER","https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=650&q=80","Smart casual shirt."],
  [9,"Cushion Cover","Home",149,299,"VALUE BUY","https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=650&q=80","Living room decor."],
  [10,"Fashion Earrings","Accessories",149,349,"SALE","https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=650&q=80","Statement earrings."],
  [11,"Cotton Kurti Set","Women",299,649,"SALE","https://images.unsplash.com/photo-1583391733956-6c78276477e9?auto=format&fit=crop&w=650&q=80","Easy-to-style kurti set."],
  [12,"Water Bottle","Home",199,399,"POPULAR","https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=650&q=80","Reusable water bottle."]
].map(a => ({
  id: a[0],
  title: a[1],
  category: a[2],
  price: a[3],
  oldPrice: a[4],
  tag: a[5],
  image: a[6],
  description: a[7],
  active: true
}));

const read = (k, d) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v == null ? d : v;
  } catch {
    return d;
  }
};

const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    toast("Browser storage unavailable/full");
  }
};

const money = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const validUrl = s => {
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};

let products = read(K.p, null);
if (!Array.isArray(products) || !products.length) {
  products = defaults.map(x => ({ ...x }));
}

let cart = read(K.c, []);
if (!Array.isArray(cart)) cart = [];

let orders = read(K.o, []);
if (!Array.isArray(orders)) orders = [];

let payment = read(K.pay, {
  merchantName: "Meesho Sale",
  upiId: "",
  qrImage: ""
});

let cat = "All";
let term = "";

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    el.textContent = "";
  }, 2600);
}

function saveP() {
  write(K.p, products);
}

function saveC() {
  write(K.c, cart);
  $("#count").textContent = cart.reduce((n, x) => n + x.qty, 0);
}

function total() {
  return cart.reduce((n, x) => n + x.price * x.qty, 0);
}

/* PRODUCT SIZE RULES */

function sizeConfig(p) {
  const title = String(p.title || "").toLowerCase();
  const type = String(p.sizeType || "").toLowerCase();
  const category = String(p.category || "").toLowerCase();

  if (type === "none" || type === "other") return null;

  // Bra: band number + cup size
  if (type === "bra" || /\b(bra|bralette)\b/.test(title)) {
    return {
      label: "Select bra size",
      sizes: p.availableSizes?.length
        ? p.availableSizes
        : [
            "30A","30B","30C",
            "32A","32B","32C","32D",
            "34A","34B","34C","34D",
            "36A","36B","36C","36D",
            "38B","38C","38D",
            "40B","40C"
          ]
    };
  }

  // Shoes: shoe number
  if (
    type === "shoes" ||
    /\b(shoes?|sneakers?|sports shoes?)\b/.test(title)
  ) {
    return {
      label: "Select shoe number",
      sizes: p.availableSizes?.length
        ? p.availableSizes
        : ["6","7","8","9","10","11"]
    };
  }

  // Sandals / chappal: footwear number
  if (
    type === "sandals" ||
    /\b(sandals?|slippers?|chappal|flip flops?)\b/.test(title)
  ) {
    return {
      label: "Select sandal/chappal number",
      sizes: p.availableSizes?.length
        ? p.availableSizes
        : ["3","4","5","6","7","8","9"]
    };
  }

  // Normal clothing sizes
  if (
    ["clothes", "clothing"].includes(type) ||
    /\b(kurti|kurta|t-?shirts?|shirts?|dress|jeans|trousers|leggings|top|hoodie|jacket|clothes|sweater|blouse)\b/.test(title) ||
    category === "clothes"
  ) {
    return {
      label: "Select clothing size",
      sizes: p.availableSizes?.length
        ? p.availableSizes
        : ["S","M","L","XL","XXL"]
    };
  }

  return null;
}

/* PRODUCT LIST AND CARDS */

function list() {
  let a = products.filter(p => p.active !== false);

  if (cat !== "All") {
    a = a.filter(p =>
      p.category.toLowerCase() === cat.toLowerCase()
    );
  }

  if (term) {
    a = a.filter(p =>
      (p.title + " " + p.category + " " + (p.description || ""))
        .toLowerCase()
        .includes(term)
    );
  }

  const sort = $("#sort").value;

  if (sort === "low") a.sort((x, y) => x.price - y.price);
  if (sort === "high") a.sort((x, y) => y.price - x.price);
  if (sort === "name") a.sort((x, y) => x.title.localeCompare(y.title));

  return a;
}

function renderProducts() {
  const a = list();

  $("#products").innerHTML = a.map(p => {
    const cfg = sizeConfig(p);

    return `
      <article class="product-card">
        <div class="product-image-wrap" data-detail="${esc(p.id)}">
          <img
            class="product-image"
            src="${esc(p.image || placeholder)}"
            alt="${esc(p.title)}"
          >
          <span class="product-tag">${esc(p.tag || "SALE")}</span>
        </div>

        <div class="product-info">
          <h3 class="product-title" data-detail="${esc(p.id)}">
            ${esc(p.title)}
          </h3>

          <p class="product-category">${esc(p.category)}</p>

          <div class="product-price">
            <span class="price-now">${money(p.price)}</span>
            <span class="price-old">${money(p.oldPrice)}</span>
            ${
              p.oldPrice > p.price
                ? `<span class="discount">${Math.round(100 * (1 - p.price / p.oldPrice))}% off</span>`
                : ""
            }
          </div>

          <p class="product-description">${esc(p.description || "")}</p>

          ${
            cfg
              ? `
                <label class="size-label">
                  ${esc(cfg.label)}
                  <select class="product-size" data-size-for="${esc(p.id)}">
                    <option value="">Choose size</option>
                    ${cfg.sizes.map(s =>
                      `<option value="${esc(s)}">${esc(s)}</option>`
                    ).join("")}
                  </select>
                </label>
              `
              : ""
          }

          <div class="product-buttons">
            <button class="add-btn" data-add="${esc(p.id)}">Add to cart</button>
            <button class="buy-btn" data-buy="${esc(p.id)}">Buy now</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $("#empty").hidden = !!a.length;
  $("#resultCount").textContent = a.length + " products";

  $$(".product-image").forEach(img => {
    img.onerror = () => {
      img.onerror = null;
      img.src = placeholder;
    };
  });

  renderAdminProducts();
}

/* ADD TO CART: SELECTED SIZE IS SAVED */

function add(p, buyNow = false) {
  const cfg = sizeConfig(p);
  let size = "";

  if (cfg) {
    const sel = $(`[data-size-for="${CSS.escape(String(p.id))}"]`);
    size = sel ? sel.value : "";

    if (!size) {
      toast(cfg.label + " choose karein");
      return;
    }
  }

  const existing = cart.find(x =>
    String(x.id) === String(p.id) &&
    String(x.size || "") === size
  );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: p.id,
      title: p.title,
      price: +p.price,
      image: p.image,
      qty: 1,
      size
    });
  }

  saveC();
  toast("Cart mein add ho gaya");

  if (buyNow) openCheckout();
}

function show(id) {
  $("#" + id).hidden = false;
}

function hide(id) {
  $("#" + id).hidden = true;
}

function hideAll() {
  $$(".overlay").forEach(x => x.hidden = true);
}

/* CART */

function renderCart(open = true) {
  $("#cartItems").innerHTML = cart.length
    ? cart.map(i => `
        <div class="cart-line">
          <img src="${esc(i.image)}" alt="">

          <div>
            <h4>${esc(i.title)}</h4>
            <p>${money(i.price)} each</p>

            ${i.size ? `<p><b>Selected size: ${esc(i.size)}</b></p>` : ""}

            <div class="qty-controls">
              <button
                data-qty="${esc(i.id)}"
                data-size="${esc(i.size || "")}"
                data-delta="-1"
              >−</button>

              <span>${i.qty}</span>

              <button
                data-qty="${esc(i.id)}"
                data-size="${esc(i.size || "")}"
                data-delta="1"
              >+</button>

              <button
                data-remove="${esc(i.id)}"
                data-size="${esc(i.size || "")}"
              >Remove</button>
            </div>
          </div>

          <b>${money(i.price * i.qty)}</b>
        </div>
      `).join("")
    : "<p class='muted'>Cart khaali hai.</p>";

  $("#subtotal").textContent = money(total());
  $("#checkoutOpen").disabled = !cart.length;

  if (open) show("cartOverlay");
}

/* UPI PAYMENT LINK AND DYNAMIC QR */

function upiUri(amount, ref) {
  if (!payment.upiId) return "";

  return "upi://pay?" + new URLSearchParams({
    pa: payment.upiId,
    pn: payment.merchantName || "Meesho Sale",
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: "Meesho Sale " + ref
  }).toString();
}

function renderPayment() {
  const host = $("#checkoutPayment");
  const sum = total();
  const ref = "MS" + Date.now().toString().slice(-8);
  const uri = upiUri(sum, ref);

  host.innerHTML = `
    <h3>Pay ${money(sum)} via UPI</h3>

    <p>UPI ID:
      <code>${esc(payment.upiId || "Set this in Admin → UPI & QR")}</code>
    </p>

    <p class="payment-total">Exact cart total: ${money(sum)}</p>

    ${
      uri
        ? `
          <div id="dynamicQr" class="qr-holder"></div>

          <a class="primary full" href="${esc(uri)}">
            Pay exact ${money(sum)} via UPI
          </a>

          <button id="copyUpi" class="plain full" type="button">
            Copy UPI link
          </button>
        `
        : ""
    }

    ${
      validUrl(payment.qrImage)
        ? `
          <p class="muted">Saved static QR image (may not include amount):</p>
          <div class="qr-holder">
            <img src="${esc(validUrl(payment.qrImage))}" alt="Merchant QR">
          </div>
        `
        : ""
    }

    <p class="muted">
      Payment is not auto-verified by this demo.
      Admin must confirm it separately. UPI app behaviour may vary.
    </p>
  `;

  const q = $("#dynamicQr");

  if (q && uri && window.QRCode) {
    new QRCode(q, {
      text: uri,
      width: 190,
      height: 190
    });
  } else if (q) {
    q.textContent = "QR library not loaded; use UPI button.";
  }

  $("#copyUpi")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(uri);
      toast("UPI link copied");
    } catch {
      toast("Copy unavailable; use UPI button");
    }
  });
}

function openCheckout() {
  if (!cart.length) {
    toast("Pehle product cart mein add karein");
    return;
  }

  hide("cartOverlay");
  $("#checkoutForm").reset();
  renderPayment();
  show("checkoutOverlay");
}

/* ORDER CARDS AND ORDER HISTORY */

function card(o, admin = false) {
  const paid = (o.paymentStatus || "").toLowerCase().includes("paid");

  return `
    <article class="order-card">
      <h4>
        ${esc(o.id)}
        <span class="status ${paid ? "paid" : ""}">
          ${esc(o.paymentStatus)}
        </span>
      </h4>

      <p><b>${esc(o.name)}</b> · ${esc(o.phone)}</p>
      <p>${esc(o.address)}</p>

      <p>
        ${(o.items || []).map(i => `
          ${esc(i.title)}
          ${i.size ? `(Size: ${esc(i.size)})` : ""}
          × ${i.qty} — ${money(i.price * i.qty)}
        `).join("<br>")}
      </p>

      <p>
        <b>Total: ${money(o.total)}</b><br>
        ${esc(new Date(o.createdAt).toLocaleString())} · ${esc(o.status)}
      </p>

      ${
        admin
          ? `
            <button data-paid="${esc(o.id)}">Mark payment verified</button>
            <button data-pending="${esc(o.id)}">Mark pending</button>
            <button data-cancel="${esc(o.id)}">Cancel</button>
          `
          : ""
      }
    </article>
  `;
}

function renderHistory(phone = "") {
  const a = orders.filter(o => o.phone === phone);

  $("#historyResults").innerHTML = a.length
    ? a.map(o => card(o)).join("")
    : `<p class="muted">${
        phone
          ? "No orders for this number in this browser."
          : "Enter your mobile number to look up orders."
      }</p>`;
}

function renderAdminOrders() {
  $("#adminOrders").innerHTML = orders.length
    ? orders.map(o => card(o, true)).join("")
    : "<p class='muted'>No orders yet.</p>";
}

function renderAdminProducts() {
  $("#adminCount").textContent = products.length;

  $("#adminProducts").innerHTML = products.map(p => `
    <div class="admin-product">
      <span>
        <b>${esc(p.title)}</b><br>
        ${money(p.price)} · ${esc(p.category)}
      </span>

      <button data-delprod="${esc(p.id)}">Delete</button>
    </div>
  `).join("");
}

/* ADMIN TABS */

function tab(t) {
  $$("[data-tab]").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === t);
  });

  $$("[data-panel]").forEach(p => {
    p.hidden = p.dataset.panel !== t;
  });

  if (t === "payments") {
    const f = $("#paymentForm");
    f.elements.merchantName.value = payment.merchantName || "Meesho Sale";
    f.elements.upiId.value = payment.upiId || "";
    f.elements.qrImage.value = payment.qrImage || "";
  }

  if (t === "orders") renderAdminOrders();
}

/* PLACE ORDER */

function placeOrder(e) {
  e.preventDefault();

  if (!cart.length) {
    return toast("Cart khaali hai");
  }

  const f = new FormData(e.currentTarget);
  const name = String(f.get("name")).trim();
  const phone = String(f.get("phone")).trim();
  const address = String(f.get("address")).trim();

  if (!/^[0-9]{10}$/.test(phone)) {
    return toast("10 digit mobile number enter karein");
  }

  const id = "MS" + Date.now().toString().slice(-10);

  const order = {
    id,
    name,
    phone,
    address,
    items: cart.map(i => ({
      id: i.id,
      title: i.title,
      price: i.price,
      qty: i.qty,
      size: i.size || ""
    })),
    total: +total().toFixed(2),
    paymentStatus: "Pending verification",
    status: "Placed",
    createdAt: new Date().toISOString()
  };

  orders.unshift(order);
  write(K.o, orders);

  cart = [];
  saveC();

  hide("checkoutOverlay");
  renderAdminOrders();

  toast("Order saved: " + id);

  alert(
    "Order " + id + " save ho gaya.\n" +
    "Total " + money(order.total) + ".\n" +
    "Payment status: Pending verification.\n" +
    "My Orders mein apna mobile number dal kar history dekhein."
  );
}

/* BUTTON ACTIONS */

document.addEventListener("click", e => {
  const b = e.target.closest("[data-add],[data-buy]");

  if (b) {
    const id = b.dataset.add || b.dataset.buy;
    const p = products.find(x => String(x.id) === String(id));

    if (p) add(p, !!b.dataset.buy);
  }

  const detail = e.target.closest("[data-detail]");

  if (detail) {
    const p = products.find(x =>
      String(x.id) === String(detail.dataset.detail)
    );

    if (p) {
      alert(
        p.title + "\n" +
        money(p.price) + "\n" +
        (p.description || "")
      );
    }
  }

  const q = e.target.closest("[data-qty]");

  if (q) {
    const item = cart.find(x =>
      String(x.id) === String(q.dataset.qty) &&
      String(x.size || "") === String(q.dataset.size || "")
    );

    if (item) item.qty += +q.dataset.delta;

    cart = cart.filter(x => x.qty > 0);

    saveC();
    renderCart(false);
  }

  const remove = e.target.closest("[data-remove]");

  if (remove) {
    cart = cart.filter(x =>
      !(
        String(x.id) === String(remove.dataset.remove) &&
        String(x.size || "") === String(remove.dataset.size || "")
      )
    );

    saveC();
    renderCart(false);
  }

  const close = e.target.closest("[data-close]");
  if (close) hide(close.dataset.close);

  if (e.target.classList.contains("overlay")) {
    hide(e.target.id);
  }

  const del = e.target.closest("[data-delprod]");

  if (del) {
    products = products.filter(p =>
      String(p.id) !== String(del.dataset.delprod)
    );

    saveP();
    renderProducts();
  }

  const paid = e.target.closest("[data-paid]");

  if (paid) {
    const o = orders.find(x => x.id === paid.dataset.paid);

    if (o) {
      o.paymentStatus = "Paid (manually verified)";
      write(K.o, orders);
      renderAdminOrders();
    }
  }

  const pending = e.target.closest("[data-pending]");

  if (pending) {
    const o = orders.find(x => x.id === pending.dataset.pending);

    if (o) {
      o.paymentStatus = "Pending verification";
      write(K.o, orders);
      renderAdminOrders();
    }
  }

  const cancel = e.target.closest("[data-cancel]");

  if (cancel) {
    const o = orders.find(x => x.id === cancel.dataset.cancel);

    if (o) {
      o.status = "Cancelled";
      write(K.o, orders);
      renderAdminOrders();
    }
  }

  const t = e.target.closest("[data-tab]");
  if (t) tab(t.dataset.tab);
});

/* SEARCH, SORT AND CATEGORIES */

$("#search").addEventListener("input", e => {
  term = e.target.value.trim().toLowerCase();
  renderProducts();
});

$("#clear").addEventListener("click", () => {
  $("#search").value = "";
  term = "";
  renderProducts();
});

$("#sort").addEventListener("change", renderProducts);

$("#categories").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;

  cat = b.dataset.cat;

  $$("[data-cat]").forEach(x => {
    x.classList.toggle("active", x === b);
  });

  renderProducts();
});

$("#reset").addEventListener("click", () => {
  cat = "All";
  term = "";
  $("#search").value = "";

  $$("[data-cat]").forEach(x => {
    x.classList.toggle("active", x.dataset.cat === "All");
  });

  renderProducts();
});

/* CART, CHECKOUT AND HISTORY BUTTONS */

$("#cartOpen").addEventListener("click", () => renderCart(true));
$("#checkoutOpen").addEventListener("click", openCheckout);
$("#checkoutForm").addEventListener("submit", placeOrder);

$("#historyOpen").addEventListener("click", () => {
  renderHistory();
  show("historyOverlay");
});

$("#historyLookup").addEventListener("submit", e => {
  e.preventDefault();

  renderHistory(
    String(new FormData(e.currentTarget).get("phone")).trim()
  );
});

/* ADMIN LOGIN */

$("#adminOpen").addEventListener("click", () => {
  show("adminOverlay");
  $("#adminForm").hidden = false;
  $("#adminTools").hidden = true;
  $("#adminForm").reset();
});

$("#adminForm").addEventListener("submit", e => {
  e.preventDefault();

  if (e.currentTarget.elements.pin.value !== PIN) {
    return toast("Admin PIN galat");
  }

  e.currentTarget.hidden = true;
  $("#adminTools").hidden = false;
  tab("products");
});

/* ADD PRODUCT AND ITS SIZE SETTINGS */

$("#addForm").addEventListener("submit", e => {
  e.preventDefault();

  const f = new FormData(e.currentTarget);
  const title = String(f.get("title")).trim();

  if (!title) return;

  products.unshift({
    id: "p" + Date.now(),
    title,
    price: +f.get("price"),
    oldPrice: +f.get("oldPrice") || 0,
    category: String(f.get("category")),
    image: validUrl(String(f.get("image") || "")) || placeholder,
    description: String(f.get("description") || ""),
    sizeType: String(f.get("sizeType") || "auto"),
    availableSizes: String(f.get("availableSizes") || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean),
    tag: "NEW",
    active: true
  });

  saveP();
  renderProducts();
  e.currentTarget.reset();
  toast("Product added");
});

/* RESTORE DEMO PRODUCTS */

$("#resetDemo").addEventListener("click", () => {
  if (confirm("Restore demo products?")) {
    products = defaults.map(x => ({ ...x }));
    saveP();
    renderProducts();
  }
});

/* UPDATE UPI AND QR SETTINGS */

$("#paymentForm").addEventListener("submit", e => {
  e.preventDefault();

  const f = new FormData(e.currentTarget);
  const upi = String(f.get("upiId")).trim();

  if (!/^[\w.\-]{2,256}@[a-zA-Z0-9.\-]{2,64}$/.test(upi)) {
    return toast("Valid UPI ID enter karein, e.g. name@bank");
  }

  payment = {
    merchantName: String(f.get("merchantName")).trim(),
    upiId: upi,
    qrImage: validUrl(String(f.get("qrImage") || ""))
  };

  write(K.pay, payment);
  toast("Payment settings saved");
});

/* CLOSE OVERLAYS WITH ESCAPE */

document.addEventListener("keydown", e => {
  if (e.key === "Escape") hideAll();
});

$("#year").textContent = new Date().getFullYear();

renderProducts();
saveC();
renderCart(false);

})();
