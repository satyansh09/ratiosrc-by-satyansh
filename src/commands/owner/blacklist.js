const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "blacklist",
    aliases: ["bl"],
    description: "Manage user blacklist",
    category: "owner",
    cooldown: 3,
    run: async (client, message, args, prefix) => {

        let accessList = await client.db.get(`blacklistaccess_${client.user.id}`) || [];

        if (message.author.id !== "760395853843136532" && !accessList.includes(message.author.id)) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | You are not authorized to use this command.`)
                ]
            });
        }

        if (!args[0]) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Usage: \`${prefix}blacklist <add/remove/update/reset>\``)
                ]
            });
        }

        let db = await client.db.get(`blacklist_${client.user.id}`);
        if (!db) {
            await client.db.set(`blacklist_${client.user.id}`, []);
            db = [];
        }

        let bl = [...db];
        let opt = args[0].toLowerCase();

        let user =
            message.mentions.users.first() ||
            client.users.cache.get(args[1]) ||
            (args[1]?.match(/^\d+$/) ? { id: args[1] } : null);

        let reason = args.slice(2).join(" ") || "No Reason Provided";

        if (["add", "remove"].includes(opt)) {
            let targetId = user?.id;
            if (targetId === "760395853843136532") {
                return message.channel.send({
                    files: [{
                        attachment: "https://cdn.discordapp.com/attachments/1127970897802833980/1438804935893450783/Doraemon_Achha_Laude_Memes.jpeg"
                    }]
                });
            }
        }

        if (opt === "add") {
            if (!user) {
                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${client.emoji.cross} | Please provide a valid user.`)
                    ]
                });
            }

            if (bl.includes(user.id)) {
                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${client.emoji.cross} | User is already blacklisted.`)
                    ]
                });
            }

            bl.push(user.id);
            await client.db.set(`blacklist_${client.user.id}`, bl);
            await client.db.set(`blreason_${user.id}`, reason);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.tick} | Successfully blacklisted <@${user.id}>`)
                ]
            });
        }

        if (opt === "remove") {
            if (!user) {
                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${client.emoji.cross} | Please provide a valid user.`)
                    ]
                });
            }

            if (!bl.includes(user.id)) {
                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${client.emoji.cross} | User is not blacklisted.`)
                    ]
                });
            }

            bl = bl.filter(x => x !== user.id);
            await client.db.set(`blacklist_${client.user.id}`, bl);
            await client.db.delete(`blreason_${user.id}`);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.tick} | Removed <@${user.id}> from blacklist`)
                ]
            });
        }

        if (opt === "update") {
            let list = bl.map(id => `${client.emoji.dot} <@${id}> | \`${id}\``);

            if (!list.length) {
                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${client.emoji.cross} | No blacklisted users.`)
                    ]
                });
            }

            let embed = new EmbedBuilder()
                .setColor('#26272F')
                .setAuthor({ name: "Blacklisted Users", iconURL: client.user.displayAvatarURL() })
                .setDescription(list.join("\n"))
                .setFooter({ text: `Total: ${list.length}` });

            let ch = client.channels.cache.get(client.config.gban_channel_id);
            if (!ch) return message.channel.send({ content: `${client.emoji.cross} | Channel not found.` });

            let old = await client.db.get(`blmsg_${client.user.id}`);
            if (old) {
                let msg = ch.messages.cache.get(old);
                if (msg) msg.delete().catch(() => {});
            }

            let sent = await ch.send({ embeds: [embed] });
            await client.db.set(`blmsg_${client.user.id}`, sent.id);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.tick} | Blacklist updated.`)
                ]
            });
        }

        if (opt === "reset") {
            await client.db.set(`blacklist_${client.user.id}`, []);
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.tick} | Blacklist reset successfully.`)
                ]
            });
        }
    }
};
