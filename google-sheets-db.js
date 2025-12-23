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

// Check if script URL is configured
function isConfigured() {
    return SCRIPT_URL && SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
}

// Fallback to localStorage if Google Sheets is not configured
const USE_GOOGLE_SHEETS = isConfigured();

// Google Sheets API Wrapper
const GoogleSheetsDB = {
    // Save data to Google Sheets
    async save(data) {
        if (!USE_GOOGLE_SHEETS) {
            console.log('Using localStorage fallback');
            localStorage.setItem('habitCompetitionData', JSON.stringify(data));
            return { success: true, message: 'Saved to localStorage' };
        }

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save',
                    data: data
                })
            });

            // Note: no-cors mode doesn't allow reading response
            // We assume success if no error thrown
            return { success: true, message: 'Saved to Google Sheets' };
        } catch (error) {
            console.error('Error saving to Google Sheets:', error);
            // Fallback to localStorage
            localStorage.setItem('habitCompetitionData', JSON.stringify(data));
            return { success: false, error: error.message };
        }
    },

    // Load data from Google Sheets
    async load() {
        if (!USE_GOOGLE_SHEETS) {
            console.log('Using localStorage fallback');
            const data = localStorage.getItem('habitCompetitionData');
            return data ? JSON.parse(data) : null;
        }

        try {
            const response = await fetch(SCRIPT_URL + '?action=load', {
                method: 'GET',
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error loading from Google Sheets:', error);
            // Fallback to localStorage
            const data = localStorage.getItem('habitCompetitionData');
            return data ? JSON.parse(data) : null;
        }
    },

    // Add activity log
    async logActivity(activity) {
        if (!USE_GOOGLE_SHEETS) {
            return;
        }

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
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