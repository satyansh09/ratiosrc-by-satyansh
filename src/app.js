'use strict';

const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Options,
} = require("discord.js");
const { Database }  = require("quickmongo");
const { readdirSync } = require("fs");
const path          = require("path");
const { open }      = require("lmdb");
const https         = require("https");
require("zlib-sync");
require("utf-8-validate");
require("bufferutil");
require("dns-cache")(60000);

const c = {
  reset:  "\x1b[0m",
  bright: "\x1b[1m",
  purple: "\x1b[35m",
  pink:   "\x1b[95m",
  white:  "\x1b[97m",
  gray:   "\x1b[90m",
};

const banner = `
${c.pink}${c.bright}  ██████╗  █████╗ ████████╗██╗ ██████╗ 
  ██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗
  ██████╔╝███████║   ██║   ██║██║   ██║
  ██╔══██╗██╔══██║   ██║   ██║██║   ██║
  ██║  ██║██║  ██║   ██║   ██║╚██████╔╝
  ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝${c.reset}
${c.purple}${c.bright}  ─────────────────────────────────────${c.reset}`;

let shardConfig   = {};
let ClusterClient = null;
try {
  const sharding = require("discord-hybrid-sharding");
  const info     = sharding.getInfo();
  if (info?.SHARD_LIST) {
    shardConfig   = { shards: info.SHARD_LIST, shardCount: info.TOTAL_SHARDS };
    ClusterClient = sharding.ClusterClient;
  }
} catch {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
  allowedMentions: {
    repliedUser: false,
    parse: ["users", "roles"],
  },
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager:            50,
    PresenceManager:            0,
    VoiceStateManager:          0,
    ReactionManager:            0,
    GuildStickerManager:        0,
    GuildScheduledEventManager: 0,
    AutoModerationRuleManager:  0,
    ApplicationCommandManager:  0,
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: { interval: 600, lifetime: 900 },
    users: {
      interval: 7200,
      filter: () => (user) => user.bot && user.id !== client.user?.id,
    },
  },
  rest: {
    retries: 3,
    timeout: 8_000,
    offset:  0,
  },
  ...shardConfig,
});

if (ClusterClient) client.cluster = new ClusterClient(client);

client.commands = new Collection();
client.cools    = new Collection();

const config   = require("./config.json");
const mongoURL = process.env.MONGODB_URL || config.MONGO;
client.db      = new Database(mongoURL);
client.db.connect();

const lmdb = open({
  path:        path.join(__dirname, "database", "lmdb"),
  compression: true,
  mapSize:     1024 * 1024 * 1024,
});

client.lmdb              = lmdb;
client.lmdbGet           = (key)        => lmdb.get(key);
client.lmdbSet           = (key, value) => lmdb.put(key, value);
client.lmdbDel           = (key)        => lmdb.remove(key);
client.isWhitelisted     = (guildId, userId) => {
  const whitelist = lmdb.get(`whitelist_${guildId}`) || [];
  return whitelist.includes(userId);
};
client.isAntinukeEnabled = (guildId) =>
  lmdb.get(`antinuke_${guildId}`) === "enabled";

client.config = config;
client.emoji  = require("./emojis.json");

let cmdCount = 0;
const basePath = path.join(__dirname, "commands");
for (const dir of readdirSync(basePath)) {
  const files = readdirSync(path.join(basePath, dir)).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const cmd = require(path.join(basePath, dir, file));
    if (cmd?.name) { client.commands.set(cmd.name, cmd); cmdCount++; }
  }
}

let evtCount = 0;
const eventsPath = path.join(__dirname, "events");
const loadEvents = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) loadEvents(fullPath);
    else if (entry.name.endsWith(".js")) {
      const eventFile = require(fullPath);
      if (typeof eventFile === "function") { eventFile(client); evtCount++; }
    }
  }
};
loadEvents(eventsPath);

client.once("ready", () => {
  console.log(banner);
  console.log(`${c.purple}${c.bright}  All Commands Loaded ${c.white}✅  ${c.gray}(${cmdCount} commands)${c.reset}`);
  console.log(`${c.purple}${c.bright}  All Events Loaded   ${c.white}✅  ${c.gray}(${evtCount} events)${c.reset}`);
  console.log(`${c.purple}${c.bright}  ─────────────────────────────────────${c.reset}`);
  console.log(`${c.pink}${c.bright}  ${client.user.tag}  ${c.gray}[ping: ${client.ws.ping}ms]${c.reset}`);
  console.log(`${c.purple}${c.bright}  ─────────────────────────────────────${c.reset}\n`);
});

const token = process.env.DISCORD_TOKEN || config.token;
client.login(token);

require("http")
  .createServer((_, res) => res.end("Alive"))
  .listen(5000, "0.0.0.0");

process.on("unhandledRejection", () => {});
process.on("uncaughtException",  () => {});

module.exports      = client;
module.exports.lmdb = lmdb;