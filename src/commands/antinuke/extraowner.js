const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "extraowner",
    aliases: ["extraowners", "addowner"],
    description: "Manage extra owners for antinuke access",
    category: "antinuke",
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        if (message.author.id !== message.guild.ownerId && !client.config.owner.includes(message.author.id)) {
            return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.cross} Only Guild Owner is allowed to run this command.`)] });
        }

        let a = await client.db.get(`ownerPermit1_${message.guild.id}`);
        let b = await client.db.get(`ownerPermit2_${message.guild.id}`);

        if (!args[0]) {
            return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.cross} Usage: \`${prefix}extraowner <add/remove/show>\``)] });
        }

        let opt = args[0].toLowerCase();

        if (opt === "show") {
            let ans = "";
            if (a != null) ans += `\n<@${a}>`;
            if (b != null) ans += `\n<@${b}>`;

            if (ans === "") {
                return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.cross} No Extraowner in this guild`)] });
            }

            return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${ans}`).setAuthor({ name: '', iconURL: message.guild.iconURL({ dynamic: true }) })] });
        }

        let user = message.guild.members.cache.get(args[1]) || message.mentions.members.first();
        if (!user) {
            return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.cross} Please provide a valid user.`)] });
        }

        if (opt === "add") {
            if (a === user.id || b === user.id) {
                return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.cross} ${user} is already in Extraowner list`)] });
            }

            if (a == null) {
                await client.db.set(`ownerPermit1_${message.guild.id}`, user.id);
            } else if (b == null) {
                await client.db.set(`ownerPermit2_${message.guild.id}`, user.id);
            } else {
                return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.cross} Can't add more than 2 Extraowner`)] });
            }

            return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.tick} Successfully added ${user} to Extraowner`)] });
        }

        if (opt === "remove") {
            if (user.id === a) {
                await client.db.delete(`ownerPermit1_${message.guild.id}`);
            } else if (user.id === b) {
                await client.db.delete(`ownerPermit2_${message.guild.id}`);
            } else {
                return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.cross} ${user} is not an Extraowner`)] });
            }

            return message.channel.send({ embeds: [new EmbedBuilder().setColor('#26272F').setDescription(`${client.emoji.tick} Successfully removed ${user} from Extraowner`)] });
        }
    }
};
