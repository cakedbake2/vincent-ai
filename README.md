# DeepInfra-based Discord AI chatbot

## How to run
### Prerequisites: Node.js version 18 or higher.
1. Clone this repository like this:
```bash
git clone https://github.com/cakedbake/vincent-ai.git
```
2. `cd` into the repository:
```bash
cd vincent-ai
```
3. Install the dependencies:
```bash
npm install
```
4. Run it:
```bash
node index.js
```

## Environment variables
- `DISCORD_TOKEN`: your [Discord bot](https://discord.com/developers/applications/) token.
- `PROVIDER_URL`: the URL of your OpenAI-API-compatible provider.
- `API_KEY`: the API key of your provider.
- `CHAT_MODEL`: the model to use for chat.
- `MAX_TOKENS`: maximum amount of tokens the `CHAT_MODEL` can generate. Leave undefined to default to 4096.
- `TEMPERATURE`: the temperature to use for the `CHAT_MODEL`. Leave undefined to default to 0°C.

# Temperature
- A temperature of 0°C will make the bot's responses deterministic and repetitive.
- A temperature of 0.5°C will make the bot's responses more balanced between creativity and coherence.
- A temperature of 0.7°C is recommended.
- A temperature of 1°C will make the bot's responses more creative and less coherent.
- A temperature of 1.5°C will make the bot drunk.
- A temperature of 2°C or above will make the bot hallucinate.

## Blacklisting
- You can blacklist a user, a channel, or a guild by adding its ID to the `blacklist.json` file, like this:
```json
[
	"123456789012345678",
	"123456789012345678",
	...
]
```
- The bot will completely ignore blacklisted entities.
- Note: You need to enable Developer Mode in your Discord client to be able to copy the IDs:
1. Go into User Settings by clicking the cog next to your profile.
2. Go into App Settings > Advanced and enable Developer Mode.
- If a file named `Weezer - Buddy Holly.mp3` is present in the same directory as the bot, it will be sent as a reply to messages from blacklisted contexts.

## Plans
- Add tool usage, Memory
- Custom system prompts
- Vision, speech-to-text
- If I'm really bored, the bot could be made to respond with TTS to voice messages.
- Web searching (with Google)
- DM support may come in the future, disabled by default (you know who you are), but could be enabled manually.