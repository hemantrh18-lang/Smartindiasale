
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

  let cat = "All";
  let term = "";
  let checkoutDraft = null;

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
      const discount = p.oldPrice > p.price
        ? Math.round(100 * (1 - p.price / p.oldPrice))
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

            <p class="product-category">${esc(p.category)}</p>

            <div class="product-price">
              <span class="price-now">${money(p.price)}</span>
              ${
                p.oldPrice > p.price
                  ? `<span class="price-old">${money(p.oldPrice)}</span>
                     <span class="discount">${discount}% off</span>`
                  : ""
              }
            </div>

            <p class="product-description">${esc(p.description || "")}</p>
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

    $("#empty").hidden = items.length > 0;
    $("#resultCount").textContent = items.length + " products";

    $$(".product-image").forEach(img => {
      img.onerror = () => {
        img.onerror = null;
        img.src = placeholder;
      };
    });

    renderAdminProducts();
  }

  /* PRODUCT DETAILS */

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
      .detail-price .price-now { font-size: 25px; }
      .detail-policy {
        background: #f8f1f8;
        border: 1px solid #ead9e9;
        border-radius: 10px;
        padding: 13px;
        margin: 16px 0;
        line-height: 1.5;
      }
      .detail-policy p { margin: 7px 0; }
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
      .detail-actions button { flex: 1; }
      .detail-policy small { display: block; margin-top: 8px; }
      @media(max-width:480px) {
        .detail-actions { flex-direction: column; }
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
    const discount = p.oldPrice > p.price
      ? Math.round((1 - p.price / p.oldPrice) * 100)
      : 0;

    const modal = ensureDetailModal();

    $("#productDetailContent").innerHTML = `
      <img class="detail-image"
        src="${esc(validUrl(p.image) || placeholder)}"
        alt="${esc(p.title)}">

      <p class="product-category">${esc(p.category)}</p>
      <h2>${esc(p.title)}</h2>

      <div class="detail-price">
        <span class="price-now">${money(p.price)}</span>
        ${
          p.oldPrice > p.price
            ? `<span class="price-old">${money(p.oldPrice)}</span>
               <span class="discount">${discount}% off</span>`
            : ""
        }
      </div>

      <p>${esc(p.description || "Product details coming soon.")}</p>

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
        <h3>↩️ 10 Days Return, Replacement & Refund</h3>
        <p>Eligible products ke liye delivery ke 10 din ke andar request karein.</p>
        <p>Return ya replacement product ki eligibility aur condition ke adheen hoga.</p>
        <p>Refund approval aur verification ke baad applicable process ke mutabik hoga.</p>
        <small>*Terms and conditions apply. Sirf wahi policy advertise karein jo aap fulfil kar sakte hain.</small>
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

    const existing = cart.find(item =>
      String(item.id) === String(product.id) &&
      String(item.size || "") === size
    );

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: Number(product.price),
        image: product.image,
        qty,
        size
      });
    }

    saveC();
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
    $("#cartItems").innerHTML = cart.length
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
                <span>${item.qty}</span>
                <button type="button" data-qty="${esc(item.id)}"
                  data-size="${esc(item.size || "")}" data-delta="1">+</button>
                <button type="button" data-remove="${esc(item.id)}"
                  data-size="${esc(item.size || "")}">Remove</button>
              </div>
            </div>
            <b>${money(item.price * item.qty)}</b>
          </div>
        `).join("")
      : "<p class='muted'>Cart khaali hai.</p>";

    $("#subtotal").textContent = money(total());
    $("#checkoutOpen").disabled = !cart.length;

    if (open) show("cartOverlay");
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

    hide("cartOverlay");
    checkoutDraft = null;
    $("#checkoutForm").reset();

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

    $("#addressSummary").innerHTML = `
      <b>Delivery to:</b><br>
      ${esc(address.name)}<br>
      ${esc(address.phone)}<br>
      ${esc(formatAddress(address))}
    `;

    $("#paymentTotal").textContent = money(checkoutDraft.total);

    renderPayment();
    setCheckoutStep("payment");
  }

  /* UPI PAYMENT AND DYNAMIC QR */

  function upiUri(amount, reference) {
    if (!payment.upiId) return "";

    return "upi://pay?" + new URLSearchParams({
      pa: payment.upiId,
      pn: payment.merchantName || "Meesho Sale",
      am: Number(amount).toFixed(2),
      cu: "INR",
      tn: "Meesho Sale " + reference
    }).toString();
  }

  function renderPayment() {
    const host = $("#checkoutPayment");
    if (!host || !checkoutDraft) return;

    const amount = checkoutDraft.total;
    const uri = upiUri(amount, checkoutDraft.reference);
    const staticQr = validUrl(payment.qrImage);

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
          <p class="muted">Scan this QR using a supported UPI app.</p>
          <button id="copyUpi" class="plain full" type="button">
            Copy UPI payment link
          </button>
        ` : `
          <p class="notice">UPI ID set nahi hai. Admin → UPI & QR mein payment details save karein.</p>
        `
      }

      ${
        staticQr ? `
          <p class="muted">Merchant static QR (amount may not be pre-filled):</p>
          <div class="qr-holder">
            <img src="${esc(staticQr)}" alt="Merchant UPI QR">
          </div>
        ` : ""
      }

      <p class="muted">
        UPI payment is not automatically verified by this demo.
        Admin must check the actual merchant payment record before marking
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
      qrHost.textContent = "QR library unavailable. Use the UPI link button.";
    }

    const payButton = $("#openUpiPayment");
    payButton.disabled = !uri;
    payButton.textContent = uri
      ? "Pay " + money(amount) + " using UPI"
      : "UPI not configured";

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

    $("#paymentMessage").hidden = true;
    $("#paymentDone").disabled = false;
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

    // Opening a UPI app is not proof of payment.
    window.location.href = uri;
  }

  /* ORDER CREATION: ALWAYS PENDING UNTIL ADMIN VERIFIES */

  function submitOrderForVerification() {
    if (!checkoutDraft || !cart.length) {
      toast("Checkout dobara start karein");
      setCheckoutStep("address");
      return;
    }

    const address = checkoutDraft.address;
    const formattedAddress = formatAddress(address);

    const order = {
      id: checkoutDraft.reference,
      name: address.name,
      phone: address.phone,
      address: formattedAddress,
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

    // Save the order before clearing the cart.
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

    $("#confirmationOrderId").textContent = order.id;
    $("#confirmationPaymentStatus").textContent =
      "Pending verification";
    $("#confirmationOrderStatus").textContent =
      "Awaiting payment verification";
    $("#confirmationTotal").textContent = money(order.total);
    $("#confirmationTitle").textContent = "Order submitted";
    $("#confirmationMessage").textContent =
      "Your order has been saved. It is NOT confirmed yet. " +
      "The admin must verify the payment against merchant records.";

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
    const matches = orders.filter(order =>
      String(order.phone || "") === phone
    );

    $("#historyResults").innerHTML = matches.length
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

  function renderAdminProducts() {
    const count = $("#adminCount");
    const host = $("#adminProducts");
    if (!count || !host) return;

    count.textContent = products.length;

    host.innerHTML = products.map(product => `
      <div class="admin-product">
        <span>
          <b>${esc(product.title)}</b><br>
          ${money(product.price)} · ${esc(product.category)}
        </span>
        <button type="button" data-delprod="${esc(product.id)}">Delete</button>
      </div>
    `).join("");
  }

  /* ADMIN TABS */

  function tab(name) {
    $$("[data-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.tab === name);
    });

    $$("[data-panel]").forEach(panel => {
      panel.hidden = panel.dataset.panel !== name;
    });

    if (name === "payments") {
      const form = $("#paymentForm");
      form.elements.merchantName.value =
        payment.merchantName || "Meesho Sale";
      form.elements.upiId.value = payment.upiId || "";
      form.elements.qrImage.value = payment.qrImage || "";
    }

    if (name === "orders") renderAdminOrders();
  }

  /* CLICK ACTIONS */

  document.addEventListener("click", event => {
    const detailButton = event.target.closest(
      "[data-detail-add], [data-detail-buy]"
    );

    if (detailButton) {
      const id = detailButton.dataset.detailAdd ||
        detailButton.dataset.detailBuy;

      const product = products.find(
        item => String(item.id) === String(id)
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
        item => String(item.id) === String(id)
      );

      if (product) add(product, Boolean(productButton.dataset.buy));
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
      products = products.filter(
        product => String(product.id) !== String(deleteProduct.dataset.delprod)
      );

      saveP();
      renderProducts();
      toast("Product deleted");
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

  $("#search").addEventListener("input", event => {
    term = event.target.value.trim().toLowerCase();
    renderProducts();
  });

  $("#clear").addEventListener("click", () => {
    $("#search").value = "";
    term = "";
    renderProducts();
  });

  $("#sort").addEventListener("change", renderProducts);

  $("#categories").addEventListener("click", event => {
    const button = event.target.closest("[data-cat]");
    if (!button) return;

    cat = button.dataset.cat;

    $$("[data-cat]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderProducts();
  });

  $("#reset").addEventListener("click", () => {
    cat = "All";
    term = "";
    $("#search").value = "";

    $$("[data-cat]").forEach(button => {
      button.classList.toggle("active", button.dataset.cat === "All");
    });

    renderProducts();
  });

  /* CART AND CHECKOUT BUTTONS */

  $("#cartOpen").addEventListener("click", () => renderCart(true));
  $("#checkoutOpen").addEventListener("click", openCheckout);

  $("#checkoutForm").addEventListener("submit", continueToPayment);

  $("#openUpiPayment").addEventListener("click", launchUpi);

  $("#paymentDone").addEventListener("click", () => {
    if (!checkoutDraft) {
      toast("Checkout dobara start karein");
      return;
    }

    const message = $("#paymentMessage");
    message.textContent =
      "Order submit hoga aur Payment Pending rahega. " +
      "Admin actual merchant payment records check karke hi verify karega.";
    message.hidden = false;

    submitOrderForVerification();
  });

  $("#backToAddress").addEventListener("click", () => {
    setCheckoutStep("address");
  });

  $("#confirmationDone").addEventListener("click", closeConfirmation);

  /* ORDER HISTORY */

  $("#historyOpen").addEventListener("click", () => {
    renderHistory();
    show("historyOverlay");
  });

  $("#historyLookup").addEventListener("submit", event => {
    event.preventDefault();

    const phone = String(
      new FormData(event.currentTarget).get("phone") || ""
    ).trim();

    renderHistory(phone);
  });

  /* ADMIN LOGIN */

  $("#adminOpen").addEventListener("click", () => {
    show("adminOverlay");
    $("#adminForm").hidden = false;
    $("#adminTools").hidden = true;
    $("#adminForm").reset();
  });

  $("#adminForm").addEventListener("submit", event => {
    event.preventDefault();

    if (event.currentTarget.elements.pin.value !== PIN) {
      toast("Admin PIN galat");
      return;
    }

    event.currentTarget.hidden = true;
    $("#adminTools").hidden = false;
    tab("products");
  });

  /* ADD PRODUCT */

  $("#addForm").addEventListener("submit", event => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();

    if (!title) return;

    products.unshift({
      id: "p" + Date.now(),
      title,
      price: Number(formData.get("price")),
      oldPrice: Number(formData.get("oldPrice")) || 0,
      category: String(formData.get("category")),
      image: validUrl(String(formData.get("image") || "")) || placeholder,
      description: String(formData.get("description") || ""),
      sizeType: String(formData.get("sizeType") || "auto"),
      availableSizes: String(formData.get("availableSizes") || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean),
      tag: "NEW",
      active: true
    });

    if (saveP()) {
      renderProducts();
      event.currentTarget.reset();
      toast("Product added");
    }
  });

  /* RESTORE DEMO PRODUCTS */

  $("#resetDemo").addEventListener("click", () => {
    if (!confirm("Restore demo products?")) return;

    products = defaults.map(product => ({ ...product }));

    if (saveP()) {
      renderProducts();
      toast("Demo products restored");
    }
  });

  /* UPI AND QR SETTINGS */

  $("#paymentForm").addEventListener("submit", event => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const upiId = String(formData.get("upiId") || "").trim();
    const merchantName = String(formData.get("merchantName") || "").trim();
    const qrImage = validUrl(String(formData.get("qrImage") || ""));

    if (!/^[\w.\-]{2,256}@[a-zA-Z0-9.\-]{2,64}$/.test(upiId)) {
      toast("Valid UPI ID enter karein, e.g. name@bank");
      return;
    }

    payment = {
      merchantName: merchantName || "Meesho Sale",
      upiId,
      qrImage
    };

    if (write(K.pay, payment)) {
      toast("Payment settings saved");
    }
  });

  /* INITIAL LOAD */

  $("#year").textContent = new Date().getFullYear();

  renderProducts();
  saveC();
  renderCart(false);
})();
