// Google Apps Script Code
// Copy this entire code and paste it in Google Apps Script Editor

// This script will be deployed as a Web App to handle database operations

// Global configuration
const CONFIG = {
  DATA_SHEET: 'Data',
  ACTIVITY_LOG_SHEET: 'ActivityLog',
  PARTICIPANT_HISTORY_SHEET: 'ParticipantHistory',
  MAX_LOG_ROWS: 10000 // Limit log size
};

// Main function to handle GET requests
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'load') {
      return loadData();
    } else if (action === 'getHistory') {
      const participant = e.parameter.participant;
      return getParticipantHistory(participant);
    } else if (action === 'getAllHistory') {
      return getAllHistory();
    }
    
    return createResponse({
      error: 'Invalid action'
    });
  } catch (error) {
    return createResponse({
      error: error.toString()
    });
  }
}

// Main function to handle POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'save') {
      return saveData(data.data);
    } else if (action === 'logActivity') {
      return logActivity(data.activity);
    }
    
    return createResponse({
      success: false,
      error: 'Invalid action'
    });
  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Helper function to create JSON response
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Save data to Google Sheets with optimization
function saveData(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Save main data to 'Data' sheet
    let dataSheet = ss.getSheetByName(CONFIG.DATA_SHEET);
    if (!dataSheet) {
      dataSheet = ss.insertSheet(CONFIG.DATA_SHEET);
      dataSheet.getRange('A1').setValue('Data Storage');
      dataSheet.getRange('B1').setValue('Last Updated');
      dataSheet.getRange('C1').setValue('Version');
    }
    
    // Save as JSON in cell A2
    const jsonString = JSON.stringify(data);
    const now = new Date();
    
    dataSheet.getRange('A2').setValue(jsonString);
    dataSheet.getRange('B2').setValue(now);
    dataSheet.getRange('C2').setValue(data.version || 1);
    
    // Auto-resize columns for better visibility
    dataSheet.autoResizeColumns(1, 3);
    
    return createResponse({
      success: true,
      message: 'Data saved successfully',
      timestamp: now.toISOString()
    });
  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Load data from Google Sheets with caching support
function loadData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dataSheet = ss.getSheetByName(CONFIG.DATA_SHEET);
    
    if (!dataSheet) {
      return createResponse({
        success: false,
        data: null,
        message: 'No data found'
      });
    }
    
    const jsonData = dataSheet.getRange('A2').getValue();
    
    if (!jsonData) {
      return createResponse({
        success: false,
        data: null,
        message: 'Empty data'
      });
    }
    
    const data = JSON.parse(jsonData);
    const lastUpdated = dataSheet.getRange('B2').getValue();
    
    return createResponse({
      ...data,
      _metadata: {
        lastUpdated: lastUpdated,
        loadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return createResponse({
      success: false,
      data: null,
      error: error.toString()
    });
  }
}

// Log activity to Activity Log sheet with auto-cleanup
function logActivity(activity) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let activitySheet = ss.getSheetByName(CONFIG.ACTIVITY_LOG_SHEET);
    
    if (!activitySheet) {
      activitySheet = ss.insertSheet(CONFIG.ACTIVITY_LOG_SHEET);
      activitySheet.getRange('A1:E1').setValues([['التاريخ', 'الوقت', 'النشاط', 'المتسابق', 'التفاصيل']]);
      activitySheet.getRange('A1:E1').setFontWeight('bold');
      activitySheet.getRange('A1:E1').setBackground('#667eea');
      activitySheet.getRange('A1:E1').setFontColor('#ffffff');
      activitySheet.setFrozenRows(1);
    }
    
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
    
    activitySheet.appendRow([
      dateStr,
      timeStr,
      activity.message || activity,
      activity.participant || '',
      activity.details || ''
    ]);
    
    // Auto-cleanup old logs if exceeding limit
    const rowCount = activitySheet.getLastRow();
    if (rowCount > CONFIG.MAX_LOG_ROWS) {
      const deleteCount = rowCount - CONFIG.MAX_LOG_ROWS + 100;
      activitySheet.deleteRows(2, deleteCount);
    }
    
    // Auto-resize columns
    activitySheet.autoResizeColumns(1, 5);
    
    return createResponse({
      success: true,
      message: 'Activity logged'
    });
  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Get participant history with improved formatting
function getParticipantHistory(participantName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let historySheet = ss.getSheetByName(CONFIG.PARTICIPANT_HISTORY_SHEET);
    
    if (!historySheet) {
      return createResponse({
        history: [],
        message: 'No history available'
      });
    }
    
    const data = historySheet.getDataRange().getValues();
    const history = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === participantName) {
        history.push({
          participant: data[i][0],
          date: data[i][1],
          habit: data[i][2],
          action: data[i][3],
          points: data[i][4],
          timestamp: data[i][5] || ''
        });
      }
    }
    
    // Sort by date descending (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return createResponse({
      history: history,
      count: history.length,
      participant: participantName
    });
  } catch (error) {
    return createResponse({
      history: [],
      error: error.toString()
    });
  }
}

