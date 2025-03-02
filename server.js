const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcodeTerminal = require("qrcode-terminal");
const qrcodeImage = require("qrcode");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
let latestQR = null; // Store latest QR

// Initialize WhatsApp Client with Persistent Session
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "/opt/app/wwebjs_auth" }), // Render Persistent Disk
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // Important for Render
      "--disable-gpu",
    ],
  },
});

// Serve a basic API route
app.get("/", (req, res) => {
  res.send("WhatsApp Bot is Running");
});

// QR Code Handling
client.on("qr", async (qr) => {
  latestQR = qr; // Store QR Code
  console.log(
    "New QR Code received! Scan it at: http://your-render-url.com/qr"
  );
  qrcodeTerminal.generate(qr, { small: true }); // Print QR in Terminal
});

// Serve QR Code as an image on /qr
app.get("/qr", async (req, res) => {
  if (!latestQR) {
    console.log("QR request received but no QR generated yet.");
    return res.status(404).send("QR code not available, please wait...");
  }

  try {
    const qrImage = await qrcodeImage.toDataURL(latestQR);
    res.send(
      `<img src="${qrImage}" alt="Scan QR Code" style="width:300px;height:300px;"/>`
    );
  } catch (err) {
    console.error("Error generating QR:", err);
    res.status(500).send("Error generating QR code.");
  }
});

// WhatsApp Client Ready Event
client.on("ready", () => {
  console.log("Client is ready!");
});

// Message Delete Detection
client.on("message_revoke_everyone", async (deletedMessage, revokedMsg) => {
  if (revokedMsg) {
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

// Initialize WhatsApp Client
client.initialize();
