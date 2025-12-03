/**
 * ELALDI - Admin Panel Sistemi
 * Tek Admin (Hüseyin) için Tam Yönetim Paneli
 * Version: 1.0.0
 */

class AdminPanel {
    constructor() {
        this.adminUser = null;
        this.isAuthenticated = false;
        this.stats = {};
        this.init();
    }

    init() {
        this.checkAdminAuth();
        this.setupEventListeners();
        this.initCharts();
        this.loadDashboardData();
        this.setupSecurity();
    }

    // ===== ADMIN AUTHENTICATION =====
    checkAdminAuth() {
        // Admin oturum kontrolü
        const adminSession = localStorage.getItem('elaldi_admin_session');
        
        if (adminSession) {
            try {
                const session = JSON.parse(adminSession);
                
                // Session süresi kontrolü
                const now = new Date();
                const expiry = new Date(session.expiresAt);
                
                if (now < expiry && session.userAgent === navigator.userAgent) {
                    this.adminUser = session.user;
                    this.isAuthenticated = true;
                    this.showAdminUI();
                    this.logAdminActivity('session_resumed', 'Admin oturumu devam ettirildi');
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Admin session parse error:', error);
                this.logout();
            }
        } else {
            // Giriş sayfasına yönlendir
            if (!window.location.href.includes('admin-login.html')) {
                window.location.href = 'admin-login.html';
            }
        }
    }

    async adminLogin(username, password, twoFactorCode = null) {
        try {
            // IP kontrolü (demo)
            const allowedIPs = ['127.0.0.1', 'localhost']; // Gerçek uygulamada database'den alınacak
            const clientIP = await this.getClientIP();
            
            if (!allowedIPs.includes(clientIP)) {
                throw new Error('Bu IP adresinden giriş izniniz yok.');
            }

            // Admin kullanıcı kontrolü
            const adminUsers = {
                'huseyin': {
                    username: 'huseyin',
                    password: this.hashPassword('Admin123!'), // Gerçek şifre: Admin123!
                    name: 'Hüseyin Elaldi',
                    email: 'huseyinelald1@icloud.com',
                    phone: '+90 542 123 9770',
                    permissions: ['full_access'],
                    twoFactorEnabled: true,
                    lastLogin: null,
                    loginAttempts: 0
                }
            };

            const admin = adminUsers[username];
            
            if (!admin) {
                this.recordFailedAttempt(username);
                throw new Error('Geçersiz kullanıcı adı veya şifre.');
            }

            // Brute force koruması
            if (admin.loginAttempts >= 5) {
                const lastAttempt = new Date(admin.lastFailedAttempt || 0);
                const lockoutTime = new Date(lastAttempt.getTime() + 15 * 60 * 1000);
                
                if (new Date() < lockoutTime) {
                    throw new Error('Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.');
                } else {
                    admin.loginAttempts = 0;
                }
            }

            // Şifre kontrolü
            const hashedPassword = this.hashPassword(password);
            if (hashedPassword !== admin.password) {
                this.recordFailedAttempt(username);
                admin.loginAttempts++;
                throw new Error('Geçersiz kullanıcı adı veya şifre.');
            }

            // 2FA kontrolü
            if (admin.twoFactorEnabled && !twoFactorCode) {
                // 2FA gerekli, özel sayfaya yönlendir
                localStorage.setItem('admin_temp_auth', JSON.stringify({ username, hashedPassword }));
                window.location.href = 'admin-2fa.html';
                return { requires2FA: true };
            }

            if (admin.twoFactorEnabled && twoFactorCode) {
                if (!this.verify2FACode(twoFactorCode)) {
                    throw new Error('Geçersiz 2FA kodu.');
                }
            }

            // Başarılı giriş
            this.resetFailedAttempts(username);
            this.createAdminSession(admin);
            
            this.logAdminActivity('login_success', 'Admin girişi başarılı');
            this.sendLoginNotification(admin);
            
            return {
                success: true,
                user: admin,
                message: 'Giriş başarılı! Yönlendiriliyorsunuz...'
            };
        } catch (error) {
            console.error('Admin login error:', error);
            this.logAdminActivity('login_failed', `Giriş başarısız: ${error.message}`);
            
            return {
                success: false,
                message: error.message
            };
        }
    }

    hashPassword(password) {
        // Demo: Basit hash (gerçek uygulamada bcrypt kullanılmalı)
        return btoa(password.split('').reverse().join(''));
    }

    async getClientIP() {
        // Demo: Gerçek IP alma (gerçek uygulamada backend'den alınacak)
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return '127.0.0.1'; // Fallback
        }
    }

    recordFailedAttempt(username) {
        const attempts = JSON.parse(localStorage.getItem('admin_login_attempts') || '{}');
        attempts[username] = {
            count: (attempts[username]?.count || 0) + 1,
            lastAttempt: new Date().toISOString(),
            ip: 'detected'
        };
        localStorage.setItem('admin_login_attempts', JSON.stringify(attempts));
    }

    resetFailedAttempts(username) {
        const attempts = JSON.parse(localStorage.getItem('admin_login_attempts') || '{}');
        delete attempts[username];
        localStorage.setItem('admin_login_attempts', JSON.stringify(attempts));
    }

    verify2FACode(code) {
        // Demo: Sabit 2FA kodu (gerçek uygulamada TOTP kullanılmalı)
        const validCodes = ['123456', '654321', '000000'];
        return validCodes.includes(code);
    }

    createAdminSession(adminUser) {
        const session = {
            user: {
                username: adminUser.username,
                name: adminUser.name,
                email: adminUser.email,
                permissions: adminUser.permissions,
                loginTime: new Date().toISOString()
            },
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 saat
            userAgent: navigator.userAgent,
            ip: 'detected'
        };

        localStorage.setItem('elaldi_admin_session', JSON.stringify(session));
        this.adminUser = session.user;
        this.isAuthenticated = true;
        
        // Son giriş zamanını güncelle
        this.updateLastLogin(adminUser.username);
    }

    updateLastLogin(username) {
        const adminData = JSON.parse(localStorage.getItem('elaldi_admin_data') || '{}');
        if (adminData[username]) {
            adminData[username].lastLogin = new Date().toISOString();
            localStorage.setItem('elaldi_admin_data', JSON.stringify(adminData));
        }
    }

    logout() {
        if (this.isAuthenticated) {
            this.logAdminActivity('logout', 'Admin çıkışı');
        }
        
        localStorage.removeItem('elaldi_admin_session');
        localStorage.removeItem('admin_temp_auth');
        
        this.adminUser = null;
        this.isAuthenticated = false;
        
        window.location.href = 'admin-login.html';
    }

    sendLoginNotification(adminUser) {
        // Demo: Giriş bildirimi
        const message = `🔐 ADMIN GİRİŞİ\n\n` +
                       `Kullanıcı: ${adminUser.name}\n` +
                       `Zaman: ${new Date().toLocaleString('tr-TR')}\n` +
                       `IP: detected\n` +
                       `Cihaz: ${navigator.userAgent.split('(')[1].split(')')[0]}`;
        
        // WhatsApp bildirimi (demo)
        const whatsappLink = `https://wa.me/905421239770?text=${encodeURIComponent(message)}`;
        console.log('Admin giriş bildirimi:', whatsappLink);
    }

    // ===== DASHBOARD MANAGEMENT =====
    loadDashboardData() {
        if (!this.isAuthenticated) return;
        
        // İstatistikleri yükle
        this.loadStatistics();
        
        // Son siparişleri yükle
        this.loadRecentOrders();
        
        // Son kullanıcıları yükle
        this.loadRecentUsers();
        
        // Abonelikleri yükle
        this.loadSubscriptions();
        
        // Gelir grafiğini güncelle
        this.updateRevenueChart();
    }

    loadStatistics() {
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]');
        const users = JSON.parse(localStorage.getItem('demo_users') || '{}');
        const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions') || '[]');
        
