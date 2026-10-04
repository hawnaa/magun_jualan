// ==========================================
// BUYER.JS - Logic untuk Buyer Dashboard
// ==========================================

let currentUser = null;
let currentUserData = null;
let allProducts = [];
let cartItems = [];
let currentProductModal = null;

// ==========================================
// HELPER FUNCTION: Format Nomor HP
// ==========================================

function formatPhoneForWhatsApp(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 08, replace with 62
    if (cleaned.startsWith('08')) {
        cleaned = '62' + cleaned.substring(1);
    }
    
    // If starts with 8 (without 0), add 62
    if (cleaned.startsWith('8') && !cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    
    // If doesn't start with 62, add it
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    
    return cleaned;
}

// ==========================================
// INITIALIZE - Cek Auth & Load Data
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is authenticated and is a buyer
        const authData = await checkAuthState('buyer');
        currentUser = authData.user;
        currentUserData = authData.userData;

        // Update UI dengan nama user
        updateUserName();

        // Check if user has seller role too
        const roles = currentUserData.roles || [currentUserData.role];
        if (roles.includes('seller')) {
            // Show switch role button
            const switchBtn = document.getElementById('switchRoleBtn');
            if (switchBtn) {
                switchBtn.style.display = 'flex';
            }
        }

        // Load data berdasarkan halaman
        const currentPage = window.location.pathname;

        if (currentPage.includes('dashboard.html')) {
            loadDashboard();
        } else if (currentPage.includes('products.html')) {
            loadProducts();
        } else if (currentPage.includes('cart.html')) {
            loadCart();
        } else if (currentPage.includes('profile.html')) {
            loadProfile();
        }

        // Load cart badge di semua halaman
        updateCartBadge();

    } catch (error) {
        console.error('Error initializing:', error);
    }
});

// ==========================================
// UPDATE USER NAME
// ==========================================

function updateUserName() {
    const userNameElements = document.querySelectorAll('#userName');
    const userNameWelcome = document.getElementById('userNameWelcome');

    userNameElements.forEach(el => {
        el.textContent = currentUserData.name;
    });

    if (userNameWelcome) {
        userNameWelcome.textContent = currentUserData.name;
    }
}

// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {
    try {
        // Load statistics
        await loadStatistics();

        // Load featured products (5 produk terbaru)
        await loadFeaturedProducts();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadStatistics() {
    try {
        // Count total products
        const productsSnapshot = await db.collection('products').get();
        const totalProducts = productsSnapshot.size;

        // Count total sellers (unique sellers)
        const sellers = new Set();
        productsSnapshot.forEach(doc => {
            sellers.add(doc.data().sellerId);
        });

        // Count cart items
        const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
        const cartItemsCount = cartDoc.exists ? (cartDoc.data().items || []).length : 0;

        // Update UI
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalSellers').textContent = sellers.size;
        document.getElementById('cartItems').textContent = cartItemsCount;

    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadFeaturedProducts() {
    try {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = '<div class="loading">Memuat produk...</div>';

        // Get 6 latest products
        const snapshot = await db.collection('products')
            .orderBy('createdAt', 'desc')
            .limit(6)
            .get();

        if (snapshot.empty) {
            productsGrid.innerHTML = '<div class="loading">Belum ada produk tersedia</div>';
            return;
        }

        productsGrid.innerHTML = '';
        allProducts = []; // Initialize array

        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            allProducts.push(product);
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });

        console.log('Loaded products:', allProducts.length);

    } catch (error) {
        console.error('Error loading featured products:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="loading">Gagal memuat produk. Error: ' + error.message + '</div>';
    }
}

// ==========================================
// LOAD PRODUCTS PAGE
// ==========================================

async function loadProducts() {
    try {
        const productsGrid = document.getElementById('productsGrid');
        const productsCount = document.getElementById('productsCount');
        
        productsGrid.innerHTML = '<div class="loading">Memuat produk...</div>';

        const snapshot = await db.collection('products')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            productsGrid.innerHTML = '<div class="loading">Belum ada produk tersedia</div>';
            productsCount.textContent = '0';
            return;
        }

        productsGrid.innerHTML = '';
        allProducts = [];

        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            allProducts.push(product);
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });

        productsCount.textContent = allProducts.length;

    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="loading">Gagal memuat produk</div>';
    }
}

