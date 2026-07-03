// ============================================================
// 30_doc_type_manager.gs
// 汎用書類種別管理 — ドキュメント種別の定義・取得・保存
// ============================================================
//
// 【ドキュメント種別 (DocType) スキーマ】
// {
//   id:               "quote_itaku",        // 一意キー（英数字_）
//   name:             "委託先見積書",        // 表示名
//   enabled:          true,
//   importFolderId:   "xxxx",               // インポート用DriveフォルダID
//   saveFolderId:     "xxxx",               // 保存先DriveフォルダID
//   processedFolderId:"xxxx",               // 処理済み移動先DriveフォルダID
//   sheetName:        "委託先見積書シート", // Spreadsheetのシート名
//   color:            "#4f46e5",            // UI表示色
//   ocrFields: [                            // OCR抽出項目（順序で管理シートの列に対応）
//     { key:"documentNo",  label:"書類番号",  type:"text",   required:true  },
//     { key:"issueDate",   label:"発行日",    type:"date",   required:false },
//     { key:"clientName",  label:"取引先名",  type:"text",   required:false },
//     { key:"totalAmount", label:"合計金額",  type:"number", required:false },
//     { key:"subject",     label:"件名",      type:"text",   required:false },
//     { key:"memo",        label:"備考",      type:"text",   required:false },
//   ],
//   statusFlow: ["未確認","確認中","承認済み","却下"],  // ステータス選択肢
//   autoLink:   false,  // 自動紐づけ（AI）の使用
// }
// ============================================================

var DOC_TYPES_PROP_KEY = 'DOC_TYPES_CONFIG';

/**
 * 全ドキュメント種別を取得（ScriptPropertiesから）
 */
function getAllDocTypes() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(DOC_TYPES_PROP_KEY);
    if (!raw) return _getDefaultDocTypes();
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : _getDefaultDocTypes();
  } catch(e) {
    Logger.log('[DOC TYPE] 取得エラー: ' + e.message);
    return _getDefaultDocTypes();
  }
}

/**
 * ドキュメント種別を保存
 */
