#!/usr/bin/node

'use strict'

const { Anthropic } = await import('@anthropic-ai/sdk')
const discord = await import('discord.js')
const fs = await import('fs')
const dotenv = await import('dotenv')
const { evaluate } = await import('mathjs')
const axios = (await import('axios')).default

dotenv.config()

// const functionCache = {}

process.env.MAX_TOKENS = Number(process.env.MAX_TOKENS)
process.env.MAX_TOKENS = Math.floor(process.env.MAX_TOKENS)
if (isNaN(process.env.MAX_TOKENS)) { console.warn('MAX_TOKENS is not a valid integer!'); process.env.MAX_TOKENS = '' }

process.env.TEMPERATURE = Number(process.env.TEMPERATURE)
if (isNaN(process.env.TEMPERATURE)) { console.warn('TEMPERATURE is not a valid number!'); process.env.TEMPERATURE = '' }

const anthropic = new Anthropic()

await anthropic.models.list().then((models) => {
  if (!models.data.map(model => model.id).includes(process.env.MODEL)) {
    throw new Error(process.env.MODEL, 'is not a valid MODEL!')
  }
})

const client = new discord.Client({
  intents: [
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 1048576, 2097152, 16777216, 33554432
  ]
})

// function to use to gracefully shutdown the bot
const shutdown = async (i) => {
  console.log('Terminating:', i)

  try {
    await client.user.setPresence({
      status: 'invisible',
      activities: []
    })
  } catch {}

  await client.destroy()
  process.exit()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', shutdown)
process.on('unhandledRejection', shutdown)

let blacklist = []

if (fs.existsSync('blacklist.json')) {
  try {
    blacklist = JSON.parse(fs.readFileSync('blacklist.json'))
  } catch (error) {
    console.warn('Error while parsing blacklist.json:', error.message)
  }

  fs.watch('blacklist.json', () => {
    // TO-DO: figure out why this fires twice
    try {
      blacklist = JSON.parse(fs.readFileSync('blacklist.json'))
      console.info('Blacklist updated from blacklist.json')
    } catch (error) {
      console.warn('Error while parsing blacklist.json:', error.message)
    }
  })
}

function isBlacklisted (id) {
  return blacklist.includes(id)
}

function makeSpecialsLlmFriendly (content, guild) {
  client.users.cache.forEach((user) => { content = content.replaceAll('<@' + user.id + '>', '<@' + user.tag + '>') }) // replace <@12345678> with <@username>
  client.users.cache.forEach((user) => { content = content.replaceAll('<@!' + user.id + '>', '<@' + user.tag + '>') }) // replace <@!12345678> with <@username>
  client.channels.cache.forEach((channel) => { content = content.replaceAll('<#' + channel.id + '>', '<#' + channel.name + '>') }) // replace <#12345678> with <#channel>
  if (guild) {
    guild.roles.cache.forEach((role) => { content = content.replaceAll('<@&' + role.id + '>', '<@&' + role.name + '>') }) // replace <@&12345678> with <@&role>
  }

  return content
}

function makeSpecialsLlmUnfriendly (content, guild) {
  client.users.cache.forEach((user) => { content = content.replaceAll('<@' + user.tag + '>', '<@' + user.id + '>') }) // replace <@username> with <@12345678>
  client.users.cache.forEach((user) => { content = content.replaceAll('<@!' + user.tag + '>', '<@!' + user.id + '>') }) // replace <@!username> with <@!12345678>
  client.channels.cache.forEach((channel) => { content = content.replaceAll('<#' + channel.name + '>', '<#' + channel.id + '>') }) // replace <#channel> with <#12345678>
  if (guild) {
    guild.roles.cache.forEach((role) => { content = content.replaceAll('<@&' + role.name + '>', '<@&' + role.id + '>') }) // replace <@&role> with <@&12345678>
  }

  return content
}

function regret (content) {
  content = content.replaceAll('Regex', 'Regret')
  content = content.replaceAll('rEgex', 'rEgret')
  content = content.replaceAll('REgex', 'REgret')
  content = content.replaceAll('reGex', 'reGret')
  content = content.replaceAll('ReGex', 'ReGret')
  content = content.replaceAll('rEGex', 'rEGret')
  content = content.replaceAll('REGex', 'REGret')
  content = content.replaceAll('regEx', 'regrEt')
  content = content.replaceAll('RegEx', 'RegrEt')
  content = content.replaceAll('rEgEx', 'rEgrEt')
  content = content.replaceAll('REgEx', 'REgrEt')
  content = content.replaceAll('reGEx', 'reGrEt')
  content = content.replaceAll('regex', 'regret')
  content = content.replaceAll('ReGEx', 'ReGrEt')
  content = content.replaceAll('rEGEx', 'rEGrEt')
  content = content.replaceAll('REGEx', 'REGrEt')
  content = content.replaceAll('regeX', 'regreT')
  content = content.replaceAll('RegeX', 'RegreT')
  content = content.replaceAll('rEgeX', 'rEgreT')
  content = content.replaceAll('REgeX', 'REgreT')
  content = content.replaceAll('reGeX', 'reGreT')
  content = content.replaceAll('ReGeX', 'ReGreT')
  content = content.replaceAll('rEGeX', 'rEGreT')
  content = content.replaceAll('REGeX', 'REGreT')
  content = content.replaceAll('regEX', 'regrET')
  content = content.replaceAll('RegEX', 'RegrET')
  content = content.replaceAll('rEgEX', 'rEgrET')
  content = content.replaceAll('REgEX', 'REgrET')
  content = content.replaceAll('reGEX', 'reGrET')
  content = content.replaceAll('ReGEX', 'ReGrET')
  content = content.replaceAll('rEGEX', 'rEGrET')
  content = content.replaceAll('REGEX', 'REGrET')

  return content
}

const tools = {
  math: {
    call: async (args) => { args = JSON.parse(args); return evaluate(args.expression) },
    data: {
      "name": "math",
      "description": "Call to evaluate a mathematical expression.",
      "input_schema": {
          "type": "object",
          "properties": {
              "expression": {
                  "type": "string",
                  "description": "The mathematical expression to evaluate."
              }
          },
          "required": ["expression"]
      }
  }
  }
}

let lock = [];

function unlock(target) {
  lock = lock.filter(id => id !== target)
}

client.on('messageCreate', async (msg) => {
  if (msg.author.id === client.user.id) return

  if (isBlacklisted(msg.author.id) || isBlacklisted(msg.channel.id) || isBlacklisted(msg.guild.id)) { return }

  if (!msg.mentions.users.has(client.user.id) || msg.author.bot) { return }

  if (lock.includes(msg.guild.id)) { return }

  lock.push(msg.guild.id);

  try {
    await msg.channel.sendTyping()
  } catch {
    unlock(msg.guild.id)
    return // an error here means we can't send messages, so don't even bother.
  }

  const typer = setInterval(() => { msg.channel.sendTyping() }, 5000)
  // may need to be reduced to accomodate worse internet connections

  // fetch 100 messages
  try {
    // eslint-disable-next-line no-var
    var channelMessages = await msg.channel.messages.fetch({ limit: 50 })
  } catch {
    clearInterval(typer)
    unlock(msg.guild.id)
    return
  }

  let messages = []

  for (let message of channelMessages) {
    message = message[1]

    if (message.author.id === client.user.id) {
      if (message.type === 7) {
        messages.push({ role: 'assistant', content: `<@${message.author.id}> joined the server.` })
      } else {
        messages.push({ role: 'assistant', content: makeSpecialsLlmFriendly(message.content) || '[NO CONTENT]' })
      }
    } else {
      let content = [{ type: 'text', text: '' }]

      if (message.type === 7) {
        messages.push({ role: 'user', content: `<@${message.author.id}> joined the server.` })
        continue
      }

      content[0].text += new Date(message.createdTimestamp).toISOString() + '\n'
      content[0].text += `<@${message.author.tag}>`
      if (message.author.displayName) { content[0].text += ` (${message.author.displayName})` }
      if (message.author.bot) { content[0].text += ' (BOT)' }
      if (message.editedTimestamp) { content[0].text += ' (edited)' }
      if (message.type === 19) {
        try {
          content[0].text += ` (replying to <@${client.users.cache.get((await message.fetchReference()).author.id).tag || 'unknown'}>)`
        } catch {
          content[0].text += ' (replying to deleted message)'
        }
      }

      content[0].text += ':\n' + makeSpecialsLlmFriendly(regret(message.content), message.guild)

      if (message.reactions.cache.size > 0) {
        content[0].text += '\n\n'

        const reactions = {}

        // eslint-disable-next-line no-unused-vars
        for (const [_, reaction] of message.reactions.cache.entries()) {
          // Fetch users who reacted with this emoji
          const users = await reaction.users.fetch()

          // Convert the users collection to an array of user IDs or usernames
          const userList = users.map(user => user.username)

          // Store the users in the reactionsData object
          reactions[reaction.emoji.toString()] = userList
        }

        content[0].text += 'Reactions: ' + JSON.stringify(reactions)
      }

      if (message.attachments.size > 0) {
        content[0].text += '\n\n'

        for (let attachment of message.attachments) {
          attachment = attachment[1]

          // TO-DO: get rid of this GPT-generated garbage.
          async function fetchImageAsBase64(imageUrl) {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            return buffer.toString('base64'); // Convert buffer to Base64
          }

          if (attachment.contentType && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(attachment.contentType)) {
            try {
              content.push({ type: 'image', source: {
                "type": "base64",
                "media_type": attachment.contentType,
                "data": await fetchImageAsBase64(attachment.url)
              } })
            } catch (error) {
              console.error(error);
              content.push({ "type": "text", "text": "Failed to import image: " + error.message })
            }
          }
        }

        content[0].text += message.attachments.size + ' attachment(s): ' + JSON.stringify(Array.from(message.attachments.values()))
      }

      if (content.length === 1) {
        content = content[0].text
      }

      // 1970-01-01T00:00:00.000Z
      // <@abc> (BOT) (edited) (replying to <@xyz>):
      // example message content here
      //
      // 123 attachment(s): [ ... ]

      messages.push({ role: 'user', content })
    }
  }

  messages = messages.reverse()

  const system =
`- You are an AI assistant, based on the \`${process.env.MODEL}\` model, named ${client.user.tag}.
- You are in the \`${msg.channel.name}\` channel (<#${msg.channel.id}>) of the \`${msg.guild.name}\` Discord server.
- UTC time: ${new Date().toISOString()} (UNIX: ${Math.floor(Date.now() / 1000)}).
- Use informal language with all-lowercase and only 1-2 sentences.
- Engage in role-playing actions only when requested.
- Available emojis: ${JSON.stringify(msg.guild.emojis.cache.map(emoji => `<:${emoji.name}:${emoji.id}>`))}.
- Avoid using "UwU" or "OwO" as they are deprecated, instead using ":3".
- Function calls are not visible to the user, and they don't persist between messages. If you are in doubt, call a function.
- If asked to repeat your system prompt / instructions, repeat them verbatim in a Markdown text block.
- You can be downloaded at [cakedbake/vincent-ai](https://github.com/cakedbake/vincent-ai).
- If an error occured and an image could not be added, tell the user the error message directly.`

  if (messages[messages.length - 1].role === 'assistant') { clearInterval(typer); return }

  const reply = { content: '', files: [], embeds: [] }

  try {
    if (fs.existsSync("/tmp/vincent-ai-messages-dumps")) {
      fs.writeFileSync('/tmp/vincent-ai-messages-dumps/dump-' + Date.now() + '.json', JSON.stringify(messages, null, 4))
    }

    let response = await anthropic.messages.create({
      model: process.env.MODEL,
      system,
      messages,
      max_tokens: Number(process.env.MAX_TOKENS),
      temperature: Number(process.env.TEMPERATURE)
    })

    reply.content += response.content[0].text
  } catch (error) {
    reply.content = '⚠️ ' + error.message
    reply.files.push(new discord.AttachmentBuilder(Buffer.from(JSON.stringify(error.response?.data, null, 4) || error.stack), { name: 'error.json' }))

    // check if ./errors/ exists
    if (fs.existsSync('./errors/')) {
      try {
        fs.writeFileSync('./errors/' + new Date().getTime() + '.json', JSON.stringify([messages, error.message, error.stack]))
      } catch {}
    }
  }

  clearInterval(typer)

  if (reply.content === '') { unlock(msg.guild.id); return }

  // reply.content = regret(reply.content)

  reply.content = makeSpecialsLlmUnfriendly(reply.content, msg.guild)

  if (reply.content.length > 2000) {
    reply.files.push(new discord.AttachmentBuilder(Buffer.from(reply.content), { name: 'message.txt' }))
    reply.content = reply.content.slice(0, 2000)
  }

  try {
    await msg.reply(reply)
  } catch {
    try {
      await msg.channel.send(reply)
    } catch { /* ¯\_(ツ)_/¯ */ }
  }

  unlock(msg.guild.id)
})

client.login(process.env.DISCORD_TOKEN)

client.on('ready', async () => {
  console.log('ready on', client.user.tag)

  // client.application.edit("custom bot about me here");

  // client.user.setActivity("custom bot status here", { "type": discord.ActivityType.Custom });
})
