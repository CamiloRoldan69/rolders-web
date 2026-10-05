const productGrid = document.getElementById("product-grid");
const filterForm = document.getElementById("part-finder-form");
const selectBrand = document.getElementById("select-brand");
const selectCategory = document.getElementById("select-category");
const inputKeyword = document.getElementById("input-keyword");
const filterStatus = document.getElementById("filter-status");
const menuButton = document.getElementById("menu-btn");
const mobileNav = document.getElementById("mobile-nav");
const cartDialog = document.getElementById("cart-dialog");
const galleryDialog = document.getElementById("gallery-dialog");
const cartItems = document.getElementById("cart-items");
const cartEmpty = document.getElementById("cart-empty");
const cartCount = document.getElementById("cart-count");
const cartSubmit = document.getElementById("send-order");
const heroCarousel = document.getElementById("hero-carousel");
const heroProgress = document.getElementById("hero-progress");

const HERO_SLIDES = [
    {
        name: "Orbix",
        image: "assets/img/catalogo-rolders/Portadas/5.jpeg"
    },
    {
        name: "Rocket Roll 800",
        image: "assets/img/catalogo-rolders/Portadas/3.png"
    },
    {
        name: "Rocket Roll 1600",
        image: "assets/img/catalogo-rolders/Portadas/4.png"
    },
    {
        name: "StarGlide 600",
        image: "assets/img/catalogo-rolders/Portadas/2.png"
    },
    {
        name: "EcoRide PRO",
        image: "assets/img/catalogo-rolders/Portadas/1.png"
    }
];

let cartState = [];
let galleryProduct = null;
let galleryIndex = 0;
let heroSlideIndex = 0;
let heroAutoplayTimer = null;
let heroAutoplayPaused = false;
const heroAutoplayDelay = 6500;

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function normalizeText(value) {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es-CO")
        .trim();
}

function getWhatsappUrl(type, message) {
    const phone = ROLDERS_CONFIG.contacts[type];
    if (!phone) throw new Error(`No hay un WhatsApp configurado para el contacto "${type}".`);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function openWhatsapp(type, message) {
    const url = getWhatsappUrl(type, message);
    window.open(url, "_blank", "noopener,noreferrer");
}

function getAssetUrl(path) {
    return new URL(path, document.baseURI).href;
}

function loadCart() {
    try {
        const saved = localStorage.getItem(ROLDERS_CONFIG.cartStorageKey);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("El formato guardado del carrito no es válido.");

        return parsed.reduce((items, item) => {
            const product = PRODUCTS_DATA.find(candidate => candidate.id === item.id);
            const quantity = Number(item.quantity);
            if (product && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) {
                items.push({ id: product.id, quantity });
            }
            return items;
        }, []);
    } catch (error) {
        console.error("No se pudo recuperar el carrito guardado.", error);
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(ROLDERS_CONFIG.cartStorageKey, JSON.stringify(cartState));
    } catch (error) {
        console.error("No se pudo guardar el carrito en este navegador.", error);
    }
}

function updateCart() {
    const itemCount = cartState.reduce((total, item) => total + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = String(itemCount);
        cartCount.setAttribute("aria-label", `${itemCount} ${itemCount === 1 ? "producto" : "productos"} en el carrito`);
    }
    document.getElementById("cart-trigger")?.setAttribute(
        "aria-label",
        itemCount ? `Abrir carrito, ${itemCount} ${itemCount === 1 ? "producto" : "productos"}` : "Abrir carrito vacío"
    );
    if (cartEmpty) cartEmpty.hidden = itemCount !== 0;
    if (cartItems) cartItems.hidden = itemCount === 0;
    if (cartSubmit) cartSubmit.disabled = itemCount === 0;
    if (!cartItems) return;

    cartItems.innerHTML = cartState.map(item => {
        const product = PRODUCTS_DATA.find(candidate => candidate.id === item.id);
        if (!product) return "";
        return `<article class="cart-item">
            <img src="${escapeHtml(getAssetUrl(product.image))}" alt="" loading="lazy">
            <div class="cart-item-copy"><h3>${escapeHtml(product.name)}</h3><span>Precio y disponibilidad por confirmar</span></div>
            <div class="cart-item-controls" aria-label="Cantidad de ${escapeHtml(product.name)}">
                <button type="button" data-cart-action="decrease" data-product-id="${escapeHtml(product.id)}" aria-label="Quitar una unidad de ${escapeHtml(product.name)}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-cart-action="increase" data-product-id="${escapeHtml(product.id)}" aria-label="Agregar una unidad de ${escapeHtml(product.name)}">+</button>
            </div>
            <button class="cart-remove" type="button" data-cart-action="remove" data-product-id="${escapeHtml(product.id)}" aria-label="Eliminar ${escapeHtml(product.name)} del carrito"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
        </article>`;
    }).join("");
}

function addToCart(productId) {
    const product = PRODUCTS_DATA.find(candidate => candidate.id === productId);
    if (!product) throw new Error(`No se encontró el producto "${productId}" para el carrito.`);

    const existing = cartState.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= 99) {
            if (filterStatus) filterStatus.textContent = "Puedes agregar hasta 99 unidades de cada referencia.";
            return;
        }
        existing.quantity += 1;
    } else {
        cartState.push({ id: productId, quantity: 1 });
    }

    saveCart();
    updateCart();
    if (filterStatus) filterStatus.textContent = `${product.name} se agregó al carrito.`;
}

