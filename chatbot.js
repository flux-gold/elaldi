/**
 * Elaldi AI Chatbot
 * Customer support and lead qualification chatbot
 */

class Chatbot {
    constructor() {
        this.config = {
            apiEndpoint: 'https://api.elaldi.com/chatbot',
            openAIKey: 'sk-...', // Replace with your OpenAI key
            initialMessage: "Merhaba! Ben Elaldi AI asistanı. Size nasıl yardımcı olabilirim?",
            typingSpeed: 30, // ms per character
            maxHistory: 50,
            themes: {
                light: {
                    primary: '#667eea',
                    secondary: '#764ba2',
                    background: '#ffffff',
                    text: '#333333'
                },
                dark: {
                    primary: '#8a2be2',
                    secondary: '#4b0082',
                    background: '#1a1a1a',
                    text: '#ffffff'
                }
            }
        };
        
        this.state = {
            isOpen: false,
            isTyping: false,
            messages: [],
            conversationId: this.generateConversationId(),
            userInfo: this.getUserInfo(),
            context: {}
        };
        
        this.init();
    }

    init() {
        this.createUI();
        this.loadHistory();
        this.setupEventListeners();
        this.setTheme();
        
        // Send welcome message after delay
        setTimeout(() => {
            if (this.state.messages.length === 0) {
                this.addBotMessage(this.config.initialMessage);
            }
        }, 1000);
    }

    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'elaldi-chatbot';
        this.container.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-title">
                    <span class="chatbot-avatar">🤖</span>
                    <h3>Elaldi AI</h3>
                    <span class="chatbot-status online"></span>
                </div>
                <button class="chatbot-close">×</button>
            </div>
            
            <div class="chatbot-messages" id="chatMessages"></div>
            
            <div class="chatbot-input-area">
                <div class="quick-replies" id="quickReplies"></div>
                <div class="input-container">
                    <input type="text" 
                           placeholder="Mesajınızı yazın..." 
                           id="chatInput"
                           autocomplete="off">
                    <button id="sendMessage">➤</button>
                </div>
                <div class="chatbot-footer">
                    <span class="typing-indicator" id="typingIndicator">AI yazıyor...</span>
                    <button class="clear-chat" title="Sohbeti temizle">🗑️</button>
                </div>
            </div>
        `;
        
        // Create toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'chatbot-toggle';
        this.toggleButton.innerHTML = '💬';
        this.toggleButton.title = 'Chatbot';
        
        // Add to page
        document.body.appendChild(this.container);
        document.body.appendChild(this.toggleButton);
        
        // Add styles
        this.addStyles();
    }

    addStyles() {
        const styles = `
            .elaldi-chatbot {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 350px;
                height: 500px;
                background: ${this.config.themes.light.background};
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                z-index: 10000;
                transform: translateY(100px) scale(0.9);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid #e1e5e9;
                overflow: hidden;
            }
            
            .elaldi-chatbot.open {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
            
            .chatbot-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                transition: all 0.3s;
            }
            
