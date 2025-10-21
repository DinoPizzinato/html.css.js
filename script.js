// products.json
function resolveProductsUrl() {
  return location.pathname.toLowerCase().includes("/pages/")
    ? "../products.json"
    : "./products.json";
}

const STORAGE_KEY = "fh_cart_v2";

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  updateCartCounter(cart);
}
function clearCart() {
  localStorage.removeItem(STORAGE_KEY);
  updateCartCounter([]);
}
function updateCartCounter(cart = loadCart()) {
  const count = cart.reduce((acc, p) => acc + (p.cantidad || 1), 0);
  document
    .querySelectorAll(".cart-count")
    .forEach((el) => (el.textContent = count));
}
function computeTotal(cart = loadCart()) {
  return cart.reduce(
    (acc, p) => acc + (Number(p.precio) || 0) * (p.cantidad || 1),
    0
  );
}

/* ---------------------------------
    Operaciones del carrito 
--------------------------------- */

function makeId(nombre, precio) {
  return (String(nombre) + "|" + String(precio))
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

function addItem({ id, nombre, precio }) {
  const cart = loadCart();
  const i = cart.findIndex((p) => p.id === id);
  if (i >= 0) {
    cart[i].cantidad = (cart[i].cantidad || 1) + 1;
  } else {
    cart.push({ id, nombre, precio: Number(precio) || 0, cantidad: 1 });
  }
  saveCart(cart);
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      text: "Producto agregado al carrito ✅",
      timer: 1200,
      showConfirmButton: false,
    });
  }
}

// Suma y resta de cantidad
function changeQty(id, delta) {
  const cart = loadCart();
  const item = cart.find((p) => p.id === id);
  if (!item) return;
  item.cantidad = (item.cantidad || 1) + delta;
  if (item.cantidad <= 0) {
    const filtrado = cart.filter((p) => p.id !== id);
    saveCart(filtrado);
  } else {
    saveCart(cart);
  }
}

// Eliminacion de un producto
function removeItem(id) {
  const cart = loadCart().filter((p) => p.id !== id);
  saveCart(cart);
}

// Finalizar compra: limpia el carrito
function finalizarCompra() {
  const cart = loadCart();
  if (!cart.length) {
    if (window.Swal)
      Swal.fire({ icon: "info", text: "Tu carrito está vacío." });
    return;
  }
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      text: "Compra realizada con éxito 🎣",
      timer: 1500,
      showConfirmButton: false,
    });
  }
  clearCart();
  renderCart();
}

/* ---------------------------------
    Datos (búsqueda)
--------------------------------- */

let PRODUCTOS_MEM = null;
async function getProductos() {
  if (PRODUCTOS_MEM) return PRODUCTOS_MEM;

  try {
    const res = await fetch(resolveProductsUrl());
    if (!res.ok) throw new Error("No se pudo cargar products.json");
    PRODUCTOS_MEM = await res.json();
    return PRODUCTOS_MEM;
  } catch (e) {
    PRODUCTOS_MEM = [];
    document
      .querySelectorAll(".product, .card, .producto, .item")
      .forEach((card, i) => {
        const nombre =
          card
            .querySelector(".card-title, h3, h4, .nombre")
            ?.textContent?.trim() || `Producto #${i + 1}`;
        const precio =
          Number(
            (card.querySelector(".price, .precio")?.textContent || "").replace(
              /\D+/g,
              ""
            )
          ) || 0;
        PRODUCTOS_MEM.push({ id: i + 1, nombre, precio });
      });
    return PRODUCTOS_MEM;
  }
}

/* ---------------------------------
   Modal del carrito
--------------------------------- */

