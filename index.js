import { config } from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";  

config();

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const prefix = '!Dyana';
const abraçoGif = 'https://media.giphy.com/media/GMFUrC8E8aWoo/giphy.gif?cid=790b761154ltmq1m5ybw4ntw1yr2uo1qny08zbaa2whsuov6&ep=v1_gifs_search&rid=giphy.gif&ct=g';
const despedidaGif = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGt5ZXBlcm96aGIxNHNjZzMzYXJnNml4aGMxem5qYW5xZGtlZTZwbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/0218ft4yXkI5O0pNn6/giphy.gif';

discordClient.login(process.env.DISCORD_TOKEN);

discordClient.on('ready', () => {
    console.log(`Estou ligada e preparada como: ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', (message) => {

    if (message.author.bot) return;

    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/); 
        const command = args.shift().toLowerCase(); 

        if (command === 'oi') {
            let greetingMessage;

            switch (message.author.locale) {
                case 'pt-BR':
                    greetingMessage = `Oizinhuuuu >-<\nEu tô aqui ${message.author.username}`;
                    break;
                case 'en-US':
                    greetingMessage = `Hallouuu >-<\nI'm here ${message.author.username}`;
                    break;
                default:
                    greetingMessage = `Hallouuuu, I'm here ${message.author.username}!`; 
                    break;
            }

            message.channel.send(greetingMessage);
        }

        else if (command === ':(') {
            const voiceChannel = message.member?.voice.channel;
            if (!voiceChannel) {
                return message.channel.send("Você precisa estar em um canal de voz para eu poder me juntar.");
            }

            joinVoiceChannel({
                channelId: voiceChannel.id, 
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            message.channel.send(`Entrando no canal de voz: ${voiceChannel.name}`);

            message.channel.send({
                content: "Eu estou aqui com você 🤗",
                files: [abraçoGif]  
            });
        }

        else if (command === ':)') {
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                connection.disconnect();
                message.channel.send("Que bom que ficou melhor, estou saindo");

                message.channel.send({
                    content: "Estou saindo, obrigada por passar seu tempo comigo",
                    files: [despedidaGif]
                });
            } else {
                message.channel.send("Não estou em nenhum chat de voz");
            }
        }

        else if (command === 'help') {
            message.channel.send('Comandos disponíveis: \n!oi - Responde com uma mensagem de saudação \n!help - Exibe os comandos disponíveis');
        }

        else {
            message.channel.send('No compreendo amiguelo');
        }
    }
});
