// ==========================================
// SELLER.JS - Logic untuk Seller Dashboard
// ==========================================

let currentUser = null;
let currentUserData = null;
let myProducts = [];
let currentEditProduct = null;

// ==========================================
// INITIALIZE - Cek Auth & Load Data
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is authenticated and is a seller
        const authData = await checkAuthState('seller');
        currentUser = authData.user;
        currentUserData = authData.userData;

        // Update UI dengan nama user
        updateUserName();

        // Check if user has buyer role too
        const roles = currentUserData.roles || [currentUserData.role];
        if (roles.includes('buyer')) {
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
        } else if (currentPage.includes('my-products.html')) {
            loadMyProducts();
        } else if (currentPage.includes('add-product.html')) {
            initAddProductForm();
        } else if (currentPage.includes('profile.html')) {
            loadProfile();
        }

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

        // Load recent products (5 produk terbaru)
        await loadRecentProducts();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadStatistics() {
    try {
        // Get products dari seller ini
        const productsSnapshot = await db.collection('products')
            .where('sellerId', '==', currentUser.uid)
            .get();

        const totalProducts = productsSnapshot.size;
        let activeProducts = 0;
        let totalValue = 0;

        productsSnapshot.forEach(doc => {
            const product = doc.data();
            if (product.stock > 0) {
                activeProducts++;
            }
            totalValue += product.price * product.stock;
        });

        // Update UI
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('activeProducts').textContent = activeProducts;
        document.getElementById('totalValue').textContent = `Rp ${formatPrice(totalValue)}`;

    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadRecentProducts() {
    try {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = '<div class="loading">Memuat produk...</div>';

        // Get 6 latest products dari seller ini
        const snapshot = await db.collection('products')
            .where('sellerId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(6)
            .get();

        if (snapshot.empty) {
            productsGrid.innerHTML = '<div class="loading">Belum ada produk. <a href="add-product.html">Tambah produk pertama</a></div>';
            return;
        }

        productsGrid.innerHTML = '';

        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });

    } catch (error) {
        console.error('Error loading recent products:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="loading">Gagal memuat produk</div>';
    }
}

// ==========================================
// LOAD MY PRODUCTS PAGE
// ==========================================

async function loadMyProducts() {
    try {
        const productsGrid = document.getElementById('productsGrid');
        const productsCount = document.getElementById('productsCount');
        
        productsGrid.innerHTML = '<div class="loading">Memuat produk...</div>';

        const snapshot = await db.collection('products')
            .where('sellerId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            productsGrid.innerHTML = '<div class="loading">Belum ada produk. <a href="add-product.html">Tambah produk pertama</a></div>';
            productsCount.textContent = '0';
            return;
        }

        productsGrid.innerHTML = '';
        myProducts = [];

        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            myProducts.push(product);
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);
        });

        productsCount.textContent = myProducts.length;

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

    card.innerHTML = `
        <img src="${product.imageUrl || 'https://via.placeholder.com/250'}" 
             alt="${product.productName}" 
             class="product-image">
        <div class="product-info">
            <h3 class="product-name">${product.productName}</h3>
            <p class="product-price">Rp ${formatPrice(product.price)}</p>
            <p class="product-stock">Stok: ${product.stock}</p>
            <div class="product-actions">
                <button class="btn-edit" onclick="editProduct('${product.id}')">
                    ✏️ Edit
                </button>
                <button class="btn-delete" onclick="deleteProduct('${product.id}')">
                    🗑️ Hapus
                </button>
            </div>
        </div>
    `;

    return card;
}

// ==========================================
// SEARCH MY PRODUCTS
// ==========================================

function searchMyProducts() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.toLowerCase().trim();
    const productsGrid = document.getElementById('productsGrid');
    const productsCount = document.getElementById('productsCount');

    if (!query) {
        loadMyProducts();
        return;
    }

    const filteredProducts = myProducts.filter(product => {
        return product.productName.toLowerCase().includes(query) ||
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
                searchMyProducts();
            }
        });
    }
});

// ==========================================
// ADD PRODUCT
// ==========================================

function initAddProductForm() {
    const addProductForm = document.getElementById('addProductForm');
    
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addProduct();
        });
    }
}

