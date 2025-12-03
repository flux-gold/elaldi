/**
 * Elaldi Analytics Integration
 * Google Analytics, Heatmap, A/B Testing and Event Tracking
 */

class AnalyticsManager {
    constructor() {
        this.initialized = false;
        this.userId = this.getUserId();
        this.sessionId = this.generateSessionId();
        this.eventsQueue = [];
        this.config = {
            gaTrackingId: 'UA-XXXXX-Y', // Replace with actual GA ID
            hotjarId: 1234567, // Replace with actual Hotjar ID
            fbPixelId: 'XXXXXXXXXXXXXXX', // Replace with Facebook Pixel ID
            debug: window.location.hostname === 'localhost'
        };
    }

    init() {
        if (this.initialized) return;
        
        // Initialize Google Analytics
        this.initGoogleAnalytics();
        
        // Initialize Hotjar (Heatmap)
        this.initHotjar();
        
        // Initialize Facebook Pixel
        this.initFacebookPixel();
        
        // Initialize custom event tracking
        this.initEventListeners();
        
        // Process queued events
        this.processQueue();
        
        this.initialized = true;
        console.log('Analytics initialized');
    }

    initGoogleAnalytics() {
        // Load GA script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.gaTrackingId}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', this.config.gaTrackingId, {
            page_title: document.title,
            page_location: window.location.href,
            user_id: this.userId,
            session_id: this.sessionId
        });

        // Enhanced ecommerce tracking
        gtag('event', 'page_view', {
            page_title: document.title,
            page_location: window.location.href,
            page_path: window.location.pathname
        });
    }

    initHotjar() {
        if (!this.config.hotjarId) return;
        
        (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:this.config.hotjarId,hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
        })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    }

    initFacebookPixel() {
        if (!this.config.fbPixelId) return;
        
        !function(f,b,e,v,n,t,s){
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            
        fbq('init', this.config.fbPixelId);
        fbq('track', 'PageView');
    }

    initEventListeners() {
        // CTA clicks
        document.addEventListener('click', (e) => {
            const cta = e.target.closest('[data-cta], .btn-primary, .btn-secondary');
            if (cta) {
                this.trackEvent('cta_click', {
                    cta_text: cta.textContent.trim(),
                    cta_type: cta.className,
                    page_url: window.location.pathname
                });
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                this.trackEvent('form_submit', {
                    form_id: e.target.id || 'unknown',
                    form_action: e.target.action,
                    page_url: window.location.pathname
                });
            }
        });

        // Video plays
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'VIDEO') {
                this.trackEvent('video_play', {
                    video_src: e.target.src,
                    current_time: e.target.currentTime
                });
            }
        }, true);

        // Scroll depth tracking
        let scrollTracked = [25, 50, 75, 100];
        window.addEventListener('scroll', () => {
            const scrollPercent = this.getScrollPercentage();
            scrollTracked.forEach(percent => {
                if (scrollPercent >= percent && !this.scrollTracked[percent]) {
                    this.trackEvent('scroll_depth', {
                        depth: percent,
                        page_url: window.location.pathname
                    });
                    this.scrollTracked[percent] = true;
                }
            });
        });

        // Time on page tracking
        this.startTime = new Date();
        window.addEventListener('beforeunload', () => {
            const timeSpent = new Date() - this.startTime;
            this.trackEvent('page_engagement', {
                time_spent_seconds: Math.round(timeSpent / 1000),
                page_url: window.location.pathname
            });
        });
    }

    trackEvent(eventName, eventData = {}) {
        const event = {
            name: eventName,
            data: {
                ...eventData,
                user_id: this.userId,
                session_id: this.sessionId,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                referrer: document.referrer,
                user_agent: navigator.userAgent
            }
        };

        // Send to GA
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }

        // Send to Facebook Pixel for conversion events
        if (eventName.includes('purchase') || eventName.includes('subscribe')) {
            if (typeof fbq !== 'undefined') {
                fbq('track', eventName.replace('_', ' ').toUpperCase(), eventData);
            }
        }

        // Send to internal API (for custom analytics)
        this.sendToAPI(event);

        // Debug logging
        if (this.config.debug) {
            console.log('Event tracked:', event);
        }
    }

    trackPageView(pageData = {}) {
        const pageInfo = {
            page_title: document.title,
            page_url: window.location.href,
            page_path: window.location.pathname,
            ...pageData
        };

        this.trackEvent('page_view', pageInfo);
    }

    trackConversion(conversionData) {
        this.trackEvent('conversion', {
            ...conversionData,
            value: conversionData.value || 0,
            currency: conversionData.currency || 'TRY'
        });
    }

    trackError(errorData) {
        this.trackEvent('error', {
            error_message: errorData.message,
            error_stack: errorData.stack,
            error_type: errorData.type || 'javascript',
            page_url: window.location.href
        });
    }

    // A/B Testing
    initABTest(testId, variants) {
        const variant = this.getABTestVariant(testId, variants);
        localStorage.setItem(`ab_test_${testId}`, variant);
        
        this.trackEvent('ab_test_assigned', {
            test_id: testId,
            variant: variant,
            timestamp: new Date().toISOString()
        });
        
        return variant;
    }

    getABTestVariant(testId, variants) {
        const stored = localStorage.getItem(`ab_test_${testId}`);
        if (stored) return stored;
        
        // Simple random assignment
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const [variant, percentage] of Object.entries(variants)) {
            cumulative += percentage;
            if (random <= cumulative) {
                return variant;
            }
        }
        
        return Object.keys(variants)[0];
    }

    // Heatmap events
    trackHeatmapInteraction(type, element, position) {
        this.trackEvent('heatmap_interaction', {
            interaction_type: type,
            element: element.tagName,
            element_id: element.id || 'none',
            element_class: element.className,
            x_position: position.x,
            y_position: position.y,
            page_url: window.location.href
        });
    }

    // Helper methods
    getUserId() {
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('user_id', userId);
        }
        return userId;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getScrollPercentage() {
        const h = document.documentElement;
        const b = document.body;
        const st = 'scrollTop';
        const sh = 'scrollHeight';
        
        return (h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight) * 100;
    }

    sendToAPI(data) {
        // In production, send to your analytics API
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).catch(err => {
            if (this.config.debug) {
                console.error('Analytics API error:', err);
            }
        });
    }

    processQueue() {
        while (this.eventsQueue.length > 0) {
            const event = this.eventsQueue.shift();
            this.trackEvent(event.name, event.data);
        }
    }
}

// Export as global
window.ElaldiAnalytics = new AnalyticsManager();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.ElaldiAnalytics.init();
    
    // Track initial page view
    window.ElaldiAnalytics.trackPageView();
});

// Error tracking
window.addEventListener('error', (event) => {
    window.ElaldiAnalytics.trackError({
        message: event.message,
        stack: event.error?.stack,
        type: 'window_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    window.ElaldiAnalytics.trackError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        type: 'promise_rejection'
    });
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = window.performance.timing;
            const loadTime = perfData.loadEventEnd - perfData.navigationStart;
            
            window.ElaldiAnalytics.trackEvent('performance_metrics', {
                load_time: loadTime,
                dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
                first_paint: performance.getEntriesByName('first-paint')[0]?.startTime,
                first_contentful_paint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
                connection_type: navigator.connection?.effectiveType,
                device_memory: navigator.deviceMemory
            });
        }, 0);
    });
}