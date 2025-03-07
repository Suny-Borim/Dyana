import { config } from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import neo4j from "neo4j-driver";
import commands from "./commands/index.js";

config();

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const prefix = "!Dyana";
const neo4jDriver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic("neo4j", process.env.NEO4J_PASSWORD)
);

discordClient.login(process.env.DISCORD_TOKEN);

discordClient.on("ready", () => {
    console.log(`Pronta para servir!`);
});

discordClient.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (commands[command]) {
            await commands[command](message, neo4jDriver);
        } else {
            message.channel.send("Comando não reconhecido.");
        }
    }
});
