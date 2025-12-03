/**
 * Elaldi Gamification System
 * Badges, points, rewards and engagement tracking
 */

class GamificationSystem {
    constructor() {
        this.config = {
            points: {
                daily_login: 10,
                service_purchase: 50,
                subscription: 100,
                referral: 25,
                review: 30,
                social_share: 15,
                content_read: 5,
                profile_completion: 20
            },
            badges: {
                beginner: { points: 100, icon: '🟢', title: 'Başlangıç' },
                explorer: { points: 500, icon: '🔵', title: 'Kaşif' },
                pro: { points: 1000, icon: '🟣', title: 'Profesyonel' },
                expert: { points: 2500, icon: '🟡', title: 'Uzman' },
                master: { points: 5000, icon: '🔴', title: 'Usta' },
                legend: { points: 10000, icon: '⭐', title: 'Efsane' }
            },
            rewards: {
                discount_5: { points: 500, reward: '%5 İndirim' },
                discount_10: { points: 1000, reward: '%10 İndirim' },
                free_month: { points: 2500, reward: '1 Ay Ücretsiz' },
                vip_support: { points: 5000, reward: 'VIP Destek' }
            },
            streaks: {
                daily_login: {
                    rewards: [5, 10, 15, 20, 25, 30, 50],
                    max_streak: 7
                }
            }
        };
        
        this.user = this.loadUserData();
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
        this.checkDailyLogin();
        this.updateUI();
        
        // Auto-save every 5 minutes
        setInterval(() => this.saveUserData(), 5 * 60 * 1000);
    }

    createUI() {
        // Create gamification panel
        this.panel = document.createElement('div');
        this.panel.className = 'gamification-panel';
        this.panel.innerHTML = `
            <div class="gamification-header">
                <h3><span class="gamification-icon">🏆</span> Puanlarım</h3>
                <button class="close-panel">×</button>
            </div>
            <div class="gamification-content">
                <div class="points-display">
                    <div class="total-points">
                        <span class="points-value">${this.user.points}</span>
                        <span class="points-label">Toplam Puan</span>
                    </div>
                    <div class="level-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${this.getLevelProgress()}%"></div>
                        </div>
                        <div class="level-info">
                            <span class="current-level">${this.user.level.title}</span>
                            <span class="next-level">Sonraki: ${this.getNextLevel().title}</span>
                        </div>
                    </div>
                </div>
                
                <div class="badges-section">
                    <h4>Rozetlerim</h4>
                    <div class="badges-container" id="badgesContainer"></div>
                </div>
                
                <div class="rewards-section">
                    <h4>Ödüller</h4>
                    <div class="rewards-container" id="rewardsContainer"></div>
                </div>
                
                <div class="achievements-section">
                    <h4>Başarılar</h4>
                    <div class="achievements-list" id="achievementsList"></div>
                </div>
                
                <div class="leaderboard-section">
                    <h4>Liderlik Tablosu</h4>
                    <div class="leaderboard" id="leaderboard"></div>
                </div>
            </div>
            <div class="gamification-footer">
                <button class="claim-daily" id="claimDaily">
                    <span class="daily-icon">🎁</span> Günlük Ödül
                </button>
            </div>
        `;
        
        // Create toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'gamification-toggle';
        this.toggleButton.innerHTML = '🏆';
        this.toggleButton.title = 'Puanlarım ve Rozetler';
        
        // Add to page
        document.body.appendChild(this.panel);
        document.body.appendChild(this.toggleButton);
        
        // Add styles
        this.addStyles();
    }

