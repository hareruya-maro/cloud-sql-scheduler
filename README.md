# Firebase Extension: Scheduled Cloud SQL Start/Stop

**Publisher:** Your Publisher Name
**Extension ID:** `scheduled-cloud-sql-start-stop`
**Version:** 0.1.0
**Source:** https://github.com/yourusername/cloud-sql-scheduler

## 概要

この拡張機能は、設定可能なスケジュール（Cron 式）とタイムゾーンに基づいて、Cloud SQL インスタンスの起動・停止を自動化します。必要な時だけインスタンスを実行することでコストを最適化し、手動操作の必要性を排除し、特に開発環境やステージング環境でインスタンスの停止忘れのリスクを低減します。

起動と停止のスケジュールは別々に設定でき、特定の日付（休日）をスキップしたり、Google カレンダーを使用してスケジュールされたアクションをスキップしたりすることが可能です。オプションの Slack 通知を使用して、起動または停止操作中に問題が発生した場合に通知を受けることができます。

## 主な機能

- **スケジュールによる起動/停止:** Cron 式を使って、Cloud SQL インスタンスを自動的に起動・停止するスケジュールを定義。
- **独立したスケジュール:** 起動のみ、停止のみ、または両方を設定可能。
- **タイムゾーン対応:** 指定したタイムゾーンに基づいてスケジュールが実行されます。
- **柔軟な休日スキップ機能:**
  - カンマ区切りリストで提供される特定の日付にアクションをスキップ。
  - （オプション）指定された Google カレンダーの終日イベントに基づいてアクションをスキップ。
  - 起動・停止スケジュールごとに独立して休日設定が可能。
- **オプションのエラー通知:** 起動または停止操作に失敗した場合、Slack 通知を受信。
- **状態チェック:** アクションを試行する前にインスタンスの現在の状態を確認し、不要な API 呼び出しを回避。

## 前提条件

- **Blaze（従量課金制）** 請求プランが有効化された Firebase プロジェクト。
- 管理したい既存の Cloud SQL インスタンス。
- 拡張機能をインストールするユーザーは、Firebase プロジェクトで Owner または Firebase Admin ロールを持っている必要があります。

## インストール方法

この拡張機能は、Firebase コンソールまたは Firebase CLI を使用してインストールできます:

```bash
firebase ext:install your-publisher-id/scheduled-cloud-sql-start-stop --project=<プロジェクトID>
```

インストール中に以下の設定項目を入力する必要があります：

1. クラウド関数のデプロイ場所（リージョン）
2. Cloud SQL インスタンスのプロジェクト ID
3. Cloud SQL インスタンスのリージョン
4. Cloud SQL インスタンス ID
5. 起動スケジュール（Cron 式、例: `0 9 * * 1-5`）
6. 停止スケジュール（Cron 式、例: `0 18 * * 1-5`）
7. タイムゾーン（例: `Asia/Tokyo`）
8. 起動スケジュールをスキップする休日リスト（オプション）
9. 停止スケジュールをスキップする休日リスト（オプション）
10. 起動スケジュールをスキップする Google カレンダー ID（オプション）
11. 停止スケジュールをスキップする Google カレンダー ID（オプション）
12. Slack 通知用の Webhook URL（オプション）

## 使用例

### 平日のみの運用

開発環境を平日の営業時間内のみ稼働させる場合：

- 起動スケジュール: `0 9 * * 1-5`（平日の午前 9 時に起動）
- 停止スケジュール: `0 18 * * 1-5`（平日の午後 6 時に停止）
- タイムゾーン: `Asia/Tokyo`
- 休日リスト: `2025-01-01,2025-05-05,2025-12-25`（元日、こどもの日、クリスマス）

### 日本の祝日への対応

日本の祝日カレンダーを使用して、祝日にはインスタンスを起動させない設定：

- 起動スケジュール: `0 9 * * 1-5`
- 停止スケジュール: `0 18 * * 1-5`
- 起動休日カレンダー ID: `ja.japanese#holiday@group.v.calendar.google.com`（日本の祝日カレンダー）

## 注意事項

- この拡張機能は Firebase の Blaze（従量課金）プランでのみ利用可能です。
- Cloud SQL API と Calendar API（Google カレンダー連携を使用する場合）を有効にする必要があります。
- IAM 権限について、この拡張機能は `cloudsql.editor` 権限を使用して Cloud SQL インスタンスの起動・停止を行います。

## 貢献方法

バグ報告や機能リクエストは、GitHub リポジトリの Issue で受け付けています：

[GitHub Issues](https://github.com/yourusername/cloud-sql-scheduler/issues)

## ライセンス

このプロジェクトは Apache-2.0 ライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。
