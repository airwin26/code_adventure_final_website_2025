async function setupDatabase() {
  const SQL = await window.initSqlJs({
    locateFile: () =>
      "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm",
  });

  const db = new SQL.Database();

  // Create Products Table
  db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price DECIMAL(10,2),
            image TEXT
        );
    `);

  // Insert Sample Products (only if empty)
  const check = db.exec("SELECT COUNT(*) FROM products");
  if (!check[0] || check[0].values[0][0] === 0) {
    db.run(`
            INSERT INTO products (name, price, image) VALUES 
            ('Black Wave Charm', 19.99, 'img/jewelry/black_wave.webp'),
            ('Boot Charm', 49.99, 'img/jewelry/boot.webp'),
            ('Butterfly Charm', 45.99, 'img/jewelry/butterfly.webp'),
            ('Cherries Charm', 29.99, 'img/jewelry/cherries.webp'),
            ('Compass Charm', 29.99, 'img/jewelry/compass.webp'),
            ('Daisy Charm', 32.99, 'img/jewelry/daisy.webp'),
            ('Dog Paw Charm', 19.99, 'img/jewelry/dog_paw.webp'),
            ('Heart Charm', 19.99, 'img/jewelry/heart.webp'),
            ('Palm Tree Charm', 29.99, 'img/jewelry/palmtree.webp'),
            ('Rainbow Charm', 25.99, 'img/jewelry/rainbow.webp');
        `);
  }

  return db;
}

// Fetch products using SQL query
async function loadProducts() {
  const db = await setupDatabase();
  const res = db.exec("SELECT * FROM products");

  const productsDiv = document.getElementById("products");
  productsDiv.innerHTML = "";

  res[0].values.forEach(([id, name, price, image]) => {
    const div = document.createElement("div");
    div.classList.add("product");

    div.innerHTML = `
            <img src="${image}" alt="${name}" width="100">
            <h4>${name}</h4>
            <p>$${price.toFixed(2)}</p>
            <button onclick="addToCart(${id}, '${name}', ${price})">Add to Cart</button>
        `;

    productsDiv.appendChild(div);
  });
}

async function searchProducts() {
  const searchQuery = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const db = await setupDatabase();

  const productsDiv = document.getElementById("products");
  productsDiv.innerHTML = ""; // Clear previous results

  // Use SQL query to find matching products
  const stmt = db.prepare(`
    SELECT * FROM products 
    WHERE name LIKE $search
  `);

  // Bind the value with wildcards for partial match
  stmt.bind({ $search: `%${searchQuery}%` });

  const results = [];

  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free(); // Clean up the prepared statement

  // If no results, show message
  if (results.length === 0) {
    productsDiv.innerHTML = `<p class="no-results">🚫 No products found for "${searchQuery}". Try another search!</p>`;
    return;
  }

  // Display matching products
  results.forEach(({ id, name, price, image }) => {
    const div = document.createElement("div");
    div.classList.add("product");

    div.innerHTML = `
      <img src="${image}" alt="${name}" width="100">
      <h4>${name}</h4>
      <p>$${price.toFixed(2)}</p>
      <button onclick="addToCart(${id}, '${name}', ${price})">Add to Cart</button>
    `;

    productsDiv.appendChild(div);
  });
}

// All things cart related
let cart = [];

// Add item to the cart
function addToCart(id, name, price) {
  cart.push({ id, name, price });
  updateCart();
}

// Update cart and total
function updateCart() {
  const cartList = document.getElementById("cart");
  const cartTotal = document.getElementById("cartTotal");
  const cartButton = document.getElementById("toggleCartBtn");
  let total = 0;

  cartList.innerHTML = "";

  cart.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} - $${item.price.toFixed(2)}`;
    cartList.appendChild(li);
    total += item.price;
  });

  cartTotal.innerText = cart.length > 0 ? `Total: $${total.toFixed(2)}` : "";

  // 🛒 Update Cart button with item count
  cartButton.innerText =
    cart.length > 0 ? `🛒 Cart (${cart.length})` : "🛒 Cart";
}

function toggleCart() {
  const panel = document.getElementById("cart-panel");
  panel.classList.toggle("show");
}

async function checkout() {
  if (cart.length === 0) {
    alert("Your cart is empty!");
  } else {
    alert("Thank you for your purchase! Your order has been placed.");

    // Clear the cart
    cart = [];
    updateCart();
  }
}

const blockedPasswords = [
  "password",
  "123456",
  "qwerty",
  "letmein",
  "admin",
  "welcome",
  "12345678",
];

function checkPasswordStrength(password) {
  const messageBox = document.getElementById("registerMessage");

  if (blockedPasswords.includes(password.toLowerCase())) {
    messageBox.style.color = "red";
    messageBox.innerText = "❌ Password is too common! Try a stronger one.";
    return false;
  }

  if (password.length < 8) {
    messageBox.style.color = "red";
    messageBox.innerText =
      "❌ Password too short! Must be at least 8 characters.";
    return false;
  }

  if (!/[A-Z]/.test(password)) {
    messageBox.style.color = "red";
    messageBox.innerText =
      "❌ Password must include at least one uppercase letter.";
    return false;
  }

  if (!/[a-z]/.test(password)) {
    messageBox.style.color = "red";
    messageBox.innerText =
      "❌ Password must include at least one lowercase letter.";
    return false;
  }

  if (!/[0-9]/.test(password)) {
    messageBox.style.color = "red";
    messageBox.innerText = "❌ Password must include at least one number.";
    return false;
  }

  if (!/[\W_]/.test(password)) {
    messageBox.style.color = "red";
    messageBox.innerText =
      "❌ Password must include at least one special character (@, #, $, etc.).";
    return false;
  }

  messageBox.style.color = "green";
  messageBox.innerText = "✅ Password is strong!";
  return true;
}

async function register() {
  const username = document.getElementById("registerUsername").value;
  const password = document.getElementById("registerPassword").value;
  const messageBox = document.getElementById("registerMessage");

  if (!username || !password) {
    messageBox.style.color = "red";
    messageBox.innerText = "Username and password required.";
    return;
  }

  if (!checkPasswordStrength(password)) {
    return; // Stop the registration if password is weak
  }

  // Load database
  const db = await setupDatabase();

  // Create Users Table if not exists
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT);"
  );

  // Check if user exists
  const res = db.exec(`SELECT * FROM users WHERE username = '${username}'`);
  if (res.length > 0) {
    messageBox.style.color = "red";
    messageBox.innerText = "User already exists!";
    return;
  }

  // Insert new user
  db.run(
    `INSERT INTO users (username, password) VALUES ('${username}', '${password}');`
  );
  messageBox.style.color = "green";
  messageBox.innerText = `Welcome, ${username}!`;
}

// Load products on page load
loadProducts();