// Get all competition history with pagination support
function getAllHistory() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let activitySheet = ss.getSheetByName(CONFIG.ACTIVITY_LOG_SHEET);
    
    if (!activitySheet) {
      return createResponse({
        history: [],
        message: 'No activity log available'
      });
    }
    
    const data = activitySheet.getDataRange().getValues();
    const history = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Check if date exists
        history.push({
          date: data[i][0],
          time: data[i][1],
          activity: data[i][2],
          participant: data[i][3],
          details: data[i][4] || ''
        });
      }
    }
    
    // Reverse to show newest first
    history.reverse();
    
    return createResponse({
      history: history,
      count: history.length,
      retrievedAt: new Date().toISOString()
    });
  } catch (error) {
    return createResponse({
      history: [],
      error: error.toString()
    });
  }
}

// Log participant daily activity with enhanced tracking
function logParticipantActivity(participantName, date, habit, action, points) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let historySheet = ss.getSheetByName(CONFIG.PARTICIPANT_HISTORY_SHEET);
    
    if (!historySheet) {
      historySheet = ss.insertSheet(CONFIG.PARTICIPANT_HISTORY_SHEET);
      historySheet.getRange('A1:F1').setValues([['المتسابق', 'التاريخ', 'العادة', 'الإجراء', 'النقاط', 'الوقت']]);
      historySheet.getRange('A1:F1').setFontWeight('bold');
      historySheet.getRange('A1:F1').setBackground('#10b981');
      historySheet.getRange('A1:F1').setFontColor('#ffffff');
      historySheet.setFrozenRows(1);
    }
    
    const now = new Date();
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
    
    historySheet.appendRow([
      participantName,
      date,
      habit,
      action,
      points,
      timeStr
    ]);
    
    // Auto-resize columns
    historySheet.autoResizeColumns(1, 6);
    
    return createResponse({
      success: true,
      message: 'Participant activity logged'
    });
  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Utility function to cleanup old data (can be called manually or via trigger)
function cleanupOldData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Keep 3 months of data
    
    // Clean activity log
    let activitySheet = ss.getSheetByName(CONFIG.ACTIVITY_LOG_SHEET);
    if (activitySheet) {
      const data = activitySheet.getDataRange().getValues();
      let deleteCount = 0;
      
      for (let i = data.length - 1; i > 0; i--) {
        const rowDate = new Date(data[i][0]);
        if (rowDate < cutoffDate) {
          activitySheet.deleteRow(i + 1);
          deleteCount++;
        }
      }
      
      Logger.log(`Cleaned ${deleteCount} old activity rows`);
    }
    
    return createResponse({
      success: true,
      message: 'Cleanup completed',
      deletedRows: deleteCount
    });
  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}