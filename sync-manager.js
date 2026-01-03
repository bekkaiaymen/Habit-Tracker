// Sync Manager - Auto synchronization with Google Sheets
// Manages connection status and periodic syncing

class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.lastSyncTime = null;
        this.syncInterval = null;
        this.statusElement = null;
        
        this.init();
    }
    
    init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Create status indicator
        this.createStatusIndicator();
        
        // Start periodic sync if online
        if (this.isOnline) {
            this.startPeriodicSync();
        }
        
        // Initial sync
        this.updateStatus();
    }
    
    createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'sync-status';
        indicator.className = 'sync-indicator';
        indicator.innerHTML = `
            <div class="sync-icon">🔄</div>
            <div class="sync-text">جاري المزامنة...</div>
        `;
        document.body.appendChild(indicator);
        this.statusElement = indicator;
    }
    
    async handleOnline() {
        this.isOnline = true;
        console.log('✅ متصل بالإنترنت');
        this.showStatus('✅ متصل', 'online');
        
        // Sync immediately when coming online
        await this.syncNow();
        
        // Restart periodic sync
        this.startPeriodicSync();
    }
    
    handleOffline() {
        this.isOnline = false;
        console.warn('⚠️ غير متصل بالإنترنت');
        this.showStatus('⚠️ غير متصل - وضع Offline', 'offline');
        
        // Stop periodic sync
        this.stopPeriodicSync();
    }
    
    startPeriodicSync() {
        // Sync every 2 minutes
        this.syncInterval = setInterval(() => {
            this.syncNow();
        }, 120000);
    }
    
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    async syncNow() {
        if (!this.isOnline) {
            console.log('غير متصل - تخطي المزامنة');
            return false;
        }
        
        try {
            this.showStatus('🔄 جاري المزامنة...', 'syncing');
            
            // Get current data
            const data = await getData();
            
            // Save to Google Sheets
            const result = await GoogleSheetsDB.save(data);
            
            if (result.success) {
                this.lastSyncTime = new Date();
                this.showStatus('✅ تمت المزامنة', 'synced', 3000);
                console.log('✅ تمت المزامنة بنجاح:', this.lastSyncTime.toLocaleTimeString('ar-SA'));
                return true;
            } else {
                throw new Error('فشلت المزامنة');
            }
        } catch (error) {
            console.error('❌ خطأ في المزامنة:', error);
            this.showStatus('❌ فشلت المزامنة', 'error', 3000);
            return false;
        }
    }
    
    showStatus(message, status, duration = null) {
        if (!this.statusElement) return;
        
        const statusClasses = {
            'online': 'status-online',
            'offline': 'status-offline',
            'syncing': 'status-syncing',
            'synced': 'status-success',
            'error': 'status-error'
        };
        
        // Remove all status classes
        Object.values(statusClasses).forEach(cls => {
            this.statusElement.classList.remove(cls);
        });
        
        // Add current status class
        if (statusClasses[status]) {
            this.statusElement.classList.add(statusClasses[status]);
        }
        
        // Update text
        const textElement = this.statusElement.querySelector('.sync-text');
        if (textElement) {
            textElement.textContent = message;
        }
        
        // Show indicator
        this.statusElement.classList.add('show');
        
        // Auto-hide after duration
        if (duration) {
            setTimeout(() => {
                this.statusElement.classList.remove('show');
            }, duration);
        }
    }
    
    updateStatus() {
        if (this.isOnline) {
            const lastSync = localStorage.getItem('lastSaveTime');
            if (lastSync) {
                const lastSyncDate = new Date(parseInt(lastSync));
                const timeDiff = Date.now() - lastSyncDate;
                
                if (timeDiff < 60000) { // Less than 1 minute
                    this.showStatus('✅ محدّث', 'synced', 2000);
                } else {
                    this.showStatus('🔄 يحتاج تحديث', 'syncing');
                }
            }
        } else {
            this.showStatus('⚠️ غير متصل', 'offline');
        }
    }
    
    getLastSyncTime() {
        return this.lastSyncTime;
    }
    
    destroy() {
        this.stopPeriodicSync();
        if (this.statusElement) {
            this.statusElement.remove();
        }
    }
}

// Initialize sync manager globally
let syncManager = null;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        syncManager = new SyncManager();
    });
} else {
    syncManager = new SyncManager();
}

// Export for manual sync
window.forceSyncNow = async function() {
    if (syncManager) {
        return await syncManager.syncNow();
    }
    return false;
};
