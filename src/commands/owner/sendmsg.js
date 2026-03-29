const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "sendmsg",
    description: "Send a message to any server channel",
    category: 'owner',
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        if (message.author.id !== '760395853843136532') {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription('❌ You do not have permission to use this command.')]
            });
        }

        if (args.length < 3) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setTitle('📨 Send Message Command')
                    .setDescription(
                        `**Usage:** \`${prefix}sendmsg <guildid> <channelid> <message>\`\n\n` +
                        `**Example:**\n` +
                        `\`${prefix}sendmsg 123456789 987654321 Hello everyone!\`\n\n` +
                        `**Features:**\n` +
                        `• Send text messages with emojis\n` +
                        `• Attach images, videos, files\n` +
                        `• Send stickers\n` +
                        `• Works in any guild/channel the bot is in`
                    )]
            });
        }

        const guildId = args[0];
        const channelId = args[1];
        const messageContent = args.slice(2).join(' ');

        try {
            const targetGuild = client.guilds.cache.get(guildId);
            if (!targetGuild) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`❌ Guild not found. Make sure the bot is in that server.\n**Guild ID:** \`${guildId}\``)]
                });
            }

            const targetChannel = targetGuild.channels.cache.get(channelId);
            if (!targetChannel) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`❌ Channel not found in **${targetGuild.name}**.\n**Channel ID:** \`${channelId}\``)]
                });
            }

            if (!targetChannel.isTextBased()) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`❌ Cannot send messages to **${targetChannel.name}** (not a text channel).`)]
                });
            }

            const messageOptions = {};

            if (messageContent && messageContent.trim().length > 0) {
                messageOptions.content = messageContent;
            }

            if (message.attachments.size > 0) {
                messageOptions.files = Array.from(message.attachments.values()).map(att => ({
                    attachment: att.url,
                    name: att.name
                }));
            }

            if (message.stickers.size > 0) {
                const sticker = message.stickers.first();
                messageOptions.stickers = [sticker.id];
            }

            if (!messageOptions.content && !messageOptions.files && !messageOptions.stickers) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription('❌ Please provide a message, attachment, or sticker to send.')]
                });
            }

            await targetChannel.send(messageOptions);

            const confirmEmbed = new EmbedBuilder()
                .setColor('#26272F')
                .setTitle('✅ Message Sent Successfully')
                .setDescription(
                    `**Guild:** ${targetGuild.name} (\`${guildId}\`)\n` +
                    `**Channel:** ${targetChannel.name} (\`${channelId}\`)`
                )
                .setTimestamp();

            if (messageContent) {
                confirmEmbed.addFields({ name: 'Message Content', value: messageContent.length > 1024 ? messageContent.substring(0, 1021) + '...' : messageContent });
            }

            if (message.attachments.size > 0) {
                confirmEmbed.addFields({ name: 'Attachments', value: `${message.attachments.size} file(s) attached` });
            }

            if (message.stickers.size > 0) {
                confirmEmbed.addFields({ name: 'Stickers', value: `${message.stickers.size} sticker(s) sent` });
            }

            await message.channel.send({ embeds: [confirmEmbed] });

        } catch (error) {
            console.error('SendMsg Error:', error);
            
            let errorMessage = '❌ Failed to send message.';
            
            if (error.code === 50013) {
                errorMessage = '❌ Missing permissions to send messages in that channel.';
            } else if (error.code === 50001) {
                errorMessage = '❌ Missing access to that channel.';
            } else if (error.message) {
                errorMessage = `❌ Error: ${error.message}`;
            }

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(errorMessage)]
            });
        }
    }
};
