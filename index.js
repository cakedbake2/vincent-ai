#!/usr/bin/node

// TO-DO: switch to Python
import SamAltman from 'openai'
import discord from 'discord.js'
import fs from 'fs'
import dotenv from 'dotenv'
import validator from 'validator'

try {
  dotenv.config()
} catch {
  // assume environment variables are set in the environment
}

const x = () => {} // to be used where error handling is not needed

const m = 'Please set it in your .env file or as an environment variable.'

/*
## Environment variables
- `DISCORD_TOKEN`: your [Discord bot](https://discord.com/developers/applications/) token.
- `PROVIDER`: the URL of your provider.
- `API_KEY`: the API key of your provider.
- `CHAT_MODEL`: the model to use for chat.
- `MAX_TOKENS`: maximum amount of tokens the `CHAT_MODEL` can generate.
- `TEMPERATURE`: the temperature to use for the `CHAT_MODEL`.
- `VISION_MODEL`: the model to use for vision (image attachments). Leave empty to disable.
- `STT_MODEL`: the model to use for speech-to-text (audio attachments). Leave empty to disable.
*/

if (!process.env.DISCORD_TOKEN) { console.error('DISCORD_TOKEN is not set!', m); process.exit(1) }

if (!validator.isURL(process.env.PROVIDER_URL)) { console.error('PROVIDER_URL is not a valid URL!', m); process.exit(1) }

if (!process.env.API_KEY) { console.error('API_KEY is not set!', m); process.exit(1) }

if (!process.env.CHAT_MODEL) { console.error('CHAT_MODEL is not set!', m); process.exit(1) }

process.env.MAX_TOKENS = Number(process.env.MAX_TOKENS)
if (!process.env.MAX_TOKENS) { console.warn('MAX_TOKENS is not set, defaulting to 4096.', m); process.env.MAX_TOKENS = 4096 }

process.env.TEMPERATURE = Number(process.env.TEMPERATURE)
if (isNaN(process.env.TEMPERATURE)) { console.error('TEMPERATURE is not set, defaulting to 0.', m); process.env.TEMPERATURE = 0 }

const provider = new SamAltman({
  apiKey: process.env.API_KEY,
  baseURL: process.env.PROVIDER_URL
})

const client = new discord.Client({
  intents: [
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 1048576, 2097152, 16777216, 33554432
    // TO-DO: only require needed intents
  ]
})

function isBlacklisted (id) {
  if (!fs.existsSync('blacklist.json')) { return false }

  try {
    return JSON.parse(fs.readFileSync('blacklist.json').toString()).includes(id)
    // file deletion can cause a race condition here, so
  } catch (error) {
    console.warn('A blacklist.json exists, but is not valid JSON!', error.message)

    return false
  }
}

