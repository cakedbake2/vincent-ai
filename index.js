#!/usr/bin/node

"use strict";

const { Mistral } = await import("@mistralai/mistralai");
const discord = await import("discord.js");
const fs = await import("fs");
const dotenv = await import("dotenv");
const { evaluate } = await import("mathjs");

dotenv.config();

// const functionCache = {};

if (!process.env.DISCORD_TOKEN) { throw new Error("DISCORD_TOKEN is not set!"); }

if (!process.env.MISTRAL_API_KEY) { throw new Error("MISTRAL_API_KEY is not set!"); }

process.env.MAX_TOKENS = Number(process.env.MAX_TOKENS);
process.env.MAX_TOKENS = Math.floor(process.env.MAX_TOKENS);
if (isNaN(process.env.MAX_TOKENS)) { console.warn("MAX_TOKENS is not a valid integer!"); process.env.MAX_TOKENS = ""; }

process.env.TEMPERATURE = Number(process.env.TEMPERATURE)
if (isNaN(process.env.TEMPERATURE)) { console.warn("TEMPERATURE is not a valid number!"); process.env.TEMPERATURE = ""; }

const mistral = new Mistral();

let modelIsMultimodal = false;

await mistral.models.list().then((models) => {
	if (!models.data.map(model => model.id).includes(process.env.MODEL)) {
		throw new Error(process.env.MODEL, "is not a valid MODEL!");
	}

	if (models.data.find(model => model.id === process.env.MODEL).capabilities.vision) {
		modelIsMultimodal = true;
	}
})

const client = new discord.Client({ "intents": [
	1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 1048576, 2097152, 16777216, 33554432
] })