function updateCartQuantity(productId, action) {
    const item = cartState.find(candidate => candidate.id === productId);
    if (!item) return;

    if (action === "remove" || (action === "decrease" && item.quantity === 1)) {
        cartState = cartState.filter(candidate => candidate.id !== productId);
    } else if (action === "increase" && item.quantity < 99) {
        item.quantity += 1;
    } else if (action === "decrease") {
        item.quantity -= 1;
    }

    saveCart();
    updateCart();
}

function sendCartOrder() {
    if (cartState.length === 0) return;

    const name = document.getElementById("checkout-name").value.trim();
    const city = document.getElementById("checkout-city").value.trim();
    const orderLines = cartState.map(item => {
        const product = PRODUCTS_DATA.find(candidate => candidate.id === item.id);
        return `• ${product.name} — cantidad: ${item.quantity}`;
    });
    const message = [
        "Hola Rolder's, quiero confirmar este pedido:",
        "",
        ...orderLines,
        "",
        name ? `Nombre: ${name}` : "",
        city ? `Ciudad de entrega: ${city}` : "",
        "",
        "Por favor confírmame el precio actualizado, la disponibilidad, el costo de envío y los medios de pago. Entiendo que el pedido queda confirmado cuando validemos esos datos."
    ].filter(Boolean).join("\n");

    openWhatsapp("commercial", message);
}

function openProductGallery(productId) {
    galleryProduct = PRODUCTS_DATA.find(product => product.id === productId);
    if (!galleryProduct) throw new Error(`No se encontró la galería del producto "${productId}".`);
    galleryIndex = 0;
    updateGallery();
    galleryDialog.showModal();
}

