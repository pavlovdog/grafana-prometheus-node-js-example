const client = require("prom-client");
const express = require("express");
const dasha = require("@dasha.ai/sdk");

//Test phone number and your API key
const phone = process.env.PHONE;

const registry = new client.Registry();
const gauge = new client.Gauge({
  name: "active_users",
  help: "Speech events by category",
  registers: [registry],
  labelNames: ["category"],
});

const app = express();

// Report Prometheus metrics on /metrics
app.get("/metrics", async (req, res, next) => {
  res.set("Content-Type", registry.contentType);
  res.end(registry.metrics());

  next();
});

let cats = {};
function reportEvent({ category }) {
  console.log(`Reporting event: ${category}`);

  if (!cats[category]) cats[category] = 1;
  else cats[category]++;

  gauge.set({ category }, cats[category]);

  return "";
}

async function runDashaApp(config, phone) {
  const app = await dasha.deploy("./dashaapp", {groupName: "Default"});

  app.connectionProvider = async (conv) =>
    conv.input.phone === "chat"
      ? dasha.chat.connect(await dasha.chat.createConsoleChat())
      : dasha.sip.connect(new dasha.sip.Endpoint(config));

  app.setExternal("reportEvent", reportEvent);
  app.start();
  if (phone) {
    console.log("Trying to call via SIP");

    const conv = app.createConversation({ phone });
    conv.on("transcription", console.log);

    const result = await conv.execute();
    console.log(result.output);

    await app.stop();
    app.dispose();

    return;
  } else {
    console.log("Waiting for calls via SIP");
    console.log("Press Ctrl+C to exit");
    console.log(
      "More details: https://docs.dasha.ai/en-us/default/tutorials/sip-inbound-calls/"
    );
    console.log("Or just type:");
    console.log(
      "dasha sip create-inbound --application-name speech-analytics-app speech-analytics-app"
    );
    console.log("And call to sip uri returned by command above");

    app.queue.on("ready", async (key, conv, info) => {
      console.log(info);

      conv.input = { phone: "" };

      const result = await conv.execute();
      console.log(result.output);
    });
  }
}

runDashaApp("default", phone);

// Run the server
app.listen(9200, "0.0.0.0", () => console.log("App started!"));