function saveAllDocTypes(docTypes) {
  try {
    PropertiesService.getScriptProperties().setProperty(DOC_TYPES_PROP_KEY, JSON.stringify(docTypes));
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

/**
 * 1件保存/更新（id が一致すれば更新、なければ追加）
 */
function saveDocType(docType) {
  if (!docType || !docType.id) return { success: false, error: 'IDが必要です' };
  var all = getAllDocTypes();
  var idx = all.findIndex(function(d) { return d.id === docType.id; });
  if (idx >= 0) {
    all[idx] = docType;
  } else {
    all.push(docType);
  }
  return saveAllDocTypes(all);
}

/**
 * 1件削除
 */
function deleteDocType(id) {
  var all = getAllDocTypes();
  all = all.filter(function(d) { return d.id !== id; });
  return saveAllDocTypes(all);
}

/**
 * デフォルトのドキュメント種別（初回起動時）
 * 既存の見積書・注文書は従来の専用コードで処理するため、汎用種別には含めない
 */
function _getDefaultDocTypes() {
  return [
    {
      id: 'quote_itaku',
      name: '委託先見積書',
      enabled: false,
      importFolderId: '',
      saveFolderId: '',
      processedFolderId: '',
      sheetName: '委託先見積書',
      color: '#7c3aed',
      ocrFields: [
        { key:'documentNo',  label:'書類番号',  type:'text',   required:true  },
        { key:'issueDate',   label:'発行日',    type:'date',   required:false },
        { key:'clientName',  label:'取引先名',  type:'text',   required:false },
        { key:'totalAmount', label:'合計金額',  type:'number', required:false },
        { key:'subject',     label:'件名/品名', type:'text',   required:false },
        { key:'category',    label:'カテゴリ',  type:'select', required:false, options:['実装費','PCB','組立費','その他'] },
        { key:'memo',        label:'備考',      type:'text',   required:false },
      ],
      statusFlow: ['未確認','確認中','承認済み','却下'],
      autoLink: false,
    },
    {
      id: 'cost_document',
      name: 'コスト査定書類',
      enabled: false,
      importFolderId: '',
      saveFolderId: '',
      processedFolderId: '',
      sheetName: 'コスト査定書類',
      color: '#0891b2',
      ocrFields: [
        { key:'documentNo',  label:'書類番号',  type:'text',   required:false },
        { key:'issueDate',   label:'発行日',    type:'date',   required:false },
        { key:'title',       label:'タイトル',  type:'text',   required:true  },
        { key:'department',  label:'部署',      type:'text',   required:false },
        { key:'totalAmount', label:'金額',      type:'number', required:false },
        { key:'memo',        label:'備考・用途',type:'text',   required:false },
      ],
      statusFlow: ['回覧中','確認済み','保管'],
      autoLink: false,
    },
    {
      id: 'general_doc',
      name: 'その他書類',
      enabled: false,
      importFolderId: '',
      saveFolderId: '',
      processedFolderId: '',
      sheetName: 'その他書類',
      color: '#059669',
      ocrFields: [
        { key:'documentNo',  label:'書類番号',  type:'text',   required:false },
        { key:'issueDate',   label:'日付',      type:'date',   required:false },
        { key:'title',       label:'タイトル',  type:'text',   required:true  },
        { key:'department',  label:'部署',      type:'text',   required:false },
        { key:'clientName',  label:'取引先/発行者', type:'text', required:false },
        { key:'memo',        label:'備考',      type:'text',   required:false },
      ],
      statusFlow: ['保管中','処理中','完了'],
      autoLink: false,
    },
  ];
}

// ============================================================
// 汎用ドキュメント監視・処理（Drive Watcher 連携）
// ============================================================

/**
 * 全ての有効な汎用DocTypeのDriveフォルダを監視
 * processDriveImports() から呼び出す
 */
function processGenericDocTypes() {
  var docTypes = getAllDocTypes().filter(function(d) { return d.enabled && d.importFolderId; });
  var total = 0;
  docTypes.forEach(function(dt) {
    try {
      total += _watchGenericDocType(dt);
    } catch(e) {
      Logger.log('[GENERIC WATCH ERROR] ' + dt.name + ': ' + e.message);
    }
  });
  return total;
}

/**
 * 汎用DocTypeのフォルダ監視・OCR処理
 */
function _watchGenericDocType(docType) {
  var processedIds = _getProcessedFileIds();
  var count = 0;
  try {
    var folder = DriveApp.getFolderById(docType.importFolderId);
    var files   = folder.getFilesByType(MimeType.PDF);
    while (files.hasNext()) {
      var file   = files.next();
      var fileId = file.getId();
      if (processedIds[fileId]) {
        Logger.log('[GENERIC WATCH] スキップ（処理済み）: ' + file.getName());
        _moveToProcessedSubfolder(file, folder, docType.processedFolderId);
        continue;
      }
      Logger.log('[GENERIC WATCH] 処理開始: ' + file.getName() + ' [' + docType.name + ']');
      try {
        // OCR実行（フィールド定義をプロンプトに反映）
        var ocrResult = _extractGenericDocOcr(file, docType);

        // 保存先フォルダへコピー
        var saveFolder = docType.saveFolderId
          ? DriveApp.getFolderById(docType.saveFolderId)
          : folder;
        var newName  = nowJST().replace(/[\/: ]/g,'') + '_' + file.getName();
        var savedFile = file.makeCopy(newName, saveFolder);
        var pdfUrl   = savedFile.getUrl();

        // シートへ保存
        _saveGenericDocToSheet(docType, ocrResult, pdfUrl, file.getName());

        _markFileAsProcessed(fileId);
        _moveToProcessedSubfolder(file, folder, docType.processedFolderId);
        count++;
        Logger.log('[GENERIC WATCH] 完了: ' + file.getName());
        Utilities.sleep(2000);
      } catch(fileErr) {
        Logger.log('[GENERIC WATCH FILE ERROR] ' + file.getName() + ': ' + fileErr.message);
        _markFileAsProcessed(fileId);
      }
    }
  } catch(folderErr) {
    Logger.log('[GENERIC WATCH FOLDER ERROR] ' + docType.name + ': ' + folderErr.message);
  }
  return count;
}

/**
 * 汎用OCR — docType.ocrFields に基づいてGeminiへ指示
 */
function _extractGenericDocOcr(file, docType) {
  try {
    var fieldList = docType.ocrFields.map(function(f) {
      return '"' + f.key + '": "' + f.label + '(' + f.type + ')"';
    }).join(', ');
    var prompt = 'このPDFから以下の項目を抽出してJSON形式で返してください。\n'
      + '項目: {' + fieldList + '}\n'
      + '抽出できない項目は空文字 "" にしてください。'
      + '数値項目は数値のみ（カンマ・円記号不要）。日付はYYYY/MM/DD形式。\n'
      + 'JSONのみ返答してください。';
    var apiKey  = getGeminiApiKey();
    var pdfB64  = Utilities.base64Encode(file.getBlob().getBytes());
    var payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'application/pdf', data: pdfB64 } }
        ]
      }]
    };
    var resp = UrlFetchApp.fetch(
      CONFIG.GEMINI_API_ENDPOINT + CONFIG.GEMINI_PRIMARY_MODEL + ':generateContent?key=' + apiKey,
      { method:'post', contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true }
    );
    var text = JSON.parse(resp.getContentText()).candidates[0].content.parts[0].text || '{}';
    text = text.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
    return JSON.parse(text);
  } catch(e) {
    Logger.log('[GENERIC OCR ERROR] ' + e.message);
    return { documentNo: file.getName().replace(/\.pdf$/i,'') };
  }
}

