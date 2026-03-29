const { PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");

module.exports = {
    name: "untimeout",
    aliases: ["unmute"],
    description: "Remove a timeout from a member",
    category: "moderation",
    cooldown: 3,
    run: async (client, message, args, prefix) => {

        const errorContainer = (text) => {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
            return { components: [container], flags: MessageFlags.IsComponentsV2 };
        };

        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | You do not have the required **`MODERATE_MEMBERS`** permission to execute this command."));
        }

        const input = args[0]?.replace(/[<@!>]/g, "");
        const reason = args.slice(1).join(" ") || "No reason provided.";

        if (!input) {
            return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | **Invalid Usage** — \`${prefix}unmute @user/username/ID [reason]\``));
        }

        let member = message.guild.members.cache.get(input)
            || message.guild.members.cache.find(m =>
                m.user.username.toLowerCase() === input.toLowerCase() ||
                m.user.tag?.toLowerCase() === input.toLowerCase() ||
                m.displayName.toLowerCase() === input.toLowerCase()
            );

        let user = member?.user || await client.users.fetch(input).catch(() => null);

        if (!user) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | No user was found with that input. Try using their ID, username, or mention."));
        }

        if (!member) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | That user is not a member of this server."));
        }

        if (user.id === message.author.id) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | You cannot unmute yourself."));
        }

        if (user.id === client.user.id) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | I cannot be unmuted."));
        }

        if (!member.isCommunicationDisabled()) {
            return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | **${user.username}** is not currently timed out.`));
        }

        if (message.author.id !== message.guild.ownerId) {
            if (message.member.roles.highest.position <= member.roles.highest.position) {
                return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | You cannot unmute **${user.username}** — their highest role is equal to or above yours.`));
            }
        }

        if (!member.moderatable) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | I am unable to unmute this member. Their highest role is equal to or above mine."));
        }

        await member.timeout(null, `${reason} | Timeout removed by ${message.author.tag}`);

        const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`<:ratio_tick2:1477543521094340730> | **[${user.username}](http://discord.com/users/${user.id})** [\`${user.id}\`] has been unmuted.\n**Reason:** ${reason}`)
            );

        await message.channel.send({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

        const dmContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("### 🔊 Your Timeout Has Been Removed"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Server:** ${message.guild.name}\n` +
                    `**Moderator:** [${message.author.username}](http://discord.com/users/${message.author.id})\n` +
                    `**Reason:** ${reason}`
                )
            );

        try {
            await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {}
    }
};
