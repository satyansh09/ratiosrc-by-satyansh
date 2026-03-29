const { PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");

module.exports = {
    name: "ban",
    aliases: [],
    description: "Ban a member from the server",
    category: "moderation",
    cooldown: 3,
    run: async (client, message, args, prefix) => {

        const errorContainer = (text) => {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
            return { components: [container], flags: MessageFlags.IsComponentsV2 };
        };

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | You do not have the required **`BAN_MEMBERS`** permission to execute this command."));
        }

        const input = args[0]?.replace(/[<@!>]/g, "");
        const reason = args.slice(1).join(" ") || "No reason provided.";

        if (!input) {
            return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | **Invalid Usage** — \`${prefix}ban @user/username/ID [reason]\``));
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

        if (user.id === message.author.id) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | You cannot ban yourself."));
        }

        if (user.id === client.user.id) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | I cannot be banned."));
        }

        if (member) {
            if (message.author.id !== message.guild.ownerId) {
                if (member.id === message.guild.ownerId) {
                    return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | You cannot ban the server owner."));
                }

                if (message.member.roles.highest.position <= member.roles.highest.position) {
                    return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | You cannot ban **${user.username}** — their highest role is equal to or above yours.`));
                }
            }

            if (!member.bannable) {
                return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | I am unable to ban this member. Their highest role is equal to or above mine."));
            }

            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent("### 🔨 You Have Been Banned"))
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

        await message.guild.members.ban(user.id, { reason: `${reason} | Banned by ${message.author.tag}` });

        const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`<:ratio_tick2:1477543521094340730> | **[${user.username}](http://discord.com/users/${user.id})** [\`${user.id}\`] has been banned from the server.\n**Reason:** ${reason}`)
            );

        await message.channel.send({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
    }
};
