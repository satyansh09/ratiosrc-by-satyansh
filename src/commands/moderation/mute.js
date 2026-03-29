const { PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");
const ms = require("ms");

module.exports = {
    name: "timeout",
    aliases: ["mute"],
    description: "Timeout a member for a specified duration",
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
        const duration = args[1];
        const reason = args.slice(2).join(" ") || "No reason provided.";

        if (!input) {
            return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | **Invalid Usage** — \`${prefix}mute @user/username/ID [duration] [reason]\`\n> Duration defaults to **2 hours** if not specified.`));
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
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | You cannot place a timeout on yourself."));
        }

        if (user.id === client.user.id) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | I cannot be timed out."));
        }

        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | **${user.username}** cannot be timed out — they hold the **Administrator** permission.`));
        }

        if (message.author.id !== message.guild.ownerId) {
            if (member.id === message.guild.ownerId) {
                return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | You cannot timeout the server owner."));
            }

            if (message.member.roles.highest.position <= member.roles.highest.position) {
                return message.channel.send(errorContainer(`<a:ratio_error:1428487794854203585> | You cannot timeout **${user.username}** — their highest role is equal to or above yours.`));
            }
        }

        if (!member.moderatable) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | I am unable to timeout this member. Their highest role is equal to or above mine."));
        }

        const durationMs = duration ? ms(duration) : ms("2h");

        if (!durationMs || durationMs > 2419200000) {
            return message.channel.send(errorContainer("<a:ratio_error:1428487794854203585> | Please provide a valid duration not exceeding **28 days** (e.g., `10m`, `1h`, `7d`)."));
        }

        const dmContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("### 🔇 You Have Been Timed Out"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Server:** ${message.guild.name}\n` +
                    `**Moderator:** [${message.author.username}](http://discord.com/users/${message.author.id})\n` +
                    `**Duration:** ${ms(durationMs, { long: true })}\n` +
                    `**Reason:** ${reason}`
                )
            );

        try {
            await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {}

        await member.timeout(durationMs, `${reason} | Timed out by ${message.author.tag}`);

        const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`<:ratio_tick2:1477543521094340730> | **[${user.username}](http://discord.com/users/${user.id})** [\`${user.id}\`] has been timed out for **${ms(durationMs, { long: true })}**.\n**Reason:** ${reason}`)
            );

        await message.channel.send({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
    }
};
