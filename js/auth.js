// ==========================================
// AUTH.JS - Login & Register Logic
// ==========================================

// Fungsi untuk menampilkan error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
}

// ==========================================
// HELPER FUNCTION: Format Nomor HP ke WhatsApp Format
// ==========================================

function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 08, replace with 628
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
// REGISTER LOGIC
// ==========================================

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Ambil data dari form
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        // Format nomor HP ke WhatsApp format (62xxx)
        const formattedPhone = formatPhoneNumber(phone);

        // Validasi password
        if (password.length < 6) {
            showError('Password minimal 6 karakter!');
            return;
        }

        if (password !== confirmPassword) {
            showError('Password tidak cocok!');
            return;
        }

        // Validasi nomor HP
        if (!/^08\d{8,11}$/.test(phone) && !/^628\d{8,11}$/.test(phone)) {
            showError('Format nomor WhatsApp tidak valid! Contoh: 081234567890');
            return;
        }

        // Ambil data tambahan berdasarkan role
        let additionalData = {};
        
        if (role === 'seller') {
            const storeName = document.getElementById('storeName').value.trim();
            const storeDescription = document.getElementById('storeDescription').value.trim();
            
            if (!storeName) {
                showError('Nama toko harus diisi!');
                return;
            }
            
            additionalData = {
                storeName: storeName,
                storeDescription: storeDescription
            };
        } else {
            const address = document.getElementById('address').value.trim();
            
            if (!address) {
                showError('Alamat harus diisi!');
                return;
            }
            
            additionalData = {
                address: address
            };
        }

        try {
            // Loading state
            const submitBtn = registerForm.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Mendaftar...';
            submitBtn.disabled = true;

            // 1. Create user di Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. Simpan data user ke Firestore
            await db.collection('users').doc(user.uid).set({
                email: email,
                roles: [role], // Simpan sebagai array untuk support multiple roles
                name: name,
                phone: formattedPhone, // Simpan dengan format +62xxx
                ...additionalData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. Redirect berdasarkan role
            alert('Registrasi berhasil! Selamat datang di Gunadarma Shop 🎉');
            
            // Default redirect ke role pertama yang dipilih
            if (role === 'buyer') {
                window.location.href = 'buyer/dashboard.html';
            } else {
                window.location.href = 'seller/dashboard.html';
            }

        } catch (error) {
            console.error('Error:', error);
            
            // Handle error messages
            let errorMessage = 'Terjadi kesalahan saat registrasi';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email sudah terdaftar! Silakan login.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid!';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password terlalu lemah!';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showError(errorMessage);
            
            // Reset button
            const submitBtn = registerForm.querySelector('.btn-submit');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ==========================================
// LOGIN LOGIC
// ==========================================

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Ambil data dari form
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validasi
        if (!email || !password) {
            showError('Email dan password harus diisi!');
            return;
        }

        try {
            // Loading state
            const submitBtn = loginForm.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Login...';
            submitBtn.disabled = true;

            // 1. Login ke Firebase Auth
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. Ambil data user dari Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                throw new Error('Data user tidak ditemukan');
            }

            const userData = userDoc.data();
            const roles = userData.roles || [userData.role]; // Support old 'role' field

            // 3. Redirect berdasarkan role pertama (default) atau role yang diminta
            alert('Login berhasil! Selamat datang kembali 👋');
            
            // Cek apakah user punya multiple roles
            if (roles.length > 1) {
                // User punya buyer & seller, tanya mau ke mana
                const choice = confirm('Anda terdaftar sebagai Buyer dan Seller.\n\nKlik OK untuk Dashboard Seller\nKlik Cancel untuk Dashboard Buyer');
                if (choice) {
                    window.location.href = 'seller/dashboard.html';
                } else {
                    window.location.href = 'buyer/dashboard.html';
                }
            } else if (roles.includes('buyer')) {
                window.location.href = 'buyer/dashboard.html';
            } else if (roles.includes('seller')) {
                window.location.href = 'seller/dashboard.html';
            } else {
                throw new Error('Role tidak valid');
            }

        } catch (error) {
            console.error('Error:', error);
            
            // Handle error messages
            let errorMessage = 'Terjadi kesalahan saat login';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Email tidak terdaftar!';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Password salah!';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid!';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Akun telah dinonaktifkan!';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showError(errorMessage);
            
            // Reset button
            const submitBtn = loginForm.querySelector('.btn-submit');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ==========================================
// CHECK AUTH STATE (untuk halaman yang memerlukan login)
// ==========================================

function checkAuthState(requiredRole = null) {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User sudah login
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    
                    if (!userDoc.exists) {
                        throw new Error('Data user tidak ditemukan');
                    }

                    const userData = userDoc.data();
                    const roles = userData.roles || [userData.role]; // Support old 'role' field
                    
                    // Cek role jika required
                    if (requiredRole && !roles.includes(requiredRole)) {
                        // User tidak punya role yang dibutuhkan
                        // Redirect ke dashboard yang sesuai dengan role pertama mereka
                        if (roles.includes('buyer')) {
                            window.location.href = '../buyer/dashboard.html';
                        } else if (roles.includes('seller')) {
                            window.location.href = '../seller/dashboard.html';
                        }
                        return;
                    }

                    resolve({ user, userData });
                } catch (error) {
                    console.error('Error:', error);
                    reject(error);
                }
            } else {
                // User belum login, redirect ke login
                window.location.href = '../login.html';
            }
        });
    });
}

// ==========================================
// LOGOUT FUNCTION
// ==========================================

function logout() {
    if (confirm('Yakin ingin logout?')) {
        auth.signOut().then(() => {
            alert('Logout berhasil!');
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error('Error logout:', error);
            alert('Terjadi kesalahan saat logout');
        });
    }
}

// Export functions untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuthState,
        logout
    };
}