function updateGallery() {
    if (!galleryProduct || !galleryDialog) return;
    const images = galleryProduct.gallery?.length ? galleryProduct.gallery : [galleryProduct.image];
    const image = images[galleryIndex];
    const galleryImage = document.getElementById("gallery-image");
    const details = galleryProduct.features?.length
        ? galleryProduct.features
        : ["Confirma compatibilidad y disponibilidad con nuestro equipo antes de solicitar el pedido."];
    const category = galleryProduct.category === "patinetes" ? "Scooter Rolder's" : "Repuesto multimarca";
    const detailNote = galleryProduct.coverNotice
        || (galleryProduct.coverImage
            ? "La portada muestra información promocional. Confirma el precio, la vigencia y la disponibilidad actuales con el asesor."
            : "La compatibilidad, el precio y la disponibilidad se confirman con nuestro equipo antes de realizar el pedido.");

    document.getElementById("gallery-title").textContent = galleryProduct.name;
    document.getElementById("gallery-brand").textContent = `${category} · ${galleryProduct.badge || "Asesoría personalizada"}`;
    document.getElementById("gallery-description").textContent = galleryProduct.description;
    document.getElementById("gallery-note").textContent = detailNote;
    document.getElementById("gallery-features-heading").textContent = galleryProduct.category === "patinetes"
        ? "Especificaciones del modelo"
        : "Lo que debes saber";
    document.getElementById("gallery-features").innerHTML = details
        .map(feature => `<li>${escapeHtml(feature)}</li>`)
        .join("");
    galleryImage.src = getAssetUrl(image);
    galleryImage.alt = `${galleryProduct.name}, foto ${galleryIndex + 1} de ${images.length}`;
    document.getElementById("gallery-count").textContent = `Foto ${galleryIndex + 1} de ${images.length}`;
    document.getElementById("gallery-previous").disabled = images.length < 2;
    document.getElementById("gallery-next").disabled = images.length < 2;
    document.getElementById("gallery-add").textContent = galleryProduct.category === "patinetes"
        ? "Agregar esta patineta al carrito"
        : "Agregar este repuesto al carrito";
}

function moveGallery(step) {
    if (!galleryProduct) return;
    const imageCount = galleryProduct.gallery?.length || 1;
    galleryIndex = (galleryIndex + step + imageCount) % imageCount;
    updateGallery();
}

function updateHeroSlide(index, resetTimer = true) {
    heroSlideIndex = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
    const slide = HERO_SLIDES[heroSlideIndex];
    const imageWrap = document.getElementById("hero-product-image-wrap");
    const image = document.getElementById("hero-product-image");

    imageWrap.classList.add("is-switching");
    window.setTimeout(() => {
        image.src = getAssetUrl(slide.image);
        image.alt = `Portada promocional Rolder's ${slide.name}. Consulta vigencia, precio y disponibilidad.`;
        image.onload = () => imageWrap.classList.remove("is-switching");
        image.onerror = () => {
            imageWrap.classList.remove("is-switching");
            console.error(`No se pudo cargar la portada promocional del modelo "${slide.name}".`);
        };
        document.getElementById("hero-view-product").href = getWhatsappUrl(
            "commercial",
            `Hola, quiero consultar la promoción de ${slide.name} que vi en la página. ¿Me confirman el precio vigente y la disponibilidad?`
        );
        heroCarousel.setAttribute("aria-label", `Portada promocional Rolder's ${slide.name}`);
        document.getElementById("hero-carousel-count").textContent = `${String(heroSlideIndex + 1).padStart(2, "0")} / ${String(HERO_SLIDES.length).padStart(2, "0")}`;
        document.querySelectorAll("[data-hero-slide]").forEach((dot, dotIndex) => {
            const isActive = dotIndex === heroSlideIndex;
            dot.classList.toggle("is-active", isActive);
            dot.setAttribute("aria-pressed", String(isActive));
            dot.setAttribute("aria-label", `Mostrar portada ${HERO_SLIDES[dotIndex].name}`);
        });
        if (resetTimer) scheduleHeroAutoplay();
    }, 170);
}

function stopHeroAutoplay() {
    window.clearTimeout(heroAutoplayTimer);
    heroProgress?.parentElement.classList.add("is-paused");
}

function scheduleHeroAutoplay() {
    window.clearTimeout(heroAutoplayTimer);
    if (heroAutoplayPaused || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        stopHeroAutoplay();
        return;
    }
    heroProgress.parentElement.classList.remove("is-running", "is-paused");
    void heroProgress.offsetWidth;
    heroProgress.parentElement.classList.add("is-running");
    heroAutoplayTimer = window.setTimeout(() => updateHeroSlide(heroSlideIndex + 1), heroAutoplayDelay);
}