async function addProduct() {
    try {
        // Get form data
        const productName = document.getElementById('productName').value.trim();
        const price = parseInt(document.getElementById('price').value);
        const stock = parseInt(document.getElementById('stock').value);
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value.trim();
        const imageFile = document.getElementById('productImage').files[0];

        // Validasi
        if (!productName || !price || !stock || !category || !description) {
            alert('Semua field harus diisi!');
            return;
        }

        if (!imageFile) {
            alert('Gambar produk harus diupload!');
            return;
        }

        if (price <= 0 || stock < 0) {
            alert('Harga dan stok harus valid!');
            return;
        }

        // Check file size (max 10MB)
        if (imageFile.size > 10 * 1024 * 1024) {
            alert('Ukuran gambar maksimal 10MB!');
            return;
        }

        // Check if file is image
        if (!imageFile.type.startsWith('image/')) {
            alert('File harus berupa gambar (JPG, PNG, dll)');
            return;
        }

        // Validate allowed formats
        const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedFormats.includes(imageFile.type)) {
            alert('Format gambar harus JPG, PNG, JPEG, atau WebP!');
            return;
        }

        // Show loading
        const submitBtn = document.querySelector('.btn-submit');
        document.getElementById('submitText').style.display = 'none';
        document.getElementById('loadingText').style.display = 'inline';
        submitBtn.disabled = true;

        try {
            // Upload image to Firebase Storage (WITH COMPRESSION!)
            console.log('Starting image upload...');
            const imageUrl = await uploadImage(imageFile);
            console.log('Image uploaded successfully:', imageUrl);

            if (!imageUrl) {
                throw new Error('Image URL is empty');
            }

            // Save product to Firestore
            console.log('Saving product to Firestore...');
            const productData = {
                sellerId: currentUser.uid,
                sellerName: currentUserData.storeName || currentUserData.name,
                productName: productName,
                description: description,
                price: price,
                stock: stock,
                category: category,
                imageUrl: imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('products').add(productData);
            console.log('Product saved successfully!');

            alert('✅ Produk berhasil ditambahkan!');
            window.location.href = 'my-products.html';

        } catch (uploadError) {
            console.error('Upload/Save Error:', uploadError);
            throw uploadError;
        }

    } catch (error) {
        console.error('Error adding product:', error);
        alert('Gagal menambahkan produk: ' + error.message);
        
        // Reset button
        document.getElementById('submitText').style.display = 'inline';
        document.getElementById('loadingText').style.display = 'none';
        document.querySelector('.btn-submit').disabled = false;
    }
}

// ==========================================
// COMPRESS IMAGE BEFORE UPLOAD
// ==========================================

function compressImage(file, maxWidth = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
        // Validate file first
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('File bukan gambar yang valid'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize if width > maxWidth
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to blob
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Gagal compress gambar'));
                                return;
                            }
                            console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
                            console.log('Compressed size:', (blob.size / 1024).toFixed(2), 'KB');
                            resolve(blob);
                        },
                        'image/jpeg',
                        quality
                    );
                } catch (error) {
                    reject(new Error('Error saat compress: ' + error.message));
                }
            };
            
            img.onerror = () => reject(new Error('Gagal load gambar'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Gagal read file'));
        reader.readAsDataURL(file);
    });
}

// ==========================================
// UPLOAD IMAGE TO CLOUDINARY
// ==========================================

