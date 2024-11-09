#!/usr/bin/node

const axios = require('axios')
const discord = require('discord.js')
const fs = require('fs')

try {
  require('dotenv').config()
} catch {
  // assume environment variables are set in the environment
}

const m = 'Please set it in your .env file or as an environment variable.'

const x = () => {} // to be used where error handling is not needed

if (!process.env.API_KEY) {
  console.error('Missing API_KEY variable. Please set it in your .env file or as an environment variable.')
  process.exit(1)
}

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN variable. Please set it in your .env file or as an environment variable.')
  process.exit(1)
}

if (!process.env.MODEL) {
  console.error('Missing MODEL variable. Please set it in your .env file or as an environment variable.')
  process.exit(1)
}

process.env.MAX_TOKENS = Number(process.env.MAX_TOKENS)

if (!process.env.MAX_TOKENS) { // NaN is not truthy
  console.warn('Missing or invalid MAX_TOKENS variable. Defaulting to 1024.')
  process.env.MAX_TOKENS = 1024
}

// customize if need be
async function chat_completion (model, messages, tools) {
  const response = await axios.post('https://api.deepinfra.com/v1/openai/chat/completions', {
    model,
    messages,
    tools,
    temperature: 0.0,
    max_tokens: process.env.MAX_TOKENS,
    stream: false
  }, {
    headers: {
      Authorization: `Bearer ${process.env.API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  return response.data.choices[0].message
}

const client = new discord.Client({
  intents: [
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 1048576, 2097152, 16777216, 33554432
    // TO-DO: only require needed intents
  ]
})

function isBlacklisted (id) {
  if (!fs.existsSync('blacklist.json')) { return false }

  try {
    blacklist = JSON.parse(fs.readFileSync('blacklist.json').toString()) // well timed file deletion causes a race condition
    return blacklist.includes(id)
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
			`- You are an AI assistant, based on the "${process.env.MODEL}" model, named ${client.user.tag}.
- You are in the "${msg.channel.name}" channel (<#${msg.channel.id}>) of the "${msg.guild.name}" Discord server.
- UTC time: ${new Date().toISOString()} (UNIX: ${Math.floor(Date.now() / 1000)}).
- Use informal language with all-lowercase and only 1-2 sentences.
- Avoid "UwU" or "OwO", using ":3" instead.
- Engage in role-playing actions only when requested.
- Available emojis: ${JSON.stringify(msg.guild.emojis.cache.map(emoji => `<:${emoji.name}:${emoji.id}>`))}.
- Backticks break pings. Only use backticks if absolutely necessary.`
    }
  ]

  channelMessages = channelMessages.reverse()

  for (let message of channelMessages) {
    message = message[1]

    if (message.author.id == client.user.id) {
      messages.push({ role: 'assistant', content: message.content })
    } else {
      let content = ''

      if (message.type == 7) {
        messages.push({ role: 'user', content: `<@${message.author.id}> joined the server.` })
        continue
      }

      content += new Date().toISOString() + '\n'
      content += `<@${message.author.tag}>`
      if (message.author.nickname) content += ` (${message.author.nickname})`
      if (message.author.bot) content += ' (BOT)'
      if (message.editedTimestamp) content += ' (edited)'
      if (message.type === 'REPLY') content += ` (replying to <@${message.reference.messageId || 'unknown'}>)`
      content += `:\n${message.content}`

      client.users.cache.forEach((user) => { content = content.replaceAll('<@' + user.id + '>', '<@' + user.tag + '>') }) // replace <@12345678> with <@username>
      client.users.cache.forEach((user) => { content = content.replaceAll('<@!' + user.id + '>', '<@' + user.tag + '>') }) // replace <@!12345678> with <@username>
      client.channels.cache.forEach((channel) => { content = content.replaceAll('<#' + channel.id + '>', '<#' + channel.name + '>') }) // replace <#12345678> with <#channel>
      message.guild.roles.cache.forEach((role) => { content = content.replaceAll('<@&' + role.id + '>', '<@&' + role.name + '>') }) // replace <@&12345678> with <@&role>

      if (message.attachments.size > 0) {
        content += '\n\n'

        // this sets a precedent for me to add vision. i don't want to add vision. at least not until pixtral 12b is on deepinfra, to avoid using multiple API providers.
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
    const response = await chat_completion(process.env.MODEL, messages)
    reply.content = response.content

    // what a mess!
    // TO-DO: export to function
    client.users.cache.forEach((user) => { reply.content = reply.content.replaceAll('<@' + user.tag + '>', '<@' + user.id + '>') }) // replace <@username> with <@12345678>
    client.users.cache.forEach((user) => { reply.content = reply.content.replaceAll('<@!' + user.tag + '>', '<@!' + user.id + '>') }) // replace <@!username> with <@!12345678>
    client.channels.cache.forEach((channel) => { reply.content = reply.content.replaceAll('<#' + channel.name + '>', '<#' + channel.id + '>') }) // replace <#channel> with <#12345678>
    msg.guild.roles.cache.forEach((role) => { reply.content = reply.content.replaceAll('<@&' + role.name + '>', '<@&' + role.id + '>') }) // replace <@&role> with <@&12345678>
  } catch (error) {
    reply.content = '⚠️ ' + error.message
    reply.files.push(new discord.AttachmentBuilder(Buffer.from(JSON.stringify(error.response?.data || error.stack, null, 4)), { name: 'error.json' }))
  }

  clearInterval(typer)

  if (reply.content == '') { return }

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