function setHeroAutoplayPaused(isPaused) {
    heroAutoplayPaused = isPaused;
    if (isPaused) {
        stopHeroAutoplay();
    } else {
        scheduleHeroAutoplay();
    }
}

function setupHeroCarousel() {
    if (!heroCarousel || !heroProgress) return;

    document.getElementById("hero-previous").addEventListener("click", () => updateHeroSlide(heroSlideIndex - 1));
    document.getElementById("hero-next").addEventListener("click", () => updateHeroSlide(heroSlideIndex + 1));
    document.querySelectorAll("[data-hero-slide]").forEach(dot => {
        dot.addEventListener("click", () => updateHeroSlide(Number(dot.dataset.heroSlide)));
    });
    heroCarousel.addEventListener("pointerenter", () => setHeroAutoplayPaused(true));
    heroCarousel.addEventListener("pointerleave", () => setHeroAutoplayPaused(false));
    heroCarousel.addEventListener("focusin", () => setHeroAutoplayPaused(true));
    heroCarousel.addEventListener("focusout", event => {
        if (!heroCarousel.contains(event.relatedTarget)) setHeroAutoplayPaused(false);
    });
    heroCarousel.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft") updateHeroSlide(heroSlideIndex - 1);
        if (event.key === "ArrowRight") updateHeroSlide(heroSlideIndex + 1);
    });
    document.addEventListener("visibilitychange", () => scheduleHeroAutoplay());
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => scheduleHeroAutoplay());

    scheduleHeroAutoplay();
}

function populateWhatsappLinks() {
    document.querySelectorAll("[data-whatsapp]").forEach(link => {
        const type = link.dataset.whatsapp;
        const message = link.dataset.message || "Hola, quiero información sobre Rolder's EcoRide.";
        link.href = getWhatsappUrl(type, message);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    });
}

function getProductSearchText(product) {
    const details = [
        product.name,
        product.description,
        product.category,
        product.brand,
        product.badge,
        ...(product.keywords || []),
        ...(product.consultFor || []),
        ...Object.values(product.specs || {})
    ];
    return normalizeText(details.join(" "));
}

function matchesProduct(product) {
    const brand = selectBrand ? selectBrand.value : "";
    const category = selectCategory ? selectCategory.value : "";
    const keyword = normalizeText(inputKeyword ? inputKeyword.value : "");
    const matchesBrand = !brand || product.brand === brand || (product.consultFor || []).includes(brand);
    const matchesCategory = !category || product.category === category;
    const matchesKeyword = !keyword || getProductSearchText(product).includes(keyword);
    const catalogTab = document.querySelector(".catalog-tab.is-active")?.dataset.catalogTab || "all";
    const matchesTab = catalogTab === "all"
        || (catalogTab === "patinetes" && product.category === "patinetes")
        || (catalogTab === "repuestos" && product.category !== "patinetes");

    return matchesBrand && matchesCategory && matchesKeyword && matchesTab;
}

