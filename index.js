#!/usr/bin/node

const axios = require("axios");
const discord = require("discord.js");
const fs = require("fs");

require("dotenv").config();

const m = "Please set it in your .env file or as an environment variable.";
const missingEnvVars = ["API_KEY", "DISCORD_TOKEN", "MODEL"].filter(key => !process.env[key]);
if (missingEnvVars.length) {
	missingEnvVars.forEach(key => console.error(`Missing ${key} variable. ${m}`));
	process.exit(1);
}

process.env.MAX_TOKENS = Number(process.env.MAX_TOKENS) || 1024;
if (isNaN(process.env.MAX_TOKENS)) {
	console.warn("Invalid MAX_TOKENS value. Defaulting to 1024.");
	process.env.MAX_TOKENS = 1024;
}

let attachment_cache = {};

async function chatCompletion(model, messages, tools) {
	try {
		const response = await axios.post("https://api.deepinfra.com/v1/openai/chat/completions", {
			model,
			messages,
			tools,
			temperature: 0.0,
			max_tokens: process.env.MAX_TOKENS,
			stream: false
		}, {
			headers: {
				Authorization: `Bearer ${process.env.API_KEY}`,
				"Content-Type": "application/json"
			}
		});
		return response.data.choices[0].message;
	} catch (error) {
		throw new Error("Error with chat completion request.");
	}
}

async function audioTranscription(buffer) {
	try {
		const formData = new FormData();
		formData.append("audio", new Blob([buffer]));
		const response = await axios.post("https://api.deepinfra.com/v1/inference/openai/whisper-large-v3-turbo", formData, {
			headers: {
				Authorization: `Bearer ${process.env.API_KEY}`,
				"Content-Type": "multipart/form-data"
			}
		});
		return response.data;
	} catch (error) {
		throw new Error("Error with audio transcription request.");
	}
}

const client = new discord.Client({
	intents: discord.Intents.FLAGS.ALL // If you don't need all intents, specify only necessary ones here.
});

function isBlacklisted(id) {
	if (!fs.existsSync("blacklist.json")) return false;

	try {
		const blacklist = JSON.parse(fs.readFileSync("blacklist.json", "utf-8"));
		return blacklist.includes(id);
	} catch (error) {
		console.warn("Invalid JSON in blacklist.json!", error.message);
		return false;
	}
}

client.on("messageCreate", async (msg) => {
	if (msg.author.id === client.user.id || msg.author.bot || !msg.mentions.users.has(client.user.id)) return;

	if (isBlacklisted(msg.author.id) || isBlacklisted(msg.channel.id) || isBlacklisted(msg.guild.id)) {
		if (fs.existsSync("Weezer - Buddy Holly.mp3")) {
			await msg.reply({ files: ["./Weezer - Buddy Holly.mp3"] }).catch(() => {});
		}
		return;
	}

	try {
		await msg.channel.sendTyping();
	} catch {
		return;
	}

	const typer = setInterval(() => msg.channel.sendTyping(), 5000);
	let messages = [{
		role: "system",
		content: `- You are an AI assistant, based on the "${process.env.MODEL}" model, named ${client.user.tag}.
- You are in the "${msg.channel.name}" channel (<#${msg.channel.id}>) of the "${msg.guild.name}" Discord server.
- UTC time: ${new Date().toISOString()} (UNIX: ${Math.floor(Date.now() / 1000)}).

- Use informal language with all-lowercase and only 1-2 sentences.
- Avoid "UwU" or "OwO", using ":3" instead.
- Engage in role-playing actions only when requested.
- Available emojis: ${JSON.stringify(msg.guild.emojis.cache.map(emoji => `<:${emoji.name}:${emoji.id}>`))}.`
	}];

	const channelMessages = (await msg.channel.messages.fetch({ limit: 100 })).reverse();
	for (const message of channelMessages.values()) {
		let content = "";

		if (message.author.id === client.user.id) {
			messages.push({ role: "assistant", content: message.content });
			continue;
		}

		content += `<@${message.author.tag}>`;
		if (message.author.nickname) content += ` (${message.author.nickname})`;
		if (message.author.bot) content += " (BOT)";
		if (message.editedTimestamp) content += " (edited)";
		if (message.type === "REPLY") content += ` (replying to <@${message.reference.messageId || "unknown"}>)`;
		content += `:\n${message.content}`;

		for (const user of client.users.cache.values()) {
			content = content.replace(new RegExp(`<@!?${user.id}>`, "g"), `<@${user.tag}>`);
		}
		for (const channel of client.channels.cache.values()) {
			content = content.replace(new RegExp(`<#${channel.id}>`, "g"), `<#${channel.name}>`);
		}
		message.guild.roles.cache.forEach(role => {
			content = content.replace(new RegExp(`<@&${role.id}>`, "g"), `<@&${role.name}>`);
		});

		messages.push({ role: "user", content });
	}

	let replyContent;
	try {
		const response = await chatCompletion(process.env.MODEL, messages);
		replyContent = response.content;
	} catch (error) {
		replyContent = `⚠️ ${error.message}`;
	}

	clearInterval(typer);
	if (!replyContent) return;

	const reply = { content: replyContent.length > 2000 ? replyContent.slice(0, 2000) : replyContent };
	if (replyContent.length > 2000) {
		reply.files = [new discord.AttachmentBuilder(Buffer.from(replyContent), { name: "message.txt" })];
	}

	try {
		await msg.reply(reply);
	} catch {
		try {
			await msg.channel.send(reply);
		} catch {
			// Permissions issue or deleted channel
		}
	}
});

client.login(process.env.DISCORD_TOKEN);

client.on("ready", () => {
	console.log(`Ready on ${client.user.tag}`);
	client.user.setActivity("free ballpoint hammer giveaway at 123 fazbear st", { type: discord.ActivityType.CUSTOM });
});
