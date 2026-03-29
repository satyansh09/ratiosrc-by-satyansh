const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');

const OWNER_ID = ('760395853843136532', '1292831426839842829');

module.exports = {
    name: 'premium',
    aliases: ['prem'],
    description: 'Manage premium subscriptions',
    category: 'premium',
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        const subCommand = args[0]?.toLowerCase();
        
        if (!subCommand) {
            const embed = new EmbedBuilder()
                .setColor('#26272F')
                .setAuthor({ name: 'Premium System', iconURL: client.user.displayAvatarURL() })
                .setDescription(
                    `**Available Commands:**\n\n` +
                    `\`${prefix}premium add <@user> <duration> <count>\` - Add premium to user\n` +
                    `\`${prefix}premium remove <@user>\` - Remove premium from user\n` +
                    `\`${prefix}premium status [user/guild]\` - Check premium status\n` +
                    `\`${prefix}premium activate\` - Activate premium in this server\n` +
                    `\`${prefix}premium deactivate\` - Deactivate premium from this server\n\n` +
                    `**Note:** Premium gives access to exclusive features!`
                )
                .setFooter({ text: 'Premium System', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subCommand === 'add') {
            if (message.author.id !== OWNER_ID) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Only the bot owner can add premium to users.`)]
                });
            }

            const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
            const durationStr = args[2];
            const count = parseInt(args[3]) || 1;

            if (!user) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Please mention a valid user.\n**Usage:** \`${prefix}premium add <@user> <duration> <count>\``)]
                });
            }

            if (!durationStr) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Please provide a duration (e.g., 30d, 7d, 1h).\n**Usage:** \`${prefix}premium add <@user> <duration> <count>\``)]
                });
            }

            const duration = ms(durationStr);
            if (!duration || duration < 60000) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Invalid duration. Use format like: 1d, 7d, 30d, 1h`)]
                });
            }

            const expiresAt = Date.now() + duration;

            await client.db.set(`premium_user_${user.id}`, {
                expiresAt: expiresAt,
                count: count,
                addedBy: message.author.id,
                addedAt: Date.now()
            });

            const embed = new EmbedBuilder()
                .setColor('#26272F')
                .setTitle('Premium Added')
                .setDescription(`${client.emoji.tick} | Successfully added premium to **${user.tag}**`)
                .addFields(
                    { name: 'Duration', value: durationStr, inline: true },
                    { name: 'Server Slots', value: `${count}`, inline: true },
                    { name: 'Expires', value: `<t:${Math.floor(expiresAt / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: `Added by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subCommand === 'remove') {
            if (message.author.id !== OWNER_ID) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Only the bot owner can remove premium from users.`)]
                });
            }

            const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);

            if (!user) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Please mention a valid user.\n**Usage:** \`${prefix}premium remove <@user>\``)]
                });
            }

            const premiumData = await client.db.get(`premium_user_${user.id}`);
            if (!premiumData) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | **${user.tag}** doesn't have premium.`)]
                });
            }

            const activatedGuilds = await client.db.get(`premium_activated_${user.id}`) || [];
            for (const guildId of activatedGuilds) {
                await client.db.delete(`premium_guild_${guildId}`);
            }
            await client.db.delete(`premium_activated_${user.id}`);
            await client.db.delete(`premium_user_${user.id}`);

            const embed = new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`${client.emoji.tick} | Successfully removed premium from **${user.tag}**\nAlso deactivated ${activatedGuilds.length} server(s).`)
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subCommand === 'status') {
            const target = args[1]?.toLowerCase();
            
            if (target === 'guild' || target === 'server') {
                const guildPremium = await client.db.get(`premium_guild_${message.guild.id}`);
                
                if (!guildPremium) {
                    return message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${client.emoji.cross} | This server doesn't have premium activated.`)]
                    });
                }

                const activator = await client.users.fetch(guildPremium.activatedBy).catch(() => null);
                
                const embed = new EmbedBuilder()
                    .setColor('#26272F')
                    .setTitle('Server Premium Status')
                    .setThumbnail(message.guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: 'Status', value: '✅ Active', inline: true },
                        { name: 'Expires', value: `<t:${Math.floor(guildPremium.expiresAt / 1000)}:R>`, inline: true },
                        { name: 'Activated By', value: activator ? activator.tag : 'Unknown', inline: true }
                    )
                    .setTimestamp();

                return message.channel.send({ embeds: [embed] });
            }

            const user = message.mentions.users.first() || message.author;
            const premiumData = await client.db.get(`premium_user_${user.id}`);
            
            if (!premiumData) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Get Premium')
                            .setStyle(ButtonStyle.Link)
                            .setURL(client.config.support_server_link || 'https://discord.gg/ratio')
                            .setEmoji('💎')
                    );

                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | **${user.tag}** doesn't have premium.`)],
                    components: [row]
                });
            }

            const isExpired = Date.now() > premiumData.expiresAt;
            const activatedGuilds = await client.db.get(`premium_activated_${user.id}`) || [];

            const embed = new EmbedBuilder()
                .setColor(isExpired ? '#FF0000' : '#FFD700')
                .setTitle('User Premium Status')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Status', value: isExpired ? '❌ Expired' : '✅ Active', inline: true },
                    { name: 'Expires', value: `<t:${Math.floor(premiumData.expiresAt / 1000)}:R>`, inline: true },
                    { name: 'Server Slots', value: `${activatedGuilds.length}/${premiumData.count}`, inline: true },
                    { name: 'Activated Servers', value: activatedGuilds.length > 0 ? activatedGuilds.map(id => `\`${id}\``).join(', ').slice(0, 1000) : 'None', inline: false }
                )
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subCommand === 'activate') {
            const premiumData = await client.db.get(`premium_user_${message.author.id}`);
            
            if (!premiumData) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Get Premium')
                            .setStyle(ButtonStyle.Link)
                            .setURL(client.config.support_server_link || 'https://discord.gg/ratio')
                            .setEmoji('💎')
                    );

                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setTitle('Premium Required')
                        .setDescription(`${client.emoji.cross} | You don't have premium!\n\nJoin our support server to purchase premium.`)],
                    components: [row]
                });
            }

            if (Date.now() > premiumData.expiresAt) {
                const activatedGuilds = await client.db.get(`premium_activated_${message.author.id}`) || [];
                for (const guildId of activatedGuilds) {
                    await client.db.delete(`premium_guild_${guildId}`);
                }
                await client.db.set(`premium_activated_${message.author.id}`, []);
                
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Your premium has expired! All activated servers have been deactivated. Please renew to continue using premium features.`)]
                });
            }

            const existingGuildPremium = await client.db.get(`premium_guild_${message.guild.id}`);
            if (existingGuildPremium && existingGuildPremium.activatedBy !== message.author.id) {
                if (Date.now() > existingGuildPremium.expiresAt) {
                    await client.db.delete(`premium_guild_${message.guild.id}`);
                } else {
                    return message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${client.emoji.cross} | This server already has premium activated by another user.`)]
                    });
                }
            }

            if (existingGuildPremium && existingGuildPremium.activatedBy === message.author.id && Date.now() < existingGuildPremium.expiresAt) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | You have already activated premium in this server.`)]
                });
            }

            let activatedGuilds = await client.db.get(`premium_activated_${message.author.id}`) || [];
            
            const validGuilds = [];
            for (const guildId of activatedGuilds) {
                const guildPrem = await client.db.get(`premium_guild_${guildId}`);
                if (guildPrem && Date.now() < guildPrem.expiresAt) {
                    validGuilds.push(guildId);
                } else if (guildPrem) {
                    await client.db.delete(`premium_guild_${guildId}`);
                }
            }
            activatedGuilds = validGuilds;
            await client.db.set(`premium_activated_${message.author.id}`, activatedGuilds);
            
            if (activatedGuilds.length >= premiumData.count) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | You have used all your server slots (${activatedGuilds.length}/${premiumData.count}).\n\nDeactivate premium from another server or upgrade your plan.`)]
                });
            }

            activatedGuilds.push(message.guild.id);
            await client.db.set(`premium_activated_${message.author.id}`, activatedGuilds);
            await client.db.set(`premium_guild_${message.guild.id}`, {
                activatedBy: message.author.id,
                expiresAt: premiumData.expiresAt,
                activatedAt: Date.now()
            });

            const embed = new EmbedBuilder()
                .setColor('#26272F')
                .setTitle('Premium Activated!')
                .setDescription(`${client.emoji.tick} | Successfully activated premium in **${message.guild.name}**!`)
                .addFields(
                    { name: 'Expires', value: `<t:${Math.floor(premiumData.expiresAt / 1000)}:R>`, inline: true },
                    { name: 'Slots Used', value: `${activatedGuilds.length}/${premiumData.count}`, inline: true }
                )
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subCommand === 'deactivate') {
            const guildPremium = await client.db.get(`premium_guild_${message.guild.id}`);
            
            if (!guildPremium) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | This server doesn't have premium activated.`)]
                });
            }

            if (guildPremium.activatedBy !== message.author.id && message.author.id !== OWNER_ID) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Only the person who activated premium or bot owner can deactivate it.`)]
                });
            }

            const activatedGuilds = await client.db.get(`premium_activated_${guildPremium.activatedBy}`) || [];
            const newActivatedGuilds = activatedGuilds.filter(id => id !== message.guild.id);
            await client.db.set(`premium_activated_${guildPremium.activatedBy}`, newActivatedGuilds);
            await client.db.delete(`premium_guild_${message.guild.id}`);

            const embed = new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`${client.emoji.tick} | Successfully deactivated premium from **${message.guild.name}**.`)
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`${client.emoji.cross} | Invalid subcommand. Use \`${prefix}premium\` to see available commands.`)]
        });
    }
};