        // Temel istatistikler
        this.stats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending_approval').length,
            completedOrders: orders.filter(o => o.status === 'completed').length,
            totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
            totalUsers: Object.keys(users).length,
            activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
            monthlyRevenue: this.calculateMonthlyRevenue(orders),
            popularServices: this.getPopularServices(orders)
        };
        
        // UI'ı güncelle
        this.updateStatsUI();
    }

    calculateMonthlyRevenue(orders) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return orders.reduce((sum, order) => {
            const orderDate = new Date(order.createdAt);
            if (orderDate.getMonth() === currentMonth && 
                orderDate.getFullYear() === currentYear &&
                order.status === 'completed') {
                return sum + (order.total || 0);
            }
            return sum;
        }, 0);
    }

    getPopularServices(orders) {
        const serviceCount = {};
        
        orders.forEach(order => {
            order.items?.forEach(item => {
                if (item.type === 'service') {
                    serviceCount[item.name] = (serviceCount[item.name] || 0) + (item.quantity || 1);
                }
            });
        });
        
        return Object.entries(serviceCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    }

    updateStatsUI() {
        const elements = {
            'total-orders': this.stats.totalOrders,
            'pending-orders': this.stats.pendingOrders,
            'completed-orders': this.stats.completedOrders,
            'total-revenue': this.formatCurrency(this.stats.totalRevenue),
            'monthly-revenue': this.formatCurrency(this.stats.monthlyRevenue),
            'total-users': this.stats.totalUsers,
            'active-subscriptions': this.stats.activeSubscriptions
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Popüler servisler
        const popularServicesList = document.getElementById('popular-services');
        if (popularServicesList && this.stats.popularServices) {
            popularServicesList.innerHTML = this.stats.popularServices
                .map(service => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${service.name}
                        <span class="badge bg-primary rounded-pill">${service.count}</span>
                    </li>
                `).join('');
        }
    }

    loadRecentOrders(limit = 10) {
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
        
        const tableBody = document.getElementById('recent-orders-table');
        if (tableBody) {
            tableBody.innerHTML = orders.map(order => `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.customer?.name || 'N/A'}</td>
                    <td>${this.formatCurrency(order.total || 0)}</td>
                    <td>
                        <span class="badge bg-${this.getStatusColor(order.status)}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </td>
                    <td>${this.formatDate(order.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.viewOrder('${order.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${order.status === 'pending_approval' ? `
                        <button class="btn btn-sm btn-success" onclick="adminPanel.approveOrder('${order.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
        }
    }

    loadRecentUsers(limit = 10) {
        const users = Object.values(JSON.parse(localStorage.getItem('demo_users') || '{}'))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
        
        const tableBody = document.getElementById('recent-users-table');
        if (tableBody) {
            tableBody.innerHTML = users.map(user => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${user.avatar || 'images/avatars/default.jpg'}" 
                                 class="rounded-circle me-2" width="32" height="32" alt="${user.firstName}">
                            ${user.firstName} ${user.lastName}
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>${user.phone || 'N/A'}</td>
                    <td>
                        <span class="badge bg-${user.plan === 'free' ? 'secondary' : 'primary'}">
                            ${user.plan || 'free'}
                        </span>
                    </td>
                    <td>${this.formatDate(user.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.viewUser('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="adminPanel.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    loadSubscriptions() {
        const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions') || '[]');
        
        const tableBody = document.getElementById('subscriptions-table');
        if (tableBody) {
            tableBody.innerHTML = subscriptions.map(sub => `
                <tr>
                    <td>${sub.id}</td>
                    <td>${sub.customer?.name || 'N/A'}</td>
                    <td>${sub.plan?.name || 'N/A'}</td>
                    <td>${this.formatCurrency(this.parsePrice(sub.plan?.price) || 0)}</td>
                    <td>
                        <span class="badge bg-${sub.status === 'active' ? 'success' : 'danger'}">
                            ${sub.status === 'active' ? 'Aktif' : 'İptal'}
                        </span>
                    </td>
                    <td>${this.formatDate(sub.startDate)}</td>
                    <td>${this.formatDate(sub.endDate)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.viewSubscription('${sub.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${sub.status === 'active' ? `
                        <button class="btn btn-sm btn-danger" onclick="adminPanel.cancelSubscription('${sub.id}')">
                            <i class="fas fa-ban"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
        }
    }

    // ===== ORDER MANAGEMENT =====
    viewOrder(orderId) {
        const order = this.getOrder(orderId);
        if (!order) {
            this.showNotification('Sipariş bulunamadı.', 'error');
            return;
        }
        
        this.showOrderModal(order);
    }

    getOrder(orderId) {
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]');
        return orders.find(order => order.id === orderId);
    }

    showOrderModal(order) {
        const modalHTML = `
        <div class="modal fade" id="orderModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Sipariş Detayı - ${order.id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Müşteri Bilgileri</h6>
                                <p><strong>Ad Soyad:</strong> ${order.customer?.name || 'N/A'}</p>
                                <p><strong>E-posta:</strong> ${order.customer?.email || 'N/A'}</p>
                                <p><strong>Telefon:</strong> ${order.customer?.phone || 'N/A'}</p>
                                <p><strong>Şirket:</strong> ${order.customer?.company || 'N/A'}</p>
                                <p><strong>Vergi No:</strong> ${order.customer?.taxNumber || 'N/A'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Sipariş Bilgileri</h6>
                                <p><strong>Durum:</strong> <span class="badge bg-${this.getStatusColor(order.status)}">${this.getStatusText(order.status)}</span></p>
                                <p><strong>Tarih:</strong> ${this.formatDateTime(order.createdAt)}</p>
                                <p><strong>Ödeme Yöntemi:</strong> ${order.payment?.method || 'N/A'}</p>
                                <p><strong>İşlem ID:</strong> ${order.payment?.transactionId || 'N/A'}</p>
                                <p><strong>Toplam Tutar:</strong> ${this.formatCurrency(order.total || 0)}</p>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <h6>Sipariş İçeriği</h6>
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Ürün/Hizmet</th>
                                    <th>Fiyat</th>
                                    <th>Miktar</th>
                                    <th>Ara Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items?.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.price}</td>
                                        <td>${item.quantity || 1}</td>
                                        <td>${this.formatCurrency(this.parsePrice(item.price) * (item.quantity || 1))}</td>
                                    </tr>
                                `).join('')}
                                ${order.plan ? `
                                    <tr>
                                        <td>${order.plan.name} Planı</td>
                                        <td>${order.plan.price}</td>
                                        <td>1</td>
                                        <td>${this.formatCurrency(this.parsePrice(order.plan.price))}</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="text-end"><strong>Toplam:</strong></td>
                                    <td><strong>${this.formatCurrency(order.total || 0)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                        
                        ${order.payment?.method === 'eft' ? `
                        <div class="alert alert-info">
                            <h6>EFT Onay Bilgisi</h6>
                            <p>Bu sipariş EFT ile ödendi. Lütfen aşağıdaki referans numarası ile banka hesabınızı kontrol edin:</p>
                            <p><strong>Referans:</strong> ${order.payment?.transactionId || 'N/A'}</p>
                            <p><strong>Müşteri:</strong> ${order.customer?.name || 'N/A'}</p>
                            <p><strong>Tutar:</strong> ${this.formatCurrency(order.total || 0)}</p>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        ${order.status === 'pending_approval' ? `
                        <button type="button" class="btn btn-success" onclick="adminPanel.approveOrder('${order.id}')">
                            <i class="fas fa-check"></i> Onayla
                        </button>
                        <button type="button" class="btn btn-danger" onclick="adminPanel.rejectOrder('${order.id}')">
                            <i class="fas fa-times"></i> Reddet
                        </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Modalı oluştur ve göster
        this.showModal(modalHTML, 'orderModal');
    }

    approveOrder(orderId) {
        if (!confirm('Bu siparişi onaylamak istediğinize emin misiniz?')) return;
        
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]');
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex].status = 'completed';
            orders[orderIndex].approvedAt = new Date().toISOString();
            orders[orderIndex].approvedBy = this.adminUser?.name || 'Admin';
            
            localStorage.setItem('elaldi_orders', JSON.stringify(orders));
            
            // Müşteriye bildirim gönder
            this.sendOrderApprovalNotification(orders[orderIndex]);
            
            // Dashboard'u güncelle
            this.loadDashboardData();
            
            this.showNotification('Sipariş başarıyla onaylandı.', 'success');
            this.logAdminActivity('order_approved', `Sipariş onaylandı: ${orderId}`);
            
            // Modal'ı kapat
            this.hideModal('orderModal');
        }
    }

    rejectOrder(orderId) {
        if (!confirm('Bu siparişi reddetmek istediğinize emin misiniz?')) return;
        
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]');
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex].status = 'rejected';
            orders[orderIndex].rejectedAt = new Date().toISOString();
            orders[orderIndex].rejectedBy = this.adminUser?.name || 'Admin';
            
            localStorage.setItem('elaldi_orders', JSON.stringify(orders));
            
            // Müşteriye bildirim gönder
            this.sendOrderRejectionNotification(orders[orderIndex]);
            
            // Dashboard'u güncelle
            this.loadDashboardData();
            
            this.showNotification('Sipariş reddedildi.', 'warning');
            this.logAdminActivity('order_rejected', `Sipariş reddedildi: ${orderId}`);
            
            // Modal'ı kapat
            this.hideModal('orderModal');
        }
    }

    sendOrderApprovalNotification(order) {
        const message = `✅ Siparişiniz Onaylandı!\n\n` +
                      `Sipariş No: ${order.id}\n` +
                      `Tutar: ${this.formatCurrency(order.total || 0)}\n` +
                      `Durum: Onaylandı ✅\n` +
                      `Onaylayan: ${this.adminUser?.name || 'Admin'}\n\n` +
                      `Teşekkür ederiz!`;
        
        // Demo: WhatsApp bildirimi
        if (order.customer?.phone) {
            const whatsappLink = `https://wa.me/${order.customer.phone}?text=${encodeURIComponent(message)}`;
            console.log('Sipariş onay bildirimi:', whatsappLink);
        }
    }

    sendOrderRejectionNotification(order) {
        const message = `❌ Siparişiniz Reddedildi\n\n` +
                      `Sipariş No: ${order.id}\n` +
                      `Sebep: Ödeme doğrulanamadı\n` +
                      `Lütfen banka hesabınızı kontrol edin veya bizimle iletişime geçin.\n\n` +
                      `İletişim: +90 542 123 9770`;
        
        // Demo: WhatsApp bildirimi
        if (order.customer?.phone) {
            const whatsappLink = `https://wa.me/${order.customer.phone}?text=${encodeURIComponent(message)}`;
            console.log('Sipariş red bildirimi:', whatsappLink);
        }
    }

    // ===== USER MANAGEMENT =====
    viewUser(userId) {
        const users = JSON.parse(localStorage.getItem('demo_users') || '{}');
        const user = Object.values(users).find(u => u.id === userId);
        
        if (!user) {
            this.showNotification('Kullanıcı bulunamadı.', 'error');
            return;
        }
        
        this.showUserModal(user);
    }

    showUserModal(user) {
        const userOrders = this.getUserOrders(user.email);
        const userSubscriptions = this.getUserSubscriptions(user.email);
        
        const modalHTML = `
        <div class="modal fade" id="userModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Kullanıcı Detayı - ${user.firstName} ${user.lastName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4 text-center">
                                <img src="${user.avatar || 'images/avatars/default.jpg'}" 
                                     class="rounded-circle mb-3" width="120" height="120" alt="${user.firstName}">
                                <h5>${user.firstName} ${user.lastName}</h5>
                                <p class="text-muted">${user.email}</p>
                            </div>
                            <div class="col-md-8">
                                <h6>Kişisel Bilgiler</h6>
                                <table class="table table-sm">
                                    <tr><th>E-posta:</th><td>${user.email}</td></tr>
                                    <tr><th>Telefon:</th><td>${user.phone || 'N/A'}</td></tr>
                                    <tr><th>Plan:</th><td><span class="badge bg-${user.plan === 'free' ? 'secondary' : 'primary'}">${user.plan || 'free'}</span></td></tr>
                                    <tr><th>Kayıt Tarihi:</th><td>${this.formatDate(user.createdAt)}</td></tr>
                                    <tr><th>Son Giriş:</th><td>${user.lastLogin ? this.formatDateTime(user.lastLogin) : 'N/A'}</td></tr>
                                </table>
                                
                                <h6 class="mt-4">İstatistikler</h6>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="card text-center">
                                            <div class="card-body">
                                                <h3>${userOrders.length}</h3>
                                                <p class="text-muted mb-0">Toplam Sipariş</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card text-center">
                                            <div class="card-body">
                                                <h3>${userSubscriptions.length}</h3>
                                                <p class="text-muted mb-0">Abonelik</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card text-center">
                                            <div class="card-body">
                                                <h3>${this.formatCurrency(this.getUserTotalSpent(user.email))}</h3>
                                                <p class="text-muted mb-0">Toplam Harcama</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <h6>Son Siparişler</h6>
                        ${userOrders.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Sipariş No</th>
                                        <th>Tutar</th>
                                        <th>Durum</th>
                                        <th>Tarih</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${userOrders.slice(0, 5).map(order => `
                                        <tr>
                                            <td>${order.id}</td>
                                            <td>${this.formatCurrency(order.total || 0)}</td>
                                            <td><span class="badge bg-${this.getStatusColor(order.status)}">${this.getStatusText(order.status)}</span></td>
                                            <td>${this.formatDate(order.createdAt)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ` : '<p class="text-muted">Henüz sipariş yok.</p>'}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-warning" onclick="adminPanel.editUser('${user.id}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        this.showModal(modalHTML, 'userModal');
    }

    editUser(userId) {
        const users = JSON.parse(localStorage.getItem('demo_users') || '{}');
        const user = Object.values(users).find(u => u.id === userId);
        
        if (!user) {
            this.showNotification('Kullanıcı bulunamadı.', 'error');
            return;
        }
        
        this.showEditUserModal(user);
    }

    showEditUserModal(user) {
        const modalHTML = `
        <div class="modal fade" id="editUserModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Kullanıcı Düzenle - ${user.firstName} ${user.lastName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm">
                            <div class="mb-3">
                                <label class="form-label">Ad</label>
                                <input type="text" class="form-control" name="firstName" value="${user.firstName}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Soyad</label>
                                <input type="text" class="form-control" name="lastName" value="${user.lastName}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">E-posta</label>
                                <input type="email" class="form-control" name="email" value="${user.email}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Telefon</label>
                                <input type="tel" class="form-control" name="phone" value="${user.phone || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Plan</label>
                                <select class="form-select" name="plan">
                                    <option value="free" ${user.plan === 'free' ? 'selected' : ''}>Ücretsiz</option>
                                    <option value="starter" ${user.plan === 'starter' ? 'selected' : ''}>Starter</option>
                                    <option value="professional" ${user.plan === 'professional' ? 'selected' : ''}>Professional</option>
                                    <option value="business" ${user.plan === 'business' ? 'selected' : ''}>Business</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Şifre (Değiştirmek için)</label>
                                <input type="password" class="form-control" name="password" placeholder="Yeni şifre">
                                <small class="text-muted">Boş bırakırsanız şifre değişmez.</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="adminPanel.saveUserChanges('${user.id}')">
                            <i class="fas fa-save"></i> Kaydet
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        this.showModal(modalHTML, 'editUserModal');
    }

    saveUserChanges(userId) {
        const form = document.getElementById('editUserForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const updates = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            plan: formData.get('plan')
        };
        
        const password = formData.get('password');
        if (password) {
            updates.password = this.hashPassword(password);
        }
        
        const users = JSON.parse(localStorage.getItem('demo_users') || '{}');
        const userKey = Object.keys(users).find(key => users[key].id === userId);
        
        if (userKey) {
            users[userKey] = { ...users[userKey], ...updates };
            localStorage.setItem('demo_users', JSON.stringify(users));
            
            this.showNotification('Kullanıcı bilgileri güncellendi.', 'success');
            this.logAdminActivity('user_updated', `Kullanıcı güncellendi: ${userId}`);
            
            this.hideModal('editUserModal');
            this.loadDashboardData();
        }
    }

    getUserOrders(email) {
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]');
        return orders.filter(order => order.customer?.email === email);
    }

    getUserSubscriptions(email) {
        const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions') || '[]');
        return subscriptions.filter(sub => sub.customer?.email === email);
    }

    getUserTotalSpent(email) {
        const orders = this.getUserOrders(email);
        return orders.reduce((sum, order) => sum + (order.total || 0), 0);
    }

    // ===== SUBSCRIPTION MANAGEMENT =====
    viewSubscription(subscriptionId) {
        const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions') || '[]');
        const subscription = subscriptions.find(sub => sub.id === subscriptionId);
        
        if (!subscription) {
            this.showNotification('Abonelik bulunamadı.', 'error');
            return;
        }
        
        this.showSubscriptionModal(subscription);
    }

    showSubscriptionModal(subscription) {
        const modalHTML = `
        <div class="modal fade" id="subscriptionModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Abonelik Detayı - ${subscription.id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <table class="table table-sm">
                            <tr><th>Müşteri:</th><td>${subscription.customer?.name || 'N/A'}</td></tr>
                            <tr><th>Plan:</th><td>${subscription.plan?.name || 'N/A'}</td></tr>
                            <tr><th>Aylık Ücret:</th><td>${this.formatCurrency(this.parsePrice(subscription.plan?.price) || 0)}</td></tr>
                            <tr><th>Durum:</th><td><span class="badge bg-${subscription.status === 'active' ? 'success' : 'danger'}">${subscription.status === 'active' ? 'Aktif' : 'İptal'}</span></td></tr>
                            <tr><th>Başlangıç:</th><td>${this.formatDate(subscription.startDate)}</td></tr>
                            <tr><th>Bitiş:</th><td>${this.formatDate(subscription.endDate)}</td></tr>
                            <tr><th>Otomatik Yenileme:</th><td>${subscription.autoRenew ? 'Açık' : 'Kapalı'}</td></tr>
                            <tr><th>Sonraki Ödeme:</th><td>${this.formatDate(subscription.nextBillingDate)}</td></tr>
                            <tr><th>Ödeme Yöntemi:</th><td>${subscription.paymentMethod || 'N/A'}</td></tr>
                        </table>
                        
                        <div class="alert alert-info mt-3">
                            <h6>Abonelik İşlemleri</h6>
                            <p>Abonelik durumunu değiştirmek için aşağıdaki butonları kullanabilirsiniz.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${subscription.status === 'active' ? `
                        <button type="button" class="btn btn-danger" onclick="adminPanel.cancelSubscription('${subscription.id}')">
                            <i class="fas fa-ban"></i> Aboneliği İptal Et
                        </button>
                        ` : `
                        <button type="button" class="btn btn-success" onclick="adminPanel.activateSubscription('${subscription.id}')">
                            <i class="fas fa-check"></i> Aboneliği Aktif Et
                        </button>
                        `}
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        this.showModal(modalHTML, 'subscriptionModal');
    }

    cancelSubscription(subscriptionId) {
        if (!confirm('Bu aboneliği iptal etmek istediğinize emin misiniz?')) return;
        
        const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions') || '[]');
        const subIndex = subscriptions.findIndex(sub => sub.id === subscriptionId);
        
        if (subIndex !== -1) {
            subscriptions[subIndex].status = 'cancelled';
            subscriptions[subIndex].cancelledAt = new Date().toISOString();
            subscriptions[subIndex].cancelledBy = this.adminUser?.name || 'Admin';
            
            localStorage.setItem('elaldi_subscriptions', JSON.stringify(subscriptions));
            
            // Müşteriye bildirim gönder
            this.sendSubscriptionCancellationNotification(subscriptions[subIndex]);
            
            // Dashboard'u güncelle
            this.loadDashboardData();
            
            this.showNotification('Abonelik iptal edildi.', 'success');
            this.logAdminActivity('subscription_cancelled', `Abonelik iptal edildi: ${subscriptionId}`);
            
            this.hideModal('subscriptionModal');
        }
    }

    activateSubscription(subscriptionId) {
        if (!confirm('Bu aboneliği aktif etmek istediğinize emin misiniz?')) return;
        
        const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions') || '[]');
        const subIndex = subscriptions.findIndex(sub => sub.id === subscriptionId);
        
        if (subIndex !== -1) {
            const now = new Date();
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);
            
            subscriptions[subIndex].status = 'active';
            subscriptions[subIndex].startDate = now.toISOString();
            subscriptions[subIndex].endDate = endDate.toISOString();
            subscriptions[subIndex].nextBillingDate = endDate.toISOString();
            subscriptions[subIndex].activatedBy = this.adminUser?.name || 'Admin';
            
            localStorage.setItem('elaldi_subscriptions', JSON.stringify(subscriptions));
            
            // Dashboard'u güncelle
            this.loadDashboardData();
            
            this.showNotification('Abonelik aktif edildi.', 'success');
            this.logAdminActivity('subscription_activated', `Abonelik aktif edildi: ${subscriptionId}`);
            
            this.hideModal('subscriptionModal');
        }
    }

    sendSubscriptionCancellationNotification(subscription) {
        const message = `📅 Aboneliğiniz İptal Edildi\n\n` +
                      `Plan: ${subscription.plan?.name || 'N/A'}\n` +
                      `İptal Tarihi: ${this.formatDate(subscription.cancelledAt)}\n` +
                      `İptal Eden: ${subscription.cancelledBy}\n\n` +
                      `Aboneliğiniz sona erdi. Yeni bir abonelik başlatmak için sitemizi ziyaret edebilirsiniz.`;
        
        // Demo: WhatsApp bildirimi
        if (subscription.customer?.phone) {
            const whatsappLink = `https://wa.me/${subscription.customer.phone}?text=${encodeURIComponent(message)}`;
            console.log('Abonelik iptal bildirimi:', whatsappLink);
        }
    }

    // ===== SERVICE MANAGEMENT =====
    loadServices() {
        const services = JSON.parse(localStorage.getItem('elaldi_services') || '[]');
        const tableBody = document.getElementById('services-table');
        
        if (tableBody) {
            tableBody.innerHTML = services.map((service, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="service-icon me-2">
                                <i class="fas ${service.icon || 'fa-cube'}"></i>
                            </div>
                            ${service.name}
                        </div>
                    </td>
                    <td>${service.description || 'N/A'}</td>
                    <td>${service.price}</td>
                    <td>
                        <span class="badge bg-${service.active ? 'success' : 'danger'}">
                            ${service.active ? 'Aktif' : 'Pasif'}
                        </span>
                    </td>
                    <td>${service.category || 'Genel'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.editService(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="adminPanel.deleteService(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    addService() {
        this.showServiceModal();
    }

    showServiceModal(service = null) {
        const isEdit = !!service;
        const modalHTML = `
        <div class="modal fade" id="serviceModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${isEdit ? 'Servis Düzenle' : 'Yeni Servis Ekle'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="serviceForm">
                            <div class="mb-3">
                                <label class="form-label">Servis Adı</label>
                                <input type="text" class="form-control" name="name" 
                                       value="${service?.name || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Açıklama</label>
                                <textarea class="form-control" name="description" rows="3">${service?.description || ''}</textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Fiyat</label>
                                <input type="text" class="form-control" name="price" 
                                       value="${service?.price || '₺0'}" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Kategori</label>
                                        <select class="form-select" name="category">
                                            <option value="seo" ${service?.category === 'seo' ? 'selected' : ''}>SEO</option>
                                            <option value="sosyal-medya" ${service?.category === 'sosyal-medya' ? 'selected' : ''}>Sosyal Medya</option>
                                            <option value="reklam" ${service?.category === 'reklam' ? 'selected' : ''}>Reklam</option>
                                            <option value="diger" ${service?.category === 'diger' ? 'selected' : ''}>Diğer</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">İkon</label>
                                        <input type="text" class="form-control" name="icon" 
                                               value="${service?.icon || 'fa-cube'}" 
                                               placeholder="fas fa-...">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" name="active" 
                                           ${service?.active !== false ? 'checked' : ''}>
                                    <label class="form-check-label">Aktif</label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" 
                                onclick="adminPanel.${isEdit ? `updateService(${service?.index})` : 'saveNewService'}()">
                            <i class="fas fa-save"></i> ${isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        this.showModal(modalHTML, 'serviceModal');
    }

    saveNewService() {
        const form = document.getElementById('serviceForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const service = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: formData.get('price'),
            category: formData.get('category'),
            icon: formData.get('icon'),
            active: formData.get('active') === 'on',
            createdAt: new Date().toISOString()
        };
        
        const services = JSON.parse(localStorage.getItem('elaldi_services') || '[]');
        services.push(service);
        localStorage.setItem('elaldi_services', JSON.stringify(services));
        
        this.showNotification('Servis başarıyla eklendi.', 'success');
        this.logAdminActivity('service_added', `Yeni servis eklendi: ${service.name}`);
        
        this.hideModal('serviceModal');
        this.loadServices();
    }

    editService(index) {
        const services = JSON.parse(localStorage.getItem('elaldi_services') || '[]');
        const service = services[index];
        if (!service) return;
        
        service.index = index;
        this.showServiceModal(service);
    }

    updateService(index) {
        const form = document.getElementById('serviceForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const updatedService = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: formData.get('price'),
            category: formData.get('category'),
            icon: formData.get('icon'),
            active: formData.get('active') === 'on',
            updatedAt: new Date().toISOString()
        };
        
        const services = JSON.parse(localStorage.getItem('elaldi_services') || '[]');
        services[index] = { ...services[index], ...updatedService };
        localStorage.setItem('elaldi_services', JSON.stringify(services));
        
        this.showNotification('Servis başarıyla güncellendi.', 'success');
        this.logAdminActivity('service_updated', `Servis güncellendi: ${updatedService.name}`);
        
        this.hideModal('serviceModal');
        this.loadServices();
    }

    deleteService(index) {
        if (!confirm('Bu servisi silmek istediğinize emin misiniz?')) return;
        
        const services = JSON.parse(localStorage.getItem('elaldi_services') || '[]');
        const service = services[index];
        
        services.splice(index, 1);
        localStorage.setItem('elaldi_services', JSON.stringify(services));
        
        this.showNotification('Servis başarıyla silindi.', 'success');
        this.logAdminActivity('service_deleted', `Servis silindi: ${service?.name || 'Unknown'}`);
        
        this.loadServices();
    }

    // ===== CONTENT MANAGEMENT =====
    loadBlogPosts() {
        const posts = JSON.parse(localStorage.getItem('elaldi_blog_posts') || '[]');
        const tableBody = document.getElementById('blog-posts-table');
        
        if (tableBody) {
            tableBody.innerHTML = posts.map((post, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <h6 class="mb-0">${post.title}</h6>
                        <small class="text-muted">${post.category || 'Genel'}</small>
                    </td>
                    <td>${post.author || 'Admin'}</td>
                    <td>${this.formatDate(post.publishedAt || post.createdAt)}</td>
                    <td>
                        <span class="badge bg-${post.published ? 'success' : 'warning'}">
                            ${post.published ? 'Yayında' : 'Taslak'}
                        </span>
                    </td>
                    <td>${post.views || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.editBlogPost(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="adminPanel.deleteBlogPost(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    addBlogPost() {
        this.showBlogPostModal();
    }

    showBlogPostModal(post = null) {
        const isEdit = !!post;
        const modalHTML = `
        <div class="modal fade" id="blogPostModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${isEdit ? 'Blog Yazısı Düzenle' : 'Yeni Blog Yazısı'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="blogPostForm">
                            <div class="mb-3">
                                <label class="form-label">Başlık</label>
                                <input type="text" class="form-control" name="title" 
                                       value="${post?.title || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Açıklama</label>
                                <textarea class="form-control" name="description" rows="2">${post?.description || ''}</textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">İçerik</label>
                                <textarea class="form-control" name="content" rows="6">${post?.content || ''}</textarea>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Kategori</label>
                                        <select class="form-select" name="category">
                                            <option value="pazarlama" ${post?.category === 'pazarlama' ? 'selected' : ''}>Pazarlama</option>
                                            <option value="seo" ${post?.category === 'seo' ? 'selected' : ''}>SEO</option>
                                            <option value="sosyal-medya" ${post?.category === 'sosyal-medya' ? 'selected' : ''}>Sosyal Medya</option>
                                            <option value="dijital-pazarlama" ${post?.category === 'dijital-pazarlama' ? 'selected' : ''}>Dijital Pazarlama</option>
                                            <option value="genel" ${!post?.category || post.category === 'genel' ? 'selected' : ''}>Genel</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Etiketler (virgülle ayırın)</label>
                                        <input type="text" class="form-control" name="tags" 
                                               value="${post?.tags?.join(', ') || ''}">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Yazar</label>
                                        <input type="text" class="form-control" name="author" 
                                               value="${post?.author || 'Hüseyin Elaldi'}">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Kapak Görseli URL</label>
                                        <input type="text" class="form-control" name="image" 
                                               value="${post?.image || ''}">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" name="published" 
                                           ${post?.published !== false ? 'checked' : ''}>
                                    <label class="form-check-label">Yayınla</label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">SEO Açıklama</label>
                                <textarea class="form-control" name="seoDescription" rows="2">${post?.seoDescription || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" 
                                onclick="adminPanel.${isEdit ? `updateBlogPost(${post?.index})` : 'saveNewBlogPost'}()">
                            <i class="fas fa-save"></i> ${isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        this.showModal(modalHTML, 'blogPostModal');
    }

    saveNewBlogPost() {
        const form = document.getElementById('blogPostForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const post = {
            id: 'BLOG_' + Date.now(),
            title: formData.get('title'),
            description: formData.get('description'),
            content: formData.get('content'),
            category: formData.get('category'),
            tags: formData.get('tags')?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
            author: formData.get('author'),
            image: formData.get('image'),
            published: formData.get('published') === 'on',
            seoDescription: formData.get('seoDescription'),
            createdAt: new Date().toISOString(),
            views: 0
        };
        
        const posts = JSON.parse(localStorage.getItem('elaldi_blog_posts') || '[]');
        posts.push(post);
        localStorage.setItem('elaldi_blog_posts', JSON.stringify(posts));
        
        this.showNotification('Blog yazısı başarıyla eklendi.', 'success');
        this.logAdminActivity('blog_post_added', `Blog yazısı eklendi: ${post.title}`);
        
        this.hideModal('blogPostModal');
        this.loadBlogPosts();
    }

    editBlogPost(index) {
        const posts = JSON.parse(localStorage.getItem('elaldi_blog_posts') || '[]');
        const post = posts[index];
        if (!post) return;
        
        post.index = index;
        this.showBlogPostModal(post);
    }

    updateBlogPost(index) {
        const form = document.getElementById('blogPostForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const updatedPost = {
            title: formData.get('title'),
            description: formData.get('description'),
            content: formData.get('content'),
            category: formData.get('category'),
            tags: formData.get('tags')?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
            author: formData.get('author'),
            image: formData.get('image'),
            published: formData.get('published') === 'on',
            seoDescription: formData.get('seoDescription'),
            updatedAt: new Date().toISOString()
        };
        
        const posts = JSON.parse(localStorage.getItem('elaldi_blog_posts') || '[]');
        posts[index] = { ...posts[index], ...updatedPost };
        localStorage.setItem('elaldi_blog_posts', JSON.stringify(posts));
        
        this.showNotification('Blog yazısı başarıyla güncellendi.', 'success');
        this.logAdminActivity('blog_post_updated', `Blog yazısı güncellendi: ${updatedPost.title}`);
        
        this.hideModal('blogPostModal');
        this.loadBlogPosts();
    }

    deleteBlogPost(index) {
        if (!confirm('Bu blog yazısını silmek istediğinize emin misiniz?')) return;
        
        const posts = JSON.parse(localStorage.getItem('elaldi_blog_posts') || '[]');
        const post = posts[index];
        
        posts.splice(index, 1);
        localStorage.setItem('elaldi_blog_posts', JSON.stringify(posts));
        
        this.showNotification('Blog yazısı başarıyla silindi.', 'success');
        this.logAdminActivity('blog_post_deleted', `Blog yazısı silindi: ${post?.title || 'Unknown'}`);
        
        this.loadBlogPosts();
    }

    // ===== TESTIMONIAL MANAGEMENT =====
    loadTestimonials() {
        const testimonials = JSON.parse(localStorage.getItem('elaldi_testimonials') || '[]');
        const tableBody = document.getElementById('testimonials-table');
        
        if (tableBody) {
            tableBody.innerHTML = testimonials.map((testimonial, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${testimonial.avatar || 'images/avatars/default.jpg'}" 
                                 class="rounded-circle me-2" width="32" height="32">
                            ${testimonial.author}
                        </div>
                    </td>
                    <td>${testimonial.position || 'N/A'}</td>
                    <td>
                        <div class="text-truncate" style="max-width: 200px;">
                            ${testimonial.content}
                        </div>
                    </td>
                    <td>
                        <div class="rating">
                            ${'★'.repeat(testimonial.rating || 5)}${'☆'.repeat(5 - (testimonial.rating || 5))}
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-${testimonial.approved ? 'success' : 'warning'}">
                            ${testimonial.approved ? 'Onaylı' : 'Onay Bekliyor'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.editTestimonial(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="adminPanel.deleteTestimonial(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${!testimonial.approved ? `
                        <button class="btn btn-sm btn-success" onclick="adminPanel.approveTestimonial(${index})">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
        }
    }

    approveTestimonial(index) {
        const testimonials = JSON.parse(localStorage.getItem('elaldi_testimonials') || '[]');
        testimonials[index].approved = true;
        testimonials[index].approvedAt = new Date().toISOString();
        testimonials[index].approvedBy = this.adminUser?.name || 'Admin';
        
        localStorage.setItem('elaldi_testimonials', JSON.stringify(testimonials));
        
        this.showNotification('Yorum onaylandı.', 'success');
        this.logAdminActivity('testimonial_approved', `Yorum onaylandı: ${testimonials[index].author}`);
        
        this.loadTestimonials();
    }

    deleteTestimonial(index) {
        if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
        
        const testimonials = JSON.parse(localStorage.getItem('elaldi_testimonials') || '[]');
        const testimonial = testimonials[index];
        
        testimonials.splice(index, 1);
        localStorage.setItem('elaldi_testimonials', JSON.stringify(testimonials));
        
        this.showNotification('Yorum silindi.', 'success');
        this.logAdminActivity('testimonial_deleted', `Yorum silindi: ${testimonial?.author || 'Unknown'}`);
        
        this.loadTestimonials();
    }

    // ===== SEO MANAGEMENT =====
    updateSEOSettings() {
        const form = document.getElementById('seo-settings-form');
        if (!form) return;
        
        const formData = new FormData(form);
        const seoSettings = {
            siteTitle: formData.get('siteTitle'),
            siteDescription: formData.get('siteDescription'),
            siteKeywords: formData.get('siteKeywords'),
            googleAnalytics: formData.get('googleAnalytics'),
            facebookPixel: formData.get('facebookPixel'),
            metaTags: formData.get('metaTags'),
            robotsTxt: formData.get('robotsTxt'),
            sitemap: formData.get('sitemap') === 'on',
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('elaldi_seo_settings', JSON.stringify(seoSettings));
        
        this.showNotification('SEO ayarları güncellendi.', 'success');
        this.logAdminActivity('seo_updated', 'SEO ayarları güncellendi');
    }

    loadSEOSettings() {
        const settings = JSON.parse(localStorage.getItem('elaldi_seo_settings') || '{}');
        const form = document.getElementById('seo-settings-form');
        
        if (form) {
            Object.keys(settings).forEach(key => {
                const element = form.querySelector(`[name="${key}"]`);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = settings[key];
                    } else {
                        element.value = settings[key] || '';
                    }
                }
            });
        }
    }

    generateSitemap() {
        // Demo: Site haritası oluşturma
        const pages = [
            { url: '/', lastmod: new Date().toISOString(), priority: '1.0' },
            { url: '/services.html', lastmod: new Date().toISOString(), priority: '0.8' },
            { url: '/saas.html', lastmod: new Date().toISOString(), priority: '0.8' },
            { url: '/blog.html', lastmod: new Date().toISOString(), priority: '0.7' },
            { url: '/contact.html', lastmod: new Date().toISOString(), priority: '0.5' }
        ];
        
        const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `
    <url>
        <loc>https://flux-gold.github.io/elaldi${page.url}</loc>
        <lastmod>${page.lastmod.split('T')[0]}</lastmod>
        <priority>${page.priority}</priority>
    </url>
`).join('')}
</urlset>`;
        
        // İndirme linki oluştur
        const blob = new Blob([sitemapXML], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Site haritası oluşturuldu ve indirildi.', 'success');
        this.logAdminActivity('sitemap_generated', 'Site haritası oluşturuldu');
    }

    generateRobotsTxt() {
        const robotsTxt = `# Robots.txt for Elaldi - https://flux-gold.github.io/elaldi/
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /payment/

Sitemap: https://flux-gold.github.io/elaldi/sitemap.xml

# Crawl-delay: 10
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /`;
        
        // İndirme linki oluştur
        const blob = new Blob([robotsTxt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'robots.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Robots.txt oluşturuldu ve indirildi.', 'success');
        this.logAdminActivity('robots_generated', 'Robots.txt oluşturuldu');
    }

    // ===== BACKUP & RESTORE =====
    backupData() {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            data: {
                users: JSON.parse(localStorage.getItem('demo_users') || '{}'),
                orders: JSON.parse(localStorage.getItem('elaldi_orders') || '[]'),
                subscriptions: JSON.parse(localStorage.getItem('elaldi_subscriptions') || '[]'),
                services: JSON.parse(localStorage.getItem('elaldi_services') || '[]'),
                blogPosts: JSON.parse(localStorage.getItem('elaldi_blog_posts') || '[]'),
                testimonials: JSON.parse(localStorage.getItem('elaldi_testimonials') || '[]'),
                seoSettings: JSON.parse(localStorage.getItem('elaldi_seo_settings') || '{}')
            }
        };
        
        const backupJSON = JSON.stringify(backup, null, 2);
        const blob = new Blob([backupJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `elaldi-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Yedekleme başarıyla tamamlandı.', 'success');
        this.logAdminActivity('backup_created', 'Veri yedeklemesi oluşturuldu');
    }

    restoreData(file) {
        if (!file) return;
        
        if (!confirm('Bu işlem mevcut verilerin üzerine yazacaktır. Devam etmek istiyor musunuz?')) {
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                // Verileri geri yükle
                if (backup.data.users) {
                    localStorage.setItem('demo_users', JSON.stringify(backup.data.users));
                }
                if (backup.data.orders) {
                    localStorage.setItem('elaldi_orders', JSON.stringify(backup.data.orders));
                }
                if (backup.data.subscriptions) {
                    localStorage.setItem('elaldi_subscriptions', JSON.stringify(backup.data.subscriptions));
                }
                if (backup.data.services) {
                    localStorage.setItem('elaldi_services', JSON.stringify(backup.data.services));
                }
                if (backup.data.blogPosts) {
                    localStorage.setItem('elaldi_blog_posts', JSON.stringify(backup.data.blogPosts));
                }
                if (backup.data.testimonials) {
                    localStorage.setItem('elaldi_testimonials', JSON.stringify(backup.data.testimonials));
                }
                if (backup.data.seoSettings) {
                    localStorage.setItem('elaldi_seo_settings', JSON.stringify(backup.data.seoSettings));
                }
                
                this.showNotification('Veriler başarıyla geri yüklendi.', 'success');
                this.logAdminActivity('data_restored', 'Veri geri yüklemesi yapıldı');
                
                // Sayfayı yenile
                setTimeout(() => location.reload(), 1500);
            } catch (error) {
                console.error('Restore error:', error);
                this.showNotification('Yedek dosyası geçersiz.', 'error');
            }
        };
        reader.readAsText(file);
    }

    // ===== SECURITY =====
    setupSecurity() {
        // Otomatik logout
        this.setupAutoLogout();
        
        // Aktivite log'u
        this.setupActivityLog();
        
        // IP kontrolü
        this.setupIPControl();
    }

    setupAutoLogout() {
        let timeout;
        
        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (this.isAuthenticated) {
                    this.showNotification('Güvenlik nedeniyle oturumunuz sonlandırıldı.', 'warning');
                    this.logout();
                }
            }, 30 * 60 * 1000); // 30 dakika
        };
        
        // Aktivite olduğunda timer'ı sıfırla
        ['click', 'mousemove', 'keypress', 'scroll'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });
        
        resetTimer();
    }

    setupActivityLog() {
        const activities = JSON.parse(localStorage.getItem('admin_activities') || '[]');
        const tableBody = document.getElementById('activity-log-table');
        
        if (tableBody) {
            tableBody.innerHTML = activities.slice(-50).reverse().map(activity => `
                <tr>
                    <td>${this.formatDateTime(activity.timestamp)}</td>
                    <td>${activity.user || 'System'}</td>
                    <td>${activity.action}</td>
                    <td>${activity.details || ''}</td>
                    <td>${activity.ip || 'N/A'}</td>
                </tr>
            `).join('');
        }
    }

    logAdminActivity(action, details) {
        const activities = JSON.parse(localStorage.getItem('admin_activities') || '[]');
        
        activities.push({
            timestamp: new Date().toISOString(),
            user: this.adminUser?.name || 'System',
            action: action,
            details: details,
            ip: 'detected'
        });
        
        // Son 1000 aktiviteyi tut
        if (activities.length > 1000) {
            activities.shift();
        }
        
        localStorage.setItem('admin_activities', JSON.stringify(activities));
        
        // UI'ı güncelle
        this.setupActivityLog();
    }

    setupIPControl() {
        // Demo: IP kontrol listesi
        const allowedIPs = JSON.parse(localStorage.getItem('admin_allowed_ips') || '[]');
        const blockedIPs = JSON.parse(localStorage.getItem('admin_blocked_ips') || '[]');
        
        // UI'ı güncelle
        this.updateIPLists(allowedIPs, blockedIPs);
    }

    updateIPLists(allowedIPs, blockedIPs) {
        const allowedList = document.getElementById('allowed-ips-list');
        const blockedList = document.getElementById('blocked-ips-list');
        
        if (allowedList) {
            allowedList.innerHTML = allowedIPs.map(ip => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${ip}
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.removeAllowedIP('${ip}')">
                        <i class="fas fa-times"></i>
                    </button>
                </li>
            `).join('');
        }
        
        if (blockedList) {
            blockedList.innerHTML = blockedIPs.map(ip => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${ip}
                    <button class="btn btn-sm btn-success" onclick="adminPanel.removeBlockedIP('${ip}')">
                        <i class="fas fa-check"></i>
                    </button>
                </li>
            `).join('');
        }
    }

    addAllowedIP() {
        const ipInput = document.getElementById('new-allowed-ip');
        if (!ipInput || !ipInput.value) return;
        
        const ip = ipInput.value.trim();
        const allowedIPs = JSON.parse(localStorage.getItem('admin_allowed_ips') || '[]');
        
        if (!allowedIPs.includes(ip)) {
            allowedIPs.push(ip);
            localStorage.setItem('admin_allowed_ips', JSON.stringify(allowedIPs));
            
            this.showNotification('IP adresi eklendi.', 'success');
            this.logAdminActivity('ip_added', `Allowed IP added: ${ip}`);
            
            ipInput.value = '';
            this.updateIPLists(allowedIPs, JSON.parse(localStorage.getItem('admin_blocked_ips') || '[]'));
        }
    }

    removeAllowedIP(ip) {
        const allowedIPs = JSON.parse(localStorage.getItem('admin_allowed_ips') || '[]');
        const index = allowedIPs.indexOf(ip);
        
        if (index !== -1) {
            allowedIPs.splice(index, 1);
            localStorage.setItem('admin_allowed_ips', JSON.stringify(allowedIPs));
            
            this.showNotification('IP adresi kaldırıldı.', 'success');
            this.logAdminActivity('ip_removed', `Allowed IP removed: ${ip}`);
            
            this.updateIPLists(allowedIPs, JSON.parse(localStorage.getItem('admin_blocked_ips') || '[]'));
        }
    }

    addBlockedIP() {
        const ipInput = document.getElementById('new-blocked-ip');
        if (!ipInput || !ipInput.value) return;
        
        const ip = ipInput.value.trim();
        const blockedIPs = JSON.parse(localStorage.getItem('admin_blocked_ips') || '[]');
        
        if (!blockedIPs.includes(ip)) {
            blockedIPs.push(ip);
            localStorage.setItem('admin_blocked_ips', JSON.stringify(blockedIPs));
            
            this.showNotification('IP adresi engellendi.', 'success');
            this.logAdminActivity('ip_blocked', `IP blocked: ${ip}`);
            
            ipInput.value = '';
            this.updateIPLists(JSON.parse(localStorage.getItem('admin_allowed_ips') || '[]'), blockedIPs);
        }
    }

    removeBlockedIP(ip) {
        const blockedIPs = JSON.parse(localStorage.getItem('admin_blocked_ips') || '[]');
        const index = blockedIPs.indexOf(ip);
        
        if (index !== -1) {
            blockedIPs.splice(index, 1);
            localStorage.setItem('admin_blocked_ips', JSON.stringify(blockedIPs));
            
            this.showNotification('IP engeli kaldırıldı.', 'success');
            this.logAdminActivity('ip_unblocked', `IP unblocked: ${ip}`);
            
            this.updateIPLists(JSON.parse(localStorage.getItem('admin_allowed_ips') || '[]'), blockedIPs);
        }
    }

    // ===== CHARTS & ANALYTICS =====
    initCharts() {
        // Revenue Chart
        this.initRevenueChart();
        
        // Orders Chart
        this.initOrdersChart();
        
        // Services Chart
        this.initServicesChart();
    }

    initRevenueChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;
        
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]');
        const monthlyData = this.getMonthlyRevenueData(orders);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Aylık Gelir (TL)',
                    data: monthlyData.revenues,
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `₺${context.raw.toLocaleString('tr-TR')}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `₺${value.toLocaleString('tr-TR')}`
                        }
                    }
                }
            }
        });
    }

    getMonthlyRevenueData(orders) {
        const monthlyData = {};
        const now = new Date();
        
        // Son 6 ay
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
            monthlyData[key] = 0;
        }
        
        // Siparişleri işle
        orders.forEach(order => {
            if (order.status === 'completed') {
                const orderDate = new Date(order.createdAt);
                const key = orderDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
                
                if (monthlyData[key] !== undefined) {
                    monthlyData[key] += order.total || 0;
                }
            }
        });
        
        return {
            labels: Object.keys(monthlyData),
            revenues: Object.values(monthlyData)
        };
    }

    initOrdersChart() {
        const ctx = document.getElementById('orders-chart');
        if (!ctx) return;
        
        const orders = JSON.parse(localStorage.getItem('elaldi_orders') || '[]');
        const statusData = this.getOrderStatusData(orders);
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: statusData.labels,
                datasets: [{
                    data: statusData.counts,
                    backgroundColor: [
                        '#4ade80', // Completed
                        '#f59e0b', // Pending
                        '#ef4444', // Rejected
                        '#94a3b8'  // Other
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    getOrderStatusData(orders) {
        const statusCount = {
            completed: 0,
            pending_approval: 0,
            rejected: 0,
            other: 0
        };
        
        orders.forEach(order => {
            if (statusCount[order.status] !== undefined) {
                statusCount[order.status]++;
            } else {
                statusCount.other++;
            }
        });
        
        return {
            labels: ['Tamamlanan', 'Onay Bekleyen', 'Reddedilen', 'Diğer'],
            counts: Object.values(statusCount)
        };
    }

    initServicesChart() {
        const ctx = document.getElementById('services-chart');
        if (!ctx) return;
        
        const popularServices = this.stats.popularServices || [];
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: popularServices.map(s => s.name),
                datasets: [{
                    label: 'Satış Sayısı',
                    data: popularServices.map(s => s.count),
                    backgroundColor: '#f72585'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    updateRevenueChart() {
        // Chart'ları yenile
        this.initCharts();
    }

    // ===== UTILITY METHODS =====
    showAdminUI() {
        // Admin UI elementlerini göster
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'block';
        });
        
        // Normal UI elementlerini gizle
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = 'none';
        });
        
        // Admin bilgilerini göster
        const adminName = document.getElementById('admin-name');
        if (adminName && this.adminUser) {
            adminName.textContent = this.adminUser.name;
        }
    }

    showModal(html, modalId) {
        // Mevcut modal'ı temizle
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Yeni modal'ı ekle
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
        
        // Modal kapandığında temizle
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
            document.getElementById(modalId)?.remove();
        });
    }

    hideModal(modalId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) {
            modal.hide();
        }
    }

    showNotification(message, type = 'info') {
        if (window.ElaldiApp && window.ElaldiApp.showNotification) {
            window.ElaldiApp.showNotification(message, type);
        } else {
            // Bootstrap toast kullan
            const toastHTML = `
            <div class="toast align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
            `;
            
            const container = document.querySelector('.toast-container') || (() => {
                const div = document.createElement('div');
                div.className = 'toast-container position-fixed top-0 end-0 p-3';
                document.body.appendChild(div);
                return div;
            })();
            
            container.insertAdjacentHTML('beforeend', toastHTML);
            
            const toast = new bootstrap.Toast(container.lastElementChild);
            toast.show();
            
            // Toast gösterildikten sonra temizle
            toast._element.addEventListener('hidden.bs.toast', () => {
                toast._element.remove();
            });
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    }

    parsePrice(priceString) {
        if (typeof priceString === 'number') return priceString;
        const numericString = priceString.replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('tr-TR');
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('tr-TR');
    }

    getStatusColor(status) {
        const colors = {
            'completed': 'success',
            'pending_approval': 'warning',
            'rejected': 'danger',
            'active': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            'completed': 'Tamamlandı',
            'pending_approval': 'Onay Bekliyor',
            'rejected': 'Reddedildi',
            'active': 'Aktif',
            'cancelled': 'İptal Edildi'
        };
        return texts[status] || status;
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Admin giriş formu
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAdminLogin(loginForm);
            });
        }
        
        // Logout butonu
        const logoutBtn = document.getElementById('admin-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Dashboard refresh
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
                this.showNotification('Dashboard yenilendi.', 'success');
            });
        }
        
        // Tab değişimi
        const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabLinks.forEach(link => {
            link.addEventListener('shown.bs.tab', (e) => {
                const tabId = e.target.getAttribute('href').substring(1);
                this.handleTabChange(tabId);
            });
        });
        
        // Backup butonu
        const backupBtn = document.getElementById('backup-data');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.backupData();
            });
        }
        
        // Restore input
        const restoreInput = document.getElementById('restore-file');
        if (restoreInput) {
            restoreInput.addEventListener('change', (e) => {
                this.restoreData(e.target.files[0]);
                e.target.value = ''; // Reset input
            });
        }
        
        // SEO formu
        const seoForm = document.getElementById('seo-settings-form');
        if (seoForm) {
            seoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateSEOSettings();
            });
        }
        
        // Sitemap butonu
        const sitemapBtn = document.getElementById('generate-sitemap');
        if (sitemapBtn) {
            sitemapBtn.addEventListener('click', () => {
                this.generateSitemap();
            });
        }
        
        // Robots.txt butonu
        const robotsBtn = document.getElementById('generate-robots');
        if (robotsBtn) {
            robotsBtn.addEventListener('click', () => {
                this.generateRobotsTxt();
            });
        }
        
        // Add IP buttons
        const addAllowedBtn = document.getElementById('add-allowed-ip');
        const addBlockedBtn = document.getElementById('add-blocked-ip');
        
        if (addAllowedBtn) {
            addAllowedBtn.addEventListener('click', () => {
                this.addAllowedIP();
            });
        }
        
        if (addBlockedBtn) {
            addBlockedBtn.addEventListener('click', () => {
                this.addBlockedIP();
            });
        }
    }

    async handleAdminLogin(form) {
        const username = form.querySelector('#username').value;
        const password = form.querySelector('#password').value;
        const twoFactorCode = form.querySelector('#two-factor-code')?.value || null;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...';
        submitBtn.disabled = true;
        
        const result = await this.adminLogin(username, password, twoFactorCode);
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1500);
        } else if (result.requires2FA) {
            // 2FA sayfasına yönlendirildi
            this.showNotification('Lütfen 2FA kodunu girin.', 'info');
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    handleTabChange(tabId) {
        switch (tabId) {
            case 'services':
                this.loadServices();
                break;
            case 'blog':
                this.loadBlogPosts();
                break;
            case 'testimonials':
                this.loadTestimonials();
                break;
            case 'seo':
                this.loadSEOSettings();
                break;
            case 'security':
                this.setupActivityLog();
                this.setupIPControl();
                break;
        }
    }
}

// Global admin instance oluştur
let adminInstance = null;

function getAdminPanel() {
    if (!adminInstance) {
        adminInstance = new AdminPanel();
    }
    return adminInstance;
}

// Global olarak erişilebilir yap
window.ElaldiAdmin = getAdminPanel();
window.adminPanel = getAdminPanel(); // Kısa alias

// Bootstrap'ı yükle (admin panel için gerekli)
if (typeof bootstrap === 'undefined') {
    console.warn('Bootstrap yüklenmemiş. Admin panel Bootstrap gerektirir.');
}

// Demo verileri başlat
function initializeAdminDemoData() {
    if (!localStorage.getItem('elaldi_services')) {
        const demoServices = [
            {
                name: 'SEO Analiz',
                description: 'Web sitenizin SEO performansını detaylı analiz edip iyileştirme önerileri sunuyoruz.',
                price: '₺499',
                category: 'seo',
                icon: 'fa-chart-line',
                active: true,
                createdAt: '2024-01-01T00:00:00Z'
            },
            {
                name: 'Sosyal Medya Stratejisi',
                description: 'Markanız için etkili sosyal medya stratejisi ve içerik planı oluşturuyoruz.',
                price: '₺799',
                category: 'sosyal-medya',
                icon: 'fa-bullhorn',
                active: true,
                createdAt: '2024-01-01T00:00:00Z'
            },
            {
                name: 'Google Ads Optimizasyon',
                description: 'Google Ads kampanyalarınızı optimize ederek daha fazla dönüşüm elde edin.',
                price: '₺1,199',
                category: 'reklam',
                icon: 'fa-ad',
                active: true,
                createdAt: '2024-01-01T00:00:00Z'
            }
        ];
        
        localStorage.setItem('elaldi_services', JSON.stringify(demoServices));
    }
    
    if (!localStorage.getItem('elaldi_blog_posts')) {
        const demoPosts = [
            {
                id: 'BLOG_001',
                title: '2024\'te Dijital Pazarlama Trendleri',
                description: '2024 yılında dijital pazarlamada öne çıkacak trendler ve stratejiler.',
                content: 'İçerik buraya gelecek...',
                category: 'dijital-pazarlama',
                tags: ['trendler', 'dijital pazarlama', '2024'],
                author: 'Hüseyin Elaldi',
                image: 'https://picsum.photos/800/400',
                published: true,
                createdAt: '2024-01-15T10:00:00Z',
                views: 1245
            }
        ];
        
        localStorage.setItem('elaldi_blog_posts', JSON.stringify(demoPosts));
    }
    
    if (!localStorage.getItem('elaldi_testimonials')) {
        const demoTestimonials = [
            {
                author: 'Ahmet Yılmaz',
                position: 'E-ticaret Girişimcisi',
                content: 'SEO analiz hizmeti sayesinde organik trafiğim %40 arttı. Kesinlikle tavsiye ederim!',
                rating: 5,
                avatar: 'images/avatars/avatar1.jpg',
                approved: true,
                createdAt: '2024-01-10T14:30:00Z'
            }
        ];
        
        localStorage.setItem('elaldi_testimonials', JSON.stringify(demoTestimonials));
    }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminDemoData();
    
    // Admin giriş sayfasında ise admin panelini başlatma
    if (!window.location.href.includes('admin-login.html') && 
        !window.location.href.includes('admin-2fa.html')) {
        getAdminPanel();
    }
    
    // Admin login sayfasında ise event listener'ları kur
    if (window.location.href.includes('admin-login.html')) {
        const adminPanel = getAdminPanel();
        adminPanel.setupEventListeners();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminPanel, getAdminPanel };
}