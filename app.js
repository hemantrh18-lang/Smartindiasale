
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

  const SUPABASE_URL = "https://vsljvkssdjmrucrhfcqj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_SMz8kHd4AhpO_Iv8n3ndmQ_GBbGDDk_";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
  const PIN = "2468";
  const placeholder =
    "https://placehold.co/600x750/f7edf6/9f2089?text=Product";

  const defaults = [
    [1, "Women's Printed Kurti", "Women", 199, 399, "BESTSELLER",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=650&q=80",
      "Printed everyday kurti."],
    [2, "Makeup Combo", "Beauty", 149, 299, "TRENDING",
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=650&q=80",
      "Everyday beauty essentials."],
    [3, "Men's T-Shirt", "Men", 249, 499, "HOT DEAL",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=650&q=80",
      "Casual daily T-shirt."],
    [4, "Home Organizer", "Home", 199, 399, "POPULAR",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=650&q=80",
      "Organize everyday essentials."],
    [5, "Women's Handbag", "Accessories", 299, 599, "NEW",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=650&q=80",
      "Everyday handbag."],
    [6, "Floral Dress", "Women", 249, 549, "TRENDING",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=650&q=80",
      "Lightweight floral outfit."],
    [7, "Skincare Essentials", "Beauty", 199, 449, "DEAL",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=650&q=80",
      "Skincare essentials."],
    [8, "Men's Casual Shirt", "Men", 299, 699, "BESTSELLER",
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=650&q=80",
      "Smart casual shirt."],
    [9, "Cushion Cover", "Home", 149, 299, "VALUE BUY",
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=650&q=80",
      "Living room decor."],
    [10, "Fashion Earrings", "Accessories", 149, 349, "SALE",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=650&q=80",
      "Statement earrings."],
    [11, "Cotton Kurti Set", "Women", 299, 649, "SALE",
      "https://images.unsplash.com/photo-1583391733956-6c78276477e9?auto=format&fit=crop&w=650&q=80",
      "Easy-to-style kurti set."],
    [12, "Water Bottle", "Home", 199, 399, "POPULAR",
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=650&q=80",
      "Reusable water bottle."]
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

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      toast("Browser storage unavailable/full. Data may not be saved.");
      return false;
    }
  }

  const money = amount =>
    "₹" + Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));

  function validUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol)
        ? url.href
        : "";
    } catch {
      return "";
    }
  }

  let products = read(K.p, null);

  if (!Array.isArray(products) || !products.length) {
    products = defaults.map(p => ({ ...p }));
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

async function loadPaymentSettingsFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from("payment_settings")
      .select("merchant_name, upi_id, qr_image_url")
      .eq("id", true)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      payment = {
        merchantName: data.merchant_name || "Paytm Merchant",
        upiId: data.upi_id || "",
        qrImage: validUrl(data.qr_image_url) || ""
      };

      // Local cache only; Supabase is the main source.
      write(K.pay, payment);

      const form = $("#paymentForm");
      if (form) {
        form.elements.merchantName.value = payment.merchantName;
        form.elements.upiId.value = payment.upiId;
        form.elements.qrImage.value = payment.qrImage;
      }

      console.log("Payment settings loaded from Supabase");
    }
  } catch (error) {
    console.error("Payment settings load failed:", error);
    toast("Payment settings database se load nahi hui.");
  }
}

  // Convert Supabase database columns into the website format
  function mapDatabaseProduct(row) {
  return {
    id: row.id,
    title: row.name || "Untitled Product",
    category: row.category || "Other",
    price: Number(row.price) || 0,
    oldPrice: Number(row.original_price) || 0,
    tag: "SALE",
    image: validUrl(row.image_url) || placeholder,
    description: row.description || "",
    active: row.active !== false,
    stock: Number(row.stock) || 0,
    rating: Number(row.rating) || 0,
    ratingCount: Number(row.rating_count) || 0,
    ratingVisible: row.rating_visible === true
  };
}

