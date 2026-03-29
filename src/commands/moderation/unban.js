const { PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");

module.exports = {
    name: "unban",
    aliases: [],
    description: "Unban a user from the server",
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
            return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | **Invalid Usage** — \`${prefix}unban @user/username/ID [reason]\``));
        }

        const banList = await message.guild.bans.fetch().catch(() => null);

        if (!banList) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | Failed to fetch the ban list. Please check my permissions."));
        }

        let banEntry = banList.get(input)
            || banList.find(b =>
                b.user.username.toLowerCase() === input.toLowerCase() ||
                b.user.tag?.toLowerCase() === input.toLowerCase()
            );

        if (!banEntry) {
            const fetchedUser = await client.users.fetch(input).catch(() => null);
            if (fetchedUser) {
                banEntry = banList.get(fetchedUser.id);
            }
        }

        if (!banEntry) {
            return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | No banned user was found matching **${input}**.`));
        }

        const user = banEntry.user;

        await message.guild.members.unban(user.id, `${reason} | Unbanned by ${message.author.tag}`);

        const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`<:ratio_tick2:1477543521094340730> | **[${user.username}](http://discord.com/users/${user.id})** [\`${user.id}\`] has been unbanned from the server.\n**Reason:** ${reason}`)
            );

        await message.channel.send({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

        const dmContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("### ✅ You Have Been Unbanned"))
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