function renderProductCard(product) {
    const name = escapeHtml(product.name);
    const description = escapeHtml(product.description);
    const badge = escapeHtml(product.badge || "");
    const cardImage = product.coverImage || product.image;
    const imageAlt = escapeHtml(product.coverImage
        ? `Portada promocional Rolder's ${product.name}; consulta la vigencia de la oferta`
        : product.imageAlt || product.name);
    const productBrand = product.brand === "rolders" ? "Rolder's EcoRide" : "Repuesto y accesorio multimarca";
    const features = product.features?.length
        ? `<ul class="product-features">${product.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>`
        : "";
    const compatibility = product.consultFor?.length
        ? `<p class="compatibility-note">Compatibilidad por confirmar con marca, modelo y foto de la pieza.</p>`
        : "";
    const imageUrl = escapeHtml(getAssetUrl(cardImage));
    const galleryCount = product.gallery?.length || 1;
    const coverClass = product.coverImage ? "product-card--campaign" : "";
    const accent = escapeHtml(product.accent || "#70f5ff");
    const imageAction = product.coverImage ? "" : `<span>Ver fotos <i class="fa-regular fa-images" aria-hidden="true"></i></span>`;
    const orderNote = product.coverImage
        ? escapeHtml(product.coverNotice || "Portada promocional · Confirma vigencia, precio y disponibilidad.")
        : "Precio y disponibilidad se confirman al hacer el pedido.";

    return `<article class="product-card ${coverClass}" style="--product-accent: ${accent};">
        <div class="product-media">
            ${badge && !product.coverImage ? `<span class="product-badge">${badge}</span>` : ""}
            <button class="product-image-button" type="button" data-open-gallery="${escapeHtml(product.id)}" aria-label="${product.coverImage ? `Ver fotos del scooter ${name}` : `Ver fotos de ${name}`}">
                <img src="${imageUrl}" alt="${imageAlt}" loading="lazy" decoding="async">
                ${imageAction}
            </button>
        </div>
        <div class="product-copy">
            <span class="product-brand">${productBrand}</span>
            <h3>${name}</h3>
            <p class="product-description">${description}</p>
            ${features}
            ${compatibility}
            <p class="product-store-note">${orderNote}</p>
            <div class="product-actions">
                <button class="product-cta" type="button" data-add-to-cart="${escapeHtml(product.id)}">Agregar al carrito <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i></button>
                <button class="product-add" type="button" data-open-gallery="${escapeHtml(product.id)}" aria-label="Ver ${galleryCount} fotos de ${name}"><i class="fa-regular fa-images" aria-hidden="true"></i><span>${galleryCount}</span></button>
            </div>
        </div>
    </article>`;
}

function renderProducts() {
    if (!productGrid) return;
    const products = PRODUCTS_DATA.filter(matchesProduct);

    if (filterStatus) {
        filterStatus.textContent = products.length
            ? `${products.length} ${products.length === 1 ? "referencia en esta selección" : "referencias en esta selección"}`
            : "No encontramos coincidencias. Escríbenos y te ayudamos a identificar una opción para tu scooter.";
    }

    if (products.length === 0) {
        productGrid.innerHTML = `<div class="product-empty">
            <i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i>
            <h3>No encontramos productos con esos filtros</h3>
            <p>Prueba otra búsqueda o consulta con nuestro equipo comercial.</p>
            <a class="text-link" href="${getWhatsappUrl("commercial", "Hola, necesito ayuda para encontrar un scooter o repuesto.")}" target="_blank" rel="noopener noreferrer">Pedir ayuda por WhatsApp <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </div>`;
        return;
    }

    productGrid.innerHTML = products.map(renderProductCard).join("");
}

function handleWorkshopRequest(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") || "").trim();
    const model = String(values.get("model") || "").trim();
    const service = String(values.get("service") || "").trim();
    const date = String(values.get("date") || "").trim();
    const time = String(values.get("time") || "").trim();
    const notes = String(values.get("notes") || "").trim();
    const message = [
        "Hola Rolder's, quiero solicitar una cita para el taller multimarca.",
        "",
        `Cliente: ${name}`,
        `Scooter: ${model}`,
        `Servicio: ${service}`,
        `Fecha preferida: ${date || "Por coordinar"}`,
        `Horario preferido: ${time || "Por coordinar"}`,
        notes ? `Descripción: ${notes}` : "",
        "",
        "Entiendo que la fecha y la hora quedan sujetas a confirmación del equipo."
    ].filter(Boolean).join("\n");

    openWhatsapp("workshop", message);
}

function setMobileMenuOpen(isOpen) {
    if (!mobileNav || !menuButton) return;
    mobileNav.hidden = !isOpen;
    document.body.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    menuButton.innerHTML = `<i class="fa-solid ${isOpen ? "fa-xmark" : "fa-bars"}" aria-hidden="true"></i>`;
}

