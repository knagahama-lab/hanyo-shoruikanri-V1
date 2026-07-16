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
//   classifyKeywords: "イードリーム,eDream",  // ※他の種別と同じインポートフォルダを共有する場合のみ使用。
//                                             //   OCRで判定した発行元会社名にこのキーワード（カンマ区切り、
//                                             //   いずれか1つでも部分一致）が含まれていればこの種別と判定する。
//                                             //   管理コンソール「書類種別管理」の編集画面で設定できる。
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
    // ── 岐阜電子工業（実装費）──────────────────────────────
    {
      id: 'quote_gifu_denshi',
      name: '岐阜電子工業見積書（実装費）',
      enabled: false,
      importFolderId: '',
      saveFolderId: '',
      processedFolderId: '',
      sheetName: '岐阜電子工業_実装費',
      color: '#b45309',
      supplier: '岐阜電子工業',
      costCategory: '実装費',
      classifyKeywords: '岐阜電子工業',
      ocrFields: [
        { key:'documentNo',   label:'見積番号',     type:'text',   required:true  },
        { key:'issueDate',    label:'発行日',        type:'date',   required:false },
        { key:'validUntil',   label:'有効期限',      type:'date',   required:false },
        { key:'totalAmount',  label:'合計金額(税込)', type:'number', required:true  },
        { key:'subtotal',     label:'小計(税抜)',     type:'number', required:false },
        { key:'productName',  label:'機種名/品名',   type:'text',   required:false },
        { key:'modelCode',    label:'機種コード',     type:'text',   required:false },
        { key:'quantity',     label:'数量',           type:'number', required:false },
        { key:'unitPrice',    label:'実装単価',       type:'number', required:false },
        { key:'workType',     label:'作業種別',       type:'text',   required:false },
        { key:'memo',         label:'備考・条件',     type:'text',   required:false },
      ],
      statusFlow: ['未確認','確認中','承認済み','発注済み','却下'],
      autoLink: false,
    },
    // ── イードリーム（組立費）──────────────────────────────
    {
      id: 'quote_edream',
      name: 'イードリーム見積書（組立費）',
      enabled: false,
      importFolderId: '',
      saveFolderId: '',
      processedFolderId: '',
      sheetName: 'イードリーム_組立費',
      color: '#0891b2',
      supplier: 'イードリーム',
      costCategory: '組立費',
      classifyKeywords: 'イードリーム,eDream',
      ocrFields: [
        { key:'documentNo',   label:'見積番号',     type:'text',   required:true  },
        { key:'issueDate',    label:'発行日',        type:'date',   required:false },
        { key:'validUntil',   label:'有効期限',      type:'date',   required:false },
        { key:'totalAmount',  label:'合計金額(税込)', type:'number', required:true  },
        { key:'subtotal',     label:'小計(税抜)',     type:'number', required:false },
        { key:'productName',  label:'機種名/品名',   type:'text',   required:false },
        { key:'modelCode',    label:'機種コード',     type:'text',   required:false },
        { key:'quantity',     label:'数量',           type:'number', required:false },
        { key:'unitPrice',    label:'組立単価',       type:'number', required:false },
        { key:'assemblyType', label:'組立種別',       type:'text',   required:false },
        { key:'memo',         label:'備考・条件',     type:'text',   required:false },
      ],
      statusFlow: ['未確認','確認中','承認済み','発注済み','却下'],
      autoLink: false,
    },
    // ── PCB業者（基板費）──────────────────────────────────
    {
      id: 'quote_pcb',
      name: 'PCB業者見積書（基板費）',
      enabled: false,
      importFolderId: '',
      saveFolderId: '',
      processedFolderId: '',
      sheetName: 'PCB_基板費',
      color: '#15803d',
      supplier: 'PCB業者',
      costCategory: 'PCB費',
      classifyKeywords: '', // 実際のPCB仕入先の会社名を管理コンソールで設定してください
      ocrFields: [
        { key:'documentNo',   label:'見積番号',     type:'text',   required:true  },
        { key:'issueDate',    label:'発行日',        type:'date',   required:false },
        { key:'validUntil',   label:'有効期限',      type:'date',   required:false },
        { key:'totalAmount',  label:'合計金額(税込)', type:'number', required:true  },
        { key:'subtotal',     label:'小計(税抜)',     type:'number', required:false },
        { key:'boardName',    label:'基板名/品名',   type:'text',   required:false },
        { key:'modelCode',    label:'機種コード',     type:'text',   required:false },
        { key:'quantity',     label:'枚数',           type:'number', required:false },
        { key:'unitPrice',    label:'基板単価',       type:'number', required:false },
        { key:'layers',       label:'層数',           type:'number', required:false },
        { key:'boardSize',    label:'基板サイズ',     type:'text',   required:false },
        { key:'deliveryDays', label:'納期(日数)',     type:'number', required:false },
        { key:'memo',         label:'備考・条件',     type:'text',   required:false },
      ],
      statusFlow: ['未確認','確認中','承認済み','発注済み','却下'],
      autoLink: false,
    },
    // ── コスト査定書類 ─────────────────────────────────────
    {
      id: 'cost_document',
      name: 'コスト査定書類',
      enabled: false,
      importFolderId: '',
      saveFolderId: '',
      processedFolderId: '',
      sheetName: 'コスト査定書類',
      color: '#6366f1',
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

  // 同じインポートフォルダIDを使っている種別ごとにグループ化する。
  // 1種別だけのフォルダは従来通りそのまま処理し、
  // 複数種別が同じフォルダを共有している場合はOCRで発行元を判定して振り分ける。
  var byFolder = {};
  docTypes.forEach(function(dt) {
    var key = dt.importFolderId;
    if (!byFolder[key]) byFolder[key] = [];
    byFolder[key].push(dt);
  });

  Object.keys(byFolder).forEach(function(folderId) {
    var group = byFolder[folderId];
    try {
      if (group.length === 1) {
        total += _watchGenericDocType(group[0]);
      } else {
        total += _watchSharedGenericFolder(folderId, group);
      }
    } catch(e) {
      Logger.log('[GENERIC WATCH ERROR] folder=' + folderId + ': ' + e.message);
    }
  });

  return total;
}