function ensureCartModal() {
  if (document.getElementById("cart-modal")) return;
  const tpl = document.createElement("div");
  tpl.innerHTML = `
  <div id="cart-modal" class="modal" aria-hidden="true" style="display:none">
    <div class="modal-content cart-modal-content">
      <button class="close-btn" id="cart-close" aria-label="Cerrar">×</button>
      <h2>Tu carrito</h2>
      <div id="cart-root"></div>
      <div class="cart-actions">
        <button id="btn-vaciar">Vaciar carrito</button>
        <div class="total">Total: $<span id="cart-total">0</span></div>
        <button id="btn-comprar">Finalizar compra</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(tpl.firstElementChild);
}

function openCartModal() {
  ensureCartModal();
  const modal = document.getElementById("cart-modal");
  if (!modal) return;
  modal.style.display = "flex";
  document.body.classList.add("modal-open");
  renderCart();
}
function closeCartModal() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.classList.remove("modal-open");
}

function renderCart() {
  const root = document.getElementById("cart-root");
  const totalEl = document.getElementById("cart-total");
  if (!root || !totalEl) return;

  const cart = loadCart();
  if (!cart.length) {
    root.innerHTML = `<div class="empty">Tu carrito está vacío.</div>`;
    totalEl.textContent = "0";
    updateCartCounter(cart);
    return;
  }

  const rows = cart
    .map(
      (p) => `
    <tr data-id="${p.id}">
      <td>${p.nombre}</td>
      <td>$${p.precio}</td>
      <td>
        <div class="qty">
          <button class="menos">-</button>
          <span class="cantidad">${p.cantidad || 1}</span>
          <button class="mas">+</button>
        </div>
      </td>
      <td>$${(p.precio || 0) * (p.cantidad || 1)}</td>
      <td><button class="eliminar">Eliminar</button></td>
    </tr>`
    )
    .join("");

  root.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Precio</th>
          <th>Cantidad</th>
          <th>Subtotal</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  totalEl.textContent = computeTotal(cart).toLocaleString("es-AR");
  updateCartCounter(cart);

  root.querySelectorAll("tr").forEach((tr) => {
    const id = tr.getAttribute("data-id");
    tr.querySelector(".menos")?.addEventListener("click", () => {
      changeQty(id, -1);
      renderCart();
    });
    tr.querySelector(".mas")?.addEventListener("click", () => {
      changeQty(id, 1);
      renderCart();
    });
    tr.querySelector(".eliminar")?.addEventListener("click", () => {
      removeItem(id);
      renderCart();
      if (window.Swal)
        Swal.fire({
          icon: "info",
          text: "Producto eliminado ❌",
          timer: 900,
          showConfirmButton: false,
        });
    });
  });
}

/* ---------------------------------
  Enlazado de botones del catálogo
--------------------------------- */

function wireProductButtons() {
  document.querySelectorAll(".product, .card").forEach((card, idx) => {
    const nameEl = card.querySelector(".card-title, h3");
    const priceEl = card.querySelector(".price");
    const addBtn = card.querySelector(".add-to-cart");
    const buyBtn = card.querySelector(".buy-now, .btn.buy-now");

    const nombre = nameEl ? nameEl.textContent.trim() : `Producto #${idx + 1}`;
    const precio = priceEl
      ? Number((priceEl.textContent || "").replace(/\D+/g, "")) || 0
      : 0;
    const id = makeId(nombre, precio);

    if (addBtn && !addBtn.dataset.wired) {
      addBtn.dataset.wired = "1";
      addBtn.addEventListener("click", () => addItem({ id, nombre, precio }));
    }

    if (buyBtn && !buyBtn.dataset.wired) {
      buyBtn.dataset.wired = "1";
      buyBtn.addEventListener("click", () => {
        const cart = loadCart();
        if (cart.some((p) => p.id === id)) {
          const nuevo = cart.filter((p) => p.id !== id);
          saveCart(nuevo);
          renderCart();
        }
        if (window.Swal) {
          Swal.fire({
            icon: "success",
            text: `Compra de ${nombre} realizada con éxito 🎣`,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      });
    }
  });
}

/* ---------------------------------
  Abrir/cerrar carrito y acciones
--------------------------------- */

function wireCartOpenClose() {
  document.querySelectorAll(".cart-icon").forEach((btn) => {
    if (!btn.dataset.wired) {
      btn.dataset.wired = "1";
      btn.addEventListener("click", openCartModal);
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target?.id === "cart-close") closeCartModal();

    if (e.target?.id === "btn-vaciar") {
      const cart = loadCart();
      if (!cart.length) return;
      if (window.Swal) {
        Swal.fire({
          title: "¿Vaciar carrito?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí",
          cancelButtonText: "No",
        }).then((r) => {
          if (r.isConfirmed) {
            clearCart();
            renderCart();
          }
        });
      } else {
        clearCart();
        renderCart();
      }
    }

    if (e.target?.id === "btn-comprar") {
      finalizarCompra();
    }

    const modal = document.getElementById("cart-modal");
    if (modal && e.target === modal) closeCartModal();
  });
}

/* ---------------------------------
  Búsqueda simple
--------------------------------- */

function wireSearch() {
  const btn = document.querySelector(".Buscar");
  const input = document.querySelector(".search-bar input");
  if (!btn || !input) return;

  btn.addEventListener("click", async () => {
    const query = (input.value || "").trim().toLowerCase();

    if (!query) {
      Swal.fire({
        icon: "info",
        text: "Por favor, escribí un producto para buscar.",
      });
      return;
    }

    const productos = await getProductos();
    const resultados = productos.filter((p) =>
      p.nombre.toLowerCase().includes(query)
    );

    if (!resultados.length) {
      Swal.fire({
        icon: "warning",
        text: `No se encontraron resultados para "${query}".`,
      });
      return;
    }

    const htmlResultados = resultados
      .map(
        (p) => `
        <div style="margin-bottom:10px; border-bottom:1px solid #ccc; padding:8px;">
          <strong>${p.nombre}</strong><br>
          💲<b>${p.precio}</b><br>
          <button class="add-result" data-id="${p.id}" 
            style="background-color:#3498db; color:#fff; border:none; padding:5px 10px; border-radius:5px; margin-top:5px; cursor:pointer;">
            🛒 Agregar al carrito
          </button>
        </div>`
      )
      .join("");

    Swal.fire({
      title: "Resultados de búsqueda",
      html: htmlResultados,
      showConfirmButton: false,
      didOpen: () => {
        document.querySelectorAll(".add-result").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const id = e.target.dataset.id;
            const producto = productos.find((p) => p.id == id);
            if (producto) {
              addItem(producto);
            }
          });
        });
      },
    });
  });
}

