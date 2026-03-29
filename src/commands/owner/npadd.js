const moment = require('moment');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'npadd',
    description: 'Add a user to noprefix list with optional duration',
    category: 'owner',
    cooldown: 3,
    async run(client, message, args) {
        const allowedUsers = ['760395853843136532', '1292831426839842829', '1191584661286174740', '1242320905607053422'];
        if (!allowedUsers.includes(message.author.id)) return message.reply('You do not have permission to use this command.');

        const user = message.mentions.users.first();
        if (!user) return message.reply('Please mention a user.');

        let duration = null;
        if (args[1]) {
            const time = args[1];
            const timeValue = parseInt(time.slice(0, -1));
            const timeUnit = time.slice(-1);

            switch (timeUnit) {
                case 'd':
                    duration = moment().add(timeValue, 'days').toDate();
                    break;
                case 'm':
                    duration = moment().add(timeValue, 'months').toDate();
                    break;
                default:
                    return message.reply('Invalid time format. Use `1d` for 1 day, `1m` for 1 month, etc.');
            }
        }

        let npList = await client.db.get('noprefix') || [];
        npList = npList.filter(entry => entry.userId !== user.id);
        npList.push({ userId: user.id, expiresAt: duration });

        await client.db.set('noprefix', npList);

        const embed = new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(`${client.emoji.tick} Added ${user} to the noprefix list${duration ? ` until ${moment(duration).format('LLL')}` : ''}.`);
        message.channel.send({ embeds: [embed] });
    }
};