# Telegram Solver Bot

Deployable Telegram bot that can answer tasks from:

- plain text
- image URLs
- photos uploaded to Telegram

## Important

The Telegram bot token shared in chat is now exposed. Revoke it in `@BotFather` and create a new one before deploying.

## Setup

1. Copy `.env.example` to `.env`
2. Fill in:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)

## Run locally

```bash
npm install
npm start
```

## Deploy

This project is ready for deployment as a background worker on services like Render or Railway.

### Render

1. Create a new Web Service or Background Worker from this folder/repo
2. Render will detect `render.yaml`
3. Add env vars:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`

### Railway

1. Create a new project
2. Upload this folder or connect the repo
3. Add the same env vars
4. Start command: `npm start`

## Bot behavior

- Send text: the bot answers normally
- Send an image: the bot analyzes it
- Send a direct image URL: the bot analyzes it
- Send a normal link: the bot treats it as text context unless it looks like an image URL

## Notes

- Telegram photos are downloaded server-side and forwarded to the model as base64 data URLs
- The bot uses long polling, so it works fine on always-on servers
