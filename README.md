# Discord Clyde-inspired Anthropic-based AI chatbot

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

# Environment variables
- `DISCORD_TOKEN`: your [Discord bot](https://discord.com/developers/applications/) token.
- `ANTHROPIC_API_KEY`: your [Anthropic](https://www.anthropic.com/) API key.
- `MODEL`: the model to use for chat.
- `MAX_TOKENS`: maximum amount of tokens the `MODEL` can generate.
- `TEMPERATURE`: the temperature to use for the `MODEL`.

# Temperature
- A temperature of 0°C will make the bot's responses deterministic and repetitive.
- A temperature of 0.5°C will make the bot's responses more balanced between creativity and coherence.
- A temperature of 0.7°C is recommended for most use cases.
- A temperature of 1°C will make the bot's responses more creative.
- A temperature of 1.5°C will make the bot borderline incoherent.
- A temperature of 2°C or above will make the bot generate total nonsense.

# [cakedbake](https://github.com/cakedbake)'s recommended settings:
- Set `MODEL` to `claude-3-5-sonnet-20241022`.
- Set `MAX_TOKENS` to `2000`.
- Set `TEMPERATURE` to `0.0`. (optional: see [Temperature](#temperature)).

# Error logging
- Create a directory named `errors` for the bot to store errors within it.
- If it encounters an error during inference, it will log the error to `errors` as `./errors/X.json` where X is the UNIX timestamp at time of error with milliseconds.

# Blacklisting
- You can blacklist a user, a channel, or a guild by adding its ID to the `blacklist.json` file, like this:
```json
[
	"123456789012345678",
	"123456789012345678",
	...
]
```
- The bot will completely ignore messages from blacklisted contexts.
- Note: You need to enable Developer Mode in your Discord client to be able to copy the IDs:
1. Go into User Settings by clicking the cog next to your profile.
2. Go into App Settings > Advanced and enable Developer Mode.
- Due to the way the blacklist is checked, junk can be specified that is not a valid ID. This can help keep track of blacklisted IDs, like this:
```json
[
	"123456789012345678", "#spam",
	"123456789012345678", "@bad-person",
	...
]
```

# Known issue
```
(node:_____) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
```
Solutions:
1. Use an LTS version of Node.js.
2. Bypass N(ode)V(ersion)M(anager) and run Node.js directly (if you have it installed): `/usr/bin/node index.js`

# Plans
- Memory
- Custom system prompts
- Speech-to-text
- Sentience
- Respond with TTS to voice messages
- Web searching (with Google)
- DM support may come in the future, disabled by default, but enableable manually
