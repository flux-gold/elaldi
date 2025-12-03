/**
 * ELALDI - Kimlik Doğrulama Sistemi
 * Kullanıcı Giriş, Kayıt ve Oturum Yönetimi
 * Version: 1.0.0
 */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.init();
    }

    init() {
        this.loadUserFromStorage();
        this.setupEventListeners();
        this.updateUI();
        
        // CSRF Token oluştur
        this.generateCSRFToken();
        
        // Oturum timeout kontrolü
        this.startSessionTimer();
    }

    // ===== STORAGE MANAGEMENT =====
    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('elaldi_user');
            const tokenData = localStorage.getItem('elaldi_token');
            const sessionData = sessionStorage.getItem('elaldi_session');
            
            if (userData && tokenData) {
                this.currentUser = JSON.parse(userData);
                this.token = tokenData;
                
                // Session doğrulama
                if (sessionData && this.validateSession(JSON.parse(sessionData))) {
                    console.log('Kullanıcı oturumu yüklendi:', this.currentUser.email);
                } else {
                    this.logout();
                    console.log('Oturum süresi doldu, çıkış yapılıyor.');
                }
            }
        } catch (error) {
            console.error('Kullanıcı verisi yüklenirken hata:', error);
            this.clearStorage();
        }
    }

    saveUserToStorage(user, token) {
        try {
            localStorage.setItem('elaldi_user', JSON.stringify(user));
            localStorage.setItem('elaldi_token', token);
            
            // Session bilgisi
            const session = {
                userId: user.id,
                loginTime: new Date().toISOString(),
                expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 saat
                userAgent: navigator.userAgent,
                ip: 'detected' // Gerçek uygulamada IP alınacak
            };
            
            sessionStorage.setItem('elaldi_session', JSON.stringify(session));
            
            this.currentUser = user;
            this.token = token;
            
            console.log('Kullanıcı bilgileri kaydedildi:', user.email);
        } catch (error) {
            console.error('Kullanıcı verisi kaydedilirken hata:', error);
        }
    }

    clearStorage() {
        localStorage.removeItem('elaldi_user');
        localStorage.removeItem('elaldi_token');
        localStorage.removeItem('elaldi_cart');
        localStorage.removeItem('elaldi_favorites');
        sessionStorage.removeItem('elaldi_session');
        
        this.currentUser = null;
        this.token = null;
        
        console.log('Kullanıcı verileri temizlendi.');
    }

    // ===== SESSION MANAGEMENT =====
    validateSession(sessionData) {
        if (!sessionData) return false;
        
        const now = new Date();
        const expiryTime = new Date(sessionData.expiryTime);
        
        // Süre kontrolü
        if (now > expiryTime) {
            return false;
        }
        
        // User agent kontrolü (güvenlik için)
        if (sessionData.userAgent !== navigator.userAgent) {
            console.warn('User agent değişikliği tespit edildi.');
            return false;
        }
        
        return true;
    }

    startSessionTimer() {
        // Her dakika session kontrolü
        setInterval(() => {
            if (this.isLoggedIn()) {
                const sessionData = JSON.parse(sessionStorage.getItem('elaldi_session') || '{}');
                if (!this.validateSession(sessionData)) {
                    this.logout();
                    this.showNotification('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', 'warning');
                }
            }
        }, 60000); // 1 dakika
    }

    extendSession() {
        if (this.isLoggedIn()) {
            const sessionData = JSON.parse(sessionStorage.getItem('elaldi_session') || '{}');
            sessionData.expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            sessionStorage.setItem('elaldi_session', JSON.stringify(sessionData));
        }
    }

    // ===== USER REGISTRATION =====
    async register(userData) {
        try {
            // Validasyon
            if (!this.validateRegistrationData(userData)) {
                throw new Error('Geçersiz kayıt bilgileri.');
            }

            // Şifre güç kontrolü
            if (!this.validatePasswordStrength(userData.password)) {
                throw new Error('Şifre çok zayıf. En az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermeli.');
            }

            // Demo API çağrısı (gerçek uygulamada backend'e gidecek)
            const response = await this.mockRegisterAPI(userData);
            
            if (response.success) {
                this.saveUserToStorage(response.user, response.token);
                this.updateUI();
                this.logActivity('register', `Yeni kullanıcı kaydı: ${userData.email}`);
                
                return {
                    success: true,
                    message: 'Kayıt başarılı! Yönlendiriliyorsunuz...',
                    user: response.user
                };
            } else {
                throw new Error(response.message || 'Kayıt sırasında bir hata oluştu.');
            }
        } catch (error) {
            console.error('Kayıt hatası:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    validateRegistrationData(userData) {
        const requiredFields = ['firstName', 'lastName', 'email', 'password', 'phone', 'agreeTerms'];
        
        for (const field of requiredFields) {
            if (!userData[field]) {
                throw new Error(`Lütfen ${field} alanını doldurun.`);
            }
        }

        // Email validasyonu
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            throw new Error('Geçerli bir e-posta adresi girin.');
        }

        // Telefon validasyonu
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(userData.phone.replace(/\D/g, ''))) {
            throw new Error('Geçerli bir telefon numarası girin.');
        }

        return true;
    }

    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return password.length >= minLength && 
               hasUpperCase && 
               hasLowerCase && 
               hasNumbers && 
               hasSpecialChar;
    }

    // ===== USER LOGIN =====
    async login(email, password, rememberMe = false) {
        try {
            // Brute force koruması
            if (!this.checkLoginAttempts(email)) {
                throw new Error('Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.');
            }

            // Demo API çağrısı
            const response = await this.mockLoginAPI(email, password);
            
            if (response.success) {
                this.saveUserToStorage(response.user, response.token);
                this.updateUI();
                this.resetLoginAttempts(email);
                this.logActivity('login', `Kullanıcı girişi: ${email}`);
                
                // "Beni hatırla" seçeneği
                if (rememberMe) {
                    this.setRememberMeToken(response.token);
                }

                return {
                    success: true,
                    message: 'Giriş başarılı! Yönlendiriliyorsunuz...',
                    user: response.user
                };
            } else {
                this.recordFailedAttempt(email);
                throw new Error(response.message || 'E-posta veya şifre hatalı.');
            }
        } catch (error) {
            console.error('Giriş hatası:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    checkLoginAttempts(email) {
        const attempts = JSON.parse(localStorage.getItem('login_attempts') || '{}');
        const userAttempts = attempts[email] || { count: 0, lastAttempt: null };
        
        // 15 dakika içinde 5'ten fazla deneme kontrolü
        if (userAttempts.count >= 5) {
            const lastAttempt = new Date(userAttempts.lastAttempt);
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            
            if (lastAttempt > fifteenMinutesAgo) {
                return false;
            } else {
                // Süre doldu, sıfırla
                userAttempts.count = 0;
                attempts[email] = userAttempts;
                localStorage.setItem('login_attempts', JSON.stringify(attempts));
            }
        }
        
        return true;
    }

    recordFailedAttempt(email) {
        const attempts = JSON.parse(localStorage.getItem('login_attempts') || '{}');
        const userAttempts = attempts[email] || { count: 0, lastAttempt: null };
        
        userAttempts.count++;
        userAttempts.lastAttempt = new Date().toISOString();
        attempts[email] = userAttempts;
        
        localStorage.setItem('login_attempts', JSON.stringify(attempts));
        
        console.log(`Başarısız giriş denemesi: ${email} (${userAttempts.count}/5)`);
    }

    resetLoginAttempts(email) {
        const attempts = JSON.parse(localStorage.getItem('login_attempts') || '{}');
        delete attempts[email];
        localStorage.setItem('login_attempts', JSON.stringify(attempts));
    }

    // ===== PASSWORD MANAGEMENT =====
    async resetPassword(email) {
        try {
            // Email validasyonu
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Geçerli bir e-posta adresi girin.');
            }

            // Demo: Şifre sıfırlama token'ı oluştur
            const resetToken = this.generateResetToken(email);
            
            // Demo: Token'ı kaydet (gerçek uygulamada database'e kaydedilir)
            this.saveResetToken(email, resetToken);
            
            // Demo: E-posta gönderim simülasyonu
            await this.sendResetEmail(email, resetToken);
            
            return {
                success: true,
                message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
            };
        } catch (error) {
            console.error('Şifre sıfırlama hatası:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async confirmPasswordReset(token, newPassword) {
        try {
            // Token validasyonu
            const tokenData = this.validateResetToken(token);
            if (!tokenData) {
                throw new Error('Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.');
            }

            // Şifre güç kontrolü
            if (!this.validatePasswordStrength(newPassword)) {
                throw new Error('Şifre çok zayıf. En az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermeli.');
            }

            // Demo: Şifreyi güncelle
            await this.mockUpdatePassword(tokenData.email, newPassword);
            
            // Token'ı geçersiz kıl
            this.invalidateResetToken(token);
            
            return {
                success: true,
                message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.'
            };
        } catch (error) {
            console.error('Şifre güncelleme hatası:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    generateResetToken(email) {
        return btoa(`${email}:${Date.now()}:${Math.random().toString(36).substr(2)}`);
    }

    saveResetToken(email, token) {
        const resetTokens = JSON.parse(localStorage.getItem('reset_tokens') || '{}');
        resetTokens[token] = {
            email: email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 saat
        };
        localStorage.setItem('reset_tokens', JSON.stringify(resetTokens));
    }

    validateResetToken(token) {
        const resetTokens = JSON.parse(localStorage.getItem('reset_tokens') || '{}');
        const tokenData = resetTokens[token];
        
        if (!tokenData) return null;
        
        const now = new Date();
        const expiresAt = new Date(tokenData.expiresAt);
        
        if (now > expiresAt) {
            delete resetTokens[token];
            localStorage.setItem('reset_tokens', JSON.stringify(resetTokens));
            return null;
        }
        
        return tokenData;
    }

    invalidateResetToken(token) {
        const resetTokens = JSON.parse(localStorage.getItem('reset_tokens') || '{}');
        delete resetTokens[token];
        localStorage.setItem('reset_tokens', JSON.stringify(resetTokens));
    }

    // ===== USER PROFILE =====
    async updateProfile(userData) {
        try {
            if (!this.isLoggedIn()) {
                throw new Error('Lütfen önce giriş yapın.');
            }

            // Validasyon
            if (userData.email && !this.validateEmail(userData.email)) {
                throw new Error('Geçerli bir e-posta adresi girin.');
            }

            if (userData.phone && !this.validatePhone(userData.phone)) {
                throw new Error('Geçerli bir telefon numarası girin.');
            }

            // Demo API çağrısı
            const response = await this.mockUpdateProfileAPI(this.currentUser.id, userData);
            
            if (response.success) {
                // Kullanıcı bilgilerini güncelle
                this.currentUser = { ...this.currentUser, ...userData };
                localStorage.setItem('elaldi_user', JSON.stringify(this.currentUser));
                
                this.logActivity('profile_update', 'Profil bilgileri güncellendi');
                
                return {
                    success: true,
                    message: 'Profil bilgileriniz güncellendi.',
                    user: this.currentUser
                };
            } else {
                throw new Error(response.message || 'Profil güncelleme sırasında bir hata oluştu.');
            }
        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.isLoggedIn()) {
                throw new Error('Lütfen önce giriş yapın.');
            }

            // Mevcut şifre kontrolü
            const isValid = await this.mockVerifyPassword(this.currentUser.email, currentPassword);
            if (!isValid) {
                throw new Error('Mevcut şifreniz hatalı.');
            }

            // Yeni şifre güç kontrolü
            if (!this.validatePasswordStrength(newPassword)) {
                throw new Error('Yeni şifre çok zayıf. En az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermeli.');
            }

            // Demo: Şifreyi güncelle
            await this.mockUpdatePassword(this.currentUser.email, newPassword);
            
            this.logActivity('password_change', 'Şifre değiştirildi');
            
            return {
                success: true,
                message: 'Şifreniz başarıyla değiştirildi.'
            };
        } catch (error) {
            console.error('Şifre değiştirme hatası:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // ===== LOGOUT =====
    logout() {
        if (this.isLoggedIn()) {
            this.logActivity('logout', 'Kullanıcı çıkışı');
        }
        
        this.clearStorage();
        this.updateUI();
        
        // Ana sayfaya yönlendir
        window.location.href = '/';
    }

    // ===== UTILITY METHODS =====
    isLoggedIn() {
        return this.currentUser !== null && this.token !== null;
    }

    getUser() {
        return this.currentUser;
    }

    getToken() {
        return this.token;
    }

    hasPermission(permission) {
        if (!this.isLoggedIn()) return false;
        
        const userPermissions = this.currentUser.permissions || [];
        return userPermissions.includes(permission) || userPermissions.includes('admin');
    }

    generateCSRFToken() {
        if (!localStorage.getItem('csrf_token')) {
            const token = this.generateRandomToken(32);
            localStorage.setItem('csrf_token', token);
        }
        return localStorage.getItem('csrf_token');
    }

    validateCSRFToken(token) {
        const storedToken = localStorage.getItem('csrf_token');
        return token === storedToken;
    }

    setRememberMeToken(token) {
        const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 gün
        document.cookie = `remember_token=${token}; expires=${expiryDate.toUTCString()}; path=/; Secure; SameSite=Strict`;
    }

    getRememberMeToken() {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'remember_token') {
                return value;
            }
        }
        return null;
    }

    clearRememberMeToken() {
        document.cookie = 'remember_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    // ===== MOCK API METHODS =====
    async mockRegisterAPI(userData) {
        // Demo amaçlı gecikme
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Demo: Email kontrolü
        const existingUsers = JSON.parse(localStorage.getItem('demo_users') || '{}');
        if (existingUsers[userData.email]) {
            return {
                success: false,
                message: 'Bu e-posta adresi zaten kayıtlı.'
            };
        }
        
        // Yeni kullanıcı oluştur
        const newUser = {
            id: this.generateRandomToken(16),
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            createdAt: new Date().toISOString(),
            plan: 'free',
            permissions: ['user'],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstName + ' ' + userData.lastName)}&background=4361ee&color=fff`
        };
        
        // Demo: Kullanıcıyı kaydet
        existingUsers[userData.email] = {
            ...newUser,
            password: btoa(userData.password) // Gerçek uygulamada hash'lenmiş olmalı
        };
        localStorage.setItem('demo_users', JSON.stringify(existingUsers));
        
        // Token oluştur
        const token = this.generateRandomToken(64);
        
        return {
            success: true,
            user: newUser,
            token: token
        };
    }

    async mockLoginAPI(email, password) {
        // Demo amaçlı gecikme
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Demo: Kullanıcı kontrolü
        const existingUsers = JSON.parse(localStorage.getItem('demo_users') || '{}');
        const userData = existingUsers[email];
        
        if (!userData || btoa(password) !== userData.password) {
            return {
                success: false,
                message: 'E-posta veya şifre hatalı.'
            };
        }
        
        // Kullanıcı bilgilerini hazırla (şifreyi çıkar)
        const { password: _, ...user } = userData;
        
        // Token oluştur
        const token = this.generateRandomToken(64);
        
        return {
            success: true,
            user: user,
            token: token
        };
    }

    async mockUpdateProfileAPI(userId, userData) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Demo: Kullanıcıyı güncelle
        const existingUsers = JSON.parse(localStorage.getItem('demo_users') || '{}');
        const userEmail = Object.keys(existingUsers).find(email => existingUsers[email].id === userId);
        
        if (userEmail) {
            existingUsers[userEmail] = { ...existingUsers[userEmail], ...userData };
            localStorage.setItem('demo_users', JSON.stringify(existingUsers));
        }
        
        return { success: true };
    }

    async mockVerifyPassword(email, password) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const existingUsers = JSON.parse(localStorage.getItem('demo_users') || '{}');
        const userData = existingUsers[email];
        
        return userData && btoa(password) === userData.password;
    }

    async mockUpdatePassword(email, newPassword) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const existingUsers = JSON.parse(localStorage.getItem('demo_users') || '{}');
        if (existingUsers[email]) {
            existingUsers[email].password = btoa(newPassword);
            localStorage.setItem('demo_users', JSON.stringify(existingUsers));
        }
        
        return { success: true };
    }

    async sendResetEmail(email, token) {
        // Demo: E-posta gönderim simülasyonu
        console.log(`Şifre sıfırlama e-postası gönderiliyor: ${email}`);
        console.log(`Token: ${token}`);
        
        // Gerçek uygulamada burada e-posta API'si çağrılır
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Demo: Reset link'ini localStorage'a kaydet (test için)
        localStorage.setItem('last_reset_link', `${window.location.origin}/reset-password.html?token=${encodeURIComponent(token)}`);
        
        return { success: true };
    }

    // ===== UI MANAGEMENT =====
    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (this.isLoggedIn()) {
            // Giriş yapmış kullanıcı için UI
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }
            
            if (userMenu) {
                userMenu.style.display = 'flex';
            }
            
            if (userAvatar) {
                userAvatar.src = this.currentUser.avatar || 'images/avatars/default.jpg';
                userAvatar.alt = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
            
            if (userName) {
                userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        } else {
            // Giriş yapmamış kullanıcı için UI
            if (loginBtn) {
                loginBtn.style.display = 'inline-flex';
                loginBtn.textContent = 'Giriş Yap';
            }
            
            if (userMenu) {
                userMenu.style.display = 'none';
            }
        }
    }

    setupEventListeners() {
        // Sayfa yüklendiğinde UI'ı güncelle
        document.addEventListener('DOMContentLoaded', () => {
            this.updateUI();
        });
        
        // Form submit event'lerini dinle
        document.addEventListener('submit', (e) => {
            const form = e.target;
            
            if (form.id === 'login-form') {
                e.preventDefault();
                this.handleLoginForm(form);
            }
            
            if (form.id === 'register-form') {
                e.preventDefault();
                this.handleRegisterForm(form);
            }
            
            if (form.id === 'reset-password-form') {
                e.preventDefault();
                this.handleResetPasswordForm(form);
            }
            
            if (form.id === 'profile-form') {
                e.preventDefault();
                this.handleProfileForm(form);
            }
        });
        
        // Logout butonlarını dinle
        document.addEventListener('click', (e) => {
            if (e.target.matches('.logout-btn, [data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    async handleLoginForm(form) {
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        const rememberMe = form.querySelector('#remember-me')?.checked || false;
        
        // Butonu loading durumuna getir
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...';
        submitBtn.disabled = true;
        
        const result = await this.login(email, password, rememberMe);
        
        // Butonu eski haline getir
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    async handleRegisterForm(form) {
        const formData = {
            firstName: form.querySelector('#first-name').value,
            lastName: form.querySelector('#last-name').value,
            email: form.querySelector('#email').value,
            phone: form.querySelector('#phone').value,
            password: form.querySelector('#password').value,
            confirmPassword: form.querySelector('#confirm-password').value,
            agreeTerms: form.querySelector('#agree-terms').checked
        };
        
        // Şifre kontrolü
        if (formData.password !== formData.confirmPassword) {
            this.showNotification('Şifreler eşleşmiyor.', 'error');
            return;
        }
        
        // Butonu loading durumuna getir
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kayıt Yapılıyor...';
        submitBtn.disabled = true;
        
        const result = await this.register(formData);
        
        // Butonu eski haline getir
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    async handleResetPasswordForm(form) {
        const email = form.querySelector('#email').value;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
        submitBtn.disabled = true;
        
        const result = await this.resetPassword(email);
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            form.reset();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    async handleProfileForm(form) {
        const formData = {
            firstName: form.querySelector('#first-name').value,
            lastName: form.querySelector('#last-name').value,
            email: form.querySelector('#email').value,
            phone: form.querySelector('#phone').value,
            company: form.querySelector('#company')?.value || '',
            position: form.querySelector('#position')?.value || ''
        };
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';
        submitBtn.disabled = true;
        
        const result = await this.updateProfile(formData);
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            this.showNotification(result.message, 'success');
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    // ===== HELPER METHODS =====
    generateRandomToken(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePhone(phone) {
        const re = /^[0-9]{10,11}$/;
        return re.test(phone.replace(/\D/g, ''));
    }

    showNotification(message, type = 'info') {
        // Main.js'deki notification sistemini kullan
        if (window.ElaldiApp && window.ElaldiApp.showNotification) {
            window.ElaldiApp.showNotification(message, type);
        } else {
            // Fallback notification
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    logActivity(action, details) {
        const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
        
        activities.push({
            userId: this.currentUser?.id || 'guest',
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            ip: 'detected', // Gerçek uygulamada IP alınacak
            userAgent: navigator.userAgent
        });
        
        // Son 100 aktiviteyi tut
        if (activities.length > 100) {
            activities.shift();
        }
        
        localStorage.setItem('user_activities', JSON.stringify(activities));
    }

    getActivities(limit = 10) {
        const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
        return activities.slice(-limit).reverse();
    }
}

// Global auth instance oluştur
let authInstance = null;

function getAuth() {
    if (!authInstance) {
        authInstance = new AuthSystem();
    }
    return authInstance;
}

// Global olarak erişilebilir yap
window.ElaldiAuth = getAuth();

// Demo kullanıcıları başlat
function initializeDemoUsers() {
    if (!localStorage.getItem('demo_users')) {
        const demoUsers = {
            'demo@elaldi.com': {
                id: 'demo_user_001',
                firstName: 'Demo',
                lastName: 'Kullanıcı',
                email: 'demo@elaldi.com',
                phone: '5551234567',
                password: btoa('Demo123!'), // Şifre: Demo123!
                createdAt: new Date().toISOString(),
                plan: 'professional',
                permissions: ['user', 'premium'],
                avatar: 'https://ui-avatars.com/api/?name=Demo+Kullanıcı&background=4361ee&color=fff'
            },
            'admin@elaldi.com': {
                id: 'admin_user_001',
                firstName: 'Hüseyin',
                lastName: 'Elaldi',
                email: 'admin@elaldi.com',
                phone: '5421239770',
                password: btoa('Admin123!'), // Şifre: Admin123!
                createdAt: new Date().toISOString(),
                plan: 'business',
                permissions: ['user', 'admin'],
                avatar: 'https://ui-avatars.com/api/?name=Hüseyin+Elaldi&background=f72585&color=fff'
            }
        };
        
        localStorage.setItem('demo_users', JSON.stringify(demoUsers));
        console.log('Demo kullanıcılar oluşturuldu.');
    }
}

// Sayfa yüklendiğinde demo kullanıcıları başlat
document.addEventListener('DOMContentLoaded', () => {
    initializeDemoUsers();
    
    // Auth sistemini başlat
    getAuth();
    
    // Login modalını yönet
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    
    if (loginModal) {
        const loginTab = loginModal.querySelector('[data-tab="login"]');
        const registerTab = loginModal.querySelector('[data-tab="register"]');
        
        if (loginTab && registerTab) {
            loginTab.addEventListener('click', () => {
                loginModal.querySelector('.tab-content.active')?.classList.remove('active');
                loginModal.querySelector('#login-tab-content')?.classList.add('active');
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
            });
            
            registerTab.addEventListener('click', () => {
                loginModal.querySelector('.tab-content.active')?.classList.remove('active');
                loginModal.querySelector('#register-tab-content')?.classList.add('active');
                registerTab.classList.add('active');
                loginTab.classList.remove('active');
            });
        }
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthSystem, getAuth };
}