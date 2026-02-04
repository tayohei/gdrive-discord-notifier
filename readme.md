# Google Drive to Discord Notifier



Google Driveの特定のフォルダに新しいファイルが追加されたら、自動的にDiscordに通知するGoogle Apps Script（GAS）です。



## 機能



- 指定したGoogle Driveフォルダの監視

- 新規ファイル追加時にDiscordへ自動通知

- ファイル名、追加者、サイズ、追加日時の表示

- ファイルへの直接リンク

- エラー発生時の通知機能



## セットアップ



### 1. Discord Webhook URLの取得



1. 通知を送りたいDiscordチャンネルを開く

2. チャンネル設定 → 連携サービス → ウェブフック

3. 「新しいウェブフック」を作成してURLをコピー



### 2. Google DriveフォルダIDの取得



1. 監視したいフォルダをGoogle Driveで開く

2. URLから以下の部分をコピー

```

https://drive.google.com/drive/folders/【ここがフォルダID】

```



### 3. Google Apps Scriptの設定



1. [Google Apps Script](https://script.google.com/)を開く

2. 新しいプロジェクトを作成

3. `Code.gs`にスクリプトをコピー&ペースト

4. スクリプト冒頭の設定を変更:

```javascript

const DISCORD_WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE';

const FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

```



### 4. 初回実行



1. 関数一覧から`setup`を選択

2. 実行ボタンをクリック

3. 権限の承認を行う（初回のみ）

4. 自動監視が開始されます



## カスタマイズ



### チェック間隔の変更



デフォルトは5分ごとですが、`setup()`関数内で変更可能:



```javascript

// 1分ごと

.everyMinutes(1)



// 10分ごと

.everyMinutes(10)



// 1時間ごと

.everyHours(1)

```



### トリガーの削除



監視を停止したい場合は`deleteTriggers()`関数を実行してください。



## 必要な権限



- Google Drive: ファイル情報の読み取り

- 外部サービス: Discord Webhookへのアクセス



## ライセンス



MIT License



## 注意事項



- Google Apps Scriptの実行時間制限に注意してください

- Discordの1メッセージあたり最大10個のembedまで対応

- 大量のファイルが追加される場合は、チェック間隔の調整を推奨