const shutdown = async (i) => {
	console.log("Terminating:", i);

	try {
		await client.user.setPresence({
			"status": "invisible",
			"activities": []
		});
	} catch {}

	await client.destroy();
	process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", shutdown);
process.on("unhandledRejection", shutdown);

let blacklist = [];

if (fs.existsSync("blacklist.json")) {
	try {
		blacklist = JSON.parse(fs.readFileSync("blacklist.json"));
	} catch (error) {
		console.warn("Error while parsing blacklist.json:", error.message);
	}

	fs.watch("blacklist.json", () => {
		// TO-DO: figure out why this fires twice
		try {
			blacklist = JSON.parse(fs.readFileSync("blacklist.json"));
			console.info("Blacklist updated from blacklist.json");
		} catch (error) {
			console.warn("Error while parsing blacklist.json:", error.message);
		}
	})
}

function isBlacklisted (id) {
	return blacklist.includes(id);
}

function makeSpecialsLlmFriendly (content, guild) {
	client.users.cache.forEach((user) => { content = content.replaceAll("<@" + user.id + ">", "<@" + user.tag + ">") }); // <@12345678> -> <@username>
	client.users.cache.forEach((user) => { content = content.replaceAll("<@!" + user.id + ">", "<@" + user.tag + ">") }); // <@!12345678> -> <@username>
	client.channels.cache.forEach((channel) => { content = content.replaceAll("<#" + channel.id + ">", "<#" + channel.name + ">") }); // <#12345678> -> <#channel>
	if (guild) {
		guild.roles.cache.forEach((role) => { content = content.replaceAll("<@&" + role.id + ">", "<@&" + role.name + ">") }); // <@&12345678> -> <@&role>
	}

	return content;
}

function makeSpecialsLlmUnfriendly (content, guild) {
	client.users.cache.forEach((user) => { content = content.replaceAll("<@" + user.tag + ">", "<@" + user.id + ">") }); // <@username> -> <@12345678>
	client.users.cache.forEach((user) => { content = content.replaceAll("<@!" + user.tag + ">", "<@!" + user.id + ">") }); // <@!username> -> <@!12345678>
	client.channels.cache.forEach((channel) => { content = content.replaceAll("<#" + channel.name + ">", "<#" + channel.id + ">") }); // <#channel> -> <#12345678>
	if (guild) {
		guild.roles.cache.forEach((role) => { content = content.replaceAll("<@&" + role.name + ">", "<@&" + role.id + ">") }); // <@&role> -> <@&12345678>
	}

	return content;
}

function regret (content) {
	content = content.replaceAll("Regex", "Regret");
	content = content.replaceAll("rEgex", "rEgret");
	content = content.replaceAll("REgex", "REgret");
	content = content.replaceAll("reGex", "reGret");
	content = content.replaceAll("ReGex", "ReGret");
	content = content.replaceAll("rEGex", "rEGret");
	content = content.replaceAll("REGex", "REGret");
	content = content.replaceAll("regEx", "regrEt");
	content = content.replaceAll("RegEx", "RegrEt");
	content = content.replaceAll("rEgEx", "rEgrEt");
	content = content.replaceAll("REgEx", "REgrEt");
	content = content.replaceAll("reGEx", "reGrEt");
	content = content.replaceAll("regex", "regret");
	content = content.replaceAll("ReGEx", "ReGrEt");
	content = content.replaceAll("rEGEx", "rEGrEt");
	content = content.replaceAll("REGEx", "REGrEt");
	content = content.replaceAll("regeX", "regreT");
	content = content.replaceAll("RegeX", "RegreT");
	content = content.replaceAll("rEgeX", "rEgreT");
	content = content.replaceAll("REgeX", "REgreT");
	content = content.replaceAll("reGeX", "reGreT");
	content = content.replaceAll("ReGeX", "ReGreT");
	content = content.replaceAll("rEGeX", "rEGreT");
	content = content.replaceAll("REGeX", "REGreT");
	content = content.replaceAll("regEX", "regrET");
	content = content.replaceAll("RegEX", "RegrET");
	content = content.replaceAll("rEgEX", "rEgrET");
	content = content.replaceAll("REgEX", "REgrET");
	content = content.replaceAll("reGEX", "reGrET");
	content = content.replaceAll("ReGEX", "ReGrET");
	content = content.replaceAll("rEGEX", "rEGrET");
	content = content.replaceAll("REGEX", "REGrET");

	return content;
}

const tools = {
	"math": {
		"call": async (args) => { args = JSON.parse(args); return evaluate(args.expression); },
		"data": { "type": "function", "function": { "name": "math", "description": "Call to evaluate a mathematical expression.", "parameters": { "type": "object", "properties": { "expression": { "type": "string", "description": "The mathematical expression to evaluate." } }, "required": ["expression"] } } }
	} // ,
	/* "fetch_user": {
		"call": async (args) => {
			args = JSON.parse(args)

			for (let user of client.users.cache) {
				if (user[0] == args.target) { // user ID
					return JSON.stringify(user[0]);
				}

				if (user[1].tag == args.target) { // user Object
					return client.users.cache.get(user[0]);
				}

				return "User \"" + args.target + "\" not found.";
			}
		},
		"data": { "type": "function", "function": { "name": "fetch_user", "description": "Fetch a user by user ID or username.", "parameters": { "type": "object", "properties": { "target": { "type": "string", "description": "The target user you want to fetch." } }, "required": ["target"] } } }
	} */ // TO-DO: fix
}

client.on("messageCreate", async (msg) => {
	if (msg.author.id === client.user.id) { return }

	if (isBlacklisted(msg.author.id) || isBlacklisted(msg.channel.id) || isBlacklisted(msg.guild.id)) { return }

	if (!msg.mentions.users.has(client.user.id) || msg.author.bot) { return }

	try {
		await msg.channel.sendTyping();
	} catch {
		return;
	}

	const typer = setInterval(() => { msg.channel.sendTyping(); }, 5000);

	let channelMessages;
	try {
		channelMessages = await msg.channel.messages.fetch({ "limit": 100 });
	} catch {
		clearInterval(typer);
		return;
	}

	let messages = [];

	let imagesSoFar = 0;

	for (let message of channelMessages) {
		message = message[1];

		if (message.author.id === client.user.id) {
			if (message.type === 7) {
				messages.push({ "role": "assistant", "content": `<@${message.author.id}> joined the server.` });
			} else {
				messages.push({ "role": "assistant", "content": makeSpecialsLlmFriendly(message.content) || "[NO CONTENT]" });
			}
		} else {
			let content = [{ "type": "text", "text": "" }];

			if (message.type === 7) {
				messages.push({ "role": "user", "content": `<@${message.author.id}> joined the server.` });
				continue;
			}

			content[0].text += new Date(message.createdTimestamp).toISOString() + "\n";
			content[0].text += `<@${message.author.tag}>`;
			message.author.displayName ? content[0].text += ` (${message.author.displayName})` : null;
			message.author.bot ? content[0].text += " (BOT)" : null;
			message.editedTimestamp ? content[0].text += " (edited)" : null;
			if (message.type === 19) {
				try {
					content[0].text += ` (replying to <@${(await message.fetchReference()).author.tag || "unknown"}>)`;
				} catch {
					content[0].text += " (replying to deleted message)";
				}
			}

			content[0].text += ":\n" + makeSpecialsLlmFriendly(regret(message.content), message.guild);

			if (message.reactions.cache.size > 0) {
				content[0].text += "\n\n";

				const reactions = {};

				// eslint-disable-next-line no-unused-vars
				for (const [_, reaction] of message.reactions.cache.entries()) {
					try {
						reactions[reaction.emoji.toString()] = (await reaction.users.fetch()).map(user => user.username);
					} catch {}
				}

				content[0].text += "Reactions: " + JSON.stringify(reactions);
			}

			if (message.attachments.size > 0) {
				content[0].text += "\n\n";

				message.attachments = message.attachments.reverse();

				for (let attachment of message.attachments) {
					attachment = attachment[1];

					if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(attachment.contentType) && modelIsMultimodal) {
						if (imagesSoFar < 8) {
							content.push({ "type": "image_url", "imageUrl": attachment.url });
							imagesSoFar++;
						} else {
							content.push({ "type": "text", "text": "[IMAGE OMITTED DUE TO 8 IMAGE MISTRAL API LIMIT]" });
						}
					}
				}

				content[0].text += message.attachments.size + " attachment(s): " + JSON.stringify(Array.from(message.attachments.values()));
			}

			if (content.length === 1) {
				content = content[0].text;
			}

			// 1970-01-01T00:00:00.000Z
			// <@abc> (BOT) (edited) (replying to <@xyz>):
			// example message content here
			//
			// Reactions: { ... }
			// 123 attachment(s): [ ... ]

			messages.push({ "role": "user", "content": content });
		}
	}

	messages = messages.reverse();

	messages = [
		{ "role": "system", "content":
`You are an AI assistant deployed in a Discord server. Your task is to respond to user messages in a casual, friendly manner while adhering to specific guidelines. Here's your configuration:

Identity:
You are based on the ${process.env.MODEL} model and your name is ${client.user.tag}.

Context:
You are in the ${msg.channel.name} channel (<#${msg.channel.id}>) of the ${msg.guild.name} Discord server.
Current UTC time: ${new Date().toISOString()} (UNIX timestamp: ${Math.floor(Date.now() / 1000)})

Language Style:
- Use informal, all-lowercase language.
- You may use emojis from this list: ${JSON.stringify(msg.guild.emojis.cache.map(emoji => `<:${emoji.name}:${emoji.id}>`))}.
- Avoid using "UwU" or "OwO" as they are deprecated. Instead, use ":3" when appropriate.

Your Task:
1. Read and understand the channel's messages.
2. Formulate a brief, friendly response that addresses the few most recent unanswered messages.
3. Ensure your response follows the language style guidelines.

Before responding, take a moment to consider the context and the best way to reply. Wrap your analysis in <message_analysis> tags:

1. Note key points from the user's message
2. Consider the context (channel, server, time)
3. List potential responses and their appropriateness
4. Choose the best response

Now, provide your response to the user. You may include appropriate emojis from the provided list.` },
		...messages,
		{ "role": "assistant", "content": "<message_analysis>\n", "prefix": true }
	]

	const reply = { "content": "", "files": [], "embeds": [] };

	let i = 0;

	let content = "", analysis = "";

	while (true) {
		// fs.writeFileSync("/tmp/vincent-ai-messages-dumps/dump-" + new Date().getTime() + ".json", JSON.stringify(messages, null, 4));
		let response;
		try {
			response = await mistral.chat.complete({
				"model": process.env.MODEL,
				"messages": messages,
				"tools": Object.values(tools).map(tool => tool.data),
				"max_tokens": Number(process.env.MAX_TOKENS),
				"temperature": Number(process.env.TEMPERATURE)
			});
		} catch (error) {
			if (error.statusCode === 429 && i < 10) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				i++;
				continue;
			} else {
				throw error;
			}
		}

		response = response.choices[0].message;

		messages.push(response);

		content += response.content;

		if (response.toolCalls) {
			for (const toolCall of response.toolCalls) {
				const tool = tools[toolCall.function.name];

				if (!tool) {
					continue;
				}

				let result;
				try {
					result = await tool.call(toolCall.function.arguments);
				} catch (error) {
					result = error.message;
				}

				messages.push({
					"role": "tool",
					"name": toolCall.function.name,
					"content": JSON.stringify(result),
					"toolCallId": toolCall.id,
					"tool_call_id": toolCall.id // even the docs have no idea which one is correct
				});
			}
		} else {
			break;
		}
	}

	clearInterval(typer);

	// <button onclick="alert(1)">Hello World!</button>

	if (content.split("<message_analysis>").length === 2) {
		analysis = content.split("</message_analysis>")[0];
		content = content.split("<message_analysis>")[1];
	}

	if (content.split("</message_analysis>").length === 2) {
		reply.content = content.split("</message_analysis>")[1];
		if (analysis.length > 4096) {
			// reply.embeds.push({ "title": "<message_analysis>", "description": analysis });
		} else {
			// reply.files.push(new discord.AttachmentBuilder(Buffer.from(analysis), { name: "analysis.txt" }))
		}
	} else {
		reply.content = content;
	}

	reply.content = makeSpecialsLlmUnfriendly(reply.content, msg.guild);

	if (reply.content.length > 2000) {
		reply.files.push(new discord.AttachmentBuilder(Buffer.from(reply.content), { name: "message.txt" }));
		reply.content = reply.content.slice(0, 2000);
	}

	if (reply.content === "" && reply.files.length === 0 && reply.embeds.length === 0) { return; }

	try {
		await msg.reply(reply);
	} catch {
		try {
			await msg.channel.send(reply);
		} catch { /* ¯\_(ツ)_/¯ */ }
	}
});

client.login(process.env.DISCORD_TOKEN);

client.on("ready", async () => {
	console.log("ready on", client.user.tag);

	// client.application.edit("custom bot about me here");

	// client.user.setActivity("custom bot status here", { "type": discord.ActivityType.Custom });
});