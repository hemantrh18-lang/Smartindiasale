
(() => {
  "use strict";

  // SUPABASE CONNECTION
  const SUPABASE_URL = "https://vsljvkssdjmrucrhfcqj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_SMz8kHd4AhpO_Iv8n3ndmQ_GBbGDDk_";

  const ORDER_KEY = "msSaleOrdersV1";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  let products = [];
  let orders = [];

  const placeholder =
    "https://placehold.co/600x750/f7edf6/9f2089?text=Product";

  // HELPERS
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function message(text, error = false) {
    const box = $("#adminMessage");
    if (!box) return;

    box.textContent = text;
    box.style.color = error ? "#c62828" : "#188038";
  }

  async function verifyAdmin() {
    const { data: { session }, error } =
      await supabaseClient.auth.getSession();

    if (error || !session) return false;

    const { data, error: roleError } =
      await supabaseClient.rpc("is_admin");

    return !roleError && data === true;
  }

  function showLogin() {
    $("#loginBox").hidden = false;
    $("#adminDashboard").hidden = true;
    $("#logoutButton").hidden = true;
  }

  function showDashboard() {
    $("#loginBox").hidden = true;
    $("#adminDashboard").hidden = false;
    $("#logoutButton").hidden = false;
  }

  // LOGIN
  async function checkLogin() {
    if (await verifyAdmin()) {
      showDashboard();
      await loadProducts();
      await loadPaymentSettings();
      loadOrders();
    } else {
      showLogin();
    }
  }

  $("#adminLoginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = $("#loginButton");

    button.disabled = true;
    message("Login ho raha hai...");

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value
      });

      if (error) throw error;

      if (!(await verifyAdmin())) {
        await supabaseClient.auth.signOut();
        throw new Error("Is account ko Admin permission nahi hai.");
      }

      showDashboard();
      message("Admin login successful.");

      await loadProducts();
      await loadPaymentSettings();
      loadOrders();

    } catch (error) {
      message(error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  // LOGOUT
  $("#logoutButton")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
    message("Logout successful.");
  });

  // TABS
  $$("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;

      $$("[data-tab]").forEach((item) => {
        item.classList.toggle("active", item === tab);
      });

      $$("[data-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== name;
      });
    });
  });

  // PRODUCT FORM
  function productFormHTML(product = {}) {
    const editing = product.id !== undefined && product.id !== null;

    return `
      <form class="admin-product-editor"
        data-product-form="${editing ? "edit" : "add"}"
        ${editing ? `data-product-id="${escapeHTML(product.id)}"` : ""}
        style="border:1px solid #ddd;padding:14px;border-radius:12px;margin:12px 0">

        <h3>${editing ? "Edit Product Details" : "Add New Product"}</h3>

        <label>Product Name</label>
        <input name="name" required
          value="${escapeHTML(product.name || "")}"
          placeholder="Product name">

        <label>Category</label>
        <input name="category" required
          value="${escapeHTML(product.category || "")}"
          placeholder="Women, Beauty, Men, Home">

        <label>Selling Price (₹)</label>
        <input name="price" type="number" min="0" step="0.01" required
          value="${escapeHTML(product.price ?? "")}">

        <label>Original Price (₹)</label>
        <input name="original_price" type="number" min="0" step="0.01"
          value="${escapeHTML(product.original_price ?? "")}">

        <label>Product Image URL</label>
        <input name="image_url" type="url"
          value="${escapeHTML(product.image_url || "")}"
          placeholder="https://example.com/image.jpg">

        <label>Product Description</label>
        <textarea name="description" rows="3"
          placeholder="Product details...">${escapeHTML(product.description || "")}</textarea>

        <label>Stock Quantity</label>
        <input name="stock" type="number" min="0"
          value="${escapeHTML(product.stock ?? 0)}">

        <label>Product Rating (0 to 5)</label>
        <input name="rating" type="number" min="0" max="5" step="0.1"
          value="${escapeHTML(product.rating ?? 0)}">

        <label>Rating Count</label>
        <input name="rating_count" type="number" min="0" step="1"
          value="${escapeHTML(product.rating_count ?? 0)}">

        <label style="display:flex;gap:8px;align-items:center;margin:12px 0">
          <input name="rating_visible" type="checkbox"
            ${product.rating_visible !== false ? "checked" : ""}>
          Show Rating on Website
        </label>

        <label style="display:flex;gap:8px;align-items:center;margin:12px 0">
          <input name="active" type="checkbox"
            ${product.active !== false ? "checked" : ""}>
          Product Active / Visible on Website
        </label>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          <button type="submit">
            ${editing ? "Save All Changes" : "Add Product"}
          </button>

          ${editing ? `
            <button type="button" data-close-editor>
              Cancel
            </button>
          ` : ""}
        </div>
      </form>
    `;
  }

  function readProductForm(form) {
    const rating = Number(form.elements.rating.value || 0);
    const price = Number(form.elements.price.value);
    const originalPrice = Number(
      form.elements.original_price.value || 0
    );
    const stock = Number(form.elements.stock.value || 0);
    const ratingCount = Number(
      form.elements.rating_count.value || 0
    );

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(originalPrice) ||
      !Number.isFinite(stock) ||
      !Number.isFinite(rating) ||
      !Number.isFinite(ratingCount)
    ) {
      throw new Error("Please enter valid numbers.");
    }

    if (price < 0 || originalPrice < 0 ||
        stock < 0 || ratingCount < 0 ||
        rating < 0 || rating > 5) {
      throw new Error("Price, stock or rating value is invalid.");
    }

    const name = form.elements.name.value.trim();
    const category = form.elements.category.value.trim();

    if (!name || !category) {
      throw new Error("Product name aur category zaroor bharo.");
    }

    return {
      name,
      category,
      price,
      original_price: originalPrice,
      image_url: form.elements.image_url.value.trim(),
      description: form.elements.description.value.trim(),
      stock: Math.floor(stock),
      rating,
      rating_count: Math.floor(ratingCount),
      rating_visible: form.elements.rating_visible.checked,
      active: form.elements.active.checked
    };
  }

  // LOAD PRODUCTS
  async function loadProducts() {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      message("Products load nahi hue: " + error.message, true);
      return;
    }

    products = data || [];
    renderProducts();
  }

  // RENDER PRODUCTS
  function renderProducts() {
    const container = $("#adminProducts");
    if (!container) return;

    if ($("#adminCount")) {
      $("#adminCount").textContent = products.length;
    }

    container.innerHTML = `
      <div style="margin-bottom:15px">
        <button type="button" id="showAddProduct">
          + Add New Product
        </button>
      </div>

      <div id="newProductEditor"></div>

      ${products.length ? products.map((product) => `
        <div style="border:1px solid #ddd;padding:12px;margin:12px 0;border-radius:12px">

          <div style="display:flex;gap:12px;align-items:center">
            <img
              src="${escapeHTML(product.image_url || placeholder)}"
              alt=""
              style="width:85px;height:100px;object-fit:cover;border-radius:8px"
              onerror="this.src='${placeholder}'">

            <div style="flex:1;min-width:0">
              <strong>${escapeHTML(product.name)}</strong>
              <p>${escapeHTML(product.category)}</p>
              <p>Price: ₹${escapeHTML(product.price)}</p>
              <p>Stock: ${escapeHTML(product.stock ?? 0)}</p>
              <p>Rating: ${escapeHTML(product.rating ?? 0)} / 5
                (${escapeHTML(product.rating_count ?? 0)} ratings)
              </p>
              <p>${product.active ? "Active" : "Inactive"}</p>
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            <button type="button" data-edit="${escapeHTML(product.id)}">
              Edit Full Details
            </button>

            <button type="button" data-delete="${escapeHTML(product.id)}">
              Delete
            </button>
          </div>

          <div data-editor="${escapeHTML(product.id)}"></div>
        </div>
      `).join("") : "<p>Abhi koi product nahi hai.</p>"}
    `;
  }

  // ADD / EDIT / DELETE PRODUCT EVENTS
  $("#adminProducts")?.addEventListener("click", async (event) => {
    const addButton = event.target.closest("#showAddProduct");
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    const closeButton = event.target.closest("[data-close-editor]");

    if (addButton) {
      const holder = $("#newProductEditor");
      holder.innerHTML = productFormHTML();

      holder.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (closeButton) {
      closeButton.closest("form")?.remove();
      return;
    }

    if (editButton) {
      const id = editButton.dataset.edit;
      const product = products.find(
        (item) => String(item.id) === String(id)
      );

      if (!product) return;

      const holder = $(`[data-editor="${CSS.escape(String(id))}"]`);
      if (!holder) return;

      holder.innerHTML = productFormHTML(product);
      holder.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (deleteButton) {
      const id = deleteButton.dataset.delete;
      const product = products.find(
        (item) => String(item.id) === String(id)
      );

      if (!product) return;

      if (!confirm(`"${product.name}" delete karna hai?`)) return;

      if (!(await verifyAdmin())) {
        message("Admin permission required.", true);
        return;
      }

      const { data, error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", product.id)
        .select("id");

      if (error) {
        message("Delete failed: " + error.message, true);
        return;
      }

      if (!data?.length) {
        message("Delete nahi hua. Supabase RLS permission check karo.", true);
        return;
      }

      message("Product delete ho gaya.");
      await loadProducts();
    }
  });

  // SAVE ADD / EDIT FORM
  $("#adminProducts")?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-product-form]");
    if (!form) return;

    event.preventDefault();

    if (!(await verifyAdmin())) {
      message("Admin permission required.", true);
      return;
    }

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;

    try {
      const productData = readProductForm(form);

      let result;

      if (form.dataset.productForm === "edit") {
        const id = form.dataset.productId;

        result = await supabaseClient
          .from("products")
          .update(productData)
          .eq("id", id)
          .select("id");
      } else {
        result = await supabaseClient
          .from("products")
          .insert(productData)
          .select("id");
      }

      if (result.error) throw result.error;

      if (!result.data?.length) {
        throw new Error("Database ne change confirm nahi kiya. RLS check karo.");
      }

      message(
        form.dataset.productForm === "edit"
          ? "Product ki saari details update ho gayi."
          : "Naya product add ho gaya."
      );

      await loadProducts();

    } catch (error) {
      message(error.message || "Product save nahi hua.", true);
      button.disabled = false;
    }
  });

  // PAYMENT SETTINGS
  async function loadPaymentSettings() {
    const { data, error } = await supabaseClient
      .from("payment_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      message("Payment settings error: " + error.message, true);
      return;
    }

    if (!data) return;

    const form = $("#paymentForm");
    if (!form) return;

    form.elements.merchantName.value = data.merchant_name || "";
    form.elements.upiId.value = data.upi_id || "";
    form.elements.qrImage.value = data.qr_image_url || "";
  }

  $("#paymentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!(await verifyAdmin())) {
      message("Admin permission required.", true);
      return;
    }

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');

    if (button) button.disabled = true;

    try {
      const settings = {
        id: true,
        merchant_name: form.elements.merchantName.value.trim(),
        upi_id: form.elements.upiId.value.trim(),
        qr_image_url: form.elements.qrImage.value.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from("payment_settings")
        .upsert(settings, { onConflict: "id" });

      if (error) throw error;

      message("Payment settings save ho gayi.");

    } catch (error) {
      message(error.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  });

  
  // ORDERS - SUPABASE INTEGRATION

  async function loadOrders() {
    const container = $("#adminOrders");
    if (container) {
      container.innerHTML = "<p>Orders load ho rahe hain...</p>";
    }

    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      orders = [];
      renderOrders();
      message("Orders load nahi hue: " + error.message, true);
      console.error("ORDERS LOAD ERROR:", error);
      return;
    }

    orders = data || [];
    renderOrders();
  }

  function renderOrders() {
    const container = $("#adminOrders");
    if (!container) return;

    if (!orders.length) {
      container.innerHTML = `
        <p>Abhi koi order nahi mila.</p>
        <button type="button" id="refreshOrders">Refresh Orders</button>
      `;
      return;
    }

    container.innerHTML = `
      <button type="button" id="refreshOrders">
        Refresh Orders
      </button>

      ${orders.map((order) => {
        const items = Array.isArray(order.items)
          ? order.items.map((item) => `
              ${escapeHTML(item.name || item.title || "Product")}
              × ${escapeHTML(item.qty || item.quantity || 1)}
              ${item.size ? `(Size: ${escapeHTML(item.size)})` : ""}
            `).join("<br>")
          : "Order items unavailable";

        const date = order.created_at
          ? new Date(order.created_at).toLocaleString("en-IN")
          : "Not available";

        return `
          <div style="border:1px solid #ddd;padding:14px;margin:12px 0;border-radius:12px">

            <strong>Order ID: ${escapeHTML(order.id)}</strong>

            <p>Customer: ${escapeHTML(order.customer_name || "")}</p>
            <p>Phone: ${escapeHTML(order.phone || "")}</p>
            <p>Address: ${escapeHTML(order.address || "")}</p>

            <p>Items:<br>${items}</p>

            <p>Total: ₹${escapeHTML(order.total ?? 0)}</p>
            <p>Payment Method: ${escapeHTML(order.payment_method || "UPI")}</p>
            <p>Payment Reference: ${escapeHTML(order.payment_reference || "Not available")}</p>
            <p>Payment Status: <strong>${escapeHTML(order.payment_status || "pending")}</strong></p>
            <p>Order Status: <strong>${escapeHTML(order.order_status || "placed")}</strong></p>
            <p>Order Date: ${escapeHTML(date)}</p>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">

              <button type="button"
                data-order-action="paid"
                data-order-id="${escapeHTML(order.id)}">
                Mark Paid
              </button>

              <button type="button"
                data-order-action="pending"
                data-order-id="${escapeHTML(order.id)}">
                Mark Pending
              </button>

              <button type="button"
                data-order-action="processing"
                data-order-id="${escapeHTML(order.id)}">
                Processing
              </button>

              <button type="button"
                data-order-action="shipped"
                data-order-id="${escapeHTML(order.id)}">
                Shipped
              </button>

              <button type="button"
                data-order-action="delivered"
                data-order-id="${escapeHTML(order.id)}">
                Delivered
              </button>

              <button type="button"
                data-order-action="cancelled"
                data-order-id="${escapeHTML(order.id)}">
                Cancel Order
              </button>

            </div>
          </div>
        `;
      }).join("")}
    `;
  }

  $("#adminOrders")?.addEventListener("click", async (event) => {
    const refresh = event.target.closest("#refreshOrders");

    if (refresh) {
      await loadOrders();
      return;
    }

    const button = event.target.closest("[data-order-action]");
    if (!button) return;

    if (!(await verifyAdmin())) {
      message("Admin permission required.", true);
      return;
    }

    const orderId = button.dataset.orderId;
    const action = button.dataset.orderAction;

    const order = orders.find(
      (item) => String(item.id) === String(orderId)
    );

    if (!order) {
      message("Order nahi mila. Refresh karke dekhein.", true);
      return;
    }

    const updates = {};

    if (action === "paid") {
      if (!confirm("Merchant account mein payment verify kar li hai?")) {
        return;
      }
      updates.payment_status = "paid";
    }

    if (action === "pending") {
      updates.payment_status = "pending";
    }

    if (action === "processing") {
      updates.order_status = "processing";
    }

    if (action === "shipped") {
      updates.order_status = "shipped";
    }

    if (action === "delivered") {
      updates.order_status = "delivered";
    }

    if (action === "cancelled") {
      if (!confirm("Kya sach mein ye order cancel karna hai?")) {
        return;
      }
      updates.order_status = "cancelled";
    }

    button.disabled = true;
    message("Order update ho raha hai...");

    try {
      const { data, error } = await supabaseClient
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Order update nahi hua. Admin RLS permission check karein.");
      }

      message("Order successfully update ho gaya.");
      await loadOrders();

    } catch (error) {
      console.error("ORDER UPDATE ERROR:", error);
      message("Order update failed: " + error.message, true);
      button.disabled = false;
    }
  });

  // FIX OLD ADD PRODUCT FORM
  $("#addForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!(await verifyAdmin())) {
      message("Admin permission required.", true);
      return;
    }

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');

    if (button) button.disabled = true;

    try {
      const productData = {
        name: form.elements.title.value.trim(),
        category: form.elements.category.value.trim(),
        price: Number(form.elements.price.value),
        original_price: Number(form.elements.oldPrice.value || 0),
        image_url: form.elements.image.value.trim(),
        description: form.elements.description.value.trim(),
        stock: 0,
        rating: 0,
        rating_count: 0,
        rating_visible: true,
        active: true
      };

      if (
        !productData.name ||
        !productData.category ||
        !Number.isFinite(productData.price) ||
        !Number.isFinite(productData.original_price) ||
        productData.price < 0 ||
        productData.original_price < 0
      ) {
        throw new Error("Product details sahi bharo.");
      }

      const { data, error } = await supabaseClient
        .from("products")
        .insert(productData)
        .select("id");

      if (error) throw error;
      if (!data?.length) throw new Error("Product save confirm nahi hua.");

      form.reset();
      message("Product successfully add ho gaya.");
      await loadProducts();

    } catch (error) {
      message("Product add nahi hua: " + error.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  });

  // START
  checkLogin().catch((error) => {
    console.error(error);
    showLogin();
    message("Admin panel error: " + error.message, true);
  });

})();
