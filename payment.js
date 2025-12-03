/**
 * ELALDI - Ödeme Sistemi
 * EFT/Havale, Online Ödeme ve Abonelik Yönetimi
 * Version: 1.0.0
 */

class PaymentSystem {
    constructor() {
        this.cart = [];
        this.selectedPlan = null;
        this.paymentMethods = [];
        this.discountCode = null;
        this.init();
    }

    init() {
        this.loadCart();
        this.loadPaymentMethods();
        this.setupEventListeners();
        this.updateCartUI();
    }

    // ===== CART MANAGEMENT =====
    loadCart() {
        try {
            this.cart = JSON.parse(localStorage.getItem('elaldi_cart')) || [];
            this.selectedPlan = JSON.parse(localStorage.getItem('selected_plan')) || null;
        } catch (error) {
            console.error('Sepet yüklenirken hata:', error);
            this.cart = [];
        }
    }

    saveCart() {
        try {
            localStorage.setItem('elaldi_cart', JSON.stringify(this.cart));
            if (this.selectedPlan) {
                localStorage.setItem('selected_plan', JSON.stringify(this.selectedPlan));
            }
        } catch (error) {
            console.error('Sepet kaydedilirken hata:', error);
        }
    }

    addToCart(item) {
        // Benzersiz ID kontrolü
        const existingItemIndex = this.cart.findIndex(cartItem => 
            cartItem.id === item.id && cartItem.type === item.type
        );

        if (existingItemIndex !== -1) {
            // Miktarı güncelle
            this.cart[existingItemIndex].quantity += item.quantity || 1;
        } else {
            // Yeni öğe ekle
            this.cart.push({
                ...item,
                id: item.id || this.generateItemId(item),
                addedAt: new Date().toISOString()
            });
        }

        this.saveCart();
        this.updateCartUI();
        
        this.showNotification(`${item.name} sepete eklendi!`, 'success');
        return true;
    }

    removeFromCart(itemId) {
        const itemIndex = this.cart.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            const removedItem = this.cart.splice(itemIndex, 1)[0];
            this.saveCart();
            this.updateCartUI();
            
            this.showNotification(`${removedItem.name} sepetten çıkarıldı.`, 'info');
            return true;
        }
        
