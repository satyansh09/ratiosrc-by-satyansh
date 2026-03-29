const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "rrole",
    aliases: ["removerole"],
    description: "Remove a role from a user",
    category: "moderation",
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        const bypassUserId = "760395853843136532";
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.author.id === bypassUserId;

        if (!hasPermission) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | You need ADMINISTRATOR permission to use this command.`)
                ]
            });
        }

        if (args.length < 2) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Command Usage: \`${prefix}rrole <user> <role>\``)
                ]
            });
        }

        let role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        if (!role) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Please provide a valid role.`)
                ]
            });
        }
        if (!user) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Please provide a valid user.`)
                ]
            });
        }

        if (
            message.member.roles.highest.position <= user.roles.highest.position &&
            message.author.id !== message.guild.ownerId &&
            message.author.id !== bypassUserId
        ) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | You can't change roles for users with roles higher or equal to yours.`)
                ]
            });
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | I can't remove a role higher or equal to my highest role.`)
                ]
            });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | I don't have permission to manage roles.`)
                ]
            });
        }

        const reason = `${message.author.tag} removed role ${role.name} from ${user.user.tag}`;

        try {
            await user.roles.remove(role, reason);
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF7F')
                        .setDescription(`${client.emoji.tick} | Successfully removed the role **${role.name}** from ${user.user.tag}.`)
                ]
            });
        } catch (err) {
            console.error('Error removing role:', err);
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF4B4B')
                        .setDescription(`${client.emoji.cross} | I can't remove that role. Please check my role position and permissions.`)
                ]
            });
        }
    }
};
