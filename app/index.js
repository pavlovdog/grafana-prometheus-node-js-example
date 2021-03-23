const client = require('prom-client');
const express = require('express');
const dasha = require('@dasha.ai/platform-sdk');

//Test phone number and your API key
const phone = "<YOUR_PHONE>";
const apiKey = "<YOUR_API_KEY>";

if(!phone) throw Error("Please set test phone number to call to.");
if(!apiKey) throw Error("Dasha API key is not set.");


const registry = new client.Registry();
const gauge = new client.Gauge({
    name: 'active_users',
    help: 'Speech events by category',
    registers: [registry],
    labelNames: [
        'category',
    ],
});

const app = express();

// Report Prometheus metrics on /metrics
app.get('/metrics', async (req, res, next) => {
    res.set('Content-Type', registry.contentType);
    res.end(registry.metrics());

    next();
});

let cats = {};
function reportEvent({ category }) {
    console.log(`Reporting event: ${category}`);

    if (!cats[category]) cats[category] = 1;
    else cats[category]++;

    gauge.set(
        { category },
        cats[category],
    );

    return "";
}

function createLogger() {
    return {
        log: async (msg) => {
            console.log({ Log: msg });
        },
        transcription: async (msg, incoming) => {
            console.log(incoming ? { Human: msg } : { AI: msg });
        },
        raw: async (devlog) => {
            if (devlog.msg.msgId === "RecognizedSpeechMessage")
                console.log(JSON.stringify(devlog.msg.results[0].facts, undefined, 2) + "\n");

            if (devlog.msg.msgId === "FailedOpenSessionChannelMessage") {
                console.error(`Failed to call: ${devlog.msg.reason} ${devlog.msg.details}`);
            }
        }
    }
}

async function runDashaApp(config, phone) {
    let sdk = new dasha.DashaSdk({
        url: "app.us.dasha.ai",
        apiKey: apiKey
    });
    let app = await sdk.registerApp({
        appPackagePath: "./dashaapp",
        concurrency: 1,
        progressReporter: dasha.progress.consoleReporter,
    });
    await app.addSessionConfig({
        name: "audio",
        config: {
            type: "audio",
            channel: {
                type: "sip",
                configName: config
            },
            stt: {
                configName: "Default"
            },
            tts: {
                type: "synthesized",
                configName: "Dasha"
            },
            noiseVolume: "0.0"
        }
    });
    if (phone !== null) {
        console.log("Trying to call via SIP");
        let job = await app.startJob(phone, "audio", { data: { phone: phone }, debugEvents: createLogger(), rpcHandler: { reportEvent: reportEvent } });
        console.log("Job started");
        const result = await job.result;
        app.disconnect();
        return;
    } else {
        console.log("Waiting for calls via SIP");
        console.log("Press Ctrl+C to exit");
        console.log("More details: https://docs.dasha.ai/en-us/default/tutorials/sip-inbound-calls/");
        console.log("Or just type:");
        console.log("dasha sip create-inbound --application-name speech-analytics-app speech-analytics-app");
        console.log("And call to sip uri returned by command above");
        app.onJob({
            startingJob: async (serverId, id, incomingData) => {
                console.log(incomingData);
                const job = { data: { phone: "" }, debugEvents: createLogger(), rpcHandler: { reportEvent: reportEvent } };
                console.log(`Accept job ${id}`, job);
                return { accept: true, sessionConfigName: "audio", ...job };
            },
            completedJob: async (id, result) => {
                console.log(`Completed job ${id}`, result);
                app.disconnect();
                return;
            },
            failedJob: async (id, error) => {
                console.log(`Failed job ${id}`, error);
                app.disconnect();
                return;
            },
            timedOutJob: async (id) => {
                console.log(`Job ${id} timed out`);
                app.disconnect();
                return;
            },
        });
    }
}

runDashaApp("default", phone);

// Run the server
app.listen(9200, '0.0.0.0', () => console.log('App started!'));
