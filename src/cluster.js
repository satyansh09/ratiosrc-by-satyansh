const { ClusterManager } = require("discord-hybrid-sharding");
const path = require("path");

const manager = new ClusterManager(path.join(__dirname, "app.js"), {
  totalShards: "auto",
  shardsPerClusters: 2,
  mode: "process",
  token: process.env.DISCORD_TOKEN || require("./config.json").token,
});

manager.on("clusterCreate", (cluster) => {
  console.log(`[Cluster] Launched Cluster #${cluster.id}`);
});

manager.spawn({ timeout: -1 });