// ==========================================
// CREATE PRODUCT CARD
// ==========================================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => showProductDetail(product);

    // Handle missing image
    const imageUrl = product.imageUrl || 'https://via.placeholder.com/250x250/B19CD9/FFFFFF?text=No+Image';

    card.innerHTML = `
        <img src="${imageUrl}" 
             alt="${product.productName}" 
             class="product-image"
             onerror="this.src='https://via.placeholder.com/250x250/B19CD9/FFFFFF?text=No+Image'">
        <div class="product-info">
            <h3 class="product-name">${product.productName}</h3>
            <p class="product-seller">📍 ${product.sellerName || 'Seller'}</p>
            <p class="product-price">Rp ${formatPrice(product.price)}</p>
            <p class="product-stock">Stok: ${product.stock}</p>
            <div class="product-actions">
                <button class="btn-add-to-cart" onclick="event.stopPropagation(); addToCart('${product.id}')">
                    🛒 Tambah
                </button>
                <button class="btn-view-detail" onclick="event.stopPropagation(); showProductDetail('${product.id}')">
                    👁️ Detail
                </button>
            </div>
        </div>
    `;

    return card;
}

// ==========================================
// SHOW PRODUCT DETAIL MODAL
// ==========================================

function showProductDetail(productId) {
    // Find product
    let product;
    if (typeof productId === 'object') {
        product = productId;
    } else {
        product = allProducts.find(p => p.id === productId);
    }

    if (!product) {
        alert('Produk tidak ditemukan');
        return;
    }

    currentProductModal = product;

    // Update modal content
    document.getElementById('modalImage').src = product.imageUrl || 'https://via.placeholder.com/400';
    document.getElementById('modalTitle').textContent = product.productName;
    document.getElementById('modalSeller').textContent = product.sellerName;
    document.getElementById('modalPrice').textContent = `Rp ${formatPrice(product.price)}`;
    document.getElementById('modalStock').textContent = product.stock;
    document.getElementById('modalCategory').textContent = product.category || 'Umum';
    document.getElementById('modalDescription').textContent = product.description || 'Tidak ada deskripsi';

    // Show modal
    const modal = document.getElementById('productModal');
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('show');
    currentProductModal = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target == modal) {
        closeModal();
    }
}

function addToCartFromModal() {
    if (currentProductModal) {
        addToCart(currentProductModal.id);
    }
}

async function contactSeller() {
    if (!currentProductModal) return;

    try {
        // Get seller data
        const sellerDoc = await db.collection('users').doc(currentProductModal.sellerId).get();
        
        if (!sellerDoc.exists) {
            alert('Data seller tidak ditemukan');
            return;
        }

        const sellerData = sellerDoc.data();
        const sellerPhone = formatPhoneForWhatsApp(sellerData.phone);

        // Format WhatsApp message
        const message = `Halo ${sellerData.name}, saya tertarik dengan produk:\n\n` +
                       `*${currentProductModal.productName}*\n` +
                       `Harga: Rp ${formatPrice(currentProductModal.price)}\n\n` +
                       `Apakah produk masih tersedia?`;

        const whatsappUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

    } catch (error) {
        console.error('Error contacting seller:', error);
        alert('Gagal menghubungi seller');
    }
}

// ==========================================
// SEARCH PRODUCTS
// ==========================================

function searchProducts() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.toLowerCase().trim();
    const productsGrid = document.getElementById('productsGrid');
    const productsCount = document.getElementById('productsCount');

    if (!query) {
        loadProducts();
        return;
    }

    const filteredProducts = allProducts.filter(product => {
        return product.productName.toLowerCase().includes(query) ||
               product.sellerName.toLowerCase().includes(query) ||
               (product.category && product.category.toLowerCase().includes(query));
    });

    productsGrid.innerHTML = '';

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<div class="loading">Tidak ada produk yang cocok</div>';
        productsCount.textContent = '0';
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });

    productsCount.textContent = filteredProducts.length;
}

// Add enter key support for search
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
    }
});

// ==========================================
// ADD TO CART
// ==========================================

