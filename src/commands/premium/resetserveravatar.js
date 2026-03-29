const { EmbedBuilder, PermissionFlagsBits, REST, Routes } = require("discord.js");

module.exports = {
    name: "resetserveravatar",
    aliases: ["rsa", "clearserveravatar"],
    description: "Reset the bot's server-specific avatar to default (Premium)",
    category: "premium",
    cooldown: 5,
    premium: true,

    async run(client, message) {
        if (!message.guild) {
            return message.reply("This command can only be used in a server.");
        }

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setDescription(`${client.emoji.cross || "❌"} You need **Administrator** permission to use this command.`)
                ]
            });
        }

        const statusMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#26272F")
                    .setDescription("⏳ Resetting server avatar...")
            ]
        });

        try {
            const rest = new REST({ version: "10" }).setToken(client.token);
            
            await rest.patch(Routes.guildMember(message.guild.id, "@me"), {
                body: { avatar: null }
            });

            await statusMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#00FF00")
                        .setDescription(`${client.emoji.tick || "✅"} Server avatar reset to default!`)
                ]
            });

        } catch (error) {
            console.error("Reset Avatar Error:", error.message);
            await statusMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setDescription(`${client.emoji.cross || "❌"} Failed to reset avatar: ${error.message}`)
                ]
            });
        }
    }
};
