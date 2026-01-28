import "dotenv/config";

import { REST, Routes } from "discord.js";

import { pingCommand } from "./commands/ping.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_APP_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN");
if (!clientId) throw new Error("Missing DISCORD_APP_CLIENT_ID");
if (!guildId) throw new Error("Missing DISCORD_GUILD_ID");

const rest = new REST({ version: "10" }).setToken(token);
const commands = [pingCommand.toJSON()];

// eslint-disable-next-line no-console
console.log(`Deploying ${commands.length} command(s) to guild ${guildId}...`);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

// eslint-disable-next-line no-console
console.log("Commands deployed.");