function selectCatalogTab(button) {
    document.querySelectorAll("[data-catalog-tab]").forEach(tab => {
        const isActive = tab === button;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-pressed", String(isActive));
    });

    if (selectBrand) selectBrand.value = "";
    if (selectCategory) selectCategory.value = button.dataset.catalogTab === "patinetes" ? "patinetes" : "";
    renderProducts();
}

function syncCatalogTabToCategory() {
    const category = selectCategory?.value || "";
    if (!category) return;
    const targetTab = category === "patinetes" ? "patinetes" : "repuestos";
    document.querySelectorAll("[data-catalog-tab]").forEach(tab => {
        const isActive = tab.dataset.catalogTab === targetTab;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-pressed", String(isActive));
    });
}

function localDateString(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function setupEventListeners() {
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            setMobileMenuOpen(false);
        }
    });

    menuButton?.addEventListener("click", () => {
        setMobileMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });
    mobileNav?.querySelectorAll("a[href^='#']").forEach(link => {
        link.addEventListener("click", () => setMobileMenuOpen(false));
    });
    document.querySelectorAll("[data-catalog-link]").forEach(link => {
        link.addEventListener("click", () => {
            const tab = document.querySelector(`[data-catalog-tab="${link.dataset.catalogLink}"]`);
            if (tab) selectCatalogTab(tab);
            setMobileMenuOpen(false);
        });
    });
    document.getElementById("cart-trigger")?.addEventListener("click", () => cartDialog.showModal());
    cartDialog?.addEventListener("click", event => {
        if (event.target === cartDialog) cartDialog.close();
    });
    galleryDialog?.addEventListener("click", event => {
        if (event.target === galleryDialog) galleryDialog.close();
    });
    document.querySelectorAll("[data-close-dialog]").forEach(button => {
        button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog)?.close());
    });
    document.getElementById("gallery-previous")?.addEventListener("click", () => moveGallery(-1));
    document.getElementById("gallery-next")?.addEventListener("click", () => moveGallery(1));
    cartSubmit?.addEventListener("click", sendCartOrder);
    document.getElementById("gallery-add")?.addEventListener("click", () => {
        if (!galleryProduct) return;
        addToCart(galleryProduct.id);
        galleryDialog.close();
    });
    document.addEventListener("click", event => {
        if (!(event.target instanceof Element)) return;
        const addButton = event.target.closest("[data-add-to-cart]");
        const galleryButton = event.target.closest("[data-open-gallery]");
        const cartAction = event.target.closest("[data-cart-action]");
        if (addButton) addToCart(addButton.dataset.addToCart);
        if (galleryButton) openProductGallery(galleryButton.dataset.openGallery);
        if (cartAction) updateCartQuantity(cartAction.dataset.productId, cartAction.dataset.cartAction);
    });
    document.addEventListener("keydown", event => {
        if (galleryDialog?.open && event.key === "ArrowRight") moveGallery(1);
        if (galleryDialog?.open && event.key === "ArrowLeft") moveGallery(-1);
    });

    filterForm?.addEventListener("submit", event => {
        event.preventDefault();
        syncCatalogTabToCategory();
        renderProducts();
        document.getElementById("scooters")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    selectBrand?.addEventListener("change", renderProducts);
    selectCategory?.addEventListener("change", () => {
        syncCatalogTabToCategory();
        renderProducts();
    });
    inputKeyword?.addEventListener("input", renderProducts);
    document.querySelectorAll("[data-catalog-tab]").forEach(tab => {
        tab.addEventListener("click", () => selectCatalogTab(tab));
    });

    document.getElementById("tech-service-form")?.addEventListener("submit", handleWorkshopRequest);
}

document.addEventListener("DOMContentLoaded", () => {
    populateWhatsappLinks();
    cartState = loadCart();
    renderProducts();
    setupEventListeners();
    setupHeroCarousel();
    updateCart();
    const dateField = document.getElementById("service-date");
    if (dateField) dateField.min = localDateString(new Date());
    const year = document.getElementById("current-year");
    if (year) year.textContent = String(new Date().getFullYear());
});
