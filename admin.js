
(() => {
  "use strict";

  const SUPABASE_URL = "https://vsljvkssdjmrucrhfcqj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_SMz8kHd4AhpO_Iv8n3ndmQ_GBbGDDk_";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const ORDER_KEY = "msSaleOrdersV1";

  let products = [];
  let orders = [];

  const message = (text, error = false) => {
    const box = $("#adminMessage");
    if (!box) return;

    box.textContent = text;
    box.style.color = error ? "#c62828" : "#188038";
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

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

  async function checkLogin() {
    const allowed = await verifyAdmin();

    if (allowed) {
      showDashboard();
      await loadProducts();
      await loadPaymentSettings();
      loadOrders();
    } else {
      showLogin();
    }
  }

  // LOGIN
  $("#adminLoginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = $("#loginButton");
    const form = event.currentTarget;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    button.disabled = true;
    message("Login ho raha hai...");

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const allowed = await verifyAdmin();

      if (!allowed) {
        await supabaseClient.auth.signOut();
        throw new Error("Is account ko Admin permission nahi mili hai.");
      }

      showDashboard();
      message("Admin login successful.");

      await loadProducts();
      await loadPaymentSettings();
      loadOrders();

    } catch (error) {
      message(error.message || "Login failed.", true);
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

  // PRODUCTS
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

  function renderProducts() {
    const container = $("#adminProducts");
    if (!container) return;

    $("#adminCount").textContent = products.length;

    if (!products.length) {
      container.innerHTML = "<p>Abhi koi product nahi hai.</p>";
      return;
    }

    container.innerHTML = products.map((product) => `
      <div class="admin-product-card"
           style="border:1px solid #ddd;padding:12px;margin:12px 0;border-radius:10px">

        <div style="display:flex;gap:12px;align-items:center">
          <img
            src="${escapeHTML(product.image_url || "")}"
            alt=""
            style="width:75px;height:90px;object-fit:cover;border-radius:7px"
            onerror="this.style.display='none'">

          <div style="flex:1;min-width:0">
            <strong>${escapeHTML(product.name)}</strong>
            <p>${escapeHTML(product.category)}</p>
            <b>₹${escapeHTML(product.price)}</b>
            <small> | पुरानी कीमत: ₹${escapeHTML(product.original_price)}</small>
            <p>Rating: ${escapeHTML(product.rating ?? 0)}</p>
            <p>Status: ${product.active ? "Active" : "Inactive"}</p>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button type="button" data-edit="${escapeHTML(product.id)}">
            Edit
          </button>
          <button type="button" data-delete="${escapeHTML(product.id)}">
            Delete
          </button>
        </div>
      </div>
    `).join("");
  }

  // ADD PRODUCT
  $("#addForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!(await verifyAdmin())) {
      message("Admin login required.", true);
      return;
    }

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;

    const newProduct = {
      name: form.elements.title.value.trim(),
      category: form.elements.category.value.trim(),
      price: Number(form.elements.price.value),
      original_price: Number(form.elements.oldPrice.value || 0),
      image_url: form.elements.image.value.trim(),
      description: form.elements.description.value.trim(),
      stock: 0,
      active: true
    };

    try {
      const { error } = await supabaseClient
        .from("products")
        .insert(newProduct);

      if (error) throw error;

      form.reset();
      message("Product successfully add ho gaya.");
      await loadProducts();

    } catch (error) {
      message("Product add nahi hua: " + error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  // EDIT PRODUCT
  $("#adminProducts")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) {
      const product = products.find(
        (item) => String(item.id) === editButton.dataset.edit
      );

      if (!product) return;

      const name = prompt("Product name:", product.name);
      if (name === null) return;

      const category = prompt("Category:", product.category || "");
      if (category === null) return;

      const price = prompt("Selling price:", product.price);
      if (price === null) return;

      const oldPrice = prompt("Original price:", product.original_price || 0);
      if (oldPrice === null) return;

      const image = prompt("Image URL:", product.image_url || "");
      if (image === null) return;

      const description = prompt(
        "Description:",
        product.description || ""
      );
      if (description === null) return;

      const newPrice = Number(price);
      const newOldPrice = Number(oldPrice);

      if (!name.trim() || !Number.isFinite(newPrice) ||
          !Number.isFinite(newOldPrice) || newPrice < 0 || newOldPrice < 0) {
        message("Product details sahi bharo.", true);
        return;
      }

      if (!(await verifyAdmin())) {
        message("Admin permission required.", true);
        return;
      }

      const { error } = await supabaseClient
        .from("products")
        .update({
          name: name.trim(),
          category: category.trim(),
          price: newPrice,
          original_price: newOldPrice,
          image_url: image.trim(),
          description: description.trim()
        })
        .eq("id", product.id);

      if (error) {
        message("Update failed: " + error.message, true);
        return;
      }

      message("Product update ho gaya.");
      await loadProducts();
    }

    if (deleteButton) {
      const product = products.find(
        (item) => String(item.id) === deleteButton.dataset.delete
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
        message("Product delete nahi hua. Database permission check karo.", true);
        return;
      }

      message("Product delete ho gaya.");
      await loadProducts();
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
      message("Payment settings load nahi hui: " + error.message, true);
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

    const settings = {
      id: true,
      merchant_name: form.elements.merchantName.value.trim(),
      upi_id: form.elements.upiId.value.trim(),
      qr_image_url: form.elements.qrImage.value.trim(),
      updated_at: new Date().toISOString()
    };

    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;

    try {
      const { error } = await supabaseClient
        .from("payment_settings")
        .upsert(settings, { onConflict: "id" });

      if (error) throw error;

      message("Payment settings save ho gayi.");

    } catch (error) {
      message("Settings save nahi hui: " + error.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  });

  // ORDERS - TEMPORARILY FROM THIS BROWSER'S LOCAL STORAGE
  function loadOrders() {
    try {
      orders = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
      if (!Array.isArray(orders)) orders = [];
    } catch {
      orders = [];
    }

    renderOrders();
  }

  function renderOrders() {
    const container = $("#adminOrders");
    if (!container) return;

    if (!orders.length) {
      container.innerHTML = `
        <p>Abhi koi local order nahi mila.</p>
        <p>Note: Orders abhi Supabase mein sync nahi ho rahe hain.</p>
      `;
      return;
    }

    container.innerHTML = orders.map((order, index) => {
      const customer = order.customer_name || order.name || "Customer";
      const phone = order.phone || "";
      const address = order.address || "";
      const total = order.total ?? order.amount ?? 0;
      const status = order.order_status || order.status || "placed";
      const payment = order.payment_status || "pending";

      const items = Array.isArray(order.items)
        ? order.items.map((item) => {
            const itemName = item.name || item.title || "Product";
            const qty = item.qty || item.quantity || 1;
            return `${escapeHTML(itemName)} × ${escapeHTML(qty)}`;
          }).join("<br>")
        : "Order items";

      return `
        <div style="border:1px solid #ddd;padding:12px;margin:12px 0;border-radius:10px">
          <strong>Order #${index + 1}</strong>
          <p>Customer: ${escapeHTML(customer)}</p>
          <p>Phone: ${escapeHTML(phone)}</p>
          <p>Address: ${escapeHTML(address)}</p>
          <p>Items:<br>${items}</p>
          <p>Total: ₹${escapeHTML(total)}</p>
          <p>Payment: ${escapeHTML(payment)}</p>
          <p>Order status: ${escapeHTML(status)}</p>

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" data-paid="${index}">Mark Paid</button>
            <button type="button" data-pending="${index}">Mark Pending</button>
            <button type="button" data-cancel="${index}">Cancel Order</button>
          </div>
        </div>
      `;
    }).join("");
  }

  $("#adminOrders")?.addEventListener("click", async (event) => {
    const paid = event.target.closest("[data-paid]");
    const pending = event.target.closest("[data-pending]");
    const cancel = event.target.closest("[data-cancel]");

    const button = paid || pending || cancel;
    if (!button) return;

    if (!(await verifyAdmin())) {
      message("Admin permission required.", true);
      return;
    }

    const index = Number(button.dataset.paid ??
      button.dataset.pending ?? button.dataset.cancel);

    if (!Number.isInteger(index) || !orders[index]) return;

    if (paid) {
      if (!confirm("Merchant account mein payment verify kar li hai?")) {
        return;
      }
      orders[index].payment_status = "paid";
    }

    if (pending) {
      orders[index].payment_status = "pending";
    }

    if (cancel) {
      if (!confirm("Is order ko cancel karna hai?")) return;
      orders[index].order_status = "cancelled";
    }

    localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
    renderOrders();
    message("Order status update ho gaya.");
  });

  // START
  checkLogin().catch((error) => {
    console.error(error);
    showLogin();
    message("Admin panel load nahi hua: " + error.message, true);
  });

})();
