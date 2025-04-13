import * as functions from "@google-cloud/functions-framework";
import axios from "axios";
import { google } from "googleapis";
import moment from "moment-timezone";

// 環境変数からパラメータを取得
const PROJECT_ID = process.env.PROJECT_ID || "";
const INSTANCE_ID = process.env.INSTANCE_ID || "";
// const REGION = process.env.REGION || "";
const TIMEZONE = process.env.TIMEZONE || "UTC";
const START_HOLIDAYS_LIST = process.env.START_HOLIDAYS_LIST || "";
const STOP_HOLIDAYS_LIST = process.env.STOP_HOLIDAYS_LIST || "";
const START_HOLIDAYS_CALENDAR_ID = process.env.START_HOLIDAYS_CALENDAR_ID || "";
const STOP_HOLIDAYS_CALENDAR_ID = process.env.STOP_HOLIDAYS_CALENDAR_ID || "";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";

// SQLAdminクライアントの初期化
const sqladmin = google.sqladmin({
  version: "v1beta4",
  auth: new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  }),
});

// カレンダーAPIクライアントの初期化
const calendar = google.calendar({
  version: "v3",
  auth: new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  }),
});

/**
 * 日付が休日リストに含まれているかをチェック
 * @param dateStr チェックする日付の文字列 (YYYY-MM-DD)
 * @param holidaysList カンマ区切りの休日リスト
 * @returns 休日の場合はtrue
 */
async function isDateInHolidayList(
  dateStr: string,
  holidaysList: string
): Promise<boolean> {
  if (!holidaysList) {
    return false;
  }

  const holidays = holidaysList.split(",").map((date) => date.trim());
  return holidays.includes(dateStr);
}

/**
 * Googleカレンダーの終日イベントをチェック
 * @param dateStr チェックする日付の文字列 (YYYY-MM-DD)
 * @param calendarId Googleカレンダーのカレンダーリスト識別子
 * @returns カレンダーに終日イベントがある場合はtrue
 */
async function hasAllDayEventInCalendar(
  dateStr: string,
  calendarId: string
): Promise<boolean> {
  if (!calendarId) {
    return false;
  }

  try {
    // 指定した日の始まりと終わりを設定
    const startDate = new Date(dateStr);
    const endDate = new Date(dateStr);
    endDate.setDate(endDate.getDate() + 1);

    // カレンダーイベントを取得
    const response = await calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    // 終日イベントをフィルタリング
    const events = response.data.items || [];
    return events.some((event) => {
      // 終日イベントの場合、dateのみが設定される
      return !!(event.start?.date && event.end?.date);
    });
  } catch (error) {
    console.error(
      `カレンダーからイベントを取得中にエラーが発生しました: ${error}`
    );
    return false;
  }
}

/**
 * 休日チェック（リストとカレンダー）
 * @param dateStr チェックする日付の文字列 (YYYY-MM-DD)
 * @param holidaysList カンマ区切りの休日リスト
 * @param calendarId Googleカレンダーのカレンダーリスト識別子
 * @returns 休日の場合はtrue
 */
async function isHoliday(
  dateStr: string,
  holidaysList: string,
  calendarId: string
): Promise<boolean> {
  // リストかカレンダーのいずれかでホリデーであればtrueを返す
  return (
    (await isDateInHolidayList(dateStr, holidaysList)) ||
    (await hasAllDayEventInCalendar(dateStr, calendarId))
  );
}

/**
 * Slackに通知を送信
 * @param message 送信するメッセージ
 */
async function sendSlackNotification(message: string): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    return;
  }

  try {
    await axios.post(SLACK_WEBHOOK_URL, { text: message });
    console.log("Slack通知が送信されました");
  } catch (error) {
    console.error(`Slack通知の送信中にエラーが発生しました: ${error}`);
  }
}

/**
 * Cloud SQLインスタンスの状態を取得
 * @returns インスタンスの状態 (RUNNABLE, STOPPED など)
 */
async function getInstanceState(): Promise<string | null> {
  try {
    const response = await sqladmin.instances.get({
      project: PROJECT_ID,
      instance: INSTANCE_ID,
    });

    return response.data.state || null;
  } catch (error) {
    console.error(`インスタンス状態の取得中にエラーが発生しました: ${error}`);
    return null;
  }
}

