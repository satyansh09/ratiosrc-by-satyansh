const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "nickname",
    aliases: ["nick"],
    description: "Change or reset a user's nickname",
    category: "moderation",
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription("<:ratio_cross:1366804187555430463> | You need the `MANAGE_NICKNAMES` permission to use this command.")]
            });
        }

        if (!args[0]) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`<:ratio_cross:1366804187555430463> | Usage: \`${prefix}nick @user <name>\``)]
            });
        }

        const actualMentions = message.mentions.users.filter(user => {
            if (message.reference && message.reference.messageId) {
                return !message.mentions.repliedUser || user.id !== message.mentions.repliedUser.id;
            }
            return true;
        });

        let target = actualMentions.first();
        if (!target) target = await client.users.fetch(args[0]).catch(() => null);

        if (!target) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription("<:ratio_cross:1366804187555430463> | Couldn't find any user from mention or ID.")]
            });
        }

        if (target.id === client.user.id) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription("<:ratio_cross:1366804187555430463> | I can't change my own nickname.")]
            });
        }

        const member = await message.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription("<:ratio_cross:1366804187555430463> | This user is not in the server.")]
            });
        }

        if (!member.manageable) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription("<:ratio_cross:1366804187555430463> | I can't change this user's nickname. Their role may be higher or I'm missing permissions.")]
            });
        }

        if (message.member.roles.highest.position <= member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`<:ratio_cross:1366804187555430463> | You can't change ${target.username}'s nickname. Their role is equal to or higher than yours.`)]
            });
        }

        const newNick = args.slice(1).join(" ");

        if (!newNick) {
            await member.setNickname(null).catch(() => {});
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`<:ratio_tick:1366804156320583772> | Nickname for **[${target.username}](http://discord.com/users/${target.id})** has been reset.`)]
            });
        }

        if (newNick.length > 32) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription("<:ratio_cross:1366804187555430463> | Nickname cannot be longer than 32 characters.")]
            });
        }

        await member.setNickname(newNick).catch(() => {});

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`<:ratio_tick:1366804156320583772> | **[${target.username}](http://discord.com/users/${target.id})** nickname has been changed to **${newNick}**.`)]
        });
    }
};
