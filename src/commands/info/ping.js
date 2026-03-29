const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "ping",
  aliases: ["latency"],
  cat: "Info",
  run: async (client, message) => {
    const websocketPing = client.ws.ping;

    const sep = () =>
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small);

    const sentMessage = await message.channel.send({
      components: [
        new ContainerBuilder()
          .setAccentColor(0x26272f)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Measuring latency…")
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const shardId = client.cluster?.id ?? 0;
    const totalShards = client.cluster?.count ?? 1;

    return sentMessage.edit({
      components: [
        new ContainerBuilder()
          .setAccentColor(0x26272f)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Pong! 🏓")
          )
          .addSeparatorComponents(sep())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `WebSocket Ping  : \`${Math.round(websocketPing)}ms\`\n` +
              `Database Latency: \`0ms\``
            )
          )
          .addSeparatorComponents(sep())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# Shard ${shardId}/${totalShards}`
            )
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};