/**
 * Cloud SQLインスタンスを開始
 */
async function startCloudSqlInstance(): Promise<void> {
  try {
    // インスタンスの現在の状態をチェック
    const state = await getInstanceState();

    if (state === "RUNNABLE") {
      console.log(`インスタンス ${INSTANCE_ID} は既に実行中です`);
      return;
    }

    console.log(`インスタンス ${INSTANCE_ID} を開始します...`);

    await sqladmin.instances.patch({
      project: PROJECT_ID,
      instance: INSTANCE_ID,
      requestBody: {
        settings: {
          activationPolicy: "ALWAYS",
        },
      },
    });

    console.log(`インスタンス ${INSTANCE_ID} の開始をリクエストしました`);
  } catch (error) {
    const errorMessage = `インスタンス ${INSTANCE_ID} の開始中にエラーが発生しました: ${error}`;
    console.error(errorMessage);

    // Slack通知を送信
    await sendSlackNotification(`:x: *Cloud SQL起動エラー*\n${errorMessage}`);

    throw new Error(errorMessage);
  }
}

/**
 * Cloud SQLインスタンスを停止
 */
async function stopCloudSqlInstance(): Promise<void> {
  try {
    // インスタンスの現在の状態をチェック
    const state = await getInstanceState();

    if (state === "STOPPED") {
      console.log(`インスタンス ${INSTANCE_ID} は既に停止しています`);
      return;
    }

    console.log(`インスタンス ${INSTANCE_ID} を停止します...`);

    await sqladmin.instances.patch({
      project: PROJECT_ID,
      instance: INSTANCE_ID,
      requestBody: {
        settings: {
          activationPolicy: "NEVER",
        },
      },
    });

    console.log(`インスタンス ${INSTANCE_ID} の停止をリクエストしました`);
  } catch (error) {
    const errorMessage = `インスタンス ${INSTANCE_ID} の停止中にエラーが発生しました: ${error}`;
    console.error(errorMessage);

    // Slack通知を送信
    await sendSlackNotification(`:x: *Cloud SQL停止エラー*\n${errorMessage}`);

    throw new Error(errorMessage);
  }
}

/**
 * インスタンス起動のCloud Functions
 */
functions.cloudEvent(
  "startInstance",
  async (cloudEvent: functions.CloudEvent<unknown>): Promise<void> => {
    console.log("インスタンス起動処理を開始します");

    // 現在の日付を取得 (指定されたタイムゾーンで)
    const today: string = moment().tz(TIMEZONE).format("YYYY-MM-DD");
    console.log(`現在の日付: ${today} (タイムゾーン: ${TIMEZONE})`);

    // 休日チェック
    const isHolidayToday: boolean = await isHoliday(
      today,
      START_HOLIDAYS_LIST,
      START_HOLIDAYS_CALENDAR_ID
    );

    if (isHolidayToday) {
      console.log(
        `本日 ${today} は休日のため、インスタンスの起動をスキップします`
      );
      return;
    }

    // インスタンスを開始
    await startCloudSqlInstance();
    console.log("インスタンス起動処理を完了しました");
  }
);

/**
 * インスタンス停止のCloud Functions
 */
functions.cloudEvent(
  "stopInstance",
  async (cloudEvent: functions.CloudEvent<unknown>) => {
    console.log("インスタンス停止処理を開始します");

    // 現在の日付を取得 (指定されたタイムゾーンで)
    const today = moment().tz(TIMEZONE).format("YYYY-MM-DD");
    console.log(`現在の日付: ${today} (タイムゾーン: ${TIMEZONE})`);

    // 休日チェック
    const isHolidayToday = await isHoliday(
      today,
      STOP_HOLIDAYS_LIST,
      STOP_HOLIDAYS_CALENDAR_ID
    );

    if (isHolidayToday) {
      console.log(
        `本日 ${today} は休日のため、インスタンスの停止をスキップします`
      );
      return;
    }

    // インスタンスを停止
    await stopCloudSqlInstance();
    console.log("インスタンス停止処理を完了しました");
  }
);