/**
 * 汎用OCR結果をシートへ保存
 * シートが存在しない場合は ocrFields に基づいて自動作成
 */
function _saveGenericDocToSheet(docType, ocrResult, pdfUrl, originalFileName) {
  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName(docType.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(docType.sheetName);
    // ヘッダー行を作成
    var headers = ['ID', '登録日時', 'PDFリンク', '元ファイル名']
      .concat(docType.ocrFields.map(function(f) { return f.label; }));
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#374151').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('[GENERIC SHEET] シート作成: ' + docType.sheetName);
  }
  var id  = 'DOC_' + new Date().getTime();
  var now = nowJST();
  var row = [id, now, pdfUrl, originalFileName]
    .concat(docType.ocrFields.map(function(f) { return ocrResult[f.key] !== undefined ? ocrResult[f.key] : ''; }));
  sheet.appendRow(row);
  Logger.log('[GENERIC SHEET] 行追加: ' + id + ' → ' + docType.sheetName);
  return id;
}

// ============================================================
// API ハンドラ（06 board api.gs のルーターから呼び出し）
// ============================================================

function apiGetDocTypes() {
  return { success: true, docTypes: getAllDocTypes() };
}

function apiSaveDocType(payload) {
  if (!payload || !payload.docType) return { success: false, error: 'docTypeが必要です' };
  return saveDocType(payload.docType);
}

function apiDeleteDocType(payload) {
  if (!payload || !payload.id) return { success: false, error: 'IDが必要です' };
  return deleteDocType(payload.id);
}

function apiGetGenericDocs(payload) {
  if (!payload || !payload.docTypeId) return { success: false, error: 'docTypeIdが必要です' };
  try {
    var docType = getAllDocTypes().find(function(d) { return d.id === payload.docTypeId; });
    if (!docType) return { success: false, error: '種別が見つかりません' };
    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName(docType.sheetName);
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, items: [], docType: docType };
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var items = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });
    return { success: true, items: items, docType: docType };
  } catch(e) {
    return { success: false, error: e.message };
  }
}
