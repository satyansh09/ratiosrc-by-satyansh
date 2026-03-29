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
    name: 'banner',
    aliases: ['bn'],
    description: "View a user's banner in full size",
    category: 'util',
    cooldown: 3,
    run: async (client, message, args) => {
        let user;

        if (message.mentions.users.size) {
            user = message.mentions.users.first();
        } else if (args[0]) {
            user = await client.users.fetch(args[0]).catch(() => null);
        } else {
            user = message.author;
        }

        if (!user) return message.reply("User not found.");

        user = await client.users.fetch(user.id, { force: true }).catch(() => null);
        if (!user) return message.reply("User not found.");

        const bannerHash = user.banner;
        if (!bannerHash) return message.reply(`**${user.tag}** does not have a banner set.`);

        const bannerOptions = (hash) => ({
            extension: hash?.startsWith('a_') ? 'gif' : 'png',
            forceStatic: false,
            size: 4096
        });

        const bannerURL = user.bannerURL(bannerOptions(bannerHash));

        const buildContainer = () => {
            const gallery = new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(bannerURL)
                );

            const text = new TextDisplayBuilder()
                .setContent(`### ${user.tag}'s Banner`);

            const separator = new SeparatorBuilder().setSpacing(1);

            const linkButton = new ButtonBuilder()
                .setLabel('Open in Browser')
                .setStyle(ButtonStyle.Link)
                .setURL(bannerURL);

            const row = new ActionRowBuilder().addComponents(linkButton);

            return new ContainerBuilder()
                .setAccentColor(user.accentColor ?? 0x26272F)
                .addTextDisplayComponents(text)
                .addSeparatorComponents(separator)
                .addMediaGalleryComponents(gallery)
                .addActionRowComponents(row);
        };

        await message.reply({
            components: [buildContainer()],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
