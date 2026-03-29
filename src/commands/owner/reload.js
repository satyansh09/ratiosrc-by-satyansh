const { EmbedBuilder } = require("discord.js");
const { readdirSync } = require("fs");
const path = require("path");

module.exports = {
  name: "reload",
  aliases: ["rl", "refresh"],
  description: "Reload commands or events",
  category: "owner",
  cooldown: 3,
  run: async (client, message, args, prefix) => {
    if (message.author.id !== "760395853843136532") {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#26272F')
            .setDescription("This command is restricted.")
        ]
      });
    }

    const type = args[0]?.toLowerCase();
    const target = args[1]?.toLowerCase();

    if (!type) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(
              `**Usage:**\n` +
              `\`${prefix}reload commands\` - Reload all commands\n` +
              `\`${prefix}reload events\` - Reload all events\n` +
              `\`${prefix}reload command <name>\` - Reload specific command\n` +
              `\`${prefix}reload all\` - Reload everything`
            )
        ]
      });
    }

    const startTime = Date.now();

    if (type === "commands" || type === "cmds") {
      let count = 0;
      const basePath = path.join(__dirname, "..");
      
      for (const dir of readdirSync(basePath)) {
        const dirPath = path.join(basePath, dir);
        const files = readdirSync(dirPath).filter(f => f.endsWith(".js"));
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          delete require.cache[require.resolve(filePath)];
          const cmd = require(filePath);
          if (cmd?.name) {
            client.commands.set(cmd.name, cmd);
            count++;
          }
        }
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(`Reloaded **${count}** commands in **${Date.now() - startTime}ms**`)
        ]
      });
    }

    if (type === "events") {
      let count = 0;
      const eventsPath = path.join(__dirname, "..", "..", "events");

      client.removeAllListeners("messageCreate");
      client.removeAllListeners("guildAuditLogEntryCreate");
      client.removeAllListeners("interactionCreate");
      client.removeAllListeners("guildMemberAdd");
      client.removeAllListeners("guildMemberRemove");
      client.removeAllListeners("voiceStateUpdate");
      client.removeAllListeners("messageDelete");
      client.removeAllListeners("messageUpdate");
      client.removeAllListeners("channelCreate");
      client.removeAllListeners("channelDelete");
      client.removeAllListeners("channelUpdate");
      client.removeAllListeners("roleCreate");
      client.removeAllListeners("roleDelete");
      client.removeAllListeners("roleUpdate");
      client.removeAllListeners("guildBanAdd");
      client.removeAllListeners("guildBanRemove");
      client.removeAllListeners("guildUpdate");
      client.removeAllListeners("webhookUpdate");
      client.removeAllListeners("ready");
      client.removeAllListeners("guildCreate");
      client.removeAllListeners("guildDelete");

      const reloadEvents = (directory) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const fullPath = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            reloadEvents(fullPath);
            continue;
          }
          if (entry.name.endsWith(".js")) {
            delete require.cache[require.resolve(fullPath)];
            const eventFile = require(fullPath);
            if (typeof eventFile === "function") {
              eventFile(client);
              count++;
            }
          }
        }
      };

      reloadEvents(eventsPath);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(`Reloaded **${count}** events in **${Date.now() - startTime}ms**`)
        ]
      });
    }

    if (type === "command" || type === "cmd") {
      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#26272F')
              .setDescription("Specify command name to reload.")
          ]
        });
      }

      const cmd = client.commands.get(target) || 
        client.commands.find(c => c.aliases?.includes(target));

      if (!cmd) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#26272F')
              .setDescription(`Command \`${target}\` not found.`)
          ]
        });
      }

      const basePath = path.join(__dirname, "..");
      let reloaded = false;

      for (const dir of readdirSync(basePath)) {
        const dirPath = path.join(basePath, dir);
        const files = readdirSync(dirPath).filter(f => f.endsWith(".js"));

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          delete require.cache[require.resolve(filePath)];
          const loadedCmd = require(filePath);
          if (loadedCmd?.name === cmd.name) {
            client.commands.set(loadedCmd.name, loadedCmd);
            reloaded = true;
            break;
          }
        }
        if (reloaded) break;
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(`Reloaded command \`${cmd.name}\` in **${Date.now() - startTime}ms**`)
        ]
      });
    }

    if (type === "all") {
      let cmdCount = 0;
      let eventCount = 0;

      const basePath = path.join(__dirname, "..");
      for (const dir of readdirSync(basePath)) {
        const dirPath = path.join(basePath, dir);
        const files = readdirSync(dirPath).filter(f => f.endsWith(".js"));
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          delete require.cache[require.resolve(filePath)];
          const cmd = require(filePath);
          if (cmd?.name) {
            client.commands.set(cmd.name, cmd);
            cmdCount++;
          }
        }
      }

      client.removeAllListeners("messageCreate");
      client.removeAllListeners("guildAuditLogEntryCreate");
      client.removeAllListeners("interactionCreate");
      client.removeAllListeners("guildMemberAdd");
      client.removeAllListeners("guildMemberRemove");
      client.removeAllListeners("voiceStateUpdate");
      client.removeAllListeners("messageDelete");
      client.removeAllListeners("messageUpdate");
      client.removeAllListeners("channelCreate");
      client.removeAllListeners("channelDelete");
      client.removeAllListeners("channelUpdate");
      client.removeAllListeners("roleCreate");
      client.removeAllListeners("roleDelete");
      client.removeAllListeners("roleUpdate");
      client.removeAllListeners("guildBanAdd");
      client.removeAllListeners("guildBanRemove");
      client.removeAllListeners("guildUpdate");
      client.removeAllListeners("webhookUpdate");
      client.removeAllListeners("ready");
      client.removeAllListeners("guildCreate");
      client.removeAllListeners("guildDelete");

      const eventsPath = path.join(__dirname, "..", "..", "events");
      const reloadEvents = (directory) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const fullPath = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            reloadEvents(fullPath);
            continue;
          }
          if (entry.name.endsWith(".js")) {
            delete require.cache[require.resolve(fullPath)];
            const eventFile = require(fullPath);
            if (typeof eventFile === "function") {
              eventFile(client);
              eventCount++;
            }
          }
        }
      };
      reloadEvents(eventsPath);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(
              `Reloaded **${cmdCount}** commands and **${eventCount}** events in **${Date.now() - startTime}ms**`
            )
        ]
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#26272F')
          .setDescription("Invalid option. Use `commands`, `events`, `command <name>`, or `all`.")
      ]
    });
  }
};
