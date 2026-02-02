// ===== 設定項目 =====
const DISCORD_WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE'; // DiscordのWebhook URLを設定
const FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // 監視したいGoogle DriveのフォルダIDを設定

// スクリプトプロパティのキー名
const LAST_CHECK_TIME_KEY = 'lastCheckTime';

/**
 * 初回セットアップ用の関数
 * スクリプトエディタで一度実行してください
 */
function setup() {
  const now = new Date().getTime();
  PropertiesService.getScriptProperties().setProperty(LAST_CHECK_TIME_KEY, now.toString());
  Logger.log('セットアップ完了: 最終チェック時刻を設定しました');
  
  // トリガーを設定(5分ごとに実行)
  ScriptApp.newTrigger('checkNewFiles')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('トリガーを作成しました: 5分ごとに実行されます');
}

/**
 * 新しいファイルをチェックしてDiscordに通知
 */
function checkNewFiles() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const lastCheckTime = scriptProperties.getProperty(LAST_CHECK_TIME_KEY);
    
    if (!lastCheckTime) {
      Logger.log('最終チェック時刻が設定されていません。setup()を実行してください。');
      return;
    }
    
    const lastCheck = new Date(parseInt(lastCheckTime));
    const folder = DriveApp.getFolderById(FOLDER_ID);
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
      sendToDiscord(newFiles, folder.getName());
      Logger.log(`${newFiles.length}件の新しいファイルを検出し、通知しました`);
    } else {
      Logger.log('新しいファイルはありませんでした');
    }
    
    // 最終チェック時刻を更新
    scriptProperties.setProperty(LAST_CHECK_TIME_KEY, new Date().getTime().toString());
    
  } catch (error) {
    Logger.log('エラーが発生しました: ' + error.toString());
    // エラーもDiscordに通知(オプション)
    sendErrorToDiscord(error.toString());
  }
}

/**
 * Discordに通知を送信
 */
function sendToDiscord(files, folderName) {
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
  
  const response = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, options);
  
  if (response.getResponseCode() !== 204) {
    Logger.log('Discord通知エラー: ' + response.getContentText());
  }
}

/**
 * エラーをDiscordに通知
 */
function sendErrorToDiscord(errorMessage) {
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
  
  UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, options);
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