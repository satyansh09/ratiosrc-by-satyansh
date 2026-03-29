const moment = require('moment');
require('moment-duration-format');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'uptime',
    aliases: ['upt'],
    description: "Check how long the bot has been online",
    category: 'info',
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        const time = moment.duration(client.uptime).format('D[days], H[hrs], m[mins], s[secs]');
        const embed = new EmbedBuilder()
            .setColor('#26272F') 
            .setDescription(`${client.emoji.uptime} | My uptime: \`${time}\``);

        return message.channel.send({ embeds: [embed] });
    }
};
