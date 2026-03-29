const { EmbedBuilder, PermissionFlagsBits, REST, Routes } = require("discord.js");
const https = require("https");
const http = require("http");

module.exports = {
    name: "setserveravatar",
    aliases: ["ssa", "serveravatar", "setguildavatar"],
    description: "Set the bot's avatar for this server only (Premium)",
    category: "premium",
    cooldown: 5,
    premium: true,

    async run(client, message, args) {
        if (!message.guild) {
            return message.reply("This command can only be used in a server.");
        }

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setDescription(`${client.emoji.cross || "❌"} You need **Administrator** permission to use this command.`)
                ]
            });
        }

        const attachment = message.attachments.first();
        const imageUrl = args[0] || (attachment ? attachment.url : null);

        if (!imageUrl) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#26272F")
                        .setTitle("Set Server Avatar")
                        .setDescription("Set a custom avatar for the bot in this server.")
                        .addFields(
                            { name: "Usage", value: `\`${client.config.prefix}setserveravatar <image_url>\`\nOr attach an image to the message.`, inline: false },
                            { name: "Aliases", value: "`ssa`, `serveravatar`, `setguildavatar`", inline: false },
                            { name: "Reset", value: `Use \`${client.config.prefix}resetserveravatar\` to reset.`, inline: false }
                        )
                ]
            });
        }

        if (!isValidUrl(imageUrl)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setDescription(`${client.emoji.cross || "❌"} Please provide a valid image URL.`)
                ]
            });
        }

        const statusMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#26272F")
                    .setDescription("⏳ Updating server avatar...")
            ]
        });

        try {
            const avatarData = await downloadImage(imageUrl);

            if (!avatarData) {
                return statusMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setDescription(`${client.emoji.cross || "❌"} Failed to download image. Please check the URL.`)
                    ]
                });
            }

            const rest = new REST({ version: "10" }).setToken(client.token);
            
            await rest.patch(Routes.guildMember(message.guild.id, "@me"), {
                body: { avatar: avatarData }
            });

            await statusMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#00FF00")
                        .setDescription(`${client.emoji.tick || "✅"} Server avatar updated successfully!`)
                        .setThumbnail(imageUrl)
                ]
            });

        } catch (error) {
            console.error("Server Avatar Error:", error.message);
            await statusMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setDescription(`${client.emoji.cross || "❌"} Failed to update avatar: ${error.message}`)
                ]
            });
        }
    }
};

function isValidUrl(str) {
    return str.startsWith("http://") || str.startsWith("https://");
}

function downloadImage(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith("https") ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                downloadImage(response.headers.location).then(resolve);
                return;
            }
            
            if (response.statusCode !== 200) {
                resolve(null);
                return;
            }

            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const ext = url.split(".").pop().split("?")[0].toLowerCase();
                    const mimeTypes = {
                        png: "image/png",
                        jpg: "image/jpeg",
                        jpeg: "image/jpeg",
                        gif: "image/gif",
                        webp: "image/webp"
                    };
                    const mimeType = mimeTypes[ext] || "image/png";
                    resolve(`data:${mimeType};base64,${buffer.toString("base64")}`);
                } catch {
                    resolve(null);
                }
            });
        }).on("error", () => resolve(null));
    });
}