/**
 * 複数のDocTypeが同じインポートフォルダを共有している場合の監視処理。
 * OCRでPDFの発行元会社名を抽出し、各種別に設定された classifyKeywords
 * （カンマ区切り、部分一致）と照合して振り分け先の種別を決定する。
 * 判定できなかったファイルは処理済みにせず、次回以降の実行で再試行する
 * （手動で classifyKeywords を追加・修正すれば自動的に拾われる）。
 *
 * ★ 2026-07: 以前は docType.supplier を使い、PDF本文テキストに発行元名の
 * 文字列が含まれるかどうかで判定していたが、(1) 管理コンソールの編集画面に
 * supplier欄が無く、フォルダ設定などを保存し直すたびに supplier が消えて
 * 判定が機能しなくなる、(2) テキスト抽出に失敗した場合の挙動が曖昧、という
 * 2つの問題があった。ここでは常にGeminiで発行元会社名を明示的に抽出し、
 * 管理コンソールで編集できる classifyKeywords と照合する方式に統一した。
 */
function _watchSharedGenericFolder(folderId, docTypes) {
  var processedIds = _getProcessedFileIds();
  var count = 0;
  try {
    var folder = DriveApp.getFolderById(folderId);
    var files  = folder.getFilesByType(MimeType.PDF);
    while (files.hasNext()) {
      var file   = files.next();
      var fileId = file.getId();
      if (processedIds[fileId]) {
        Logger.log('[GENERIC WATCH-SHARED] スキップ（処理済み）: ' + file.getName());
        _moveToProcessedSubfolder(file, folder, '');
        continue;
      }
      Logger.log('[GENERIC WATCH-SHARED] 分類開始: ' + file.getName());
      try {
        var issuer  = _classifyGenericDocIssuer(file);
        var matched = docTypes.filter(function(dt) {
          var kws = String(dt.classifyKeywords || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
          return kws.some(function(kw) { return issuer.indexOf(kw) >= 0; });
        })[0];

        if (!matched) {
          Logger.log('[GENERIC WATCH-SHARED] 分類不能: ' + file.getName() + '（抽出した発行元: "' + issuer + '"）。'
            + '種別の「分類キーワード」設定を見直してください。次回実行時に再試行します。');
          try { _logOcrResult(file.getName(), 'classify_failed', null, '発行元を判定できませんでした: ' + issuer); } catch(e2) {}
          continue; // 未処理のまま残す（processedIdsに入れない）
        }
        Logger.log('[GENERIC WATCH-SHARED] 判定: ' + file.getName() + ' → 種別「' + matched.name + '」（発行元: "' + issuer + '"）');

        var ocrResult = _extractGenericDocOcr(file, matched);

        var saveFolder = matched.saveFolderId
          ? DriveApp.getFolderById(matched.saveFolderId)
          : folder;
        var newName   = nowJST().replace(/[\/: ]/g,'') + '_' + file.getName();
        var savedFile = file.makeCopy(newName, saveFolder);
        var pdfUrl    = savedFile.getUrl();

        _saveGenericDocToSheet(matched, ocrResult, pdfUrl, file.getName());

        _markFileAsProcessed(fileId);
        _moveToProcessedSubfolder(file, folder, matched.processedFolderId);
        count++;
        Logger.log('[GENERIC WATCH-SHARED] 完了: ' + file.getName() + ' → ' + matched.sheetName);
        Utilities.sleep(2000);
      } catch(fileErr) {
        Logger.log('[GENERIC WATCH-SHARED FILE ERROR] ' + file.getName() + ': ' + fileErr.message);
        // 分類/OCR自体が例外で失敗した場合は無限リトライを避けるため処理済み扱いにする
        _markFileAsProcessed(fileId);
      }
    }
  } catch(folderErr) {
    Logger.log('[GENERIC WATCH-SHARED FOLDER ERROR] folder=' + folderId + ': ' + folderErr.message);
  }
  return count;
}

/**
 * PDFの発行元会社名をOCRで抽出する（振り分け判定専用の軽量呼び出し）。
 * 宛先（御中/様）ではなく、書類を作成・発行した側の会社名を返す。
 * レート制限に強い _callGeminiApi()（複数キー・自動リトライ対応）を使用する。
 */
function _classifyGenericDocIssuer(file) {
  var prompt = 'このPDF（見積書などの書類）の発行元会社名を1つだけ抽出してください。\n'
    + '発行元とは、この書類を作成して相手先へ提出した会社（通常は書類の右上や末尾付近に、住所・電話番号などと一緒に記載されている会社）です。\n'
    + '宛先（「御中」「様」と書かれている、書類を受け取る側の会社）は発行元ではないので絶対に含めないでください。\n'
    + '該当が見つからない場合は空文字にしてください。\n'
    + 'JSON形式 {"issuer": "会社名"} のみで返答してください。';
  var pdfB64 = Utilities.base64Encode(file.getBlob().getBytes());
  var body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'application/pdf', data: pdfB64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
  };
  var result = _callGeminiApi(CONFIG.GEMINI_PRIMARY_MODEL, body);
  if (!result) result = _callGeminiApi(CONFIG.GEMINI_FALLBACK_MODEL, body);
  if (!result) {
    Logger.log('[GENERIC CLASSIFY ERROR] ' + file.getName() + ': 全モデル失敗');
    return '';
  }
  try {
    var text = '';
    if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
      text = result.candidates[0].content.parts[0].text || '';
    }
    text = text.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
    if (!text) return '';
    var parsed = JSON.parse(text);
    return String(parsed.issuer || '').trim();
  } catch(e) {
    Logger.log('[GENERIC CLASSIFY PARSE ERROR] ' + file.getName() + ': ' + e.message);
    return '';
  }
}

