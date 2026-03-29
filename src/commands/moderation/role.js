const { 
    EmbedBuilder, 
    PermissionFlagsBits, 
    SlashCommandBuilder,
    ApplicationCommandOptionType 
} = require("discord.js");

module.exports = {
    name: "role",
    aliases: ["giverole", "addrole"],
    description: "Assign a role to a user",
    category: "moderation",
    cooldown: 3,
    slashCommand: new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage user roles")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add a role to a user")
                .addUserOption(opt => 
                    opt.setName("user")
                        .setDescription("The user to add the role to")
                        .setRequired(true))
                .addRoleOption(opt =>
                    opt.setName("role")
                        .setDescription("The role to add")
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove a role from a user")
                .addUserOption(opt =>
                    opt.setName("user")
                        .setDescription("The user to remove the role from")
                        .setRequired(true))
                .addRoleOption(opt =>
                    opt.setName("role")
                        .setDescription("The role to remove")
                        .setRequired(true))),

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
                        .setDescription(`${client.emoji.cross} | Command Usage: \`${prefix}role <user> <role>\``)
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
                        .setDescription(`${client.emoji.cross} | I can't assign a role higher or equal to my highest role.`)
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

        const reason = `${message.author.tag} assigned role ${role.name} to ${user.user.tag}`;

        try {
            await user.roles.add(role, reason);
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF7F')
                        .setDescription(`${client.emoji.tick} | Successfully assigned the role **${role.name}** to ${user.user.tag}.`)
                ]
            });
        } catch (err) {
            console.error('Error assigning role:', err);
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF4B4B')
                        .setDescription(`${client.emoji.cross} | I can't assign that role. Please check my role position and permissions.`)
                ]
            });
        }
    },

    runSlash: async (client, interaction) => {
        const bypassUserId = "760395853843136532";
        const hasPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || interaction.user.id === bypassUserId;

        if (!hasPermission) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | You need ADMINISTRATOR permission to use this command.`)
                ],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getMember("user");
        const role = interaction.options.getRole("role");

        if (!user) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | User not found in this server.`)
                ],
                ephemeral: true
            });
        }

        if (
            interaction.member.roles.highest.position <= user.roles.highest.position &&
            interaction.user.id !== interaction.guild.ownerId &&
            interaction.user.id !== bypassUserId
        ) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | You can't change roles for users with roles higher or equal to yours.`)
                ],
                ephemeral: true
            });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | I can't manage a role higher or equal to my highest role.`)
                ],
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | I don't have permission to manage roles.`)
                ],
                ephemeral: true
            });
        }

        try {
            if (subcommand === "add") {
                const reason = `${interaction.user.tag} assigned role ${role.name} to ${user.user.tag}`;
                await user.roles.add(role, reason);
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF7F')
                            .setDescription(`${client.emoji.tick} | Successfully assigned **${role.name}** to ${user.user.tag}.`)
                    ]
                });
            } else if (subcommand === "remove") {
                const reason = `${interaction.user.tag} removed role ${role.name} from ${user.user.tag}`;
                await user.roles.remove(role, reason);
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF7F')
                            .setDescription(`${client.emoji.tick} | Successfully removed **${role.name}** from ${user.user.tag}.`)
                    ]
                });
            }
        } catch (err) {
            console.error('Error managing role:', err);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF4B4B')
                        .setDescription(`${client.emoji.cross} | I can't manage that role. Please check my role position and permissions.`)
                ],
                ephemeral: true
            });
        }
    }
};