async function addToCart(productId) {
    try {
        // Find product
        const productDoc = await db.collection('products').doc(productId).get();
        
        if (!productDoc.exists) {
            alert('Produk tidak ditemukan');
            return;
        }

        const product = { id: productDoc.id, ...productDoc.data() };

        // Check stock
        if (product.stock <= 0) {
            alert('Stok produk habis');
            return;
        }

        const cartRef = db.collection('carts').doc(currentUser.uid);
        const cartDoc = await cartRef.get();

        let items = [];

        if (cartDoc.exists) {
            items = cartDoc.data().items || [];
        }

        // Check if product already in cart
        const existingItemIndex = items.findIndex(item => item.productId === productId);

        if (existingItemIndex !== -1) {
            // Update quantity
            items[existingItemIndex].quantity += 1;
        } else {
            // Add new item
            items.push({
                productId: product.id,
                productName: product.productName,
                price: product.price,
                quantity: 1,
                sellerId: product.sellerId,
                sellerName: product.sellerName,
                imageUrl: product.imageUrl || 'https://via.placeholder.com/100'
            });
        }

        // Save to Firestore
        await cartRef.set({ items: items });

        alert('✅ Produk berhasil ditambahkan ke keranjang!');
        updateCartBadge();

    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Gagal menambahkan produk ke keranjang');
    }
}

// ==========================================
// UPDATE CART BADGE
// ==========================================

async function updateCartBadge() {
    try {
        const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
        const itemsCount = cartDoc.exists ? (cartDoc.data().items || []).length : 0;

        const badges = document.querySelectorAll('#cartBadge');
        badges.forEach(badge => {
            badge.textContent = itemsCount;
        });

    } catch (error) {
        console.error('Error updating cart badge:', error);
    }
}

// ==========================================
// LOAD CART PAGE
// ==========================================

async function loadCart() {
    try {
        const cartItemsDiv = document.getElementById('cartItems');
        cartItemsDiv.innerHTML = '<div class="loading">Memuat keranjang...</div>';

        const cartDoc = await db.collection('carts').doc(currentUser.uid).get();

        if (!cartDoc.exists || !cartDoc.data().items || cartDoc.data().items.length === 0) {
            cartItemsDiv.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <h3>Keranjang Kosong</h3>
                    <p>Belum ada produk di keranjang</p>
                    <a href="products.html" class="btn-add-to-cart" style="display: inline-block; margin-top: 1rem; text-decoration: none;">
                        Mulai Belanja
                    </a>
                </div>
            `;
            updateCartSummary([]);
            return;
        }

        cartItems = cartDoc.data().items;
        displayCartItems(cartItems);
        updateCartSummary(cartItems);

    } catch (error) {
        console.error('Error loading cart:', error);
        document.getElementById('cartItems').innerHTML = 
            '<div class="loading">Gagal memuat keranjang</div>';
    }
}

function displayCartItems(items) {
    const cartItemsDiv = document.getElementById('cartItems');
    cartItemsDiv.innerHTML = '';

    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.productName}" class="cart-item-image">
            <div class="cart-item-info">
                <h3 class="cart-item-name">${item.productName}</h3>
                <p class="cart-item-seller">📍 ${item.sellerName}</p>
                <p class="cart-item-price">Rp ${formatPrice(item.price)}</p>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
            </div>
            <button class="btn-remove" onclick="removeFromCart(${index})">🗑️ Hapus</button>
        `;
        cartItemsDiv.appendChild(itemDiv);
    });
}

function updateCartSummary(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalPrice').textContent = `Rp ${formatPrice(totalPrice)}`;
}

// ==========================================
// UPDATE QUANTITY
// ==========================================

async function updateQuantity(index, change) {
    try {
        cartItems[index].quantity += change;

        if (cartItems[index].quantity <= 0) {
            removeFromCart(index);
            return;
        }

        await db.collection('carts').doc(currentUser.uid).set({ items: cartItems });
        displayCartItems(cartItems);
        updateCartSummary(cartItems);
        updateCartBadge();

    } catch (error) {
        console.error('Error updating quantity:', error);
        alert('Gagal mengupdate jumlah');
    }
}

// ==========================================
// REMOVE FROM CART
// ==========================================

async function removeFromCart(index) {
    if (!confirm('Hapus produk dari keranjang?')) return;

    try {
        cartItems.splice(index, 1);
        await db.collection('carts').doc(currentUser.uid).set({ items: cartItems });
        
        if (cartItems.length === 0) {
            loadCart();
        } else {
            displayCartItems(cartItems);
            updateCartSummary(cartItems);
        }
        
        updateCartBadge();
        alert('✅ Produk dihapus dari keranjang');

    } catch (error) {
        console.error('Error removing from cart:', error);
        alert('Gagal menghapus produk');
    }
}

