/**
 * ELALDI - Pazarlama Danışmanlığı Platformu
 * Ana JavaScript Dosyası
 * Version: 1.0.0
 */

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('ELALDI Platformu yüklendi - https://flux-gold.github.io/elaldi/');
    
    // Uygulama durumu
    const state = {
        currentUser: null,
        theme: localStorage.getItem('theme') || 'light',
        cart: JSON.parse(localStorage.getItem('cart')) || [],
        favorites: JSON.parse(localStorage.getItem('favorites')) || []
    };

    // ===== INITIALIZATION =====
    function init() {
        initTheme();
        initCurrentYear();
        initNavigation();
        initModals();
        initStickyHeader();
        initStickyCTA();
        initSmoothScroll();
        initServiceCards();
        initTestimonialSlider();
        initNewsletterForm();
        initScrollAnimations();
        initMobileMenu();
        initPaymentButtons();
        
        updateCartBadge();
        updateFavoritesBadge();
        
        console.log('Uygulama başlatıldı:', state);
    }

    // ===== THEME MANAGEMENT =====
    function initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;
        
        // Mevcut temayı ayarla
        if (state.theme === 'dark') {
            enableDarkMode();
        } else {
            enableLightMode();
        }
        
        // Tema değiştirme butonu
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
    }

    function enableDarkMode() {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        state.theme = 'dark';
        localStorage.setItem('theme', 'dark');
    }

    function enableLightMode() {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        state.theme = 'light';
        localStorage.setItem('theme', 'light');
    }

    function toggleTheme() {
        if (state.theme === 'light') {
            enableDarkMode();
        } else {
            enableLightMode();
        }
        
        // Tema değişikliği animasyonu
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    // ===== CURRENT YEAR =====
    function initCurrentYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    // ===== NAVIGATION =====
    function initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('section[id]');
        
        // Aktif link takibi
        function setActiveLink() {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (scrollY >= (sectionTop - 200)) {
                    current = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }
        
        window.addEventListener('scroll', setActiveLink);
        setActiveLink(); // İlk yüklemede çalıştır
    }

    // ===== MOBILE MENU =====
    function initMobileMenu() {
        const mobileToggle = document.getElementById('mobile-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (!mobileToggle || !navMenu) return;
        
        mobileToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
            
            // Hamburger animasyonu
            const spans = mobileToggle.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
                navMenu.style.display = 'flex';
                navMenu.style.flexDirection = 'column';
                navMenu.style.position = 'absolute';
                navMenu.style.top = '100%';
                navMenu.style.left = '0';
                navMenu.style.width = '100%';
                navMenu.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--bg-white');
                navMenu.style.padding = '1rem';
                navMenu.style.boxShadow = 'var(--shadow-lg)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
                navMenu.style.display = '';
            }
        });
        
        // Mobil menüde linklere tıklandığında menüyü kapat
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
                const spans = mobileToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
                navMenu.style.display = '';
            });
        });
    }

    // ===== STICKY HEADER =====
    function initStickyHeader() {
        const header = document.querySelector('.header');
        
        if (!header) return;
        
        function updateHeader() {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
        
        window.addEventListener('scroll', updateHeader);
        updateHeader(); // İlk yüklemede çalıştır
    }

    // ===== STICKY CTA =====
    function initStickyCTA() {
        const stickyCTA = document.querySelector('.sticky-cta');
        
        if (!stickyCTA) return;
        
        function updateStickyCTA() {
            if (window.scrollY > 500) {
                stickyCTA.classList.add('show');
            } else {
                stickyCTA.classList.remove('show');
            }
        }
        
        // Başlangıçta gizle
        setTimeout(() => {
            stickyCTA.style.transition = 'transform 0.3s ease';
            updateStickyCTA();
        }, 1000);
        
        window.addEventListener('scroll', updateStickyCTA);
        
        // CTA butonuna tıklandığında
        const ctaButton = stickyCTA.querySelector('.btn');
        if (ctaButton) {
            ctaButton.addEventListener('click', function(e) {
                e.preventDefault();
                showNotification('Yönlendiriliyorsunuz...', 'success');
                setTimeout(() => {
                    window.location.href = '#pricing';
                }, 500);
            });
        }
    }

    // ===== MODAL MANAGEMENT =====
    function initModals() {
        const loginBtn = document.getElementById('login-btn');
        const loginModal = document.getElementById('login-modal');
        const closeModal = document.querySelector('.modal-close');
        const registerLink = document.getElementById('register-link');
        
        if (loginBtn && loginModal) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showModal(loginModal);
            });
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                hideModal(loginModal);
            });
        }
        
        // Dışarı tıklandığında modalı kapat
        window.addEventListener('click', function(event) {
            if (event.target === loginModal) {
                hideModal(loginModal);
            }
        });
        
        // Kayıt ol linki
        if (registerLink) {
            registerLink.addEventListener('click', function(e) {
                e.preventDefault();
                hideModal(loginModal);
                showNotification('Kayıt sayfası yakında eklenecek!', 'info');
            });
        }
        
        // Giriş formu
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                // Demo girişi
                if (email && password) {
                    showNotification('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
                    hideModal(loginModal);
                    
                    // Demo kullanıcıyı kaydet
                    state.currentUser = {
                        email: email,
                        name: email.split('@')[0],
                        plan: 'free'
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showNotification('Lütfen tüm alanları doldurun.', 'error');
                }
            });
        }
    }

    function showModal(modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    // ===== SMOOTH SCROLL =====
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Boş veya modal linkleri için
                if (href === '#' || href.startsWith('#modal')) return;
                
                e.preventDefault();
                
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Mobil menüyü kapat
                    const mobileMenu = document.querySelector('.nav-menu');
                    if (mobileMenu && mobileMenu.classList.contains('active')) {
                        mobileMenu.classList.remove('active');
                    }
                }
            });
        });
    }

    // ===== SERVICE CARDS =====
    function initServiceCards() {
        document.querySelectorAll('.service-btn').forEach(button => {
            button.addEventListener('click', function() {
                const card = this.closest('.service-card');
                const serviceName = card.querySelector('.service-title').textContent;
                const price = card.querySelector('.service-price').textContent;
                
                addToCart({
                    id: generateId(),
                    type: 'service',
                    name: serviceName,
                    price: price,
                    quantity: 1,
                    addedAt: new Date().toISOString()
                });
                
                // Buton animasyonu
                this.innerHTML = '<i class="fas fa-check"></i> Eklendi';
                this.classList.remove('btn-outline');
                this.classList.add('btn-primary');
                this.disabled = true;
                
                setTimeout(() => {
                    this.innerHTML = 'Hemen Al';
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-outline');
                    this.disabled = false;
                }, 2000);
            });
        });
    }

    // ===== TESTIMONIAL SLIDER =====
    function initTestimonialSlider() {
        const slider = document.querySelector('.testimonial-slider');
        if (!slider) return;
        
        // Basit otomatik geçiş
        let currentIndex = 0;
        const cards = slider.children;
        
        function showNextTestimonial() {
            cards[currentIndex].style.opacity = '0';
            cards[currentIndex].style.transform = 'translateX(-20px)';
            
            currentIndex = (currentIndex + 1) % cards.length;
            
            cards[currentIndex].style.opacity = '1';
            cards[currentIndex].style.transform = 'translateX(0)';
            
            // Diğer kartları gizle
            Array.from(cards).forEach((card, index) => {
                if (index !== currentIndex) {
                    card.style.opacity = '0.5';
                    card.style.transform = 'scale(0.95)';
                }
            });
        }
        
        // Sadece birden fazla testimonial varsa
        if (cards.length > 1) {
            // İlk kartı göster
            cards[0].style.opacity = '1';
            cards[0].style.transform = 'translateX(0)';
            
            // 5 saniyede bir geçiş
            setInterval(showNextTestimonial, 5000);
        }
    }

    // ===== NEWSLETTER FORM =====
    function initNewsletterForm() {
        const newsletterForm = document.querySelector('.newsletter-form');
        
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const emailInput = this.querySelector('input[type="email"]');
                const email = emailInput.value;
                
                if (validateEmail(email)) {
                    showNotification('Bülten aboneliğiniz başarıyla kaydedildi!', 'success');
                    emailInput.value = '';
                    
                    // Demo: Aboneliği kaydet
                    const subscriptions = JSON.parse(localStorage.getItem('newsletterSubscriptions')) || [];
                    subscriptions.push({
                        email: email,
                        subscribedAt: new Date().toISOString()
                    });
                    localStorage.setItem('newsletterSubscriptions', JSON.stringify(subscriptions));
                } else {
                    showNotification('Lütfen geçerli bir e-posta adresi girin.', 'error');
                }
            });
        }
    }

    // ===== SCROLL ANIMATIONS =====
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.service-card, .pricing-card, .testimonial-card');
        
        function checkAnimation() {
            animatedElements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;
                
                if (elementTop < windowHeight - 100) {
                    element.classList.add('fade-in');
                }
            });
        }
        
        window.addEventListener('scroll', checkAnimation);
        checkAnimation(); // İlk yüklemede çalıştır
    }

    // ===== PAYMENT BUTTONS =====
    function initPaymentButtons() {
        document.querySelectorAll('.plan-btn').forEach(button => {
            button.addEventListener('click', function() {
                const card = this.closest('.pricing-card');
                const planName = card.querySelector('.plan-name').textContent;
                const planPrice = card.querySelector('.plan-price').textContent;
                
                showNotification(`${planName} planı seçildi! Ödeme sayfasına yönlendiriliyorsunuz...`, 'success');
                
                // Demo: Plan seçimini kaydet
                const selectedPlan = {
                    plan: planName,
                    price: planPrice,
                    selectedAt: new Date().toISOString()
                };
                localStorage.setItem('selectedPlan', JSON.stringify(selectedPlan));
                
                // Gerçek uygulamada: payment/checkout.html sayfasına yönlendir
                setTimeout(() => {
                    window.location.href = 'payment/checkout.html';
                }, 1500);
            });
        });
    }

    // ===== CART MANAGEMENT =====
    function addToCart(item) {
        state.cart.push(item);
        localStorage.setItem('cart', JSON.stringify(state.cart));
        updateCartBadge();
        showNotification(`${item.name} sepete eklendi!`, 'success');
    }

    function updateCartBadge() {
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            const count = state.cart.length;
            cartBadge.textContent = count;
            cartBadge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // ===== FAVORITES MANAGEMENT =====
    function updateFavoritesBadge() {
        const favBadge = document.querySelector('.fav-badge');
        if (favBadge) {
            const count = state.favorites.length;
            favBadge.textContent = count;
            favBadge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // ===== NOTIFICATION SYSTEM =====
    function showNotification(message, type = 'info') {
        // Mevcut bildirimleri temizle
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());
        
        // Yeni bildirim oluştur
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Bildirimi göster
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Kapatma butonu
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Otomatik kapatma
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
        
        // Bildirim stilleri
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--bg-card);
                border-left: 4px solid;
                border-radius: var(--radius-md);
                padding: var(--spacing-md) var(--spacing-lg);
                box-shadow: var(--shadow-xl);
                transform: translateX(150%);
                transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                z-index: 2000;
                max-width: 400px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--spacing-md);
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification-info { border-color: var(--primary-color); }
            .notification-success { border-color: var(--success-color); }
            .notification-warning { border-color: var(--warning-color); }
            .notification-error { border-color: var(--danger-color); }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: var(--spacing-md);
            }
            
            .notification-content i {
                font-size: 1.2em;
            }
            
            .notification-info .notification-content i { color: var(--primary-color); }
            .notification-success .notification-content i { color: var(--success-color); }
            .notification-warning .notification-content i { color: var(--warning-color); }
            .notification-error .notification-content i { color: var(--danger-color); }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--text-light);
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--radius-sm);
                transition: all var(--transition-fast);
            }
            
            .notification-close:hover {
                color: var(--danger-color);
                background: rgba(239, 68, 68, 0.1);
            }
        `;
        
        if (!document.querySelector('#notification-styles')) {
            style.id = 'notification-styles';
            document.head.appendChild(style);
        }
    }

    function getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ===== UTILITY FUNCTIONS =====
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // ===== WINDOW EVENTS =====
    window.addEventListener('resize', function() {
        // Mobil menüyü resetle
        const navMenu = document.querySelector('.nav-menu');
        if (window.innerWidth > 768 && navMenu) {
            navMenu.classList.remove('active');
            navMenu.style.display = '';
        }
    });

    // ===== PUBLIC API =====
    window.ElaldiApp = {
        state: state,
        toggleTheme: toggleTheme,
        showNotification: showNotification,
        addToCart: addToCart
    };

    // Uygulamayı başlat
    init();
});

// PWA desteği
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// Çevrimdışı destek
window.addEventListener('online', function() {
    if (window.ElaldiApp) {
        window.ElaldiApp.showNotification('Çevrimiçi moda geçildi', 'success');
    }
});

window.addEventListener('offline', function() {
    if (window.ElaldiApp) {
        window.ElaldiApp.showNotification('Çevrimdışı moddasınız', 'warning');
    }
});

// Sayfa kapatma/refresh uyarısı
window.addEventListener('beforeunload', function(e) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length > 0) {
        e.preventDefault();
        e.returnValue = 'Sepetinizde ürünler var. Sayfadan ayrılmak istediğinize emin misiniz?';
        return e.returnValue;
    }
});