client.on('messageCreate', async (msg) => {
  if (msg.author.id === client.user.id || msg.author.bot || !msg.mentions.users.has(client.user.id)) return

  if (isBlacklisted(msg.author.id) || isBlacklisted(msg.channel.id) || isBlacklisted(msg.guild.id)) {
    if (fs.existsSync('Weezer - Buddy Holly.mp3')) {
      await msg.reply({ files: ['./Weezer - Buddy Holly.mp3'] }).catch(x)
    }
    return
  }

  try {
    await msg.channel.sendTyping()
  } catch {
    return // an error here means we can't send messages, so don't even bother.
  }

  const typer = setInterval(() => { msg.channel.sendTyping() }, 5000)
  // may need to be reduced to accomodate worse internet connections

  // fetch 100 messages
  let channelMessages
  try {
    channelMessages = await msg.channel.messages.fetch({ limit: 100 }) // variable scopes are woke nonsense
  } catch {
    clearInterval(typer)
    return
  }

  const messages = [
    {
      role: 'system',
      content:
`- You are an AI assistant, based on the "${process.env.CHAT_MODEL}" model, named ${client.user.tag}.
- You are in the "${msg.channel.name}" channel (<#${msg.channel.id}>) of the "${msg.guild.name}" Discord server.
- UTC time: ${new Date().toISOString()} (UNIX: ${Math.floor(Date.now() / 1000)}).
- Use informal language with all-lowercase and only 1-2 sentences.
- Avoid "UwU" or "OwO", using ":3" instead.
- Engage in role-playing actions only when requested.
- Available emojis: ${JSON.stringify(msg.guild.emojis.cache.map(emoji => `<:${emoji.name}:${emoji.id}>`))}.
- Avoid using backticks when pinging users or mentioning channels.`
    }
  ]

  channelMessages = channelMessages.reverse()

  for (let message of channelMessages) {
    message = message[1]

    if (message.author.id === client.user.id) {
      messages.push({ role: 'assistant', content: message.content })
    } else {
      let content = ''

      if (message.type === 7) {
        messages.push({ role: 'user', content: `<@${message.author.id}> joined the server.` })
        continue
      }

      content += new Date().toISOString() + '\n'
      content += `<@${message.author.tag}>`
      if (message.author.nickname) content += ` (${message.author.nickname})`
      if (message.author.bot) content += ' (BOT)'
      if (message.editedTimestamp) content += ' (edited)'
      if (message.type === 19) content += ` (replying to <@${message.reference.messageId || 'unknown'}>)`
      content += `:\n${message.content}`

      client.users.cache.forEach((user) => { content = content.replaceAll('<@' + user.id + '>', '<@' + user.tag + '>') }) // replace <@12345678> with <@username>
      client.users.cache.forEach((user) => { content = content.replaceAll('<@!' + user.id + '>', '<@' + user.tag + '>') }) // replace <@!12345678> with <@username>
      client.channels.cache.forEach((channel) => { content = content.replaceAll('<#' + channel.id + '>', '<#' + channel.name + '>') }) // replace <#12345678> with <#channel>
      message.guild.roles.cache.forEach((role) => { content = content.replaceAll('<@&' + role.id + '>', '<@&' + role.name + '>') }) // replace <@&12345678> with <@&role>

      if (message.attachments.size > 0) {
        content += '\n\n'

        for (let attachment of message.attachments) {
          attachment = attachment[1]
        }

        content += message.attachments.size + ' attachment(s): ' + JSON.stringify(Array.from(message.attachments.values()))
      }

      // 1970-01-01T00:00:00.000Z
      // <@abc> (BOT) (edited) (replying to <@xyz>):
      // you are a fool. a gigantic FOOL.
      //
      // 123 attachment(s): [ ... ]

      // TO-DO: reactions
      messages.push({ role: 'user', content })
    }
  }

  const reply = { content: '', files: [], embeds: [] }

  try {
    const response = await provider.chat.completions.create({
      model: process.env.CHAT_MODEL,
      messages,
      max_tokens: process.env.MAX_TOKENS,
      temperature: process.env.TEMPERATURE
    })

    reply.content = response.choices[0].message.content
  } catch (error) {
    reply.content = '⚠️ ' + error.message
    reply.files.push(new discord.AttachmentBuilder(Buffer.from(JSON.stringify(error.response?.data || error.stack, null, 4)), { name: 'error.json' }))
  }

  clearInterval(typer)

  if (reply.content === '') { return }

  // what a mess!
  // TO-DO: export to function
  client.users.cache.forEach((user) => { reply.content = reply.content.replaceAll('<@' + user.tag + '>', '<@' + user.id + '>') }) // replace <@username> with <@12345678>
  client.users.cache.forEach((user) => { reply.content = reply.content.replaceAll('<@!' + user.tag + '>', '<@!' + user.id + '>') }) // replace <@!username> with <@!12345678>
  client.channels.cache.forEach((channel) => { reply.content = reply.content.replaceAll('<#' + channel.name + '>', '<#' + channel.id + '>') }) // replace <#channel> with <#12345678>
  msg.guild.roles.cache.forEach((role) => { reply.content = reply.content.replaceAll('<@&' + role.name + '>', '<@&' + role.id + '>') }) // replace <@&role> with <@&12345678>

  if (reply.content.length > 2000) {
    reply.files.push(new discord.AttachmentBuilder(Buffer.from(reply.content), { name: 'message.txt' }))
    reply.content = reply.content.slice(0, 2000)
  }

  await msg.reply(reply).catch(async () => { await msg.channel.send(reply).catch(x) })
})

client.login(process.env.DISCORD_TOKEN)

client.on('ready', async () => {
  console.log('ready on', client.user.tag)

  // client.application.edit("who out here large languaging my models 😞");

  // client.user.setActivity("free ballpoint hammer giveaway at 123 fazbear st", { "type": discord.ActivityType.Custom });
})