// ==========================================
// CHECKOUT (via WhatsApp)
// ==========================================

async function checkout() {
    if (cartItems.length === 0) {
        alert('Keranjang kosong!');
        return;
    }

    try {
        // Group items by seller
        const itemsBySeller = {};
        
        cartItems.forEach(item => {
            if (!itemsBySeller[item.sellerId]) {
                itemsBySeller[item.sellerId] = {
                    sellerName: item.sellerName,
                    items: []
                };
            }
            itemsBySeller[item.sellerId].items.push(item);
        });

        // Send message to each seller
        for (const sellerId in itemsBySeller) {
            const sellerData = itemsBySeller[sellerId];
            
            // Get seller phone
            const sellerDoc = await db.collection('users').doc(sellerId).get();
            if (!sellerDoc.exists) continue;
            
            const sellerPhone = formatPhoneForWhatsApp(sellerDoc.data().phone);

            // Calculate total for this seller
            let total = 0;
            let itemsList = '';
            
            sellerData.items.forEach(item => {
                const subtotal = item.price * item.quantity;
                total += subtotal;
                itemsList += `• ${item.productName}\n  ${item.quantity}x Rp ${formatPrice(item.price)} = Rp ${formatPrice(subtotal)}\n\n`;
            });

            // Format WhatsApp message
            const message = `Halo ${sellerData.sellerName},\n\n` +
                           `Saya *${currentUserData.name}* ingin membeli:\n\n` +
                           itemsList +
                           `*Total: Rp ${formatPrice(total)}*\n\n` +
                           `Alamat Pengiriman:\n${currentUserData.address}\n\n` +
                           `Terima kasih!`;

            const whatsappUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }

        alert('✅ Anda akan dihubungkan dengan seller via WhatsApp!');

    } catch (error) {
        console.error('Error checkout:', error);
        alert('Gagal melakukan checkout');
    }
}

// ==========================================
// LOAD PROFILE
// ==========================================

async function loadProfile() {
    try {
        // Fill form with user data
        document.getElementById('profileName').textContent = currentUserData.name;
        document.getElementById('name').value = currentUserData.name;
        document.getElementById('email').value = currentUserData.email;
        document.getElementById('phone').value = currentUserData.phone;
        document.getElementById('address').value = currentUserData.address || '';

        // Handle form submit
        const profileForm = document.getElementById('profileForm');
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProfile();
        });

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile() {
    try {
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address').value.trim();

        // Validate
        if (!name || !phone || !address) {
            alert('Semua field harus diisi!');
            return;
        }

        // Format phone number
        const formattedPhone = phone.replace(/\D/g, '');
        let finalPhone = formattedPhone;
        if (formattedPhone.startsWith('08')) {
            finalPhone = '62' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('62')) {
            finalPhone = '62' + formattedPhone;
        }

        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            name: name,
            phone: finalPhone,
            address: address
        });

        // Update local data
        currentUserData.name = name;
        currentUserData.phone = finalPhone;
        currentUserData.address = address;

        updateUserName();
        alert('✅ Profil berhasil diupdate!');

    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Gagal mengupdate profil');
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Switch to Seller Dashboard
function switchToSeller() {
    if (confirm('Beralih ke mode Seller?')) {
        window.location.href = '../seller/dashboard.html';
    }
}

// Upgrade to Seller
async function upgradeToSeller() {
    if (!confirm('Upgrade akun untuk menjadi Seller juga?\n\nAnda akan bisa menjual produk.')) {
        return;
    }

    try {
        const roles = currentUserData.roles || [currentUserData.role];
        
        if (roles.includes('seller')) {
            alert('Anda sudah terdaftar sebagai Seller!');
            return;
        }

        // Tambah role seller
        roles.push('seller');

        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            roles: roles,
            storeName: currentUserData.name + "'s Store",
            storeDescription: ''
        });

        alert('✅ Akun berhasil diupgrade!\n\nAnda sekarang bisa beralih ke mode Seller.');
        location.reload();

    } catch (error) {
        console.error('Error upgrading account:', error);
        alert('Gagal upgrade akun');
    }
}