/**
 * 汎用DocTypeのフォルダ監視・OCR処理（他の種別とインポートフォルダを共有していない場合）
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
 *
 * ★ 2026-07: 以前はここで UrlFetchApp.fetch を直接1回だけ呼んでいたため、
 * Gemini無料枠のレート制限（15req/分）に達すると429エラーがそのまま
 * JSON.parseで例外になり、catch節で「ファイル名だけをdocumentNoに入れる」
 * フォールバックへ落ち、他の項目が全て空になる不具合が大量発生していた。
 * 既存の見積書OCR（02_ocr_and_processing.gs）と同じ複数キー・自動リトライ
 * 対応の _callGeminiApi() を使うことで解消する（18 api key manage.gs が
 * 同名関数を上書きしていれば、そちらのレート制限回避版が使われる）。
 */
function _extractGenericDocOcr(file, docType) {
  var fieldList = docType.ocrFields.map(function(f) {
    return '"' + f.key + '": "' + f.label + '(' + f.type + ')"';
  }).join(', ');
  var prompt = 'このPDFから以下の項目を抽出してJSON形式で返してください。\n'
    + '項目: {' + fieldList + '}\n'
    + '抽出できない項目は空文字 "" にしてください。'
    + '数値項目は数値のみ（カンマ・円記号不要）。日付はYYYY/MM/DD形式。\n'
    + 'JSONのみ返答してください。';
  var pdfB64 = Utilities.base64Encode(file.getBlob().getBytes());
  var body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'application/pdf', data: pdfB64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
  };

  var result = _callGeminiApi(CONFIG.GEMINI_PRIMARY_MODEL, body);
  if (!result) result = _callGeminiApi(CONFIG.GEMINI_FALLBACK_MODEL, body);
  if (!result) {
    Logger.log('[GENERIC OCR ERROR] ' + file.getName() + ': 全モデル失敗（レート制限またはAPIエラー）');
    return { documentNo: file.getName().replace(/\.pdf$/i, '') };
  }

  try {
    var text = '';
    if (result.candidates && result.candidates[0] &&
        result.candidates[0].content && result.candidates[0].content.parts) {
      text = result.candidates[0].content.parts[0].text || '';
    }
    text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    if (!text) throw new Error('レスポンスが空です: ' + JSON.stringify(result).substring(0, 300));
    return JSON.parse(text);
  } catch (e) {
    Logger.log('[GENERIC OCR PARSE ERROR] ' + file.getName() + ': ' + e.message + ' / raw=' + JSON.stringify(result).substring(0, 300));
    return { documentNo: file.getName().replace(/\.pdf$/i, '') };
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
      headers.forEach(function(h, i) {
        var v = row[i];
        // Dateオブジェクトはそのままクライアントへ返すと google.script.run の
        // シリアライズ処理で失敗する場合があるため、文字列に変換しておく
        if (Object.prototype.toString.call(v) === '[object Date]') {
          v = isNaN(v.getTime()) ? '' : Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy/MM/dd');
        } else if (v === undefined) {
          v = '';
        }
        obj[String(h)] = v;
      });
      return obj;
    });
    return { success: true, items: items, docType: docType };
  } catch(e) {
    Logger.log('[GENERIC DOCS GET ERROR] ' + (e && e.stack ? e.stack : e));
    return { success: false, error: (e && (e.message || String(e))) || '不明なサーバーエラー（Apps Scriptの「実行数」ログを確認してください）' };
  }
}

