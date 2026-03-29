const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    name: 'avatar',
    aliases: ['av'],
    description: "View a user's avatar in full size",
    category: 'util',
    cooldown: 3,
    run: async (client, message, args) => {
        let user;
        let member;

        if (message.mentions.users.size) {
            user = message.mentions.users.first();
            member = message.mentions.members.first();
        } else if (args[0]) {
            user = await client.users.fetch(args[0]).catch(() => null);
            member = user ? await message.guild.members.fetch(user.id).catch(() => null) : null;
        } else {
            user = message.author;
            member = message.member;
        }

        if (!user) return message.reply("User not found.");

        const avatarOptions = (hash) => ({
            extension: hash?.startsWith('a_') ? 'gif' : 'png',
            forceStatic: false,
            size: 4096
        });

        const globalAvatar = user.displayAvatarURL(avatarOptions(user.avatar));
        const guildAvatar = member?.avatar
            ? member.displayAvatarURL(avatarOptions(member.avatar))
            : null;

        const buildContainer = (imageUrl, isGuild = false) => {
            const gallery = new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(imageUrl)
                );

            const text = new TextDisplayBuilder()
                .setContent(`### ${user.tag}'s ${isGuild ? 'Server' : 'Global'} Avatar`);

            const separator = new SeparatorBuilder().setSpacing(1);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('avatar_global')
                    .setLabel('Global Avatar')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!isGuild ? true : false),
                new ButtonBuilder()
                    .setCustomId('avatar_guild')
                    .setLabel('Server Avatar')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(isGuild ? true : !guildAvatar)
            );

            return new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(text)
                .addSeparatorComponents(separator)
                .addMediaGalleryComponents(gallery)
                .addActionRowComponents(row);
        };

        const msg = await message.reply({
            components: [buildContainer(globalAvatar, false)],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'avatar_global') {
                await interaction.update({
                    components: [buildContainer(globalAvatar, false)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (interaction.customId === 'avatar_guild' && guildAvatar) {
                await interaction.update({
                    components: [buildContainer(guildAvatar, true)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        });

    }
};
