const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const qrcodeImage = require("qrcode");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

let latestQR = null;

// Initialize the WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Serve a basic API route
app.get("/", (req, res) => {
  res.send("WhatsApp Bot is Running");
});

client.on("qr", async (qr) => {
  latestQR = qr;
  console.log("New QR Code received! Scan it from the /qr page.");
  qrcode.generate(qr, { small: true });
});

app.get("/qr", async (req, res) => {
  if (!latestQR)
    return res.status(404).send("QR code not available, please wait...");

  try {
    const qrImage = await qrcodeImage.toDataURL(latestQR);
    res.send(
      `<img src="${qrImage}" alt="Scan QR Code" style="width:300px;height:300px;"/>`
    );
  } catch (err) {
    res.status(500).send("Error generating QR code.");
  }
});

// WhatsApp Client Ready Event
client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message_revoke_everyone", async (deletedMessage, revokedMsg) => {
  if (revokedMsg) {
    const chat = await deletedMessage.getChat();
    const sender = await deletedMessage.getContact();
    const senderTag = `@${sender.name || sender.number}`;
    const deleteTime = new Date().toLocaleString();
    const deletedContent =
      revokedMsg.body || "Media message (image, video, etc.)";

    const recipient = deletedMessage.to;

    if (recipient) {
      const formattedMessage = `🛑 *Anti-Delete:* ${senderTag} deleted a message at ${deleteTime}:\n\n${deletedContent}`;
      client.sendMessage(recipient, formattedMessage);
    }
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

client.initialize();
