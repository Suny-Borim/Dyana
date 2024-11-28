import { config } from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import neo4j from "neo4j-driver";

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

const neo4jDriver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD)
);

discordClient.login(process.env.DISCORD_TOKEN);

discordClient.on('ready', () => {
    console.log(`Estou ligada e preparada como: ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        const session = neo4jDriver.session();

        if (command === 'oi') {
            let greetingMessage;
            switch (message.author.locale) {
                case 'pt-BR':
                    greetingMessage = `Oizinhuuuu >-<\nEu tô aqui ${message.author.globalName}`;
                    break;
                case 'en-US':
                    greetingMessage = `Hallouuu >-<\nI'm here ${message.author.globalName}`;
                    break;
                default:
                    greetingMessage = `Hallouuuu, I'm here ${message.author.globalName}!`;
                    break;
            }
            message.channel.send(greetingMessage);
        }

        else if (command === "personagens") {
            const neo4jSession = neo4jDriver.session();
        
            try {
                const result = await neo4jSession.run(
                    "MATCH (p:Personagem) RETURN p.nome AS nome"
                );
        
                const personagens = result.records.map((record) => record.get("nome"));
        
                if (personagens.length === 0) {
                    return message.channel.send("Nenhum personagem encontrado no banco de dados.");
                }
        
                const listaPersonagens = personagens
                    .map((personagem, index) => `${index + 1}. ${personagem}`)
                    .join("\n");
        
                await message.channel.send(`Escolha um personagem digitando o número correspondente:\n${listaPersonagens}`);
        
                const collector = message.channel.createMessageCollector({
                    filter: (m) => !m.author.bot,
                    time: 60000,
                });
        
                collector.on("collect", async (msg) => {
                    const escolha = parseInt(msg.content, 10);
                    if (isNaN(escolha) || escolha < 1 || escolha > personagens.length) {
                        return msg.channel.send("Escolha inválida. Tente novamente digitando um número da lista.");
                    }
        
                    const personagemEscolhido = personagens[escolha - 1];
        
                    const detailsResult = await neo4jSession.run(
                        `MATCH (p:Personagem {nome: $nome})
                         OPTIONAL MATCH (p)-[:REGIAO]->(r:Regiao)
                         OPTIONAL MATCH (p)-[:PAIS]->(pa:Pais)
                         OPTIONAL MATCH (p)-[:NAMORADO_A]->(parceiro:Personagem)
                         RETURN 
                            p.nome AS nome, 
                            p.foto AS foto,
                            p.idade AS idade, 
                            p.sexualidade AS sexualidade, 
                            p.historia AS historia, 
                            p.comidaFavorita AS comida,
                            p.genero AS genero,
                            parceiro.nome AS parceiro,
                            pa.nome AS pais,
                            r.nome AS regiao`,
                        { nome: personagemEscolhido }
                    );
        
                    if (detailsResult.records.length === 0) {
                        return msg.channel.send(`Nenhuma informação encontrada para o personagem "${personagemEscolhido}".`);
                    }
        
                    const personagem = detailsResult.records[0];
                    const nome = personagem.get("nome") || "Desconhecido";
                    const idade = personagem.get("idade") || "Desconhecida";
                    const sexualidade = personagem.get("sexualidade") || "Desconhecida";
                    const historia = personagem.get("historia") || "Sem história cadastrada";
                    const comida = personagem.get("comida") || "Desconhecida";
                    const genero = personagem.get("genero") || "Desconhecido";
                    const parceiro = personagem.get("parceiro") || "Sem parceiro romântico";
                    const pais = personagem.get("pais") || "Desconhecido";
                    const regiao = personagem.get("regiao") || "Desconhecida";
                    const foto = personagem.get("foto") || null;
        
                    await msg.channel.send(`**Informações Gerais de ${nome}:**
        - Nome: ${nome}
        - Idade: ${idade}
        - Par Romântico: ${parceiro}
        - Sexualidade: ${sexualidade}
        - Gênero: ${genero}
        - País de Origem: ${pais}
        - Região: ${regiao}
        - Comida Favorita: ${comida}
        - História: ${historia}`);
        
                    const eventosResult = await neo4jSession.run(
                        `MATCH (p:Personagem {nome: $nome})-[:PARTICIPOU_DE]->(e:Evento)
                         RETURN e.nome AS evento, e.descricao AS descricao`,
                        { nome: personagemEscolhido }
                    );
        
                    const eventos = eventosResult.records.map((record) => ({
                        nome: record.get("evento"),
                        descricao: record.get("descricao"),
                    }));
        
                    if (eventos.length === 0) {
                        await msg.channel.send("Este personagem não está associado a nenhum evento.");
                        collector.stop();
                        return;
                    }
        
                    await msg.channel.send(`Eventos envolvendo ${nome}:`);
                    eventos.forEach((evento, index) => {
                        msg.channel.send(`${index + 1}. ${evento.nome}\n${evento.descricao}`);
                    });
        
                    collector.stop();
                });
        
                collector.on("end", () => {
                    neo4jSession.close();
                });
            } catch (error) {
                console.error("Erro ao buscar personagens:", error);
                message.channel.send("Ocorreu um erro ao buscar os personagens.");
            }
        } else if (command === "mundo") {
            try {
                const neo4jSession = neo4jDriver.session();
        
                const collector = message.channel.createMessageCollector({
                    filter: (m) => !m.author.bot,
                    time: 60000,
                });
        
                collector.on("collect", async (msg) => {
        
                    const mundoResult = await neo4jSession.run(
                        "MATCH (m:Mundo) RETURN m.nome AS nome, m.descricao AS descricao"
                    );
        
                    if (mundoResult.records.length === 0) {
                        return msg.channel.send("Nenhuma informação sobre o mundo encontrada.");
                    }
        
                    const mundo = mundoResult.records[0];
                    const nomeMundo = mundo.get("nome") || "Desconhecido";
                    const descricaoMundo = mundo.get("descricao") || "Sem descrição disponível";
        
                    await msg.channel.send(`**História de ${nomeMundo}:**\n${descricaoMundo}`);
        
                    collector.stop();
                });
        
                collector.on("end", () => {
                    neo4jSession.close();
                });
        
            } catch (error) {
                console.error("Erro ao buscar informações:", error);
                message.channel.send("Ocorreu um erro ao buscar as informações.");
            }
        }        
        }
        
    }
);