/* ---------------------------------
  Carrusel 
--------------------------------- */

/* ---------------------------------
  Carrusel JS (estable y sin “imagen fantasma”)
--------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(
    "#carousel-container .carousel-item"
  );
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");

  if (!slides.length || !prev || !next) return;

  let current = 0;
  let interval = null;

  function showSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    current = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === current);
    });
  }

  function nextSlide() {
    showSlide(current + 1);
  }
  function prevSlide() {
    showSlide(current - 1);
  }

  function startTimer() {
    clearInterval(interval);
    interval = setInterval(() => {
      showSlide(current + 1);
    }, 5000);
  }

  next.addEventListener("click", () => {
    nextSlide();
    startTimer();
  });

  prev.addEventListener("click", () => {
    prevSlide();
    startTimer();
  });

  showSlide(0);
  startTimer();
});

/* ---------------------------------
  Fallback seguro
--------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".img1 .carousel");
  const items2 = container?.querySelectorAll(".carousel-item") || [];
  if (!container || !items2.length) return;

  container.style.animation = "none";
  let idx2 = 0;
  const render2 = () => {
    container.style.transform = `translateX(-${idx2 * 100}%)`;
  };
  const go2 = (n) => {
    idx2 = (n + items2.length) % items2.length;
    render2();
  };
  const prev2 = document.querySelector(".img1 .prev");
  const next2 = document.querySelector(".img1 .next");
  prev2?.addEventListener("click", () => go2(idx2 - 1));
  next2?.addEventListener("click", () => go2(idx2 + 1));
  setInterval(() => go2(idx2 + 1), 5000);
  render2();
});

/* ---------------------------------
  Inicialización general
--------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("cart-modal");
  if (modal) modal.style.display = "none";

  ensureCartModal();
  updateCartCounter();
  wireProductButtons();
  wireCartOpenClose();
  wireSearch();
});
