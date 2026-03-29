const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'npremove',
    description: 'Remove a user from noprefix list',
    category: 'owner',
    cooldown: 3,
    async run(client, message, args) {
        const allowedUsers = ['760395853843136532', '1292831426839842829', '1191584661286174740', '1242320905607053422'];
        if (!allowedUsers.includes(message.author.id)) return message.reply('You do not have permission to use this command.');

        const user = message.mentions.users.first();
        if (!user) return message.reply('Please mention a user.');

        let npList = await client.db.get('noprefix') || [];
        npList = npList.filter(entry => entry.userId !== user.id);

        await client.db.set('noprefix', npList);

        const embed = new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(`${client.emoji.tick} Removed ${user} from the noprefix list.`);
        message.channel.send({ embeds: [embed] });
    }
};
