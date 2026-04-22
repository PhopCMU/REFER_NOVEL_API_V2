import { Bot } from "grammy";
import { logger } from "../utils/logger";
import { getRequestInfo } from "../utils/requestInfo";

interface CaseReferralPayload {
  referenceNo: string | number;
  id: string;
  hospitalId: string;
  veterinarianId: string;
  referralType: string;
  veterinarian: { firstName: string; lastName: string };
  hospital: { name: string };
}

export const sendTelegramMessage = async (
  data: CaseReferralPayload,
  request: any,
  set: any,
): Promise<void> => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const requestInfo = getRequestInfo(request);

  const now = new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour12: false,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    numberingSystem: "latn",
  });

  try {
    if (!botToken || !chatId) {
      logger.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not defined", {
        ...requestInfo,
        set: set.status,
      });
      throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not defined");
    }

    // ✅ Validate required data fields
    if (!data?.referenceNo) {
      logger.error("Missing referenceNo in data payload", {
        ...requestInfo,
        data,
      });
      throw new Error("Invalid data: referenceNo is required");
    }

    const escapeMarkdownV2 = (
      text: string | number | null | undefined,
    ): string => {
      if (text == null) return "";
      const str = String(text);
      // Escape all MarkdownV2 reserved characters
      return str.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
    };

    const telegramMessage = `
🎉 New Case Referral
🆔 referenceNo: ${escapeMarkdownV2(data.referenceNo)}
🏥 Hospital: ${escapeMarkdownV2(data.hospital?.name)}
🩺 Vet: ${escapeMarkdownV2(data.veterinarian?.firstName)} ${escapeMarkdownV2(data.veterinarian?.lastName)}
🗓️ Referral Time: ${escapeMarkdownV2(now)}
    `.trim();

    const bot = new Bot(botToken);

    await bot.api.sendMessage(chatId, telegramMessage, {
      parse_mode: "MarkdownV2",
    });

    set.status = 200;
    logger.info("Telegram message sent successfully", {
      ...requestInfo,
      status: set.status,
      referenceNo: data.referenceNo,
    });
  } catch (error) {
    logger.error("Error sending message:", error);
    // Optionally re-throw or handle gracefully
    // throw error;
  }
};
