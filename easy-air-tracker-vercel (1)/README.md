# Easy Smart Air Tracker – Vercel deploy (Telegram order alerts)

## 1. Get your Telegram chat ID (one time)
1. Open your bot @easysmarttrackerbot in Telegram, press Start, and send "hi".
   (For a group: add the bot to the group and send a message there.)
2. In your browser open:  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
3. Find `"chat":{"id": 123456789 ...}` – that number is your chat ID (group IDs start with -).

## 2. Deploy on Vercel
1. Put this folder in a GitHub repo and import it in vercel.com (Framework preset: **Other**, no build command).
2. Project Settings > Environment Variables:
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `TELEGRAM_CHAT_ID`   = the chat ID from step 1
3. Redeploy, place a test order – you should get a Telegram message instantly.

NEVER put the bot token inside index.html or any file – only in Vercel Environment Variables.

## 3. Check Meta Pixel
Install the "Meta Pixel Helper" Chrome extension, open your live site: PageView, ViewContent (when pressing order buttons),
InitiateCheckout (first form click) and Purchase (after a successful order, value in BDT) should appear.

## Notes
- Prices/delivery are recalculated on the server (api/order.js `PRODUCTS`/`DELIVERY`). Change them there AND in index.html (`PR`/`DC`).
- Order numbers look like ORD-261019-4821 (date + random 4 digits).