async function uploadImage(file) {
    try {
        // Show progress
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressDiv) progressDiv.style.display = 'block';
        if (progressText) progressText.textContent = 'Memproses gambar: 0%';
        if (progressFill) progressFill.style.width = '0%';
        
        // Compress image first
        if (progressText) progressText.textContent = 'Mengkompress gambar...';
        const compressedBlob = await compressImage(file, 1200, 0.85);
        
        if (progressFill) progressFill.style.width = '30%';
        if (progressText) progressText.textContent = 'Mengupload ke Cloudinary: 30%';
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', compressedBlob);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', `gunadarma-shop/products/${currentUser.uid}`);
        
        // Force unique filename untuk avoid overwrite
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const uniquePublicId = `product_${timestamp}_${randomStr}`;
        formData.append('public_id', uniquePublicId);
        
        // Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
        
        const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Cloudinary error: ${errorData.error?.message || 'Upload failed'}`);
        }
        
        const data = await response.json();
        
        // Complete progress
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = 'Upload selesai: 100%';
        
        // Hide progress after 500ms
        setTimeout(() => {
            if (progressDiv) progressDiv.style.display = 'none';
        }, 500);
        
        console.log('Upload successful! Cloudinary URL:', data.secure_url);
        
        // Return secure URL
        return data.secure_url;

    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        const progressDiv = document.getElementById('uploadProgress');
        if (progressDiv) progressDiv.style.display = 'none';
        throw new Error('Gagal mengupload gambar: ' + error.message);
    }
}

// ==========================================
// EDIT PRODUCT
// ==========================================

async function editProduct(productId) {
    try {
        // Find product
        const product = myProducts.find(p => p.id === productId);
        
        if (!product) {
            alert('Produk tidak ditemukan');
            return;
        }

        currentEditProduct = product;

        // Fill form
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.productName;
        document.getElementById('editPrice').value = product.price;
        document.getElementById('editStock').value = product.stock;
        document.getElementById('editCategory').value = product.category || '';
        document.getElementById('editDescription').value = product.description;

        // Show modal
        const modal = document.getElementById('editModal');
        modal.classList.add('show');

        // Handle form submit
        const editForm = document.getElementById('editForm');
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            await updateProduct();
        };

    } catch (error) {
        console.error('Error editing product:', error);
        alert('Gagal membuka form edit');
    }
}

async function updateProduct() {
    try {
        const productId = document.getElementById('editProductId').value;
        const productName = document.getElementById('editProductName').value.trim();
        const price = parseInt(document.getElementById('editPrice').value);
        const stock = parseInt(document.getElementById('editStock').value);
        const category = document.getElementById('editCategory').value;
        const description = document.getElementById('editDescription').value.trim();

        // Validasi
        if (!productName || !price || !stock || !category || !description) {
            alert('Semua field harus diisi!');
            return;
        }

        if (price <= 0 || stock < 0) {
            alert('Harga dan stok harus valid!');
            return;
        }

        // Update Firestore
        await db.collection('products').doc(productId).update({
            productName: productName,
            price: price,
            stock: stock,
            category: category,
            description: description
        });

        alert('✅ Produk berhasil diupdate!');
        closeEditModal();
        loadMyProducts();

    } catch (error) {
        console.error('Error updating product:', error);
        alert('Gagal mengupdate produk');
    }
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('show');
    currentEditProduct = null;
}

// ==========================================
// DELETE PRODUCT
// ==========================================

async function deleteProduct(productId) {
    if (!confirm('Yakin ingin menghapus produk ini?')) {
        return;
    }

    try {
        // Find product
        const product = myProducts.find(p => p.id === productId);
        
        if (!product) {
            alert('Produk tidak ditemukan');
            return;
        }

        // Delete from Firestore
        await db.collection('products').doc(productId).delete();

        // Note: Untuk delete image dari Cloudinary, butuh backend/admin SDK
        // Karena kita pakai unsigned upload, image akan tetap di Cloudinary
        // Tapi ga masalah karena Cloudinary gratis 25GB
        // Kalau mau cleanup, bisa manual dari Cloudinary Dashboard

        alert('✅ Produk berhasil dihapus!');
        loadMyProducts();

    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Gagal menghapus produk');
    }
}

// ==========================================
// LOAD PROFILE
// ==========================================

async function loadProfile() {
    try {
        // Fill form with user data
        document.getElementById('profileStoreName').textContent = currentUserData.storeName || currentUserData.name;
        document.getElementById('name').value = currentUserData.name;
        document.getElementById('email').value = currentUserData.email;
        document.getElementById('phone').value = currentUserData.phone;
        document.getElementById('storeName').value = currentUserData.storeName || '';
        document.getElementById('storeDescription').value = currentUserData.storeDescription || '';

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
        const storeName = document.getElementById('storeName').value.trim();
        const storeDescription = document.getElementById('storeDescription').value.trim();

        // Validate
        if (!name || !phone || !storeName) {
            alert('Nama, No. WhatsApp, dan Nama Toko harus diisi!');
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
            storeName: storeName,
            storeDescription: storeDescription
        });

        // Update products dengan sellerName baru
        const productsSnapshot = await db.collection('products')
            .where('sellerId', '==', currentUser.uid)
            .get();

        const batch = db.batch();
        productsSnapshot.forEach(doc => {
            batch.update(doc.ref, { sellerName: storeName });
        });
        await batch.commit();

        // Update local data
        currentUserData.name = name;
        currentUserData.phone = finalPhone;
        currentUserData.storeName = storeName;
        currentUserData.storeDescription = storeDescription;

        updateUserName();
        document.getElementById('profileStoreName').textContent = storeName;
        
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

// Switch to Buyer Dashboard
function switchToBuyer() {
    if (confirm('Beralih ke mode Buyer?')) {
        window.location.href = '../buyer/dashboard.html';
    }
}

// Upgrade to Buyer
async function upgradeToBuyer() {
    if (!confirm('Upgrade akun untuk menjadi Buyer juga?\n\nAnda akan bisa berbelanja produk.')) {
        return;
    }

    try {
        const roles = currentUserData.roles || [currentUserData.role];
        
        if (roles.includes('buyer')) {
            alert('Anda sudah terdaftar sebagai Buyer!');
            return;
        }

        // Tambah role buyer
        roles.push('buyer');

        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            roles: roles,
            address: ''
        });

        alert('✅ Akun berhasil diupgrade!\n\nAnda sekarang bisa beralih ke mode Buyer.');
        location.reload();

    } catch (error) {
        console.error('Error upgrading account:', error);
        alert('Gagal upgrade akun');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target == modal) {
        closeEditModal();
    }
}