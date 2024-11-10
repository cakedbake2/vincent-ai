# Customizable Discord AI chatbot (you can set your own AI provider)

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
- `PROVIDER_URL`: the URL of your OpenAI-API-compatible provider. Leave undefined to default to https://api.openai.com/v1/.
- `API_KEY`: the API key of your provider.
- `CHAT_MODEL`: the model to use for chat.
- `MAX_TOKENS`: maximum amount of tokens the `CHAT_MODEL` can generate. Leave undefined to default to 4096.
- `TEMPERATURE`: the temperature to use for the `CHAT_MODEL`. Leave undefined to default to 0°C.

# Compatible providers
- [DeepInfra](https://deepinfra.com/): https://api.deepinfra.com/v1/openai/ (tested)
- [Mistral](https://mistral.ai/): https://api.deepinfra.com/v1/openai/ (tested)
- Note: Mistral models are incapable of typing in all-lowercase for some bizzare reason.
- [OpenAI](https://openai.com/): https://api.openai.com/v1/ (ewww)

# Temperature
- A temperature of 0°C will make the bot's responses deterministic and repetitive.
- A temperature of 0.5°C will make the bot's responses more balanced between creativity and coherence.
- A temperature of 0.7°C is recommended.
- A temperature of 1°C will make the bot's responses more creative and less coherent.
- A temperature of 1.5°C will make the bot drunk.
- A temperature of 2°C or above will make the bot hallucinate.

# [cakedbake](https://github.com/cakedbake)'s recommended settings:
- Use [DeepInfra](https://deepinfra.com/) as your provider.
- Use `Qwen/Qwen2.5-72B-Instruct` as your model. [It even beats Llama 3.1 405B](https://artificialanalysis.ai/?models_selected=o1%2Co1-mini%2Cgpt-4o-2024-08-06%2Cgpt-4o-mini%2Cllama-3-1-instruct-405b%2Cllama-3-2-instruct-90b-vision%2Cllama-3-1-instruct-70b%2Cllama-3-1-instruct-8b%2Cgemini-1-5-pro%2Cgemini-1-5-flash%2Cclaude-35-sonnet%2Cclaude-3-5-haiku%2Cmistral-large-2%2Cjamba-1-5-large%2Cqwen2-5-72b-instruct), a model 5.625x bigger, while being 5.114x cheaper.
- Set `MAX_TOKENS` to 8000.
- Set `TEMPERATURE` to 0.0.
- Add `694548530144083978` (an incredibly unpleasant individual) to your `blacklist.json`.

# Blacklisting
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
- If a file named `Weezer - Buddy Holly.mp3` is present in the same directory as the bot, it will be uploaded as a reply to messages from blacklisted contexts.

# Plans
- Add tool usage, Memory
- Custom system prompts
- Vision, speech-to-text
- If I'm really bored, the bot could be made to respond with TTS to voice messages.
- Web searching (with Google)
- DM support may come in the future, disabled by default (you know who you are), but could be enabled manually.