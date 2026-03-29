const { ActivityType, REST, Routes } = require("discord.js");

module.exports = (client) => {
  client.on("clientReady", async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    
    const shardList = client.cluster?.info?.SHARD_LIST ?? [0];
    const shardId = shardList[0] ?? 0;
    
    client.user.setPresence({
      status: "dnd",
      activities: [
        {
          name: `@ratio help || shard ${shardId}`,
          type: ActivityType.Playing,
        },
      ],
    });

    const slashCommands = [];
    for (const [name, cmd] of client.commands) {
      if (cmd.slashCommand && cmd.runSlash) {
        slashCommands.push(cmd.slashCommand.toJSON());
      }
    }

    if (slashCommands.length > 0) {
      try {
        const rest = new REST({ version: '10' }).setToken(client.token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log(`[Slash] Registered ${slashCommands.length} slash commands globally`);
      } catch (err) {
        console.error('[Slash] Failed to register commands:', err);
      }
    }
    
    console.log(`[Shard ${shardId}] Ready with ${client.guilds.cache.size} guilds`);
  });
};