    addStyles() {
        const styles = `
            .gamification-panel {
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%) translateX(400px);
                width: 350px;
                max-height: 80vh;
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 9998;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #e1e5e9;
            }
            
            .gamification-panel.open {
                transform: translateY(-50%) translateX(0);
            }
            
            .gamification-toggle {
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%);
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                z-index: 9997;
                box-shadow: 0 4px 20px rgba(255, 154, 158, 0.4);
                transition: all 0.3s;
            }
            
            .gamification-toggle:hover {
                transform: translateY(-50%) scale(1.1);
                box-shadow: 0 6px 25px rgba(255, 154, 158, 0.6);
            }
            
            .gamification-header {
                background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .gamification-header h3 {
                margin: 0;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .close-panel {
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
            
            .close-panel:hover {
                background: rgba(255,255,255,0.2);
            }
            
            .gamification-content {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .points-display {
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%);
                border-radius: 10px;
            }
            
            .points-value {
                font-size: 48px;
                font-weight: bold;
                background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                display: block;
            }
            
            .points-label {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
            }
            
            .level-progress {
                margin-top: 20px;
            }
            
            .progress-bar {
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 10px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #ff9a9e 0%, #fad0c4 100%);
                transition: width 0.5s ease-out;
            }
            
            .level-info {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #666;
            }
            
            .badges-section, .rewards-section, .achievements-section, .leaderboard-section {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
            }
            
            .badges-section h4, .rewards-section h4, .achievements-section h4, .leaderboard-section h4 {
                margin: 0 0 15px 0;
                font-size: 14px;
                color: #333;
            }
            
            .badges-container {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .badge {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
                position: relative;
                cursor: pointer;
                transition: transform 0.3s;
            }
            
            .badge:hover {
                transform: scale(1.1);
            }
            
            .badge.locked {
                background: #e0e0e0;
                color: #999;
                cursor: not-allowed;
            }
            
            .badge-tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                z-index: 100;
            }
            
            .badge:hover .badge-tooltip {
                opacity: 1;
            }
            
            .rewards-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .reward-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: white;
                border-radius: 5px;
                border: 1px solid #e0e0e0;
            }
            
            .reward-item.available {
                border-color: #4CAF50;
                background: #f1f8e9;
            }
            
            .reward-points {
                font-weight: bold;
                color: #ff9a9e;
            }
            
            .claim-reward {
                padding: 5px 10px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .claim-reward:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            
            .achievements-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .achievement-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                background: white;
                border-radius: 5px;
                font-size: 12px;
            }
            
            .achievement-icon {
                font-size: 16px;
            }
            
            .achievement-progress {
                flex: 1;
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
                overflow: hidden;
            }
            
            .achievement-progress-fill {
                height: 100%;
                background: #4CAF50;
                transition: width 0.5s;
            }
            
            .leaderboard {
                max-height: 200px;
                overflow-y: auto;
            }
            
            .leaderboard-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                border-bottom: 1px solid #eee;
            }
            
            .leaderboard-item.current-user {
                background: #e3f2fd;
                border-radius: 5px;
            }
            
            .leaderboard-rank {
                font-weight: bold;
                color: #ff9a9e;
            }
            
            .leaderboard-name {
                flex: 1;
                font-size: 12px;
            }
            
            .leaderboard-points {
                font-weight: bold;
                font-size: 12px;
            }
            
            .gamification-footer {
                padding: 15px 20px;
                border-top: 1px solid #e1e5e9;
            }
            
            .claim-daily {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: transform 0.3s;
            }
            
            .claim-daily:hover {
                transform: scale(1.05);
            }
            
            .claim-daily.claimed {
                background: #4CAF50;
            }
            
            .daily-icon {
                font-size: 18px;
            }
            
            /* Animations */
            @keyframes pointsIncrease {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            @keyframes badgeUnlock {
                0% { transform: scale(0) rotate(0deg); }
                50% { transform: scale(1.2) rotate(180deg); }
                100% { transform: scale(1) rotate(360deg); }
            }
            
            .points-animate {
                animation: pointsIncrease 0.5s ease-out;
            }
            
            .badge-unlock {
                animation: badgeUnlock 1s ease-out;
            }
            
            /* Dark theme */
            body.dark-theme .gamification-panel {
                background: #1a1a1a;
                border-color: #333;
            }
            
            body.dark-theme .gamification-content {
                color: white;
            }
            
            body.dark-theme .badges-section,
            body.dark-theme .rewards-section,
            body.dark-theme .achievements-section,
            body.dark-theme .leaderboard-section {
                background: #2d2d2d;
            }
            
            body.dark-theme .reward-item {
                background: #333;
                border-color: #444;
                color: white;
            }
            
            body.dark-theme .achievement-item {
                background: #333;
                color: white;
            }
            
            @media (max-width: 480px) {
                .gamification-panel {
                    width: calc(100vw - 40px);
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
        this.toggleButton.addEventListener('click', () => this.togglePanel());
        
        // Close button
        this.panel.querySelector('.close-panel').addEventListener('click', () => this.togglePanel());
        
        // Daily reward claim
        this.panel.querySelector('#claimDaily').addEventListener('click', () => this.claimDailyReward());
        
        // Badge tooltips
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.badge')) {
                this.showBadgeTooltip(e.target.closest('.badge'));
            }
        });
    }

    loadUserData() {
        try {
            const saved = localStorage.getItem('elaldi_gamification');
            if (saved) {
                const data = JSON.parse(saved);
                return {
                    points: data.points || 0,
                    badges: data.badges || [],
                    achievements: data.achievements || {},
                    dailyStreak: data.dailyStreak || 0,
                    lastLogin: data.lastLogin ? new Date(data.lastLogin) : null,
                    level: this.calculateLevel(data.points || 0),
                    userId: data.userId || this.generateUserId(),
                    leaderboardPosition: data.leaderboardPosition || 0
                };
            }
        } catch (e) {
            console.error('Failed to load gamification data:', e);
        }
        
        // Default user data
        return {
            points: 0,
            badges: [],
            achievements: {
                first_login: true,
                profile_complete: false,
                first_service: false,
                first_review: false
            },
            dailyStreak: 0,
            lastLogin: null,
            level: this.calculateLevel(0),
            userId: this.generateUserId(),
            leaderboardPosition: 0
        };
    }

    saveUserData() {
        try {
            const data = {
                points: this.user.points,
                badges: this.user.badges,
                achievements: this.user.achievements,
                dailyStreak: this.user.dailyStreak,
                lastLogin: this.user.lastLogin ? this.user.lastLogin.toISOString() : null,
                userId: this.user.userId,
                leaderboardPosition: this.user.leaderboardPosition,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('elaldi_gamification', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save gamification data:', e);
        }
    }

    checkDailyLogin() {
        const today = new Date().toDateString();
        const lastLogin = this.user.lastLogin ? this.user.lastLogin.toDateString() : null;
        
        if (lastLogin !== today) {
            // Check if consecutive day
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastLogin === yesterday.toDateString()) {
                this.user.dailyStreak++;
            } else {
                this.user.dailyStreak = 1;
            }
            
            this.user.lastLogin = new Date();
            this.addPoints('daily_login', this.user.dailyStreak);
            this.checkAchievements();
            this.updateUI();
            this.saveUserData();
        }
    }

    addPoints(reason, multiplier = 1) {
        const points = (this.config.points[reason] || 10) * multiplier;
        this.user.points += points;
        
        // Animate points display
        this.animatePoints(points);
        
        // Check for level up
        const oldLevel = this.user.level;
        this.user.level = this.calculateLevel(this.user.points);
        
        if (oldLevel.title !== this.user.level.title) {
            this.levelUp(oldLevel, this.user.level);
        }
        
        // Check for badge unlocks
        this.checkBadgeUnlocks();
        
        // Update UI
        this.updateUI();
        
        // Track analytics
        window.ElaldiAnalytics?.trackEvent('points_earned', {
            reason: reason,
            points: points,
            total_points: this.user.points,
            level: this.user.level.title
        });
        
        return points;
    }

    animatePoints(points) {
        const pointsValue = this.panel.querySelector('.points-value');
        pointsValue.classList.add('points-animate');
        
        // Show notification
        this.showNotification(`+${points} puan kazandınız! 🎉`);
        
        setTimeout(() => {
            pointsValue.classList.remove('points-animate');
            pointsValue.textContent = this.user.points;
        }, 500);
    }

    calculateLevel(points) {
        let level = { title: 'Başlangıç', icon: '🟢', points: 0 };
        
        for (const [key, badge] of Object.entries(this.config.badges)) {
            if (points >= badge.points) {
                level = { ...badge, key };
            } else {
                break;
            }
        }
        
        return level;
    }

    getLevelProgress() {
        const currentLevelPoints = this.user.level.points;
        const nextLevel = this.getNextLevel();
        const nextLevelPoints = nextLevel.points;
        const pointsForNextLevel = nextLevelPoints - currentLevelPoints;
        const userPointsBeyondCurrent = this.user.points - currentLevelPoints;
        
        return Math.min(100, (userPointsBeyondCurrent / pointsForNextLevel) * 100);
    }

    getNextLevel() {
        const levels = Object.values(this.config.badges);
        const currentIndex = levels.findIndex(level => level.title === this.user.level.title);
        
        if (currentIndex < levels.length - 1) {
            return levels[currentIndex + 1];
        }
        
        return { title: 'Maksimum', points: this.user.level.points + 1000 };
    }

    levelUp(oldLevel, newLevel) {
        // Show level up notification
        this.showNotification(`🎉 Seviye Atladınız: ${newLevel.title}!`, 'success');
        
        // Unlock badge if applicable
        if (newLevel.key && !this.user.badges.includes(newLevel.key)) {
            this.user.badges.push(newLevel.key);
            this.unlockBadge(newLevel.key);
        }
        
        // Track analytics
        window.ElaldiAnalytics?.trackEvent('level_up', {
            old_level: oldLevel.title,
            new_level: newLevel.title,
            points: this.user.points
        });
    }

    checkBadgeUnlocks() {
        for (const [badgeKey, badge] of Object.entries(this.config.badges)) {
            if (this.user.points >= badge.points && !this.user.badges.includes(badgeKey)) {
                this.user.badges.push(badgeKey);
                this.unlockBadge(badgeKey);
            }
        }
    }

    unlockBadge(badgeKey) {
        const badge = this.config.badges[badgeKey];
        if (!badge) return;
        
        // Show badge unlock notification
        this.showNotification(`🏆 Yeni Rozet: ${badge.title}!`, 'badge');
        
        // Animate badge in UI
        const badgeElement = this.panel.querySelector(`.badge[data-badge="${badgeKey}"]`);
        if (badgeElement) {
            badgeElement.classList.remove('locked');
            badgeElement.classList.add('badge-unlock');
            setTimeout(() => {
                badgeElement.classList.remove('badge-unlock');
            }, 1000);
        }
        
        // Track analytics
        window.ElaldiAnalytics?.trackEvent('badge_unlocked', {
            badge: badgeKey,
            title: badge.title,
            points: badge.points
        });
    }

    claimDailyReward() {
        const claimBtn = this.panel.querySelector('#claimDaily');
        
        // Check if already claimed today
        const today = new Date().toDateString();
        const lastClaim = localStorage.getItem('daily_reward_last_claim');
        
        if (lastClaim === today) {
            this.showNotification('Bugünkü ödülünüzü zaten aldınız!', 'warning');
            return;
        }
        
        // Calculate reward based on streak
        const streakReward = this.config.streaks.daily_login.rewards[
            Math.min(this.user.dailyStreak - 1, this.config.streaks.daily_login.max_streak - 1)
        ] || 5;
        
        // Add points
        const pointsEarned = this.addPoints('daily_login', streakReward / 10);
        
        // Update UI
        claimBtn.classList.add('claimed');
        claimBtn.innerHTML = `<span class="daily-icon">✅</span> Bugün Alındı (+${pointsEarned})`;
        claimBtn.disabled = true;
        
        // Save claim date
        localStorage.setItem('daily_reward_last_claim', today);
        
        // Show confirmation
        this.showNotification(`Günlük ödülünüz alındı! +${pointsEarned} puan 🎁`, 'success');
        
        // Track analytics
        window.ElaldiAnalytics?.trackEvent('daily_reward_claimed', {
            streak: this.user.dailyStreak,
            points: pointsEarned,
            reward: streakReward
        });
    }

    updateUI() {
        // Update points
        this.panel.querySelector('.points-value').textContent = this.user.points;
        
        // Update progress bar
        this.panel.querySelector('.progress-fill').style.width = `${this.getLevelProgress()}%`;
        
        // Update level info
        const levelInfo = this.panel.querySelector('.level-info');
        const nextLevel = this.getNextLevel();
        levelInfo.querySelector('.current-level').textContent = this.user.level.title;
        levelInfo.querySelector('.next-level').textContent = `Sonraki: ${nextLevel.title} (${nextLevel.points} puan)`;
        
        // Update badges
        this.updateBadgesDisplay();
        
        // Update rewards
        this.updateRewardsDisplay();
        
        // Update achievements
        this.updateAchievementsDisplay();
        
        // Update leaderboard
        this.updateLeaderboardDisplay();
        
        // Update daily reward button
        this.updateDailyRewardButton();
    }

    updateBadgesDisplay() {
        const container = this.panel.querySelector('#badgesContainer');
        const badges = Object.entries(this.config.badges);
        
        container.innerHTML = badges.map(([key, badge]) => {
            const unlocked = this.user.badges.includes(key);
            return `
                <div class="badge ${unlocked ? '' : 'locked'}" data-badge="${key}">
                    ${badge.icon}
                    <div class="badge-tooltip">
                        ${badge.title}<br>
                        ${badge.points} puan
                        ${!unlocked ? '<br><small>Kilitli</small>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateRewardsDisplay() {
        const container = this.panel.querySelector('#rewardsContainer');
        const rewards = Object.entries(this.config.rewards);
        
        container.innerHTML = rewards.map(([key, reward]) => {
            const canClaim = this.user.points >= reward.points;
            const claimed = localStorage.getItem(`reward_${key}_claimed`) === 'true';
            
            return `
                <div class="reward-item ${canClaim && !claimed ? 'available' : ''}">
                    <div class="reward-info">
                        <strong>${reward.reward}</strong>
                        <div class="reward-points">${reward.points} puan</div>
                    </div>
                    <button class="claim-reward" 
                            data-reward="${key}" 
                            ${!canClaim || claimed ? 'disabled' : ''}>
                        ${claimed ? 'Alındı' : 'Değiş'}
                    </button>
                </div>
            `;
        }).join('');
        
        // Add event listeners to claim buttons
        container.querySelectorAll('.claim-reward:not(:disabled)').forEach(button => {
            button.addEventListener('click', (e) => {
                this.claimReward(e.target.dataset.reward);
            });
        });
    }

    updateAchievementsDisplay() {
        const container = this.panel.querySelector('#achievementsList');
        const achievements = [
            { id: 'first_login', name: 'İlk Giriş', icon: '🎯', progress: this.user.achievements.first_login ? 1 : 0, total: 1 },
            { id: 'profile_complete', name: 'Profil Tamamlandı', icon: '👤', progress: this.user.achievements.profile_complete ? 1 : 0, total: 1 },
            { id: 'first_service', name: 'İlk Hizmet', icon: '🛒', progress: this.user.achievements.first_service ? 1 : 0, total: 1 },
            { id: 'first_review', name: 'İlk Yorum', icon: '⭐', progress: this.user.achievements.first_review ? 1 : 0, total: 1 },
            { id: 'streak_7', name: '7 Gün Üst Üste', icon: '🔥', progress: Math.min(this.user.dailyStreak, 7), total: 7 },
            { id: 'points_1000', name: '1000 Puan', icon: '💰', progress: Math.min(this.user.points, 1000), total: 1000 }
        ];
        
        container.innerHTML = achievements.map(achievement => {
            const percent = (achievement.progress / achievement.total) * 100;
            return `
                <div class="achievement-item">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-progress">
                        <div class="achievement-progress-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateLeaderboardDisplay() {
        const container = this.panel.querySelector('#leaderboard');
        
        // In a real app, this would be fetched from an API
        const mockLeaderboard = [
            { id: 1, name: 'Ahmet Y.', points: 5420, isCurrent: false },
            { id: 2, name: 'Ayşe K.', points: 4210, isCurrent: false },
            { id: 3, name: 'Mehmet D.', points: 3890, isCurrent: false },
            { id: 4, name: 'Sen', points: this.user.points, isCurrent: true },
            { id: 5, name: 'Can Ö.', points: 2450, isCurrent: false },
            { id: 6, name: 'Zeynep Ş.', points: 1980, isCurrent: false },
            { id: 7, name: 'Selin A.', points: 1560, isCurrent: false }
        ].sort((a, b) => b.points - a.points);
        
        container.innerHTML = mockLeaderboard.map((user, index) => `
            <div class="leaderboard-item ${user.isCurrent ? 'current-user' : ''}">
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${user.name}</span>
                <span class="leaderboard-points">${user.points.toLocaleString()} puan</span>
            </div>
        `).join('');
    }

    updateDailyRewardButton() {
        const claimBtn = this.panel.querySelector('#claimDaily');
        const today = new Date().toDateString();
        const lastClaim = localStorage.getItem('daily_reward_last_claim');
        
        if (lastClaim === today) {
            claimBtn.classList.add('claimed');
            claimBtn.innerHTML = `<span class="daily-icon">✅</span> Bugün Alındı`;
            claimBtn.disabled = true;
        } else {
            claimBtn.classList.remove('claimed');
            claimBtn.innerHTML = `<span class="daily-icon">🎁</span> Günlük Ödül (${this.user.dailyStreek} gün)`;
            claimBtn.disabled = false;
        }
    }

    claimReward(rewardKey) {
        const reward = this.config.rewards[rewardKey];
        if (!reward) return;
        
        // Check if enough points
        if (this.user.points < reward.points) {
            this.showNotification('Yeterli puanınız yok!', 'error');
            return;
        }
        
        // Check if already claimed
        if (localStorage.getItem(`reward_${rewardKey}_claimed`) === 'true') {
            this.showNotification('Bu ödül zaten kullanıldı!', 'warning');
            return;
        }
        
        // Deduct points
        this.user.points -= reward.points;
        
        // Mark as claimed
        localStorage.setItem(`reward_${rewardKey}_claimed`, 'true');
        
        // Show success message
        this.showNotification(`🎉 Tebrikler! ${reward.reward} kazandınız!`, 'success');
        
        // Update UI
        this.updateUI();
        
        // Track analytics
        window.ElaldiAnalytics?.trackEvent('reward_claimed', {
            reward: rewardKey,
            value: reward.reward,
            points_spent: reward.points
        });
        
        return reward.reward;
    }

    checkAchievements() {
        // Check for achievements based on user actions
        // This would be called after specific user actions
        
        if (!this.user.achievements.first_login) {
            this.user.achievements.first_login = true;
            this.unlockAchievement('first_login');
        }
    }

    unlockAchievement(achievementId) {
        // Show achievement unlock notification
        this.showNotification(`🏆 Başarı Açıldı: ${achievementId}!`, 'achievement');
        
        // Add points for achievement
        this.addPoints('achievement', 10);
        
        // Track analytics
        window.ElaldiAnalytics?.trackEvent('achievement_unlocked', {
            achievement: achievementId
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `gamification-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '🎉' : 
                      type === 'error' ? '❌' : 
                      type === 'warning' ? '⚠️' : 
                      type === 'badge' ? '🏆' : 
                      type === 'achievement' ? '⭐' : '💡'}
                </span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // Add styles for notification
        if (!document.querySelector('#gamification-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'gamification-notification-styles';
            styles.textContent = `
                .gamification-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 10px;
                    padding: 15px 20px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                    z-index: 10000;
                    animation: slideIn 0.3s ease-out;
                    border-left: 4px solid #4CAF50;
                    max-width: 350px;
                }
                
                .gamification-notification.success {
                    border-left-color: #4CAF50;
                    background: #f1f8e9;
                }
                
                .gamification-notification.error {
                    border-left-color: #f44336;
                    background: #ffebee;
                }
                
                .gamification-notification.warning {
                    border-left-color: #ff9800;
                    background: #fff3e0;
                }
                
                .gamification-notification.badge {
                    border-left-color: #9c27b0;
                    background: #f3e5f5;
                }
                
                .gamification-notification.achievement {
                    border-left-color: #ffc107;
                    background: #fff8e1;
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .notification-icon {
                    font-size: 20px;
                }
                
                .notification-message {
                    flex: 1;
                    font-size: 14px;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    showBadgeTooltip(badgeElement) {
        // Tooltip is shown via CSS
    }

    togglePanel() {
        this.panel.classList.toggle('open');
        this.toggleButton.style.opacity = this.panel.classList.contains('open') ? '0' : '1';
        
        if (this.panel.classList.contains('open')) {
            // Update UI when opened
            this.updateUI();
            
            // Track analytics
            window.ElaldiAnalytics?.trackEvent('gamification_panel_opened', {
                points: this.user.points,
                level: this.user.level.title
            });
        }
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Public API methods
    awardPoints(reason, multiplier = 1) {
        return this.addPoints(reason, multiplier);
    }

    getCurrentLevel() {
        return this.user.level;
    }

    getPoints() {
        return this.user.points;
    }

    getBadges() {
        return this.user.badges.map(key => this.config.badges[key]);
    }

    getStreak() {
        return this.user.dailyStreak;
    }

    completeAchievement(achievementId) {
        if (!this.user.achievements[achievementId]) {
            this.user.achievements[achievementId] = true;
            this.unlockAchievement(achievementId);
            this.saveUserData();
            return true;
        }
        return false;
    }
}

// Initialize gamification system
document.addEventListener('DOMContentLoaded', () => {
    window.ElaldiGamification = new GamificationSystem();
    
    // Auto-complete first login achievement
    setTimeout(() => {
        window.ElaldiGamification.completeAchievement('first_login');
    }, 1000);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamificationSystem;
}