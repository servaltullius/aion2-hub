import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

export const pingCommand = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function executePing(interaction: ChatInputCommandInteraction) {
  await interaction.reply("Pong!");
}

