const fs = require("fs");
const path = require("path");
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    SeparatorSpacingSize,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");

const ARROW = "<:ratio_arrow:1453424166295437404>";

module.exports = {
    name: "help",
    aliases: ["h", "commands", "cmds"],
    description: "View all available commands",
    category: "info",
    cooldown: 3,

    run: async (client, message) => {
        let prefix = client.config.prefix;
        const prefixData = await client.db.get(`prefix_${message.guild.id}`);
        if (prefixData) prefix = prefixData;

        const commandsPath = path.join(__dirname, "..");
        const categories = fs.readdirSync(commandsPath)
            .filter(d => fs.statSync(path.join(commandsPath, d)).isDirectory())
            .filter(c => !["owner", "subscription"].includes(c.toLowerCase()));

        const getCommands = (cat) => {
            const dir = path.join(commandsPath, cat);
            if (!fs.existsSync(dir)) return [];
            return fs.readdirSync(dir)
                .filter(f => f.endsWith(".js"))
                .map(f => require(path.join(dir, f)))
                .filter(c => c?.name);
        };

        const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

        const sep  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
        const thin = () => new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);

        const makeDropdown = (selected = null) =>
            new StringSelectMenuBuilder()
                .setCustomId("help-category")
                .setPlaceholder(selected ? capitalize(selected) : "Browse by category")
                .addOptions(
                    categories.map((cat, i) => ({
                        label: `${i + 1}. ${capitalize(cat)}`,
                        value: cat,
                        default: cat === selected,
                    }))
                );

        const makeNavButtons = (homeDisabled) =>
            new ButtonBuilder()
                .setCustomId("home")
                .setLabel("Home")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(homeDisabled);

        const makeListButton = (listDisabled) =>
            new ButtonBuilder()
                .setCustomId("list")
                .setLabel("All Commands")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(listDisabled);

        const buildHome = () =>
            new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${client.user.username}\n` +
                        `-# Prefix: \`${prefix}\` — ${categories.length} categories`
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Hey there! <:automod:1366990442419453953>\nWelcome to **Ratio** — your all-in-one server protection bot.\nUse the dropdown below to explore commands by category, or hit **All Commands** for a full overview.`
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `[Invite Me](https://dsc.gg/ratiogg)  |  [Support Server](https://discord.gg/hDHa6Ru2j6)`
                    )
                )
                .addSeparatorComponents(sep())
                .addActionRowComponents((row) =>
                    row.addComponents(makeNavButtons(true), makeListButton(false))
                )
                .addActionRowComponents((row) => row.addComponents(makeDropdown()));

        const buildList = () => {
            const container = new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## All Commands")
                )
                .addSeparatorComponents(sep());

            categories.forEach((cat, index) => {
                const cmds = getCommands(cat).map(c => `\`${c.name}\``).join("  ") || "None";
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**${index + 1}. ${capitalize(cat)}**\n${cmds}`
                    )
                );
                if (index < categories.length - 1) container.addSeparatorComponents(thin());
            });

            return container
                .addSeparatorComponents(sep())
                .addActionRowComponents((row) =>
                    row.addComponents(makeNavButtons(false), makeListButton(true))
                )
                .addActionRowComponents((row) => row.addComponents(makeDropdown()));
        };

        const buildAntinukeCategory = () =>
            new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Antinuke**")
                )
                .addSeparatorComponents(thin())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${ARROW} \`${prefix}antinuke\`\n` +
                        `${ARROW} \`${prefix}antinuke enable\`\n` +
                        `${ARROW} \`${prefix}antinuke disable\`\n` +
                        `${ARROW} \`${prefix}antinuke status\``
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Whitelist**")
                )
                .addSeparatorComponents(thin())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${ARROW} \`${prefix}whitelist\`\n` +
                        `${ARROW} \`${prefix}whitelist add <@user>\`\n` +
                        `${ARROW} \`${prefix}whitelist remove <@user>\`\n` +
                        `${ARROW} \`${prefix}whitelist show\`\n` +
                        `${ARROW} \`${prefix}multiwhitelist add <@user1> <@user2> <@user3> ...\`\n` +
                        `${ARROW} \`${prefix}multiwhitelist remove <@user1> <@user2> <@user3> ...\``
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Extraowner**")
                )
                .addSeparatorComponents(thin())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${ARROW} \`${prefix}extraowner\`\n` +
                        `${ARROW} \`${prefix}extraowner add\`\n` +
                        `${ARROW} \`${prefix}extraowner remove\`\n` +
                        `${ARROW} \`${prefix}extraowner show\``
                    )
                )
                .addSeparatorComponents(sep())
                .addActionRowComponents((row) =>
                    row.addComponents(makeNavButtons(false), makeListButton(false))
                )
                .addActionRowComponents((row) => row.addComponents(makeDropdown("antinuke")));

        const buildCategory = (cat) => {
            if (cat.toLowerCase() === "antinuke") return buildAntinukeCategory();

            const cmds = getCommands(cat).map(c => `\`${c.name}\``).join("  ") || "None";
            return new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${capitalize(cat)}`)
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(cmds)
                )
                .addSeparatorComponents(sep())
                .addActionRowComponents((row) =>
                    row.addComponents(makeNavButtons(false), makeListButton(false))
                )
                .addActionRowComponents((row) => row.addComponents(makeDropdown(cat)));
        };

        const msg = await message.reply({
            components: [buildHome()],
            flags: MessageFlags.IsComponentsV2,
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => {
                if (i.user.id !== message.author.id) {
                    i.reply({ content: "Only the command author can use this menu.", ephemeral: true });
                    return false;
                }
                return true;
            },
            time: 0,
        });

        collector.on("collect", async (i) => {
            if (i.customId === "home") {
                return i.update({ components: [buildHome()], flags: MessageFlags.IsComponentsV2 });
            }

            if (i.customId === "list") {
                return i.update({ components: [buildList()], flags: MessageFlags.IsComponentsV2 });
            }

            if (i.values?.[0]) {
                return i.update({ components: [buildCategory(i.values[0])], flags: MessageFlags.IsComponentsV2 });
            }
        });
    },
};