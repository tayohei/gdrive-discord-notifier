// スクリプトプロパティのキー名
const DISCORD_WEBHOOK_URL_KEY = 'discordWebhookUrl';
const FOLDER_ID_KEY = 'folderId';
const LAST_CHECK_TIME_KEY = 'lastCheckTime';

/**
 * 初回セットアップ用の関数
 * スクリプトエディタで一度実行してください
 * 
 * 使い方:
 * 1. この関数を編集して、WEBHOOK_URLとTARGET_FOLDER_IDを設定
 * 2. setup()を実行
 * 3. この関数内の設定値は削除してOK（スクリプトプロパティに保存されます）
 */
function setup() {
  // ===== ここに設定値を入力 =====
  const WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE';
  const TARGET_FOLDER_ID = 'YOUR_FOLDER_ID_HERE';
  // ============================
  
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 設定値をスクリプトプロパティに保存
  scriptProperties.setProperty(DISCORD_WEBHOOK_URL_KEY, WEBHOOK_URL);
  scriptProperties.setProperty(FOLDER_ID_KEY, TARGET_FOLDER_ID);
  scriptProperties.setProperty(LAST_CHECK_TIME_KEY, new Date().getTime().toString());
  
  Logger.log('✓ 設定を保存しました');
  Logger.log('  - Discord Webhook URL: ' + WEBHOOK_URL.substring(0, 30) + '...');
  Logger.log('  - Folder ID: ' + TARGET_FOLDER_ID);
  
  // トリガーを設定(5分ごとに実行)
  ScriptApp.newTrigger('checkNewFiles')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('✓ トリガーを作成しました: 5分ごとに実行されます');
}

/**
 * 設定値を表示（確認用）
 */
function showConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const webhookUrl = scriptProperties.getProperty(DISCORD_WEBHOOK_URL_KEY);
  const folderId = scriptProperties.getProperty(FOLDER_ID_KEY);
  
  Logger.log('現在の設定:');
  Logger.log('  - Discord Webhook URL: ' + (webhookUrl ? webhookUrl.substring(0, 30) + '...' : '未設定'));
  Logger.log('  - Folder ID: ' + (folderId || '未設定'));
}

/**
 * 設定値を更新（個別に変更したい場合）
 */
function updateWebhookUrl(newUrl) {
  PropertiesService.getScriptProperties().setProperty(DISCORD_WEBHOOK_URL_KEY, newUrl);
  Logger.log('Discord Webhook URLを更新しました');
}

function updateFolderId(newId) {
  PropertiesService.getScriptProperties().setProperty(FOLDER_ID_KEY, newId);
  Logger.log('Folder IDを更新しました');
}

/**
 * 新しいファイルをチェックしてDiscordに通知
 */
function checkNewFiles() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const webhookUrl = scriptProperties.getProperty(DISCORD_WEBHOOK_URL_KEY);
    const folderId = scriptProperties.getProperty(FOLDER_ID_KEY);
    const lastCheckTime = scriptProperties.getProperty(LAST_CHECK_TIME_KEY);
    
    // 設定チェック
    if (!webhookUrl || !folderId) {
      Logger.log('エラー: 設定が完了していません。setup()を実行してください。');
      return;
    }
    
    if (!lastCheckTime) {
      Logger.log('最終チェック時刻が設定されていません。setup()を実行してください。');
      return;
    }
    
    const lastCheck = new Date(parseInt(lastCheckTime));
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const newFiles = [];
    
    // 最終チェック以降に追加されたファイルを検索
    while (files.hasNext()) {
      const file = files.next();
      const createdDate = file.getDateCreated();
      
      if (createdDate > lastCheck) {
        newFiles.push({
          name: file.getName(),
          url: file.getUrl(),
          owner: file.getOwner().getName(),
          createdDate: createdDate,
          mimeType: file.getMimeType(),
          size: formatFileSize(file.getSize())
        });
      }
    }
    
    // 新しいファイルがあればDiscordに通知
    if (newFiles.length > 0) {
      sendToDiscord(newFiles, folder.getName(), webhookUrl);
      Logger.log(`${newFiles.length}件の新しいファイルを検出し、通知しました`);
    } else {
      Logger.log('新しいファイルはありませんでした');
    }
    
    // 最終チェック時刻を更新
    scriptProperties.setProperty(LAST_CHECK_TIME_KEY, new Date().getTime().toString());
    
  } catch (error) {
    Logger.log('エラーが発生しました: ' + error.toString());
    // エラーもDiscordに通知(オプション)
    const webhookUrl = PropertiesService.getScriptProperties().getProperty(DISCORD_WEBHOOK_URL_KEY);
    if (webhookUrl) {
      sendErrorToDiscord(error.toString(), webhookUrl);
    }
  }
}

/**
 * Discordに通知を送信
 */
function sendToDiscord(files, folderName, webhookUrl) {
  const embeds = files.map(file => {
    return {
      title: `📄 ${file.name}`,
      url: file.url,
      color: 5814783, // 青色
      fields: [
        {
          name: '追加者',
          value: file.owner,
          inline: true
        },
        {
          name: 'サイズ',
          value: file.size,
          inline: true
        },
        {
          name: '追加日時',
          value: formatDate(file.createdDate),
          inline: false
        }
      ],
      footer: {
        text: `フォルダ: ${folderName}`
      },
      timestamp: file.createdDate.toISOString()
    };
  });
  
  const payload = {
    content: `🔔 **${files.length}件の新しいファイルが追加されました！**`,
    embeds: embeds.slice(0, 10) // Discordは1メッセージに最大10個のembed
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(webhookUrl, options);
  
  if (response.getResponseCode() !== 204) {
    Logger.log('Discord通知エラー: ' + response.getContentText());
  }
}

/**
 * エラーをDiscordに通知
 */
function sendErrorToDiscord(errorMessage, webhookUrl) {
  const payload = {
    content: '⚠️ **Google Drive監視スクリプトでエラーが発生しました**',
    embeds: [{
      title: 'エラー詳細',
      description: errorMessage,
      color: 15158332, // 赤色
      timestamp: new Date().toISOString()
    }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  UrlFetchApp.fetch(webhookUrl, options);
}

/**
 * ファイルサイズを読みやすい形式に変換
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 日時を読みやすい形式に変換
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * トリガーを削除(必要に応じて実行)
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  Logger.log('すべてのトリガーを削除しました');
}