function ratingMarkup(product) {
  if (
    product.ratingVisible !== true ||
    !(Number(product.rating) > 0)
  ) return "";

  const rating = Math.max(0, Math.min(5, Number(product.rating)));
  const count = Math.max(0, Number(product.ratingCount) || 0);
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  const stars =
    "★".repeat(fullStars) +
    (halfStar ? "½" : "") +
    "☆".repeat(emptyStars);

  return `
    <div class="product-rating">
      <span class="rating-stars">${stars}</span>
      <b>${rating.toFixed(1)}</b>
      <small>(${count} ratings)</small>
    </div>
  `;
}
  // Load products from Supabase
  async function loadProductsFromSupabase() {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select(
          "id, name, category, price, original_price, image_url, description, stock, active, rating, rating_count, rating_visible"
        )
        .order("id", { ascending: true });

      if (error) throw error;

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No products returned by Supabase");
      }

      products = data.map(mapDatabaseProduct);

      // Keep a local cache for the next page load
      saveP();

      renderProducts();
      console.log("Supabase products loaded:", products.length);
    } catch (error) {
      console.error("Supabase product loading failed:", error);
      toast(
        "Database se products load nahi hue. Console mein error check karein."
      );
    }
  }

  let cat = "All";
  let term = "";
  let checkoutDraft = null;
  let editingProductId = null;

  function toast(message) {
    const el = $("#toast");

    if (!el) {
      alert(message);
      return;
    }

    el.textContent = message;
    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      el.textContent = "";
    }, 3000);
  }

  function saveP() {
    return write(K.p, products);
  }

  function saveC() {
    write(K.c, cart);

    const count = $("#count");

    if (count) {
      count.textContent = cart.reduce(
        (sum, item) => sum + Number(item.qty || 0),
        0
      );
    }
  }

  function total() {
    return cart.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );
  }

  /* PRODUCT SIZES */

  function sizeConfig(product) {
    const title = String(product.title || "").toLowerCase();
    const type = String(product.sizeType || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();

    if (type === "none" || type === "other") return null;

    const customSizes = Array.isArray(product.availableSizes)
      ? product.availableSizes
      : [];

    if (type === "bra" || /\b(bra|bralette)\b/.test(title)) {
      return {
        label: "Select bra size",
        sizes: customSizes.length ? customSizes : [
          "30A", "30B", "30C", "32A", "32B", "32C", "32D",
          "34A", "34B", "34C", "34D", "36A", "36B", "36C",
          "36D", "38B", "38C", "38D", "40B", "40C"
        ]
      };
    }

    if (
      type === "shoes" ||
      /\b(shoes?|sneakers?|sports shoes?)\b/.test(title)
    ) {
      return {
        label: "Select shoe number",
        sizes: customSizes.length
          ? customSizes
          : ["6", "7", "8", "9", "10", "11"]
      };
    }

    if (
      type === "sandals" ||
      /\b(sandals?|slippers?|chappal|flip flops?)\b/.test(title)
    ) {
      return {
        label: "Select sandal/chappal number",
        sizes: customSizes.length
          ? customSizes
          : ["3", "4", "5", "6", "7", "8", "9"]
      };
    }

    if (
      ["clothes", "clothing"].includes(type) ||
      /\b(kurti|kurta|t-?shirts?|shirts?|dress|jeans|trousers|leggings|top|hoodie|jacket|clothes|sweater|blouse)\b/.test(title) ||
      category === "clothes"
    ) {
      return {
        label: "Select clothing size",
        sizes: customSizes.length
          ? customSizes
          : ["S", "M", "L", "XL", "XXL"]
      };
    }

    return null;
  }

  /* PRODUCT LIST */

  function list() {
    let items = products.filter(p => p.active !== false);

    if (cat !== "All") {
      items = items.filter(
        p => String(p.category || "").toLowerCase() === cat.toLowerCase()
      );
    }

    if (term) {
      items = items.filter(p =>
        (
          String(p.title || "") + " " +
          String(p.category || "") + " " +
          String(p.description || "")
        ).toLowerCase().includes(term)
      );
    }

    const sort = $("#sort")?.value || "featured";

    if (sort === "low") {
      items.sort((a, b) => Number(a.price) - Number(b.price));
    }

    if (sort === "high") {
      items.sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sort === "name") {
      items.sort((a, b) =>
        String(a.title).localeCompare(String(b.title))
      );
    }

    return items;
  }

  function renderProducts() {
    const host = $("#products");
    if (!host) return;

    const items = list();

    host.innerHTML = items.map(p => {
      const config = sizeConfig(p);
      const price = Number(p.price) || 0;
      const oldPrice = Number(p.oldPrice) || 0;

      const discount = oldPrice > price
        ? Math.round(100 * (1 - price / oldPrice))
        : 0;

      return `
        <article class="product-card">
          <div class="product-image-wrap"
            data-detail="${esc(p.id)}"
            role="button" tabindex="0"
            aria-label="View ${esc(p.title)} details">
            <img class="product-image"
              src="${esc(validUrl(p.image) || placeholder)}"
              alt="${esc(p.title)}">
            <span class="product-tag">${esc(p.tag || "SALE")}</span>
          </div>

          <div class="product-info">
            <h3 class="product-title"
              data-detail="${esc(p.id)}"
              role="button" tabindex="0">
              ${esc(p.title)}
            </h3>

            <p class="product-category">${esc(p.category || "")}</p>

            <div class="product-price">
              <span class="price-now">${money(price)}</span>
              ${
                oldPrice > price
                  ? `<span class="price-old">${money(oldPrice)}</span>
                     <span class="discount">${discount}% off</span>`
                  : ""
              }
            </div>

            <p class="product-description">
              ${esc(p.description || "Tap to view product details.")}
            </p>

            <p class="policy-short">↩️ 10 Days Return*</p>

            ${
              config ? `
                <label class="size-label">
                  ${esc(config.label)}
                  <select class="product-size"
                    data-size-for="${esc(p.id)}">
                    <option value="">Choose size</option>
                    ${config.sizes.map(size =>
                      `<option value="${esc(size)}">${esc(size)}</option>`
                    ).join("")}
                  </select>
                </label>
              ` : ""
            }

            <div class="product-buttons">
              <button class="add-btn" data-add="${esc(p.id)}" type="button">
                Add to cart
              </button>
              <button class="buy-btn" data-buy="${esc(p.id)}" type="button">
                Buy now
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    const empty = $("#empty");
    const resultCount = $("#resultCount");

    if (empty) empty.hidden = items.length > 0;
    if (resultCount) resultCount.textContent = items.length + " products";

    $$(".product-image").forEach(img => {
      img.onerror = () => {
        img.onerror = null;
        img.src = placeholder;
      };
    });

    renderAdminProducts();
  }

  /* PRODUCT DETAILS POPUP */

  function ensureDetailModal() {
    let modal = $("#productDetailOverlay");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "productDetailOverlay";
    modal.className = "overlay";
    modal.hidden = true;

    modal.innerHTML = `
      <section class="modal product-detail-modal"
        role="dialog" aria-modal="true" aria-label="Product details">
        <button type="button" class="detail-close"
          data-close="productDetailOverlay" aria-label="Close">✕</button>
        <div id="productDetailContent"></div>
      </section>
    `;

    document.body.appendChild(modal);

    const style = document.createElement("style");

    style.textContent = `
      .product-image-wrap, .product-title { cursor: pointer; }

      .product-title:hover {
        color: #9f2089;
      }

      .policy-short {
        color: #7c246c;
        font-size: 12px;
        font-weight: 700;
        margin: 7px 0;
      }

      .product-detail-modal {
        width: min(94vw, 680px);
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        background: #fff;
        border-radius: 14px;
      }

      .detail-close {
        position: sticky;
        top: 0;
        float: right;
        z-index: 3;
        border: 0;
        border-radius: 50%;
        width: 38px;
        height: 38px;
        background: #f5eaf4;
        font-size: 20px;
        cursor: pointer;
      }

      .detail-image {
        display: block;
        width: 100%;
        max-height: 390px;
        object-fit: contain;
        background: #faf6fa;
        border-radius: 12px;
        margin-bottom: 12px;
      }

      .detail-price {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin: 12px 0;
      }

      .detail-price .price-now {
        font-size: 25px;
      }

      .detail-description {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.65;
        margin: 14px 0;
      }

      .detail-policy {
        background: #f8f1f8;
        border: 1px solid #ead9e9;
        border-radius: 10px;
        padding: 13px;
        margin: 16px 0;
        line-height: 1.5;
      }

      .detail-policy p {
        margin: 7px 0;
      }

      .detail-qty {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 14px 0;
      }

      .detail-qty button {
        min-width: 36px;
        min-height: 36px;
        cursor: pointer;
      }

      .detail-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
      }

      .detail-actions button {
        flex: 1;
      }

      .detail-policy small {
        display: block;
        margin-top: 8px;
      }

      @media(max-width:480px) {
        .detail-actions {
          flex-direction: column;
        }
        .product-rating {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 9px;
  font-size: 13px;
}
.rating-stars {
  color: #e5a000;
  letter-spacing: 1px;
}
.product-rating b {
  color: #222;
}
.product-rating small {
  color: #777;
      }
    `;

    document.head.appendChild(style);
    return modal;
  }

  function openProductDetails(id) {
    const p = products.find(
      x => String(x.id) === String(id) && x.active !== false
    );

    if (!p) return;

    const config = sizeConfig(p);
    const price = Number(p.price) || 0;
    const oldPrice = Number(p.oldPrice) || 0;

    const discount = oldPrice > price
      ? Math.round((1 - price / oldPrice) * 100)
      : 0;

    const description = String(p.description || "").trim() ||
      "Is product ki detailed description abhi add nahi ki gayi hai.";

    const modal = ensureDetailModal();

    $("#productDetailContent").innerHTML = `
      <img class="detail-image"
        src="${esc(validUrl(p.image) || placeholder)}"
        alt="${esc(p.title)}">

      <p class="product-category">${esc(p.category || "")}</p>
      ${ratingMarkup(p)}
      <h2>${esc(p.title)}</h2>
      ${ratingMarkup(p)}
      <div class="detail-price">
        <span class="price-now">${money(price)}</span>
        ${
          oldPrice > price
            ? `<span class="price-old">${money(oldPrice)}</span>
               <span class="discount">${discount}% off</span>`
            : ""
        }
      </div>

      <h3>Product description</h3>
      <p class="detail-description">${esc(description)}</p>

      ${
        p.tag
          ? `<p><b>Offer:</b> ${esc(p.tag)}</p>`
          : ""
      }

      ${
        config ? `
          <label class="size-label">
            ${esc(config.label)}
            <select id="detailSize" class="product-size">
              <option value="">Choose size</option>
              ${config.sizes.map(size =>
                `<option value="${esc(size)}">${esc(size)}</option>`
              ).join("")}
            </select>
          </label>
        ` : ""
      }

      <div class="detail-qty">
        <b>Quantity</b>
        <button type="button" data-detail-qty="-1">−</button>
        <span id="detailQty">1</span>
        <button type="button" data-detail-qty="1">+</button>
      </div>

      <div class="detail-policy">
        <h3>↩️ Return and replacement information</h3>
        <p>Return eligibility product aur seller ki actual policy par depend karti hai.</p>
        <p>Order karne se pehle product details aur applicable terms check karein.</p>
        <small>
          Website par wahi return/refund policy dikhayein jo aap sach mein provide karte hain.
        </small>
      </div>

      <p><b>Payment:</b> UPI available · Cash on Delivery unavailable</p>

      <div class="detail-actions">
        <button type="button" class="add-btn"
          data-detail-add="${esc(p.id)}">Add to Cart</button>
        <button type="button" class="buy-btn"
          data-detail-buy="${esc(p.id)}">Buy Now</button>
      </div>
    `;

    const image = $(".detail-image");

    image.onerror = () => {
      image.onerror = null;
      image.src = placeholder;
    };

    modal.hidden = false;
  }

  /* CART */

  function add(product, buyNow = false, options = null) {
    const config = sizeConfig(product);
    let size = "";
    let qty = 1;

    if (options) {
      size = options.size || "";
      qty = Math.max(1, parseInt(options.qty, 10) || 1);
    } else if (config) {
      const selector = $(
        `[data-size-for="${CSS.escape(String(product.id))}"]`
      );

      size = selector ? selector.value : "";
    }

    if (config && !size) {
      toast(config.label + " choose karein");
      return;
    }

    const currentPrice = Number(product.price) || 0;

    const existing = cart.find(item =>
      String(item.id) === String(product.id) &&
      String(item.size || "") === size
    );

    if (existing) {
      existing.qty += qty;
      existing.price = currentPrice;
      existing.title = product.title;
      existing.image = product.image;
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: currentPrice,
        image: product.image,
        qty,
        size
      });
    }

    saveC();
    renderCart(false);
    toast("Cart mein add ho gaya");

    if (buyNow) openCheckout();
  }

  function show(id) {
    const el = $("#" + id);
    if (el) el.hidden = false;
  }

  function hide(id) {
    const el = $("#" + id);
    if (el) el.hidden = true;
  }

  function hideAll() {
    $$(".overlay").forEach(el => {
      el.hidden = true;
    });
  }

  function renderCart(open = true) {
    const host = $("#cartItems");
    if (!host) return;

    host.innerHTML = cart.length
      ? cart.map(item => `
          <div class="cart-line">
            <img src="${esc(validUrl(item.image) || placeholder)}" alt="">
            <div>
              <h4>${esc(item.title)}</h4>
              <p>${money(item.price)} each</p>
              ${item.size
                ? `<p><b>Selected size: ${esc(item.size)}</b></p>`
                : ""}
              <div class="qty-controls">
                <button type="button" data-qty="${esc(item.id)}"
                  data-size="${esc(item.size || "")}" data-delta="-1">−</button>
                <span>${Number(item.qty) || 0}</span>
                <button type="button" data-qty="${esc(item.id)}"
                  data-size="${esc(item.size || "")}" data-delta="1">+</button>
                <button type="button" data-remove="${esc(item.id)}"
                  data-size="${esc(item.size || "")}">Remove</button>
              </div>
            </div>
            <b>${money(Number(item.price || 0) * Number(item.qty || 0))}</b>
          </div>
        `).join("")
      : "<p class='muted'>Cart khaali hai.</p>";

    const subtotal = $("#subtotal");
    const checkoutButton = $("#checkoutOpen");

    if (subtotal) subtotal.textContent = money(total());
    if (checkoutButton) checkoutButton.disabled = !cart.length;

    if (open) show("cartOverlay");
  }

  /*
    When checkout starts, refresh cart item prices from the latest
    saved product data so an edited product price is reflected.
  */

  function refreshCartPrices() {
    cart = cart.map(item => {
      const product = products.find(
        p => String(p.id) === String(item.id)
      );

      if (!product) return item;

      return {
        ...item,
        title: product.title,
        price: Number(product.price) || 0,
        image: product.image || placeholder
      };
    });

    saveC();
    renderCart(false);
  }

  /* CHECKOUT STEPS */

  function setCheckoutStep(step) {
    const steps = {
      address: ["addressStep", "stepAddressLabel"],
      payment: ["paymentStep", "stepPaymentLabel"],
      confirmation: ["confirmationStep", "stepConfirmLabel"]
    };

    Object.entries(steps).forEach(([name, ids]) => {
      const active = name === step;
      const page = $("#" + ids[0]);
      const label = $("#" + ids[1]);

      if (page) page.hidden = !active;
      if (label) label.classList.toggle("active", active);
    });
  }

  function openCheckout() {
    if (!cart.length) {
      toast("Pehle product cart mein add karein");
      return;
    }

    refreshCartPrices();

    hide("cartOverlay");
    checkoutDraft = null;

    const form = $("#checkoutForm");
    if (form) form.reset();

    setCheckoutStep("address");
    show("checkoutOverlay");
  }

  function readAddress(formData) {
    return {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      house: String(formData.get("house") || "").trim(),
      street: String(formData.get("street") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      pincode: String(formData.get("pincode") || "").trim()
    };
  }

  function formatAddress(address) {
    return [
      address.house,
      address.street,
      address.city,
      address.state,
      address.pincode
    ].filter(Boolean).join(", ");
  }

  function continueToPayment(event) {
    event.preventDefault();

    if (!cart.length) {
      toast("Cart khaali hai");
      return;
    }

    refreshCartPrices();

    const formData = new FormData(event.currentTarget);
    const address = readAddress(formData);

    if (!/^[0-9]{10}$/.test(address.phone)) {
      toast("10 digit mobile number enter karein");
      return;
    }

    if (!/^[0-9]{6}$/.test(address.pincode)) {
      toast("6 digit PIN code enter karein");
      return;
    }

    checkoutDraft = {
      address,
      total: Number(total().toFixed(2)),
      items: cart.map(item => ({ ...item })),
      reference: "MS" + Date.now().toString().slice(-10)
    };

    const summary = $("#addressSummary");
    if (summary) {
      summary.innerHTML = `
        <b>Delivery to:</b><br>
        ${esc(address.name)}<br>
        ${esc(address.phone)}<br>
        ${esc(formatAddress(address))}
      `;
    }

    const paymentTotal = $("#paymentTotal");
    if (paymentTotal) {
      paymentTotal.textContent = money(checkoutDraft.total);
    }

    renderPayment();
    setCheckoutStep("payment");
  }

  /* UPI PAYMENT AND DYNAMIC QR */

  function upiUri(amount, reference) {
  const upiId = String(payment.upiId || "").trim();
  const merchant = String(payment.merchantName || "Meesho Sale").trim();
  const total = Number(amount);

  if (!/^[\w.\-]{2,256}@[a-zA-Z0-9.\-]{2,64}$/.test(upiId)) {
    return "";
  }

  if (!Number.isFinite(total) || total <= 0) {
    return "";
  }

  const params = new URLSearchParams({
    pa: upiId,
    pn: merchant,
    tr: String(reference || ""),
    tn: "Meesho Sale Order " + String(reference || ""),
    am: total.toFixed(2),
    cu: "INR"
  });

  return "upi://pay?" + params.toString();
}

  function renderPayment() {
    const host = $("#checkoutPayment");
    if (!host || !checkoutDraft) return;

    const amount = checkoutDraft.total;
    const uri = upiUri(amount, checkoutDraft.reference);
     console.log("UPI PAYMENT LINK:", uri);

    host.innerHTML = `
      <h3>Pay ${money(amount)} via UPI</h3>
      <p>Business: ${esc(payment.merchantName || "Meesho Sale")}</p>
      <p>UPI ID:
        <code>${esc(payment.upiId || "Set in Admin → UPI & QR")}</code>
      </p>
      <p class="payment-total">Exact cart total: ${money(amount)}</p>

      ${
        uri ? `
          <div id="dynamicQr" class="qr-holder"></div>
          <p class="muted">
            Scan this dynamic QR using a supported UPI app.
            Verify the amount shown in your UPI app before paying.
          </p>
          <button id="copyUpi" class="plain full" type="button">
            Copy UPI payment link
          </button>
        ` : `
          <p class="notice">
            UPI ID set nahi hai. Admin → UPI & QR mein valid payment details save karein.
          </p>
        `
      }

    

      <p class="muted">
        Payment is not automatically verified by this demo.
        Admin must check actual merchant payment records before marking
        an order paid.
      </p>
    `;

    const qrHost = $("#dynamicQr");

    if (qrHost && uri && window.QRCode) {
      new QRCode(qrHost, {
        text: uri,
        width: 190,
        height: 190
      });
    } else if (qrHost) {
      qrHost.textContent =
        "QR library unavailable. Use the UPI payment link.";
    }

    const payButton = $("#openUpiPayment");

    if (payButton) {
      payButton.disabled = !uri;
      payButton.textContent = uri
        ? "Pay " + money(amount) + " using UPI"
        : "UPI not configured";
    }

    const copyButton = $("#copyUpi");

    if (copyButton && uri) {
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(uri);
          toast("UPI link copied");
        } catch {
          toast("Copy unavailable. Try the Pay using UPI button.");
        }
      });
    }

    const message = $("#paymentMessage");
    const doneButton = $("#paymentDone");

    if (message) message.hidden = true;
    if (doneButton) doneButton.disabled = false;
  }

  function launchUpi() {
    if (!checkoutDraft) {
      toast("Pehle address complete karein");
      return;
    }

    const uri = upiUri(
      checkoutDraft.total,
      checkoutDraft.reference
    );

    if (!uri) {
      toast("Admin panel mein valid UPI ID save karein");
      return;
    }

    // Opening a UPI app does not prove payment.
    window.location.href = uri;
  }

  /* ORDER CREATION: PENDING UNTIL ADMIN VERIFIES */

  function submitOrderForVerification() {
    if (!checkoutDraft || !cart.length) {
      toast("Checkout dobara start karein");
      setCheckoutStep("address");
      return;
    }

    const address = checkoutDraft.address;

    const order = {
      id: checkoutDraft.reference,
      name: address.name,
      phone: address.phone,
      address: formatAddress(address),
      addressDetails: { ...address },
      items: checkoutDraft.items.map(item => ({
        id: item.id,
        title: item.title,
        price: Number(item.price),
        qty: Number(item.qty),
        size: item.size || ""
      })),
      total: checkoutDraft.total,
      paymentMethod: "UPI",
      paymentReference: checkoutDraft.reference,
      paymentStatus: "Pending verification",
      status: "Awaiting payment verification",
      createdAt: new Date().toISOString()
    };

    const previousOrders = orders;
    orders = [order, ...orders];

    if (!write(K.o, orders)) {
      orders = previousOrders;
      toast("Order save nahi hua. Browser storage check karein.");
      return;
    }

    cart = [];
    saveC();
    renderCart(false);
    renderAdminOrders();

    const orderId = $("#confirmationOrderId");
    const paymentStatus = $("#confirmationPaymentStatus");
    const orderStatus = $("#confirmationOrderStatus");
    const confirmationTotal = $("#confirmationTotal");
    const confirmationTitle = $("#confirmationTitle");
    const confirmationMessage = $("#confirmationMessage");

    if (orderId) orderId.textContent = order.id;
    if (paymentStatus) paymentStatus.textContent = "Pending verification";
    if (orderStatus) orderStatus.textContent = "Awaiting payment verification";
    if (confirmationTotal) confirmationTotal.textContent = money(order.total);
    if (confirmationTitle) confirmationTitle.textContent = "Order submitted";

    if (confirmationMessage) {
      confirmationMessage.textContent =
        "Your order has been saved. It is NOT confirmed yet. " +
        "The admin must verify payment against actual merchant records.";
    }

    setCheckoutStep("confirmation");
    toast("Order submitted for verification");
  }

  function closeConfirmation() {
    hide("checkoutOverlay");
    checkoutDraft = null;
    setCheckoutStep("address");
  }

  /* ORDER HISTORY */

  function card(order, admin = false) {
    const paid = String(order.paymentStatus || "")
      .toLowerCase()
      .includes("paid");

    const addressText = typeof order.address === "string"
      ? order.address
      : formatAddress(order.address || {});

    const created = order.createdAt
      ? new Date(order.createdAt).toLocaleString()
      : "Date unavailable";

    return `
      <article class="order-card">
        <h4>
          ${esc(order.id)}
          <span class="status ${paid ? "paid" : ""}">
            ${esc(order.paymentStatus || "Pending verification")}
          </span>
        </h4>

        <p><b>${esc(order.name)}</b> · ${esc(order.phone)}</p>
        <p>${esc(addressText)}</p>

        <p>
          ${(order.items || []).map(item => `
            ${esc(item.title)}
            ${item.size ? `(Size: ${esc(item.size)})` : ""}
            × ${Number(item.qty || 0)}
            — ${money(Number(item.price || 0) * Number(item.qty || 0))}
          `).join("<br>")}
        </p>

        <p>
          <b>Total: ${money(order.total)}</b><br>
          ${esc(created)}<br>
          Order status: <b>${esc(order.status || "Placed")}</b>
        </p>

        ${
          admin ? `
            ${
              !paid && order.status !== "Cancelled"
                ? `<button type="button" data-paid="${esc(order.id)}">
                     Mark payment verified
                   </button>`
                : ""
            }
            <button type="button" data-pending="${esc(order.id)}">
              Mark pending
            </button>
            <button type="button" data-cancel="${esc(order.id)}">
              Cancel
            </button>
          ` : ""
        }
      </article>
    `;
  }

  function renderHistory(phone = "") {
    const host = $("#historyResults");
    if (!host) return;

    const matches = orders.filter(order =>
      String(order.phone || "") === phone
    );

    host.innerHTML = matches.length
      ? matches.map(order => card(order)).join("")
      : `<p class="muted">${
          phone
            ? "No orders for this number in this browser."
            : "Enter your mobile number to look up orders."
        }</p>`;
  }

  function renderAdminOrders() {
    const host = $("#adminOrders");
    if (!host) return;

    host.innerHTML = orders.length
      ? orders.map(order => card(order, true)).join("")
      : "<p class='muted'>No orders yet.</p>";
  }

  /* ADMIN PRODUCTS: EDIT, SAVE, DELETE */

  function renderAdminProducts() {
    const count = $("#adminCount");
    const host = $("#adminProducts");

    if (!host) return;

    if (count) count.textContent = products.length;

    host.innerHTML = products.map(product => {
      const isEditing =
        String(product.id) === String(editingProductId);

      if (isEditing) {
        return `
          <div class="admin-product admin-product-edit">
            <form data-edit-product-form="${esc(product.id)}">
              <h3>Edit Product</h3>

              <label>
                Product name
                <input name="title"
                  value="${esc(product.title || "")}" required>
              </label>

              <label>
                Category
                <input name="category"
                  value="${esc(product.category || "")}" required>
              </label>

              <label>
                Selling price (₹)
                <input name="price" type="number" min="1" step="0.01"
                  value="${Number(product.price) || 0}" required>
              </label>

              <label>
                Old price / MRP (₹)
                <input name="oldPrice" type="number" min="0" step="0.01"
                  value="${Number(product.oldPrice) || 0}" required>
              </label>

              <label>
                Product tag
                <input name="tag" value="${esc(product.tag || "")}">
              </label>
              <label>
                Rating (0 से 5)
              <input name="rating" type="number" min="0" max="5" step="0.1"
                value="${Number(product.rating) || 0}">
              </label>

               <label>
                Rating Count
               <input name="ratingCount" type="number" min="0" step="1"
                value="${Number(product.ratingCount) || 0}">
               </label>

               <label>
               <input name="ratingVisible" type="checkbox"
               ${product.ratingVisible === true ? "checked" : ""}>
                Website par rating dikhayein
              </label>
              <label>
                Product image URL
                <input name="image" type="url"
                  value="${esc(product.image || "")}">
              </label>

              <label>
                Description
                <textarea name="description" rows="4">${esc(product.description || "")}</textarea>
              </label>

              <label>
                Size type (auto, clothes, shoes, sandals, bra, none)
                <input name="sizeType"
                  value="${esc(product.sizeType || "auto")}">
              </label>

              <label>
                Available sizes (comma-separated)
                <input name="availableSizes"
                  value="${esc(Array.isArray(product.availableSizes)
                    ? product.availableSizes.join(", ")
                    : product.availableSizes || "")}">
              </label>

              <div class="admin-edit-actions">
                <button type="submit" class="primary">Save Changes</button>
                <button type="button" data-cancel-edit>Cancel</button>
              </div>
            </form>
          </div>
        `;
      }

      return `
        <div class="admin-product">
          <div class="admin-product-info">
            <b>${esc(product.title || "Product")}</b><br>
            <span>${esc(product.category || "")}</span><br>
            <strong>Price: ${money(product.price)}</strong>
            ${
              Number(product.oldPrice) > Number(product.price)
                ? `<br><small>Old price: ${money(product.oldPrice)}</small>`
                : ""
            }
          </div>

          <div class="admin-product-actions">
            <button type="button" data-editprod="${esc(product.id)}">
              Edit / Change Price
            </button>
            <button type="button" data-delprod="${esc(product.id)}">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  
async function saveEditedProduct(event, form) {
  event.preventDefault();

  const id = form.dataset.editProductForm;
  const product = products.find(
    item => String(item.id) === String(id)
  );

  if (!product) {
    toast("Product nahi mila. Refresh karke try karein.");
    return;
  }

  const data = new FormData(form);

  const title = String(data.get("title") || "").trim();
  const category = String(data.get("category") || "").trim();
  const price = Number(data.get("price"));
  const oldPrice = Number(data.get("oldPrice"));
  const tag = String(data.get("tag") || "").trim();
  const imageText = String(data.get("image") || "").trim();
  const description = String(data.get("description") || "").trim();
const rating = Number(data.get("rating") || 0);
const ratingCount = Number(data.get("ratingCount") || 0);
const ratingVisible = form.elements.ratingVisible.checked;

if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
  toast("Rating 0 se 5 ke beech honi chahiye.");
  return;
}

if (!Number.isInteger(ratingCount) || ratingCount < 0) {
  toast("Rating Count valid number hona chahiye.");
  return;
} 
  const sizeType = String(data.get("sizeType") || "auto")
    .trim().toLowerCase();

  const sizes = String(data.get("availableSizes") || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  if (!title || !category) {
    toast("Product name aur category bharo.");
    return;
  }

  if (!Number.isFinite(price) || price < 1) {
    toast("Valid selling price enter karo.");
    return;
  }

  if (!Number.isFinite(oldPrice) || oldPrice < 0) {
    toast("Valid old price enter karo.");
    return;
  }

  const image = imageText ? validUrl(imageText) : placeholder;

  if (imageText && !image) {
    toast("Valid http/https image URL enter karo.");
    return;
  }

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    toast("Admin login expire ho gaya. Dobara login karo.");
    return;
  }

  const { data: isAdmin, error: roleError } =
    await supabaseClient.rpc("is_admin");

  if (roleError || isAdmin !== true) {
    toast("Admin permission verify nahi hui.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    const { error: updateError } = await supabaseClient
  .from("products")
  .update({
    name: title,
    category,
    price,
    original_price: oldPrice,
    image_url: image,
    description,
    rating,
    rating_count: ratingCount,
    rating_visible: ratingVisible
  })
  .eq("id", id);

    if (updateError) throw updateError;

    const { data: rows, error: loadError } = await supabaseClient
      .from("products")
      .select(
        "id, name, category, price, original_price, image_url, description, stock, active"
      )
      .order("id", { ascending: true });

    if (loadError) throw loadError;

    products = (rows || []).map(mapDatabaseProduct);

    // Keep these display settings for the current browser session.
    const updatedProduct = products.find(
      item => String(item.id) === String(id)
    );

    if (updatedProduct) {
      updatedProduct.tag = tag || "SALE";
      updatedProduct.sizeType = sizeType || "auto";
      updatedProduct.availableSizes = sizes;
    }

    editingProductId = null;

    saveP();

    cart = cart.map(item => {
      const latest = products.find(
        p => String(p.id) === String(item.id)
      );

      return latest
        ? {
            ...item,
            title: latest.title,
            price: Number(latest.price),
            image: latest.image
          }
        : item;
    });

    saveC();
    renderProducts();
    renderCart(false);

    toast("Product aur price database mein update ho gaye!");

  } catch (error) {
    console.error("Product update failed:", error);
    toast("Update nahi hua: " + error.message);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

  /* ADMIN TABS */

  function tab(name) {
    $$("[data-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.tab === name);
    });

    $$("[data-panel]").forEach(panel => {
      panel.hidden = panel.dataset.panel !== name;
    });

    if (name === "products") renderAdminProducts();

    if (name === "payments") {
      const form = $("#paymentForm");

      if (form) {
        form.elements.merchantName.value =
          payment.merchantName || "Meesho Sale";
        form.elements.upiId.value = payment.upiId || "";
        form.elements.qrImage.value = payment.qrImage || "";
      }
    }

    if (name === "orders") renderAdminOrders();
  }

  /* CLICK ACTIONS */

  document.addEventListener("click", event => {
    const editButton = event.target.closest("[data-editprod]");

    if (editButton) {
      editingProductId = editButton.dataset.editprod;
      renderAdminProducts();
      return;
    }

    const cancelEdit = event.target.closest("[data-cancel-edit]");

    if (cancelEdit) {
      editingProductId = null;
      renderAdminProducts();
      return;
    }

    const detailButton = event.target.closest(
      "[data-detail-add], [data-detail-buy]"
    );

    if (detailButton) {
      const id = detailButton.dataset.detailAdd ||
        detailButton.dataset.detailBuy;

      const product = products.find(
        item => String(item.id) === String(id) &&
          item.active !== false
      );

      if (!product) return;

      const config = sizeConfig(product);
      const size = $("#detailSize")?.value || "";

      if (config && !size) {
        toast(config.label + " choose karein");
        return;
      }

      const buyNow = Boolean(detailButton.dataset.detailBuy);
      const qty = $("#detailQty")?.textContent || "1";

      if (buyNow) hide("productDetailOverlay");

      add(product, buyNow, { size, qty });
      return;
    }

    const detailQty = event.target.closest("[data-detail-qty]");

    if (detailQty) {
      const qty = $("#detailQty");

      if (qty) {
        qty.textContent = Math.max(
          1,
          (parseInt(qty.textContent, 10) || 1) +
            Number(detailQty.dataset.detailQty)
        );
      }

      return;
    }

    const detail = event.target.closest("[data-detail]");

    if (detail) {
      openProductDetails(detail.dataset.detail);
      return;
    }

    const productButton = event.target.closest("[data-add], [data-buy]");

    if (productButton) {
      const id = productButton.dataset.add || productButton.dataset.buy;

      const product = products.find(
        item => String(item.id) === String(id) &&
          item.active !== false
      );

      if (product) {
        add(product, Boolean(productButton.dataset.buy));
      }

      return;
    }

    const qtyButton = event.target.closest("[data-qty]");

    if (qtyButton) {
      const item = cart.find(x =>
        String(x.id) === String(qtyButton.dataset.qty) &&
        String(x.size || "") === String(qtyButton.dataset.size || "")
      );

      if (item) {
        item.qty += Number(qtyButton.dataset.delta);
      }

      cart = cart.filter(item => item.qty > 0);

      saveC();
      renderCart(false);
      return;
    }

    const removeButton = event.target.closest("[data-remove]");

    if (removeButton) {
      cart = cart.filter(item => !(
        String(item.id) === String(removeButton.dataset.remove) &&
        String(item.size || "") === String(removeButton.dataset.size || "")
      ));

      saveC();
      renderCart(false);
      return;
    }

    const closeButton = event.target.closest("[data-close]");

    if (closeButton) {
      hide(closeButton.dataset.close);
      return;
    }

    if (event.target.classList.contains("overlay")) {
      hide(event.target.id);
      return;
    }


const deleteProduct = event.target.closest("[data-delprod]");

if (deleteProduct) {
  const id = deleteProduct.dataset.delprod;

  if (!confirm("Is product ko database se permanently delete karna hai?")) {
    return;
  }

  deleteProduct.disabled = true;

  (async () => {
    try {
      // Confirm that an admin session exists.
      const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError || !sessionData.session) {
        throw new Error("Admin login expire ho gaya. Dobara login karein.");
      }

      // Verify admin permission.
      const { data: isAdmin, error: roleError } =
        await supabaseClient.rpc("is_admin");

      if (roleError || isAdmin !== true) {
        throw new Error("Admin permission verify nahi hui.");
      }

      // Delete the product from Supabase.
    const { data: deletedRows, error: deleteError } =
  await supabaseClient
    .from("products")
    .delete()
    .eq("id", id)
    .select("id, name");

if (deleteError) throw deleteError;

if (!deletedRows || deletedRows.length === 0) {
  throw new Error(
    "Koi row delete nahi hui. ID ya Supabase DELETE permission/RLS check karni hogi."
  );
}

console.log("Supabase deleted rows:", deletedRows);
toast("Delete response: " + JSON.stringify(deletedRows));
      // Reload products to verify the deletion.
      const { data: rows, error: loadError } = await supabaseClient
        .from("products")
        .select(
          "id, name, category, price, original_price, image_url, description, stock, active"
        )
        .order("id", { ascending: true });

      if (loadError) throw loadError;

      if ((rows || []).some(row => String(row.id) === String(id))) {
        throw new Error(
          "Product database mein abhi bhi hai. RLS policy check karein."
        );
      }

      // Refresh the website from the database.
      products = (rows || []).map(mapDatabaseProduct);
      editingProductId = null;

      // Remove deleted product from the current browser cart too.
      cart = cart.filter(item => String(item.id) !== String(id));

      saveP();
      saveC();
      renderProducts();
      renderCart(false);

      toast("Product database se delete ho gaya!");

    } catch (error) {
      console.error("Product delete failed:", error);
      toast("Delete nahi hua: " + error.message);
    } finally {
      if (deleteProduct.isConnected) {
        deleteProduct.disabled = false;
      }
    }
  })();

  return;
}

    const markPaid = event.target.closest("[data-paid]");

    if (markPaid) {
      const order = orders.find(x => x.id === markPaid.dataset.paid);
      if (!order) return;

      const confirmed = confirm(
        "Merchant/bank records mein actual payment verify ki hai? " +
        "Sirf customer ke claim par confirm na karein."
      );

      if (!confirmed) return;

      order.paymentStatus = "Paid (manually verified)";
      order.status = "Confirmed";

      if (write(K.o, orders)) {
        renderAdminOrders();
        toast("Payment marked verified. Order confirmed.");
      }

      return;
    }

    const markPending = event.target.closest("[data-pending]");

    if (markPending) {
      const order = orders.find(x => x.id === markPending.dataset.pending);
      if (!order) return;

      order.paymentStatus = "Pending verification";
      order.status = "Awaiting payment verification";

      if (write(K.o, orders)) {
        renderAdminOrders();
        toast("Order marked pending");
      }

      return;
    }

    const cancelOrder = event.target.closest("[data-cancel]");

    if (cancelOrder) {
      const order = orders.find(x => x.id === cancelOrder.dataset.cancel);
      if (!order) return;

      if (!confirm("Cancel this order?")) return;

      order.status = "Cancelled";

      if (write(K.o, orders)) {
        renderAdminOrders();
        toast("Order cancelled");
      }

      return;
    }

    const tabButton = event.target.closest("[data-tab]");

    if (tabButton) {
      tab(tabButton.dataset.tab);
    }
  });

  /* SAVE PRODUCT EDIT FORM */

  document.addEventListener("submit", event => {
    const form = event.target.closest("[data-edit-product-form]");
    if (!form) return;

    saveEditedProduct(event, form);
  });

  /* KEYBOARD ACCESS */

  document.addEventListener("keydown", event => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches("[data-detail]")
    ) {
      event.preventDefault();
      openProductDetails(event.target.dataset.detail);
    }

    if (event.key === "Escape") hideAll();
  });

  /* SEARCH, SORT AND CATEGORIES */

  $("#search")?.addEventListener("input", event => {
    term = event.target.value.trim().toLowerCase();
    renderProducts();
  });

  $("#clear")?.addEventListener("click", () => {
    if ($("#search")) $("#search").value = "";

    term = "";
    renderProducts();
  });

  $("#sort")?.addEventListener("change", renderProducts);

  $("#categories")?.addEventListener("click", event => {
    const button = event.target.closest("[data-cat]");
    if (!button) return;

    cat = button.dataset.cat;

    $$("[data-cat]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderProducts();
  });

  $("#reset")?.addEventListener("click", () => {
    cat = "All";
    term = "";

    if ($("#search")) $("#search").value = "";

    $$("[data-cat]").forEach(button => {
      button.classList.toggle("active", button.dataset.cat === "All");
    });

    renderProducts();
  });

  /* CART AND CHECKOUT BUTTONS */

  $("#cartOpen")?.addEventListener("click", () => renderCart(true));

  $("#checkoutOpen")?.addEventListener("click", openCheckout);

  $("#checkoutForm")?.addEventListener("submit", continueToPayment);

  $("#openUpiPayment")?.addEventListener("click", launchUpi);

  $("#paymentDone")?.addEventListener("click", () => {
    if (!checkoutDraft) {
      toast("Checkout dobara start karein");
      return;
    }

    const message = $("#paymentMessage");

    if (message) {
      message.textContent =
        "Order submit hoga aur Payment Pending rahega. " +
        "Admin actual merchant payment records check karke hi verify karega.";
      message.hidden = false;
    }

    submitOrderForVerification();
  });

  $("#backToAddress")?.addEventListener("click", () => {
    setCheckoutStep("address");
  });

  $("#confirmationDone")?.addEventListener("click", closeConfirmation);

  /* ORDER HISTORY */

  $("#historyOpen")?.addEventListener("click", () => {
    renderHistory();
    show("historyOverlay");
  });

  $("#historyLookup")?.addEventListener("submit", event => {
    event.preventDefault();

    const phone = String(
      new FormData(event.currentTarget).get("phone") || ""
    ).trim();

    renderHistory(phone);
  });

  /* ADMIN LOGIN */


$("#adminOpen")?.addEventListener("click", async () => {
  show("adminOverlay");

  const { data: { session } } =
    await supabaseClient.auth.getSession();

  if (session) {
    const { data: isAdmin, error } =
      await supabaseClient.rpc("is_admin");

    if (!error && isAdmin === true) {
      $("#adminForm").hidden = true;
      $("#adminTools").hidden = false;
      tab("products");
      return;
    }
  }

  if ($("#adminForm")) {
    $("#adminForm").hidden = false;
    $("#adminForm").reset();
  }

  if ($("#adminTools")) {
    $("#adminTools").hidden = true;
  }
});

$("#adminForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    toast("Login failed: " + error.message);
    return;
  }

  const { data: isAdmin, error: roleError } =
    await supabaseClient.rpc("is_admin");

  if (roleError || isAdmin !== true) {
    await supabaseClient.auth.signOut();
    toast("Admin permission nahi mili");
    return;
  }

  form.hidden = true;
  $("#adminTools").hidden = false;
  tab("products");
  toast("Admin login successful");
});


  /* ADD PRODUCT — SAVE TO SUPABASE */

  $("#addForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const price = Number(formData.get("price"));
    const oldPrice = Number(formData.get("oldPrice")) || 0;
    const imageText = String(formData.get("image") || "").trim();
    const image = imageText
      ? validUrl(imageText)
      : "";

    const description = String(
      formData.get("description") || ""
    ).trim();

    if (!title || !category) {
      toast("Product name aur category bharo.");
      return;
    }

    if (!Number.isFinite(price) || price < 1) {
      toast("Valid selling price enter karo.");
      return;
    }

    if (!Number.isFinite(oldPrice) || oldPrice < 0) {
      toast("Valid old price enter karo.");
      return;
    }

    if (imageText && !image) {
      toast("Valid http/https image URL enter karo.");
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
      toast("Admin login expire ho gaya. Dobara login karo.");
      return;
    }

    const { data: isAdmin, error: roleError } =
      await supabaseClient.rpc("is_admin");

    if (roleError || isAdmin !== true) {
      toast("Admin permission verify nahi hui.");
      return;
    }

    if (submitButton) submitButton.disabled = true;

    try {
      const { data: inserted, error: insertError } =
        await supabaseClient
          .from("products")
          .insert({
            name: title,
            category,
            price,
            original_price: oldPrice,
            image_url: image || placeholder,
            description,
            stock: 0,
            active: true
          })
          .select(
            "id, name, category, price, original_price, image_url, description, stock, active"
          )
          .single();

      if (insertError) throw insertError;

      const { data, error: loadError } =
        await supabaseClient
          .from("products")
          .select(
            "id, name, category, price, original_price, image_url, description, stock, active"
          )
          .order("id", { ascending: true });

      if (loadError) throw loadError;

      products = (data || []).map(mapDatabaseProduct);
      editingProductId = null;

      saveP();
      renderProducts();
      form.reset();

      toast("Product Supabase database mein save ho gaya!");
      console.log("Product saved to Supabase:", inserted.id);

    } catch (error) {
      console.error("Product save failed:", error);
      toast("Product save nahi hua: " + error.message);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  /* RESTORE DEMO PRODUCTS */

  $("#resetDemo")?.addEventListener("click", () => {
    if (!confirm("Restore demo products? This will replace current products.")) {
      return;
    }

    products = defaults.map(product => ({ ...product }));
    editingProductId = null;

    if (saveP()) {
      renderProducts();
      toast("Demo products restored");
    }
  });

  /* UPI AND QR SETTINGS */

  
$("#paymentForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const upiId = String(formData.get("upiId") || "").trim();
  const merchantName = String(
    formData.get("merchantName") || ""
  ).trim();

  const qrImageText = String(
    formData.get("qrImage") || ""
  ).trim();

  const qrImage = qrImageText ? validUrl(qrImageText) : "";

  if (!/^[\w.\-]{2,256}@[a-zA-Z0-9.\-]{2,64}$/.test(upiId)) {
    toast("Valid UPI ID enter karein.");
    return;
  }

  if (qrImageText && !qrImage) {
    toast("Valid QR image URL enter karein.");
    return;
  }

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    toast("Admin login dobara karein.");
    return;
  }

  const { data: isAdmin, error: roleError } =
    await supabaseClient.rpc("is_admin");

  if (roleError || isAdmin !== true) {
    toast("Admin permission verify nahi hui.");
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const newPayment = {
      id: true,
      merchant_name: merchantName || "Paytm Merchant",
      upi_id: upiId,
      qr_image_url: qrImage || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from("payment_settings")
      .upsert(newPayment, { onConflict: "id" });

    if (error) throw error;

    payment = {
      merchantName: newPayment.merchant_name,
      upiId: newPayment.upi_id,
      qrImage: qrImage
    };

    write(K.pay, payment);

    toast("Payment settings Supabase mein save ho gayi!");
  } catch (error) {
    console.error("Payment settings save failed:", error);
    toast("Save nahi hua: " + error.message);
  } finally {
    if (button) button.disabled = false;
  }
});

  /* INITIAL LOAD */

  if ($("#year")) {
    $("#year").textContent = new Date().getFullYear();
  }

  renderProducts();
saveC();
renderCart(false);

loadProductsFromSupabase(); 
loadPaymentSettingsFromSupabase();
})();