        return false;
    }

    updateQuantity(itemId, quantity) {
        if (quantity < 1) {
            return this.removeFromCart(itemId);
        }

        const itemIndex = this.cart.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            this.cart[itemIndex].quantity = quantity;
            this.saveCart();
            this.updateCartUI();
            return true;
        }
        
        return false;
    }

    clearCart() {
        this.cart = [];
        this.selectedPlan = null;
        this.saveCart();
        this.updateCartUI();
        
        this.showNotification('Sepet temizlendi.', 'info');
    }

    getCartTotal() {
        let total = 0;
        
        // Sepet öğeleri
        this.cart.forEach(item => {
            const price = this.parsePrice(item.price);
            total += price * (item.quantity || 1);
        });
        
        // Plan ücreti
        if (this.selectedPlan) {
            const planPrice = this.parsePrice(this.selectedPlan.price);
            total += planPrice;
        }
        
        // İndirim uygula
        if (this.discountCode) {
            total = this.applyDiscount(total, this.discountCode);
        }
        
        return total;
    }

    parsePrice(priceString) {
        if (typeof priceString === 'number') return priceString;
        
        const numericString = priceString.replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    }

    generateItemId(item) {
        return `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ===== DISCOUNT MANAGEMENT =====
    applyDiscountCode(code) {
        const discount = this.validateDiscountCode(code);
        
        if (discount) {
            this.discountCode = discount;
            this.updateCartUI();
            this.showNotification(`İndirim kodu uygulandı: ${discount.value}% indirim!`, 'success');
            return true;
        } else {
            this.showNotification('Geçersiz veya süresi dolmuş indirim kodu.', 'error');
            return false;
        }
    }

    validateDiscountCode(code) {
        // Demo indirim kodları
        const discountCodes = {
            'ELALDI10': { value: 10, type: 'percentage', minAmount: 100, expires: '2024-12-31' },
            'ELALDI20': { value: 20, type: 'percentage', minAmount: 300, expires: '2024-12-31' },
            'WELCOME50': { value: 50, type: 'fixed', amount: 50, expires: '2024-12-31' },
            'FIRSTORDER': { value: 15, type: 'percentage', minAmount: 0, expires: '2024-12-31' }
        };

        const discount = discountCodes[code.toUpperCase()];
        
        if (!discount) return null;
        
        // Süre kontrolü
        const now = new Date();
        const expiryDate = new Date(discount.expires);
        
        if (now > expiryDate) return null;
        
        return { code, ...discount };
    }

    applyDiscount(total, discount) {
        if (discount.type === 'percentage') {
            // Minimum tutar kontrolü
            if (discount.minAmount && total < discount.minAmount) {
                return total;
            }
            return total * (1 - discount.value / 100);
        } else if (discount.type === 'fixed') {
            return Math.max(0, total - discount.amount);
        }
        
        return total;
    }

    removeDiscount() {
        this.discountCode = null;
        this.updateCartUI();
        this.showNotification('İndirim kodu kaldırıldı.', 'info');
    }

    // ===== PAYMENT METHODS =====
    loadPaymentMethods() {
        // Demo ödeme yöntemleri
        this.paymentMethods = [
            {
                id: 'eft',
                name: 'EFT / Havale',
                description: 'Bankalar arası transfer',
                icon: 'fa-university',
                fee: 0,
                processingTime: '1-2 iş günü',
                instructions: `Lütfen ödeme açıklamasına "ELALDI-${Date.now()}" yazmayı unutmayın.`,
                bankAccounts: [
                    {
                        bank: 'Ziraat Bankası',
                        accountName: 'HÜSEYİN ELALDİ PAZARLAMA DANIŞMANLIK',
                        accountNumber: 'TR00 0000 0000 0000 0000 0000 00',
                        iban: 'TR00 0000 0000 0000 0000 0000 00',
                        branch: 'Merkez Şube'
                    },
                    {
                        bank: 'İş Bankası',
                        accountName: 'HÜSEYİN ELALDİ PAZARLAMA DANIŞMANLIK',
                        accountNumber: 'TR00 0000 0000 0000 0000 0000 00',
                        iban: 'TR00 0000 0000 0000 0000 0000 00',
                        branch: 'Merkez Şube'
                    }
                ]
            },
            {
                id: 'credit_card',
                name: 'Kredi Kartı',
                description: 'Online ödeme',
                icon: 'fa-credit-card',
                fee: 2.5, // %
                processingTime: 'Anlık',
                supportedCards: ['Visa', 'Mastercard', 'American Express']
            },
            {
                id: 'qr',
                name: 'QR Kod',
                description: 'Mobil ödeme',
                icon: 'fa-qrcode',
                fee: 1.5,
                processingTime: 'Anlık',
                qrData: 'elaldi-payment:' + Date.now()
            }
        ];
    }

    getPaymentMethod(id) {
        return this.paymentMethods.find(method => method.id === id);
    }

    // ===== CHECKOUT PROCESS =====
    async processCheckout(paymentData) {
        try {
            // Validasyon
            if (!this.validateCheckoutData(paymentData)) {
                throw new Error('Lütfen tüm gerekli alanları doldurun.');
            }

            // Sepet kontrolü
            if (this.cart.length === 0 && !this.selectedPlan) {
                throw new Error('Sepetiniz boş.');
            }

            // Ödeme yöntemine göre işlem
            let paymentResult;
            
            switch (paymentData.method) {
                case 'eft':
                    paymentResult = await this.processEFTPayment(paymentData);
                    break;
                case 'credit_card':
                    paymentResult = await this.processCreditCardPayment(paymentData);
                    break;
                case 'qr':
                    paymentResult = await this.processQRPayment(paymentData);
                    break;
                default:
                    throw new Error('Geçersiz ödeme yöntemi.');
            }

            if (paymentResult.success) {
                // Siparişi kaydet
                const order = this.createOrder(paymentResult, paymentData);
                
                // Sepeti temizle
                this.clearCart();
                
                // Fatura oluştur
                if (paymentData.needInvoice) {
                    this.generateInvoice(order);
                }
                
                // Abonelik başlat
                if (this.selectedPlan) {
                    this.startSubscription(order);
                }
                
                return {
                    success: true,
                    order: order,
                    message: 'Ödemeniz başarıyla alındı!',
                    redirectUrl: '/payment/success.html?order=' + order.id
                };
            } else {
                throw new Error(paymentResult.message || 'Ödeme işlemi başarısız.');
            }
        } catch (error) {
            console.error('Ödeme işlemi hatası:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    validateCheckoutData(paymentData) {
        const requiredFields = ['method', 'name', 'email'];
        
        for (const field of requiredFields) {
            if (!paymentData[field]) {
                throw new Error(`Lütfen ${field} alanını doldurun.`);
            }
        }

        // Email validasyonu
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(paymentData.email)) {
            throw new Error('Geçerli bir e-posta adresi girin.');
        }

        // Kredi kartı validasyonu
        if (paymentData.method === 'credit_card') {
            if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvc) {
                throw new Error('Lütfen kredi kartı bilgilerini eksiksiz girin.');
            }
            
            if (!this.validateCreditCard(paymentData.cardNumber)) {
                throw new Error('Geçersiz kredi kartı numarası.');
            }
        }

        return true;
    }

    validateCreditCard(cardNumber) {
        // Luhn algoritması
        const sanitized = cardNumber.replace(/\D/g, '');
        let sum = 0;
        let shouldDouble = false;
        
        for (let i = sanitized.length - 1; i >= 0; i--) {
            let digit = parseInt(sanitized.charAt(i), 10);
            
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        
        return sum % 10 === 0;
    }

    async processEFTPayment(paymentData) {
        // Demo: EFT işlemi simülasyonu
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Demo: Başarılı ödeme
        return {
            success: true,
            transactionId: 'EFT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            amount: this.getCartTotal(),
            method: 'eft',
            timestamp: new Date().toISOString(),
            status: 'pending_approval', // Admin onayı bekliyor
            adminApprovalRequired: true
        };
    }

    async processCreditCardPayment(paymentData) {
        // Demo: Kredi kartı işlemi simülasyonu
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Demo: 3D Secure simülasyonu
        const threeDSecure = await this.mock3DSecure(paymentData);
        
        if (!threeDSecure.success) {
            return {
                success: false,
                message: '3D Secure doğrulaması başarısız.'
            };
        }
        
        // Demo: Ödeme işlemi
        const paymentProcess = await this.mockPaymentGateway(paymentData);
        
        if (paymentProcess.success) {
            return {
                success: true,
                transactionId: 'CC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                amount: this.getCartTotal(),
                method: 'credit_card',
                timestamp: new Date().toISOString(),
                status: 'completed'
            };
        } else {
            return {
                success: false,
                message: 'Kartınızdan ödeme alınamadı.'
            };
        }
    }

    async processQRPayment(paymentData) {
        // Demo: QR ödeme simülasyonu
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return {
            success: true,
            transactionId: 'QR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            amount: this.getCartTotal(),
            method: 'qr',
            timestamp: new Date().toISOString(),
            status: 'completed'
        };
    }

    async mock3DSecure(paymentData) {
        // Demo: 3D Secure simülasyonu
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Demo: Her zaman başarılı
        return { success: true };
    }

    async mockPaymentGateway(paymentData) {
        // Demo: Ödeme gateway simülasyonu
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Demo: Bazı kart numaralarını başarısız yap
        const failedCards = ['4111111111111111', '5555555555554444'];
        const lastFour = paymentData.cardNumber.slice(-4);
        
        if (failedCards.includes(paymentData.cardNumber.replace(/\s/g, ''))) {
            return {
                success: false,
                message: 'Kartınızdan ödeme alınamadı. Lütfen bankanızla iletişime geçin.'
            };
        }
        
        return { success: true };
    }

    // ===== ORDER MANAGEMENT =====
    createOrder(paymentResult, paymentData) {
        const order = {
            id: 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            items: [...this.cart],
            plan: this.selectedPlan,
            total: this.getCartTotal(),
            discount: this.discountCode,
            payment: paymentResult,
            customer: {
                name: paymentData.name,
                email: paymentData.email,
                phone: paymentData.phone || '',
                company: paymentData.company || '',
                taxNumber: paymentData.taxNumber || '',
                address: paymentData.address || ''
            },
            createdAt: new Date().toISOString(),
            status: paymentResult.status,
            adminApprovalRequired: paymentResult.adminApprovalRequired || false
        };

        // Siparişi kaydet
        this.saveOrder(order);
        
        return order;
    }

    saveOrder(order) {
        try {
            const orders = JSON.parse(localStorage.getItem('elaldi_orders')) || [];
            orders.push(order);
            localStorage.setItem('elaldi_orders', JSON.stringify(orders));
            
            // Admin'e bildirim (demo)
            this.notifyAdmin(order);
        } catch (error) {
            console.error('Sipariş kaydedilirken hata:', error);
        }
    }

    getOrder(orderId) {
        const orders = JSON.parse(localStorage.getItem('elaldi_orders')) || [];
        return orders.find(order => order.id === orderId);
    }

    getCustomerOrders(email) {
        const orders = JSON.parse(localStorage.getItem('elaldi_orders')) || [];
        return orders.filter(order => order.customer.email === email);
    }

    // ===== INVOICE GENERATION =====
    generateInvoice(order) {
        try {
            const invoice = {
                id: 'INV_' + order.id,
                orderId: order.id,
                customer: order.customer,
                items: order.items,
                plan: order.plan,
                subtotal: this.getCartTotal(),
                discount: order.discount ? {
                    code: order.discount.code,
                    amount: this.getCartTotal() - order.total
                } : null,
                total: order.total,
                taxRate: 20, // %20 KDV
                taxAmount: order.total * 0.20,
                grandTotal: order.total * 1.20,
                issueDate: new Date().toISOString(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 gün
                status: 'pending'
            };

            // Faturayı kaydet
            this.saveInvoice(invoice);
            
            return invoice;
        } catch (error) {
            console.error('Fatura oluşturma hatası:', error);
            return null;
        }
    }

    saveInvoice(invoice) {
        try {
            const invoices = JSON.parse(localStorage.getItem('elaldi_invoices')) || [];
            invoices.push(invoice);
            localStorage.setItem('elaldi_invoices', JSON.stringify(invoices));
        } catch (error) {
            console.error('Fatura kaydedilirken hata:', error);
        }
    }

    downloadInvoice(invoiceId) {
        const invoices = JSON.parse(localStorage.getItem('elaldi_invoices')) || [];
        const invoice = invoices.find(inv => inv.id === invoiceId);
        
        if (!invoice) {
            this.showNotification('Fatura bulunamadı.', 'error');
            return;
        }

        // Demo: PDF oluşturma simülasyonu
        this.showNotification('Faturanız hazırlanıyor...', 'info');
        
        setTimeout(() => {
            // Gerçek uygulamada burada PDF oluşturulur
            const invoiceContent = this.generateInvoiceHTML(invoice);
            
            // Yeni pencerede göster
            const printWindow = window.open('', '_blank');
            printWindow.document.write(invoiceContent);
            printWindow.document.close();
            printWindow.print();
            
            this.showNotification('Faturanız yazdırılmaya hazır.', 'success');
        }, 1000);
    }

    generateInvoiceHTML(invoice) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Fatura - ${invoice.id}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .invoice { border: 1px solid #ddd; padding: 30px; max-width: 800px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .company-info h2 { color: #4361ee; margin: 0; }
                .invoice-info { text-align: right; }
                .details { margin: 30px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                th { background-color: #f5f5f5; }
                .totals { text-align: right; margin-top: 30px; }
                .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice">
                <div class="header">
                    <div class="company-info">
                        <h2>Elaldi Pazarlama Danışmanlık</h2>
                        <p>Vergi No: 1234567890</p>
                        <p>Adres: Örnek Mah. Örnek Cad. No:1 İstanbul</p>
                        <p>Tel: +90 542 123 9770</p>
                        <p>E-posta: huseyinelald1@icloud.com</p>
                    </div>
                    <div class="invoice-info">
                        <h3>FATURA</h3>
                        <p>Fatura No: ${invoice.id}</p>
                        <p>Tarih: ${new Date(invoice.issueDate).toLocaleDateString('tr-TR')}</p>
                        <p>Son Ödeme: ${new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</p>
                    </div>
                </div>
                
                <div class="details">
                    <h4>MÜŞTERİ BİLGİLERİ</h4>
                    <p><strong>${invoice.customer.name}</strong></p>
                    <p>${invoice.customer.company || ''}</p>
                    <p>Vergi No: ${invoice.customer.taxNumber || 'Belirtilmemiş'}</p>
                    <p>E-posta: ${invoice.customer.email}</p>
                    <p>Tel: ${invoice.customer.phone || 'Belirtilmemiş'}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Ürün/Hizmet</th>
                            <th>Birim Fiyat</th>
                            <th>Miktar</th>
                            <th>Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.price} TL</td>
                                <td>${item.quantity || 1}</td>
                                <td>${this.parsePrice(item.price) * (item.quantity || 1)} TL</td>
                            </tr>
                        `).join('')}
                        ${invoice.plan ? `
                            <tr>
                                <td>${invoice.plan.name} Planı</td>
                                <td>${invoice.plan.price}</td>
                                <td>1</td>
                                <td>${this.parsePrice(invoice.plan.price)} TL</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
                
                <div class="totals">
                    <p>Ara Toplam: ${invoice.subtotal.toFixed(2)} TL</p>
                    ${invoice.discount ? `<p>İndirim (${invoice.discount.code}): -${invoice.discount.amount.toFixed(2)} TL</p>` : ''}
                    <p>KDV (%${invoice.taxRate}): ${invoice.taxAmount.toFixed(2)} TL</p>
                    <h3>GENEL TOPLAM: ${invoice.grandTotal.toFixed(2)} TL</h3>
                </div>
                
                <div class="footer">
                    <p>Bu belge elektronik faturadır. Kaşe ve imza gerektirmez.</p>
                    <p>EFT/Havale için: Ziraat Bankası TR00 0000 0000 0000 0000 0000 00</p>
                    <p>Ödeme onayı Admin (Hüseyin Elaldi) tarafından yapılacaktır.</p>
                    <button class="no-print" onclick="window.print()">Yazdır</button>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // ===== SUBSCRIPTION MANAGEMENT =====
    startSubscription(order) {
        try {
            const subscription = {
                id: 'SUB_' + Date.now(),
                orderId: order.id,
                plan: order.plan,
                customer: order.customer,
                startDate: new Date().toISOString(),
                endDate: this.calculateEndDate(order.plan),
                status: 'active',
                autoRenew: true,
                paymentMethod: order.payment.method,
                nextBillingDate: this.calculateNextBillingDate(order.plan)
            };

            // Aboneliği kaydet
            this.saveSubscription(subscription);
            
            // Kullanıcıya bildirim
            this.notifySubscriptionStart(subscription);
            
            return subscription;
        } catch (error) {
            console.error('Abonelik başlatma hatası:', error);
            return null;
        }
    }

    calculateEndDate(plan) {
        const now = new Date();
        let endDate;
        
        switch (plan.billingPeriod || 'monthly') {
            case 'monthly':
                endDate = new Date(now.setMonth(now.getMonth() + 1));
                break;
            case 'quarterly':
                endDate = new Date(now.setMonth(now.getMonth() + 3));
                break;
            case 'yearly':
                endDate = new Date(now.setFullYear(now.getFullYear() + 1));
                break;
            default:
                endDate = new Date(now.setMonth(now.getMonth() + 1));
        }
        
        return endDate.toISOString();
    }

    calculateNextBillingDate(plan) {
        return this.calculateEndDate(plan);
    }

    saveSubscription(subscription) {
        try {
            const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions')) || [];
            subscriptions.push(subscription);
            localStorage.setItem('elaldi_subscriptions', JSON.stringify(subscriptions));
        } catch (error) {
            console.error('Abonelik kaydedilirken hata:', error);
        }
    }

    cancelSubscription(subscriptionId) {
        const subscriptions = JSON.parse(localStorage.getItem('elaldi_subscriptions')) || [];
        const subscriptionIndex = subscriptions.findIndex(sub => sub.id === subscriptionId);
        
        if (subscriptionIndex !== -1) {
            subscriptions[subscriptionIndex].status = 'cancelled';
            subscriptions[subscriptionIndex].cancelledAt = new Date().toISOString();
            localStorage.setItem('elaldi_subscriptions', JSON.stringify(subscriptions));
            
            this.showNotification('Aboneliğiniz iptal edildi.', 'success');
            return true;
        }
        
        return false;
    }

    // ===== NOTIFICATIONS =====
    notifyAdmin(order) {
        // Demo: Admin bildirimi
        console.log('🔔 YENİ SİPARİŞ - Admin Bildirimi');
        console.log('Sipariş ID:', order.id);
        console.log('Müşteri:', order.customer.name);
        console.log('Tutar:', order.total, 'TL');
        console.log('Durum:', order.status);
        
        // WhatsApp API entegrasyonu (demo)
        if (order.payment.method === 'eft') {
            const message = `✅ Yeni EFT Siparişi\n\n` +
                          `Sipariş: ${order.id}\n` +
                          `Müşteri: ${order.customer.name}\n` +
                          `E-posta: ${order.customer.email}\n` +
                          `Tutar: ${order.total} TL\n\n` +
                          `Lütfen ${order.payment.transactionId} referans numaralı EFT'yi kontrol edin ve onaylayın.`;
            
            // WhatsApp linki (demo)
            const whatsappLink = `https://wa.me/905421239770?text=${encodeURIComponent(message)}`;
            console.log('WhatsApp Bildirimi:', whatsappLink);
        }
    }

    notifySubscriptionStart(subscription) {
        const message = `🎉 Aboneliğiniz Başladı!\n\n` +
                       `Plan: ${subscription.plan.name}\n` +
                       `Başlangıç: ${new Date(subscription.startDate).toLocaleDateString('tr-TR')}\n` +
                       `Bitiş: ${new Date(subscription.endDate).toLocaleDateString('tr-TR')}\n` +
                       `Sonraki ödeme: ${new Date(subscription.nextBillingDate).toLocaleDateString('tr-TR')}`;
        
        // Demo: E-posta gönderimi
        console.log('Abonelik başlangıç bildirimi:', message);
        
        // Kullanıcıya göster
        this.showNotification('Aboneliğiniz başarıyla başlatıldı!', 'success');
    }

    // ===== UI MANAGEMENT =====
    updateCartUI() {
        const cartCount = document.getElementById('cart-count');
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        const emptyCart = document.getElementById('empty-cart');
        const cartNotEmpty = document.getElementById('cart-not-empty');
        
        const totalItems = this.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // Sepet sayacı
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        // Sepet modalı/dropdown
        if (cartItems && emptyCart && cartNotEmpty) {
            if (totalItems === 0 && !this.selectedPlan) {
                emptyCart.style.display = 'block';
                cartNotEmpty.style.display = 'none';
            } else {
                emptyCart.style.display = 'none';
                cartNotEmpty.style.display = 'block';
                
                // Sepet öğelerini listele
                let itemsHTML = '';
                
                this.cart.forEach(item => {
                    const price = this.parsePrice(item.price);
                    const total = price * (item.quantity || 1);
                    
                    itemsHTML += `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>${item.price} × ${item.quantity || 1}</p>
                        </div>
                        <div class="cart-item-actions">
                            <span class="cart-item-price">${total.toFixed(2)} TL</span>
                            <button class="btn btn-sm btn-outline" onclick="paymentSystem.removeFromCart('${item.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    `;
                });
                
                // Plan varsa ekle
                if (this.selectedPlan) {
                    const planPrice = this.parsePrice(this.selectedPlan.price);
                    
                    itemsHTML += `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <h4>${this.selectedPlan.name} Planı</h4>
                            <p>Abonelik</p>
                        </div>
                        <div class="cart-item-actions">
                            <span class="cart-item-price">${planPrice.toFixed(2)} TL/ay</span>
                            <button class="btn btn-sm btn-outline" onclick="paymentSystem.removePlan()">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }
                
                cartItems.innerHTML = itemsHTML;
            }
        }
        
        // Toplam tutar
        if (cartTotal) {
            const total = this.getCartTotal();
            cartTotal.textContent = total.toFixed(2) + ' TL';
        }
    }

    setupEventListeners() {
        // Sayfa yüklendiğinde sepeti güncelle
        document.addEventListener('DOMContentLoaded', () => {
            this.updateCartUI();
        });
        
        // Sepet modalı/dropdown toggle
        const cartToggle = document.getElementById('cart-toggle');
        const cartDropdown = document.getElementById('cart-dropdown');
        
        if (cartToggle && cartDropdown) {
            cartToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                cartDropdown.classList.toggle('show');
            });
            
            // Dışarı tıklandığında kapat
            document.addEventListener('click', (e) => {
                if (!cartDropdown.contains(e.target) && !cartToggle.contains(e.target)) {
                    cartDropdown.classList.remove('show');
                }
            });
        }
        
        // Checkout form submit
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCheckoutForm(checkoutForm);
            });
        }
        
        // Discount form submit
        const discountForm = document.getElementById('discount-form');
        if (discountForm) {
            discountForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const code = discountForm.querySelector('#discount-code').value;
                this.applyDiscountCode(code);
                discountForm.reset();
            });
        }
        
        // Remove discount button
        const removeDiscountBtn = document.getElementById('remove-discount');
        if (removeDiscountBtn) {
            removeDiscountBtn.addEventListener('click', () => {
                this.removeDiscount();
            });
        }
        
        // Clear cart button
        const clearCartBtn = document.getElementById('clear-cart');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                if (confirm('Sepetinizi temizlemek istediğinize emin misiniz?')) {
                    this.clearCart();
                }
            });
        }
        
        // Payment method toggle
        const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', (e) => {
                this.updatePaymentDetails(e.target.value);
            });
        });
    }

    async handleCheckoutForm(form) {
        const formData = new FormData(form);
        const paymentData = {
            method: formData.get('payment-method'),
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            company: formData.get('company'),
            taxNumber: formData.get('taxNumber'),
            address: formData.get('address'),
            needInvoice: formData.get('needInvoice') === 'on',
            agreeTerms: formData.get('agreeTerms') === 'on'
        };
        
        // Kredi kartı bilgileri
        if (paymentData.method === 'credit_card') {
            paymentData.cardNumber = formData.get('cardNumber');
            paymentData.expiryDate = formData.get('expiryDate');
            paymentData.cvc = formData.get('cvc');
            paymentData.cardName = formData.get('cardName');
        }
        
        // Butonu loading durumuna getir
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor...';
        submitBtn.disabled = true;
        
        const result = await this.processCheckout(paymentData);
        
        // Butonu eski haline getir
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            
            // Başarı sayfasına yönlendir
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 1500);
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    updatePaymentDetails(methodId) {
        const method = this.getPaymentMethod(methodId);
        const detailsContainer = document.getElementById('payment-details');
        
        if (!detailsContainer || !method) return;
        
        let detailsHTML = '';
        
        switch (methodId) {
            case 'eft':
                detailsHTML = `
                <div class="payment-instructions">
                    <h4>EFT / Havale Talimatları</h4>
                    <p>${method.instructions}</p>
                    
                    <div class="bank-accounts">
                        ${method.bankAccounts.map(account => `
                        <div class="bank-account">
                            <h5>${account.bank}</h5>
                            <p>Hesap Adı: ${account.accountName}</p>
                            <p>IBAN: <code>${account.iban}</code></p>
                            <p>Hesap No: ${account.accountNumber}</p>
                            <p>Şube: ${account.branch}</p>
                        </div>
                        `).join('')}
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        <p>Ödeme onayı Admin (Hüseyin Elaldi) tarafından yapılacaktır. Lütfen ödeme yaptıktan sonra WhatsApp +90 542 123 9770 numaradan bilgi veriniz.</p>
                    </div>
                </div>
                `;
                break;
                
            case 'credit_card':
                detailsHTML = `
                <div class="credit-card-form">
                    <h4>Kredi Kartı Bilgileri</h4>
                    
                    <div class="form-group">
                        <label for="cardName">Kart Üzerindeki İsim</label>
                        <input type="text" id="cardName" name="cardName" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="cardNumber">Kart Numarası</label>
                        <input type="text" id="cardNumber" name="cardNumber" 
                               pattern="[0-9]{16}" maxlength="16" 
                               placeholder="0000 0000 0000 0000" required>
                        <div class="card-icons">
                            <i class="fab fa-cc-visa"></i>
                            <i class="fab fa-cc-mastercard"></i>
                            <i class="fab fa-cc-amex"></i>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expiryDate">Son Kullanma Tarihi</label>
                            <input type="text" id="expiryDate" name="expiryDate" 
                                   pattern="(0[1-9]|1[0-2])\/[0-9]{2}" 
                                   placeholder="MM/YY" maxlength="5" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="cvc">CVC</label>
                            <input type="text" id="cvc" name="cvc" 
                                   pattern="[0-9]{3,4}" maxlength="4" 
                                   placeholder="123" required>
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-lock"></i>
                        <p>Ödeme bilgileriniz güvenli bir şekilde şifrelenmektedir.</p>
                    </div>
                </div>
                `;
                break;
                
            case 'qr':
                detailsHTML = `
                <div class="qr-payment">
                    <h4>QR Kod ile Ödeme</h4>
                    <p>Aşağıdaki QR kodu telefonunuzla tarayarak ödeme yapabilirsiniz.</p>
                    
                    <div class="qr-code" id="qr-code">
                        <!-- QR kod buraya oluşturulacak -->
                        <div class="qr-placeholder">
                            <i class="fas fa-qrcode"></i>
                            <p>QR Kod yükleniyor...</p>
                        </div>
                    </div>
                    
                    <div class="qr-instructions">
                        <ol>
                            <li>QR kodu telefonunuzla tarayın</li>
                            <li>Ödeme sayfasına yönlendirileceksiniz</li>
                            <li>Ödemenizi tamamlayın</li>
                            <li>Otomatik olarak yönlendirileceksiniz</li>
                        </ol>
                    </div>
                </div>
                `;
                
                // QR kod oluştur
                setTimeout(() => this.generateQRCode(method.qrData), 100);
                break;
        }
        
        detailsContainer.innerHTML = detailsHTML;
    }

    generateQRCode(data) {
        const qrContainer = document.getElementById('qr-code');
        if (!qrContainer) return;
        
        // Demo: Basit QR kod görseli
        qrContainer.innerHTML = `
        <div class="qr-image">
            <div class="qr-pattern"></div>
            <div class="qr-content">ELALDI</div>
        </div>
        <p class="qr-expiry">Süre: 15 dakika</p>
        `;
        
        // Stil ekle
        const style = document.createElement('style');
        style.textContent = `
        .qr-image {
            width: 200px;
            height: 200px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 8px;
            position: relative;
            margin: 20px auto;
            padding: 10px;
        }
        .qr-pattern {
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(45deg, #333 25%, transparent 25%),
                linear-gradient(-45deg, #333 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #333 75%),
                linear-gradient(-45deg, transparent 75%, #333 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            opacity: 0.3;
        }
        .qr-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            font-weight: bold;
            color: #4361ee;
        }
        .qr-expiry {
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        `;
        qrContainer.appendChild(style);
    }

    removePlan() {
        this.selectedPlan = null;
        localStorage.removeItem('selected_plan');
        this.saveCart();
        this.updateCartUI();
        
        this.showNotification('Plan seçimi kaldırıldı.', 'info');
    }

    // ===== HELPER METHODS =====
    showNotification(message, type = 'info') {
        if (window.ElaldiApp && window.ElaldiApp.showNotification) {
            window.ElaldiApp.showNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Global payment instance oluştur
let paymentInstance = null;

function getPaymentSystem() {
    if (!paymentInstance) {
        paymentInstance = new PaymentSystem();
    }
    return paymentInstance;
}

// Global olarak erişilebilir yap
window.ElaldiPayment = getPaymentSystem();
window.paymentSystem = getPaymentSystem(); // Kısa alias

// Demo verileri başlat
function initializeDemoData() {
    if (!localStorage.getItem('elaldi_orders')) {
        const demoOrders = [
            {
                id: 'ORD_2024001',
                items: [
                    { id: 'service_1', name: 'SEO Analiz', price: '₺499', quantity: 1, type: 'service' }
                ],
                total: 499,
                payment: {
                    method: 'eft',
                    transactionId: 'EFT_123456789',
                    status: 'completed',
                    timestamp: '2024-01-15T10:30:00Z'
                },
                customer: {
                    name: 'Demo Müşteri',
                    email: 'demo@elaldi.com',
                    phone: '5551234567'
                },
                createdAt: '2024-01-15T10:30:00Z',
                status: 'completed'
            }
        ];
        
        localStorage.setItem('elaldi_orders', JSON.stringify(demoOrders));
    }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    initializeDemoData();
    getPaymentSystem();
    
    // Cart dropdown için event listener
    document.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart')) {
            const button = e.target.closest('.add-to-cart');
            const item = {
                type: button.dataset.type,
                name: button.dataset.name,
                price: button.dataset.price,
                id: button.dataset.id
            };
            
            getPaymentSystem().addToCart(item);
        }
        
        if (e.target.closest('.select-plan')) {
            const button = e.target.closest('.select-plan');
            const plan = {
                name: button.dataset.name,
                price: button.dataset.price,
                billingPeriod: button.dataset.period || 'monthly'
            };
            
            localStorage.setItem('selected_plan', JSON.stringify(plan));
            getPaymentSystem().selectedPlan = plan;
            getPaymentSystem().updateCartUI();
            
            getPaymentSystem().showNotification(`${plan.name} planı seçildi!`, 'success');
        }
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PaymentSystem, getPaymentSystem };
}