/**
 * 3社コスト比較: 機種コードをキーに岐阜電子・イードリーム・PCBの金額を横断集計
 */
function apiGetCostSummary(payload) {
  try {
    var modelCode = payload && payload.modelCode ? String(payload.modelCode).trim() : '';
    var ss = getSpreadsheet();
    var targetIds = ['quote_gifu_denshi', 'quote_edream', 'quote_pcb'];
    var docTypes = getAllDocTypes().filter(function(d) { return targetIds.indexOf(d.id) >= 0; });
    var summary = {};

    docTypes.forEach(function(dt) {
      var sheet = ss.getSheetByName(dt.sheetName);
      if (!sheet || sheet.getLastRow() <= 1) return;
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var mcIdx = headers.indexOf('機種コード');
      data.slice(1).forEach(function(row) {
        var mc = mcIdx >= 0 ? String(row[mcIdx] || '').trim() : '';
        if (modelCode && mc !== modelCode) return;
        var key = mc || '（機種未設定）';
        if (!summary[key]) summary[key] = {};
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i]; });
        if (!summary[key][dt.id] || (Number(obj['合計金額(税込)']) < Number(summary[key][dt.id].totalAmount))) {
          summary[key][dt.id] = {
            docTypeId:    dt.id,
            name:         dt.name,
            costCategory: dt.costCategory || '',
            documentNo:   obj['見積番号'] || '',
            issueDate:    obj['発行日']    || '',
            totalAmount:  Number(obj['合計金額(税込)']) || 0,
            pdfUrl:       obj['PDFリンク'] || '',
          };
        }
      });
    });

    return { success: true, summary: summary };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

/**
 * ステータス更新（シートの「ステータス」列を更新）
 */
function apiUpdateGenericDocStatus(payload) {
  if (!payload || !payload.docTypeId || !payload.docId || !payload.status) {
    return { success: false, error: 'docTypeId / docId / status が必要です' };
  }
  try {
    var docType = getAllDocTypes().find(function(d) { return d.id === payload.docTypeId; });
    if (!docType) return { success: false, error: '種別が見つかりません' };
    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName(docType.sheetName);
    if (!sheet) return { success: false, error: 'シートが存在しません' };
    var data    = sheet.getDataRange().getValues();
    var headers = data[0];
    var idIdx   = headers.indexOf('ID');
    var stIdx   = headers.indexOf('ステータス');
    if (idIdx < 0) return { success: false, error: 'ID列が見つかりません' };
    // ステータス列がなければ追加
    if (stIdx < 0) {
      stIdx = headers.length;
      sheet.getRange(1, stIdx + 1).setValue('ステータス');
    }
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) === String(payload.docId)) {
        sheet.getRange(i + 1, stIdx + 1).setValue(payload.status);
        return { success: true };
      }
    }
    return { success: false, error: '対象行が見つかりません' };
  } catch(e) {
    return { success: false, error: e.message };
  }
}