            .chatbot-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
            }
            
            .chatbot-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .chatbot-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .chatbot-avatar {
                font-size: 24px;
            }
            
            .chatbot-title h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .chatbot-status {
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .chatbot-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.3s;
            }
            
            .chatbot-close:hover {
                background: rgba(255,255,255,0.2);
            }
            
            .chatbot-messages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .message {
                max-width: 80%;
                padding: 10px 15px;
                border-radius: 15px;
                position: relative;
                animation: messageAppear 0.3s ease-out;
            }
            
            @keyframes messageAppear {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message.bot {
                align-self: flex-start;
                background: #f0f2f5;
                color: #333;
                border-bottom-left-radius: 5px;
            }
            
            .message.user {
                align-self: flex-end;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-bottom-right-radius: 5px;
            }
            
            .message-time {
                font-size: 10px;
                opacity: 0.7;
                margin-top: 5px;
                text-align: right;
            }
            
            .quick-replies {
                padding: 10px 20px;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                background: #f8f9fa;
                border-bottom: 1px solid #e1e5e9;
            }
            
            .quick-reply {
                background: white;
                border: 1px solid #ddd;
                border-radius: 20px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .quick-reply:hover {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .input-container {
                padding: 15px 20px;
                display: flex;
                gap: 10px;
            }
            
            #chatInput {
                flex: 1;
                padding: 12px 15px;
                border: 2px solid #e1e5e9;
                border-radius: 25px;
                font-size: 14px;
                transition: border 0.3s;
            }
            
            #chatInput:focus {
                outline: none;
                border-color: #667eea;
            }
            
            #sendMessage {
                width: 45px;
                height: 45px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                transition: transform 0.3s;
            }
            
            #sendMessage:hover {
                transform: scale(1.1);
            }
            
            .chatbot-footer {
                padding: 0 20px 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .typing-indicator {
                font-size: 12px;
                color: #666;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .typing-indicator.visible {
                opacity: 1;
            }
            
            .clear-chat {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 16px;
                padding: 5px;
                border-radius: 5px;
                transition: background 0.3s;
            }
            
            .clear-chat:hover {
                background: #f0f0f0;
            }
            
            /* Dark theme */
            body.dark-theme .elaldi-chatbot {
                background: ${this.config.themes.dark.background};
                border-color: #333;
            }
            
            body.dark-theme .message.bot {
                background: #2d2d2d;
                color: white;
            }
            
            body.dark-theme .quick-replies {
                background: #2d2d2d;
                border-color: #333;
            }
            
            body.dark-theme .quick-reply {
                background: #333;
                border-color: #444;
                color: white;
            }
            
            body.dark-theme #chatInput {
                background: #333;
                border-color: #444;
                color: white;
            }
            
            @media (max-width: 480px) {
                .elaldi-chatbot {
                    width: calc(100vw - 40px);
                    height: 70vh;
                    right: 20px;
                    left: 20px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        // Toggle button
        this.toggleButton.addEventListener('click', () => this.toggle());
        
        // Close button
        this.container.querySelector('.chatbot-close').addEventListener('click', () => this.toggle());
        
        // Send message
        const sendBtn = this.container.querySelector('#sendMessage');
        const input = this.container.querySelector('#chatInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Clear chat
        this.container.querySelector('.clear-chat').addEventListener('click', () => this.clearChat());
        
        // Quick replies (will be added dynamically)
        
        // Auto-focus input when opened
        this.container.addEventListener('transitionend', () => {
            if (this.state.isOpen) {
                input.focus();
            }
        });
    }

    toggle() {
        this.state.isOpen = !this.state.isOpen;
        this.container.classList.toggle('open', this.state.isOpen);
        this.toggleButton.style.opacity = this.state.isOpen ? '0' : '1';
        
        // Track analytics
        if (this.state.isOpen) {
            window.ElaldiAnalytics?.trackEvent('chatbot_opened', {
                conversation_id: this.state.conversationId
            });
        }
    }

    async sendMessage() {
        const input = this.container.querySelector('#chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addUserMessage(message);
        input.value = '';
        
        // Show typing indicator
        this.showTyping(true);
        
        try {
            // Get AI response
            const response = await this.getAIResponse(message);
            
            // Add bot message
            this.addBotMessage(response);
            
            // Update quick replies based on context
            this.updateQuickReplies();
            
        } catch (error) {
            console.error('Chatbot error:', error);
            this.addBotMessage("Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        } finally {
            this.showTyping(false);
            this.saveHistory();
        }
    }

    async getAIResponse(message) {
        // Prepare request data
        const requestData = {
            message: message,
            conversation_id: this.state.conversationId,
            context: this.state.context,
            user_info: this.state.userInfo,
            history: this.state.messages.slice(-10), // Last 10 messages
            timestamp: new Date().toISOString()
        };
        
        // Check for predefined responses first
        const predefined = this.getPredefinedResponse(message);
        if (predefined) return predefined;
        
        try {
            // Call AI API (OpenAI GPT)
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.openAIKey}`
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update context
            if (data.context) {
                this.state.context = { ...this.state.context, ...data.context };
            }
            
            return data.response || "Anlayamadım, lütfen tekrar açıklar mısınız?";
            
        } catch (error) {
            // Fallback to rule-based responses
            return this.getFallbackResponse(message);
        }
    }

    getPredefinedResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        const responses = {
            // Greetings
            'merhaba': 'Merhaba! Size nasıl yardımcı olabilirim?',
            'selam': 'Selam! Elaldi AI asistanıyım. Pazarlama danışmanlığı, SaaS araçları veya mikro hizmetler hakkında sorularınızı yanıtlayabilirim.',
            'hi': 'Hello! How can I help you today?',
            
            // Services
            'hizmetler': 'Elaldi olarak sunduğumuz hizmetler:\n\n1. Pazarlama Danışmanlığı\n2. Mikro Hizmet Pazarı\n3. SaaS Araçları\n\nHangi hizmetle ilgileniyorsunuz?',
            'paketler': 'Mevcut paketlerimiz:\n\n• Starter: ₺499/ay\n• Professional: ₺999/ay\n• Business: ₺1,999/ay\n\nDetaylı bilgi için: https://flux-gold.github.io/elaldi/pages/saas.html',
            
            // Pricing
            'fiyat': 'Fiyatlandırma planlarımız:\n\n- Starter: Aylık ₺499\n- Professional: Aylık ₺999 (en popüler)\n- Business: Aylık ₺1,999\n\n14 günlük ücretsiz demo talep edebilirsiniz.',
            'ücret': 'Tüm fiyatlar aylık abonelik üzerinedir. Yıllık ödemede %20 indirim uygulanır.',
            
            // Payment
            'ödeme': 'Ödeme yöntemlerimiz:\n• EFT/Havale\n• Kredi Kartı (yakında)\n• Online Ödeme\n\nEFT ödemeler admin onayı sonrası aktifleştirilir.',
            'eft': 'EFT/Havale bilgileri:\n\nHesap Adı: Elaldi Digital\nBanka: İş Bankası\nIBAN: TRXX XXXX XXXX XXXX XXXX XXXX\n\nÖdeme sonrası dekontu WhatsApp +90 542 123 9770 numarasına gönderin.',
            
            // Contact
            'iletişim': 'İletişim bilgilerimiz:\n\n📧 E-posta: huseyinelald1@icloud.com\n📱 WhatsApp: +90 542 123 9770\n📷 Instagram: @huseyinelaldi7\n🌐 Website: https://flux-gold.github.io/elaldi/',
            'destek': 'Destek ekibimize ulaşmak için:\n\n• WhatsApp: +90 542 123 9770\n• E-posta: huseyinelald1@icloud.com\n• Kullanıcı panelinden destek talebi oluşturabilirsiniz.',
            
            // Demo
            'demo': 'Demo talep etmek için:\n1. https://flux-gold.github.io/elaldi/pages/saas.html sayfasına gidin\n2. "Demo Talep Et" butonuna tıklayın\n3. Formu doldurun\n\n14 gün boyunca tüm özellikleri ücretsiz deneyebilirsiniz.',
            
            // Admin
            'admin': 'Admin panele sadece yetkili kişiler erişebilir. Admin girişi için: https://flux-gold.github.io/elaldi/pages/admin-login.html'
        };
        
        // Check for exact matches
        if (responses[message.toLowerCase()]) {
            return responses[message.toLowerCase()];
        }
        
        // Check for keyword matches
        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerMessage.includes(keyword)) {
                return response;
            }
        }
        
        return null;
    }

    getFallbackResponse(message) {
        const fallbacks = [
            "Anladım. Bu konuda daha detaylı bilgi için https://flux-gold.github.io/elaldi/pages/contact.html adresinden bize ulaşabilirsiniz.",
            "Bu sorunuz için en doğru cevabı almak için lütfen WhatsApp +90 542 123 9770 numaramızdan iletişime geçin.",
            "Bu konuda sizi bir uzmanımızla görüştürmek istiyorum. İletişim bilgilerinizi paylaşabilir misiniz?",
            "Bu sorunun cevabını blog yazılarımızda bulabilirsiniz: https://flux-gold.github.io/elaldi/pages/blog.html",
            "Üzgünüm, bu soruya henüz hazırlıklı değilim. Lütfen farklı bir soru sorun veya destek ekibimizle iletişime geçin."
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addUserMessage(text) {
        const message = {
            id: Date.now(),
            type: 'user',
            text: text,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };
        
        this.state.messages.push(message);
        this.renderMessage(message);
        
        // Track message in analytics
        window.ElaldiAnalytics?.trackEvent('chatbot_message', {
            type: 'user',
            length: text.length,
            conversation_id: this.state.conversationId
        });
    }

    async addBotMessage(text) {
        const message = {
            id: Date.now() + 1,
            type: 'bot',
            text: '',
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };
        
        this.state.messages.push(message);
        
        // Type message character by character
        await this.typeMessage(message, text);
        
        // Track message in analytics
        window.ElaldiAnalytics?.trackEvent('chatbot_message', {
            type: 'bot',
            length: text.length,
            conversation_id: this.state.conversationId
        });
    }

    async typeMessage(message, text) {
        this.showTyping(true);
        
        // Create message element
        const element = this.renderMessage(message);
        
        // Type effect
        for (let i = 0; i < text.length; i++) {
            message.text += text[i];
            element.querySelector('.message-text').textContent = message.text;
            
            // Scroll to bottom
            this.scrollToBottom();
            
            await this.sleep(this.config.typingSpeed);
        }
        
        this.showTyping(false);
        
        // Add time after typing is complete
        element.querySelector('.message-time').textContent = message.time;
    }

    renderMessage(message) {
        const messagesContainer = this.container.querySelector('#chatMessages');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${message.type}`;
        messageElement.innerHTML = `
            <div class="message-text">${message.text}</div>
            <div class="message-time">${message.time}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        return messageElement;
    }

    updateQuickReplies() {
        const quickRepliesContainer = this.container.querySelector('#quickReplies');
        const suggestions = this.getQuickReplies();
        
        quickRepliesContainer.innerHTML = suggestions.map(suggestion => `
            <button class="quick-reply" data-message="${suggestion}">
                ${suggestion}
            </button>
        `).join('');
        
        // Add event listeners to quick replies
        quickRepliesContainer.querySelectorAll('.quick-reply').forEach(button => {
            button.addEventListener('click', (e) => {
                const message = e.target.dataset.message;
                this.addUserMessage(message);
                setTimeout(() => this.sendMessage(), 500);
            });
        });
    }

    getQuickReplies() {
        // Base suggestions
        let suggestions = [
            'Hizmetleriniz neler?',
            'Fiyatlar nedir?',
            'Demo talep etmek istiyorum',
            'EFT bilgileriniz?',
            'İletişim bilgileriniz'
        ];
        
        // Context-based suggestions
        if (this.state.context.interested_in === 'saas') {
            suggestions = [
                'SaaS plan detayları',
                'Demo nasıl alınır?',
                'API dokümantasyonu',
                'Kullanım limitleri'
            ];
        } else if (this.state.context.interested_in === 'consulting') {
            suggestions = [
                'Danışmanlık paketleri',
                'Referanslar',
                'Çalışma şekliniz',
                'Ücretlendirme'
            ];
        }
        
        return suggestions.slice(0, 4); // Max 4 suggestions
    }

    showTyping(show) {
        const indicator = this.container.querySelector('#typingIndicator');
        indicator.classList.toggle('visible', show);
        this.state.isTyping = show;
    }

    scrollToBottom() {
        const messagesContainer = this.container.querySelector('#chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    clearChat() {
        if (confirm('Sohbet geçmişini temizlemek istediğinize emin misiniz?')) {
            this.state.messages = [];
            this.state.conversationId = this.generateConversationId();
            this.container.querySelector('#chatMessages').innerHTML = '';
            
            // Add welcome message
            setTimeout(() => {
                this.addBotMessage(this.config.initialMessage);
            }, 500);
            
            // Track clear event
            window.ElaldiAnalytics?.trackEvent('chatbot_cleared');
        }
    }

    setTheme() {
        // Check for dark theme
        if (document.body.classList.contains('dark-theme')) {
            this.container.style.setProperty('--chatbot-bg', this.config.themes.dark.background);
            this.container.style.setProperty('--chatbot-text', this.config.themes.dark.text);
        }
    }

    getUserInfo() {
        return {
            user_id: localStorage.getItem('user_id') || 'anonymous',
            page_url: window.location.href,
            referrer: document.referrer,
            device: this.getDeviceInfo(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
        };
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = 'desktop';
        
        if (/mobile/i.test(ua)) device = 'mobile';
        if (/tablet/i.test(ua)) device = 'tablet';
        
        return {
            type: device,
            os: this.getOS(),
            browser: this.getBrowser()
        };
    }

    getOS() {
        const ua = navigator.userAgent;
        if (/windows/i.test(ua)) return 'Windows';
        if (/macintosh|mac os x/i.test(ua)) return 'macOS';
        if (/linux/i.test(ua)) return 'Linux';
        if (/android/i.test(ua)) return 'Android';
        if (/ios|iphone|ipad|ipod/i.test(ua)) return 'iOS';
        return 'Unknown';
    }

    getBrowser() {
        const ua = navigator.userAgent;
        if (/chrome/i.test(ua) && !/edge/i.test(ua)) return 'Chrome';
        if (/firefox/i.test(ua)) return 'Firefox';
        if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
        if (/edge/i.test(ua)) return 'Edge';
        if (/opera|opr/i.test(ua)) return 'Opera';
        return 'Unknown';
    }

    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('elaldi_chat_history');
            if (saved) {
                const data = JSON.parse(saved);
                // Only load if from today
                if (new Date(data.date).toDateString() === new Date().toDateString()) {
                    this.state.messages = data.messages.slice(-this.config.maxHistory);
                    this.renderHistory();
                }
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }
    }

    saveHistory() {
        try {
            const data = {
                date: new Date().toISOString(),
                messages: this.state.messages.slice(-this.config.maxHistory),
                conversation_id: this.state.conversationId
            };
            localStorage.setItem('elaldi_chat_history', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save chat history:', e);
        }
    }

    renderHistory() {
        const messagesContainer = this.container.querySelector('#chatMessages');
        messagesContainer.innerHTML = '';
        
        this.state.messages.forEach(message => {
            this.renderMessage(message);
        });
        
        this.scrollToBottom();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API
    open() {
        this.state.isOpen = true;
        this.container.classList.add('open');
        this.toggleButton.style.opacity = '0';
    }

    close() {
        this.state.isOpen = false;
        this.container.classList.remove('open');
        this.toggleButton.style.opacity = '1';
    }

    sendAutoMessage(message, delay = 1000) {
        setTimeout(() => {
            this.addBotMessage(message);
        }, delay);
    }

    setContext(key, value) {
        this.state.context[key] = value;
    }

    getContext() {
        return { ...this.state.context };
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ElaldiChatbot = new Chatbot();
    
    // Optional: Auto-open based on conditions
    setTimeout(() => {
        const isFirstVisit = !localStorage.getItem('chatbot_seen');
        const timeOnPage = 30000; // 30 seconds
        
        if (isFirstVisit) {
            setTimeout(() => {
                window.ElaldiChatbot.open();
                window.ElaldiChatbot.sendAutoMessage("Merhaba! İlk kez ziyaret ettiğiniz için teşekkürler. Size nasıl yardımcı olabilirim?");
                localStorage.setItem('chatbot_seen', 'true');
            }, timeOnPage);
        }
    }, 1000);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chatbot;
}