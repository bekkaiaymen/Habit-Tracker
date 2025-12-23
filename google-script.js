// Google Apps Script Code
// Copy this entire code and paste it in Google Apps Script Editor

// This script will be deployed as a Web App to handle database operations

// Main function to handle GET requests
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'load') {
    return loadData();
  } else if (action === 'getHistory') {
    const participant = e.parameter.participant;
    return getParticipantHistory(participant);
  } else if (action === 'getAllHistory') {
    return getAllHistory();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    error: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
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
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Save data to Google Sheets
function saveData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Save main data to 'Data' sheet
  let dataSheet = ss.getSheetByName('Data');
  if (!dataSheet) {
    dataSheet = ss.insertSheet('Data');
    dataSheet.getRange('A1').setValue('Data Storage');
  }
  
  // Save as JSON in cell A2
  dataSheet.getRange('A2').setValue(JSON.stringify(data));
  dataSheet.getRange('B2').setValue(new Date());
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Data saved successfully'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Load data from Google Sheets
function loadData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dataSheet = ss.getSheetByName('Data');
  
  if (!dataSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      data: null
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const jsonData = dataSheet.getRange('A2').getValue();
  
  if (!jsonData) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      data: null
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = JSON.parse(jsonData);
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Log activity to Activity Log sheet
function logActivity(activity) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let activitySheet = ss.getSheetByName('ActivityLog');
  
  if (!activitySheet) {
    activitySheet = ss.insertSheet('ActivityLog');
    activitySheet.getRange('A1:D1').setValues([['التاريخ', 'الوقت', 'النشاط', 'المتسابق']]);
  }
  
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
  
  activitySheet.appendRow([
    dateStr,
    timeStr,
    activity.message || activity,
    activity.participant || ''
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Get participant history
function getParticipantHistory(participantName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let historySheet = ss.getSheetByName('ParticipantHistory');
  
  if (!historySheet) {
    return ContentService.createTextOutput(JSON.stringify({
      history: []
    })).setMimeType(ContentService.MimeType.JSON);
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
        points: data[i][4]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    history: history
  })).setMimeType(ContentService.MimeType.JSON);
}

// Get all competition history
function getAllHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let activitySheet = ss.getSheetByName('ActivityLog');
  
  if (!activitySheet) {
    return ContentService.createTextOutput(JSON.stringify({
      history: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = activitySheet.getDataRange().getValues();
  const history = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    history.push({
      date: data[i][0],
      time: data[i][1],
      activity: data[i][2],
      participant: data[i][3]
    });
  }
  
  // Reverse to show newest first
  history.reverse();
  
  return ContentService.createTextOutput(JSON.stringify({
    history: history
  })).setMimeType(ContentService.MimeType.JSON);
}

// Log participant daily activity
function logParticipantActivity(participantName, date, habit, action, points) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let historySheet = ss.getSheetByName('ParticipantHistory');
  
  if (!historySheet) {
    historySheet = ss.insertSheet('ParticipantHistory');
    historySheet.getRange('A1:E1').setValues([['المتسابق', 'التاريخ', 'العادة', 'الإجراء', 'النقاط']]);
  }
  
  historySheet.appendRow([
    participantName,
    date,
    habit,
    action,
    points
  ]);
}