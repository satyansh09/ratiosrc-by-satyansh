const { scheduleGiveaway, endGiveaway } = require("../utils/giveawayUtils");

module.exports = (client) => {
    client.on("clientReady", async () => {
        console.log("[🎉] Giveaway Scheduler: Starting up...");
        
        setTimeout(() => {
            restoreGiveaways(client);
        }, 5000);

        setInterval(() => {
            checkExpiredGiveaways(client);
        }, 30000);
    });
};

async function restoreGiveaways(client) {
    try {
        let totalRestored = 0;
        
        for (const guild of client.guilds.cache.values()) {
            const guildGiveaways = await client.db.get(`giveaways_${guild.id}`) || [];
            
            for (const messageId of guildGiveaways) {
                const giveaway = await client.db.get(`giveaway_${messageId}`);
                
                if (giveaway && giveaway.status && !giveaway.ended) {
                    const timeLeft = giveaway.endTime - Date.now();
                    
                    if (timeLeft <= 0) {
                        await endGiveaway(client, messageId);
                    } else {
                        scheduleGiveaway(client, giveaway);
                        totalRestored++;
                    }
                }
            }
        }
        
        console.log(`[🎉] Giveaway Scheduler: Restored ${totalRestored} active giveaways`);
    } catch (error) {
        console.error("[🎉] Giveaway Scheduler: Error restoring giveaways:", error);
    }
}

async function checkExpiredGiveaways(client) {
    try {
        for (const guild of client.guilds.cache.values()) {
            const guildGiveaways = await client.db.get(`giveaways_${guild.id}`) || [];
            
            for (const messageId of guildGiveaways) {
                const giveaway = await client.db.get(`giveaway_${messageId}`);
                
                if (giveaway && giveaway.status && !giveaway.ended) {
                    if (Date.now() >= giveaway.endTime) {
                        await endGiveaway(client, messageId);
                    }
                }
            }
        }
    } catch (error) {
        console.error("[🎉] Giveaway Scheduler: Error checking expired giveaways:", error);
    }
}