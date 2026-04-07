import dotenv from "dotenv";
import OpenAI from "openai";
import { Telegraf } from "telegraf";

dotenv.config();

const {
  TELEGRAM_BOT_TOKEN,
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-4.1",
} = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const SYSTEM_PROMPT =
  "You are a strong academic and practical assistant. Solve the user's task carefully. " +
  "If the user sends a problem, explain the answer step by step. " +
  "If the user sends an image, read all visible details before answering. " +
  "If the task is ambiguous, state assumptions clearly. Answer in the same language as the user.";

function extractUrl(text = "") {
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0] : null;
}

function isLikelyImageUrl(url = "") {
  return /\.(png|jpe?g|webp|gif|bmp)(\?.*)?$/i.test(url);
}

async function telegramPhotoToDataUrl(ctx) {
  const photos = ctx.message?.photo;
  if (!photos?.length) {
    return null;
  }

  const largest = photos[photos.length - 1];
  const fileLink = await ctx.telegram.getFileLink(largest.file_id);
  const response = await fetch(fileLink.href);

  if (!response.ok) {
    throw new Error(`Failed to download Telegram photo: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

async function buildInputFromMessage(ctx) {
  const text = ctx.message?.text?.trim() || ctx.message?.caption?.trim() || "";
  const imageUrl = extractUrl(text);
  const dataUrl = await telegramPhotoToDataUrl(ctx);

  const content = [];

  if (text) {
    content.push({
      type: "input_text",
      text,
    });
  }

  if (dataUrl) {
    content.push({
      type: "input_image",
      image_url: dataUrl,
      detail: "high",
    });
  } else if (imageUrl && isLikelyImageUrl(imageUrl)) {
    content.push({
      type: "input_image",
      image_url: imageUrl,
      detail: "high",
    });
  }

  if (!content.length) {
    content.push({
      type: "input_text",
      text: "Пользователь прислал сообщение без читаемого текста. Попроси уточнить задачу.",
    });
  }

  return content;
}

async function solveMessage(ctx) {
  const input = await buildInputFromMessage(ctx);

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: input,
      },
    ],
  });

  return response.output_text || "Не удалось сформировать ответ.";
}

bot.start((ctx) =>
  ctx.reply(
    "Отправь задачу текстом, фото или ссылкой на изображение. Я разберу и отвечу."
  )
);

bot.on("message", async (ctx) => {
  try {
    await ctx.reply("Обрабатываю...");
    const answer = await solveMessage(ctx);

    const chunks = answer.match(/[\s\S]{1,3900}/g) || [];
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } catch (error) {
    console.error(error);
    await ctx.reply(
      "Не получилось обработать запрос. Проверь ключи, формат сообщения или попробуй ещё раз."
    );
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
