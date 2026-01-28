import "dotenv/config";

import { Client, Events, GatewayIntentBits } from "discord.js";

import { executePing } from "./commands/ping.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) throw new Error("Missing DISCORD_BOT_TOKEN");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  // eslint-disable-next-line no-console
  console.log(`Discord bot ready: ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await executePing(interaction);
  }
});

await client.login(token);

