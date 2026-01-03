// Google Sheets Database Configuration
// Instructions to set up Google Sheets as database:

/*
SETUP INSTRUCTIONS (تعليمات الإعداد):

1. إنشاء Google Sheet جديد:
   - اذهب إلى https://sheets.google.com
   - أنشئ جدول جديد
   - سمّه "مسابقة العادات اليومية"

2. نسخ Google Apps Script:
   - في Google Sheet، اذهب إلى Extensions > Apps Script
   - احذف الكود الموجود والصق الكود من ملف google-script.js
   - احفظ المشروع

3. نشر كـ Web App:
   - اضغط Deploy > New Deployment
   - اختر "Web app"
   - Execute as: Me
   - Who has access: Anyone
   - اضغط Deploy
   - انسخ الـ Web App URL

4. لصق الرابط هنا:
   - الصق الرابط في المتغير SCRIPT_URL أدناه
*/

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBwa21YERInYhL7Ew0D0DbeWkPtlcKfXnh13UMJGhVw-yLDgVa8t77ckmxToOb7CxDzw/exec';

// Cache configuration
const CACHE_DURATION = 30000; // 30 seconds
let dataCache = null;
let cacheTimestamp = 0;

// Check if script URL is configured
function isConfigured() {
    return SCRIPT_URL && SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
}

// Fallback to localStorage if Google Sheets is not configured
const USE_GOOGLE_SHEETS = isConfigured();

// Request queue to prevent concurrent requests
let requestQueue = Promise.resolve();

// Google Sheets API Wrapper
const GoogleSheetsDB = {
    // Save data to Google Sheets
    async save(data) {
        // Always save to localStorage as backup
        localStorage.setItem('habitCompetitionData', JSON.stringify(data));
        localStorage.setItem('lastSaveTime', Date.now().toString());
        
        // Clear cache when saving
        dataCache = null;
        cacheTimestamp = 0;
        
        if (!USE_GOOGLE_SHEETS) {
            console.log('✅ حُفظت البيانات محلياً (localStorage)');
            return { success: true, message: 'Saved to localStorage' };
        }

        // Queue the request to prevent conflicts
        return requestQueue = requestQueue.then(async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: JSON.stringify({
                        action: 'save',
                        data: data
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                
                console.log('✅ حُفظت البيانات في Google Sheets');
                return { success: true, message: 'Saved to Google Sheets' };
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn('⏱️ انتهت مهلة الحفظ - البيانات محفوظة محلياً');
                } else {
                    console.error('❌ خطأ في الحفظ لـ Google Sheets:', error);
                }
                return { success: false, error: error.message };
            }
        });
    },

    // Load data from Google Sheets
    async load() {
        // Check cache first
        const now = Date.now();
        if (dataCache && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('📦 تم تحميل البيانات من الذاكرة المؤقتة');
            return dataCache;
        }

        if (!USE_GOOGLE_SHEETS) {
            console.log('📂 تحميل من localStorage');
            const data = localStorage.getItem('habitCompetitionData');
            return data ? JSON.parse(data) : null;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const response = await fetch(SCRIPT_URL + '?action=load&t=' + Date.now(), {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('فشل تحميل البيانات');
            }

            const data = await response.json();
            
            // Update cache
            dataCache = data;
            cacheTimestamp = Date.now();
            
            // Also save to localStorage as backup
            if (data) {
                localStorage.setItem('habitCompetitionData', JSON.stringify(data));
            }
            
            console.log('✅ تم تحميل البيانات من Google Sheets');
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⏱️ انتهت مهلة التحميل - استخدام البيانات المحلية');
            } else {
                console.error('❌ خطأ في التحميل من Google Sheets:', error);
            }
            
            // Fallback to localStorage
            const data = localStorage.getItem('habitCompetitionData');
            if (data) {
                console.log('📂 تم التحميل من localStorage');
                const parsedData = JSON.parse(data);
                dataCache = parsedData;
                cacheTimestamp = Date.now();
                return parsedData;
            }
            return null;
        }
    },

    // Clear cache manually
    clearCache() {
        dataCache = null;
        cacheTimestamp = 0;
        console.log('🗑️ تم مسح الذاكرة المؤقتة');
    },

    // Add activity log
    async logActivity(activity) {
        if (!USE_GOOGLE_SHEETS) {
            return;
        }

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify({
                    action: 'logActivity',
                    activity: activity
                })
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    },

    // Get detailed history for participant
    async getParticipantHistory(participantName) {
        if (!USE_GOOGLE_SHEETS) {
            return [];
        }

        try {
            const response = await fetch(SCRIPT_URL + `?action=getHistory&participant=${encodeURIComponent(participantName)}`, {
                method: 'GET',
            });

            const data = await response.json();
            return data.history || [];
        } catch (error) {
            console.error('Error getting participant history:', error);
            return [];
        }
    },

    // Get all competition history
    async getCompetitionHistory() {
        if (!USE_GOOGLE_SHEETS) {
            return [];
        }

        try {
            const response = await fetch(SCRIPT_URL + '?action=getAllHistory', {
                method: 'GET',
            });

            const data = await response.json();
            return data.history || [];
        } catch (error) {
            console.error('Error getting competition history:', error);
            return [];
        }
    }
};

// Show configuration warning if needed
if (!USE_GOOGLE_SHEETS) {
    console.warn('⚠️ Google Sheets غير مُعد. يتم استخدام localStorage كبديل.');
    console.warn('لإعداد Google Sheets، اتبع التعليمات في ملف google-sheets-db.js');
}