import { config } from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import neo4j from "neo4j-driver";
import fs from 'fs';

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

     if (command === "personagens") {
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
        
                    const mundo = mundoResult.records[0];
                    const nomeMundo = mundo.get("nome") || "Desconhecido";
                    const descricaoMundo = mundo.get("descricao") || "Sem descrição disponível";
                    const mensagemCompleta = `**História de ${nomeMundo}:**\n${descricaoMundo}`;
                    
                    await global.sendLongMessage(msg.channel, mensagemCompleta);
        
                    collector.stop();
                });
        
                collector.on("end", () => {
                    neo4jSession.close();
                });
        
            } catch (error) {
                console.error("Erro ao buscar informações:", error);
                message.channel.send("Ocorreu um erro ao buscar as informações.");
            }
        } else if (command === "comparar") {
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
        
                await message.channel.send(`Escolha dois personagens para comparar, digitando os números correspondentes separados por espaço:\n${listaPersonagens}`);
        
                const collector = message.channel.createMessageCollector({
                    filter: (m) => !m.author.bot,
                    time: 60000,
                });
        
                collector.on("collect", async (msg) => {
                    const escolhas = msg.content.split(" ").map(Number);
        
                    if (escolhas.length !== 2 || escolhas.some((e) => isNaN(e) || e < 1 || e > personagens.length)) {
                        return msg.channel.send("Escolha inválida. Certifique-se de digitar dois números válidos separados por espaço.");
                    }
        
                    const personagem1 = personagens[escolhas[0] - 1];
                    const personagem2 = personagens[escolhas[1] - 1];
        
                    const comparisonQuery = `
                        MATCH (p1:Personagem {nome: $personagem1}), (p2:Personagem {nome: $personagem2})
                        RETURN 
                            p1.nome AS nome1, p1.idade AS idade1, p1.genero AS genero1, p1.altura AS altura1, p1.\`comida favorita\` AS comida1,
                            p2.nome AS nome2, p2.idade AS idade2, p2.genero AS genero2, p2.altura AS altura2, p2.\`comida favorita\` AS comida2
                    `;
        
                    const comparisonResult = await neo4jSession.run(comparisonQuery, {
                        personagem1,
                        personagem2,
                    });
        
                    if (comparisonResult.records.length === 0) {
                        return msg.channel.send("Não foi possível encontrar os personagens para comparação.");
                    }
        
                    const record = comparisonResult.records[0];
        
                    const atributos = ["idade", "genero", "altura", "comida"];
                    const similaridades = [];
                    const diferencas = [];
        
                    atributos.forEach((atributo) => {
                        let valor1, valor2;
        
                        if (atributo === "comida") {
                            valor1 = record.get("comida1");
                            valor2 = record.get("comida2");
                        } else {
                            valor1 = record.get(`${atributo}1`);
                            valor2 = record.get(`${atributo}2`);
                        }
        
                        if (valor1 === valor2) {
                            similaridades.push(`- ${atributo}: ${valor1}`);
                        } else {
                            diferencas.push(`- ${atributo}: ${personagem1} (${valor1 || "não informado"}), ${personagem2} (${valor2 || "não informado"})`);
                        }
                    });
        
                    let resposta = `**Comparação entre ${personagem1} e ${personagem2}:**\n\n`;
        
                    if (similaridades.length > 0) {
                        resposta += `**Similaridades:**\n${similaridades.join("\n")}\n\n`;
                    } else {
                        resposta += "**Não há similaridades entre os personagens.**\n\n";
                    }
        
                    if (diferencas.length > 0) {
                        resposta += `**Diferenças:**\n${diferencas.join("\n")}`;
                    } else {
                        resposta += "**Não há diferenças entre os personagens.**";
                    }
        
                    await msg.channel.send(resposta);
        
                    collector.stop();
                });
        
                collector.on("end", () => {
                    neo4jSession.close();
                });
            } catch (error) {
                console.error("Erro ao comparar personagens:", error);
                message.channel.send("Ocorreu um erro ao comparar os personagens.");
            }
        }
        
         else if (command === "adm" && args[0] === "create") {
            const senhaCorreta = process.env.SENHA_ADM;  
            const inputSenha = args[1];
        
            if (!inputSenha || inputSenha.trim() !== senhaCorreta.trim()) {
                return message.channel.send("Senha incorreta! A operação foi cancelada.");
            }
        
            message.channel.send("Senha correta! Iniciando o processo de criação...");
        
            const perguntas = [
                "Qual o nome do personagem?",
                "Qual a idade do personagem?",
                "Qual a sexualidade do personagem?",
                "Conte a história do personagem.",
                "Quais as habilidades do personagem?",
                "Qual a raça do personagem?",
                "Qual a comida favorita do personagem?",
                "Qual o gênero do personagem?",
                "Quais são os pronomes do personagem? digite por exemplo: "+"Ela/Dela",
                "Envie a URL da foto do personagem.",
                "Envie a URL do gif do personagem.",
                "Qual o nome do evento? (Opcional)",
                "Qual a descrição do evento? (Opcional)"
            ];
            
            const validadores = {
                "Qual o nome do personagem?": (resposta) => resposta.length > 0,
                "Qual a idade do personagem?": (resposta) => !isNaN(resposta) && Number(resposta) > 0,
                "Qual a sexualidade do personagem?": (resposta) => resposta.length > 0,
                "Conte a história do personagem.": (resposta) => resposta.length > 10,
                "Quais as habilidades do personagem?": (resposta) => resposta.length > 0,
                "Qual a raça do personagem?": (resposta) => resposta.length > 0,
                "Qual a comida favorita do personagem?": (resposta) => resposta.length > 0,
                "Qual o gênero do personagem?": (resposta) => resposta.length > 0 && ["masculino", "feminino", "neutro"].includes(resposta.toLowerCase()),
                "Quais são os pronomes do personagem? Digite por exemplo: 'Ela/Dela'": (resposta) =>{
                    const pronomesAceitos = ["Ela/Dela", "Ele/Dele", "Elu/Delu"];
                    const pronomes = resposta.split(",").map(pronomes => pronomes.trim());
                    return pronomes.every(pronome => pronomesAceitos.includes(pronome));
                },
                "Envie a URL da foto do personagem.": (resposta) => /^(http|https):\/\/[^ "]+$/.test(resposta),
                "Envie a URL do gif do personagem.": (resposta) => /^(http|https):\/\/[^ "]+$/.test(resposta),
                "Qual o nome do evento? (Opcional)": () => true,
                "Qual a descrição do evento? (Opcional)": () => true,
            };

            let respostas = {};
            let coletando = true;  
        
            const coletarDados = async (index = 0) => {
                if (!coletando) {
                    return message.channel.send("O processo foi cancelado.");
                }
                if (index >= perguntas.length) {

                for (let pergunta in respostas) {
                    const resposta = respostas[pergunta];
                    if (!validadores[pergunta](resposta)) {
                        if (pergunta.includes("(Opcional)") && !resposta) continue;
                        return message.channel.send(`A resposta para "${pergunta}" é inválida. Por favor, revise. Processo cancelado.`);
                    }
                }
                const session = neo4jDriver.session();
                try {
                    const { 
                        "Qual o nome do personagem?": nome, 
                        "Qual a idade do personagem?": idade, 
                        "Qual a sexualidade do personagem?": sexualidade, 
                        "Conte a história do personagem.": historia, 
                        "Quais as habilidades do personagem?": poderes, 
                        "Qual a raça do personagem?": raca, 
                        "Qual a comida favorita do personagem?": comidaFavorita, 
                        "Qual o gênero do personagem?": genero, 
                        "Quais são os pronomes do personagem? Digite por exemplo: 'Ela/Dela'": pronomes, 
                        "Envie a URL da foto do personagem.": foto, 
                        "Envie a URL do gif do personagem.": gif, 
                        "Qual o nome do evento? (Opcional)": eventoNome, 
                        "Qual a descrição do evento? (Opcional)": eventoDescricao 
                    } = respostas;
                    const existingGenero = await session.run(
                        `MATCH (g:Genero {nome: $genero}) RETURN g`,
                        { genero: genero.charAt(0).toUpperCase() + genero.slice(1).toLowerCase() }
                    );
                    
                    if (existingGenero.records.length === 0) {
                        return message.channel.send(`O gênero "${genero}" não é válido ou não está cadastrado no banco.`);
                    }
    
                    const existingPronomes = await session.run(
                        `MATCH (p:Pronomes {nome: $pronomes}) RETURN p`,
                        { pronomes: pronomes }
                    );
    
                    if (existingPronomes.records.length === 0) {
                        return message.channel.send(`Os pronomes "${pronomes}" não são válidos ou não estão cadastrados no banco.`);
                    }
    
                    const existingPersonagem = await session.run(
                        `MATCH (p:Personagem {nome: $nome}) RETURN p`,
                        { nome }
                    );
    
                    if (existingPersonagem.records.length > 0) {
                        return message.channel.send(`Já existe um personagem com o nome "${nome}". O processo foi cancelado.`);
                    }
    
                        await session.run(
                            `CREATE (:Personagem {
                                nome: $nome,
                                idade: $idade,
                                sexualidade: $sexualidade,
                                historia: $historia,
                                poderes: $poderes,
                                raca: $raca,
                                comidaFavorita: $comidaFavorita,
                                genero: $genero,
                                pronomes: $pronomes,
                                foto: $foto,
                                gif: $gif
                            })`,
                            respostas
                        );
        
                        message.channel.send(`Personagem ${nome} criado com sucesso!`);
        
                        if (eventoNome && eventoDescricao) {
                            await session.run(
                                `CREATE (:Evento {
                                    nome: $eventoNome,
                                    descricao: $eventoDescricao
                                })`,
                                { eventoNome, eventoDescricao }
                            );
        
                            message.channel.send(`Evento ${eventoNome} criado com sucesso!`);
                        }
        
                    } catch (error) {
                        console.error("Erro ao criar personagem:", error);
                        message.channel.send("Ocorreu um erro ao tentar criar o personagem.");
                    } finally {
                        session.close();
                    }
                    return;
                }
        
                const pergunta = perguntas[index];
                message.channel.send(pergunta);
        
                const collector = message.channel.createMessageCollector({
                    filter: (m) => m.author.id === message.author.id, 
                    time: 60000,  
                });
        
                collector.on("collect", async (msg) => {
                    if (msg.content.toLowerCase() === "cancelar") {
                        coletando = false;  
                        collector.stop();  
                        return message.channel.send("Processo cancelado.");
                    }
        
                    respostas[pergunta] = msg.content;
        
                    collector.stop();
                    coletarDados(index + 1);
                });
        
                collector.on("end", (collected, reason) => {
                    if (reason === 'time' && coletando) {
                        message.channel.send("O tempo para responder expirou. A operação foi cancelada.");
                    }
                });
            };
            coletarDados();
        }
        else if (command === "adm" && args[0] === "delete") {
            const senhaCorreta = process.env.SENHA_ADM;
            const inputSenha = args[1];
        
            if (inputSenha !== senhaCorreta) {
                return message.channel.send("Senha incorreta! A operação foi cancelada.");
            }
        
            const session = neo4jDriver.session();
            try {
                const result = await session.run(
                    "MATCH (p:Personagem) RETURN p.nome AS nome"
                );
        
                const personagens = result.records.map((record) => record.get("nome"));
        
                if (personagens.length === 0) {
                    return message.channel.send("Nenhum personagem encontrado no banco de dados.");
                }
        
                const listaPersonagens = personagens
                    .map((personagem, index) => `${index + 1}. ${personagem}`)
                    .join("\n");
        
                await message.channel.send(`Escolha um personagem para deletar digitando o número correspondente, ou digite **cancelar** para cancelar a operação:\n${listaPersonagens}`);
        
                const collector = message.channel.createMessageCollector({
                    filter: (m) => m.author.id === message.author.id,
                    time: 60000,
                });
        
                collector.on("collect", async (msg) => {
                    const escolha = msg.content.toLowerCase();
        
                    if (escolha === "cancelar") {
                        message.channel.send("Operação de deleção cancelada.");
                        collector.stop();
                        return;
                    }
        
                    const escolhaNumero = parseInt(escolha, 10);
                    if (isNaN(escolhaNumero) || escolhaNumero < 1 || escolhaNumero > personagens.length) {
                        return msg.channel.send("Escolha inválida. Tente novamente digitando um número da lista ou **cancelar**.");
                    }
        
                    const personagemEscolhido = personagens[escolhaNumero - 1];
        
                    await message.channel.send(`Tem certeza que deseja deletar o personagem **${personagemEscolhido}**? Responda com "sim", "não" ou "cancelar".`);
        
                    const confirmationCollector = message.channel.createMessageCollector({
                        filter: (m) => m.author.id === message.author.id,
                        time: 30000,
                    });
        
                    confirmationCollector.on("collect", async (confirmMsg) => {
                        const confirmacao = confirmMsg.content.toLowerCase();
        
                        if (confirmacao === "cancelar" || confirmacao === "não") {
                            message.channel.send("Operação de deleção cancelada.");
                            confirmationCollector.stop();
                            collector.stop();
                            return;
                        }
        
                        if (confirmacao === "sim") {
                            try {
                                await session.run(
                                    `MATCH (p:Personagem {nome: $nome}) DELETE p`,
                                    { nome: personagemEscolhido }
                                );
                                message.channel.send(`Personagem **${personagemEscolhido}** deletado com sucesso!`);
                            } catch (error) {
                                console.error("Erro ao deletar personagem:", error);
                                message.channel.send("Ocorreu um erro ao tentar deletar o personagem.");
                            } finally {
                                confirmationCollector.stop();
                                collector.stop();
                                session.close();
                            }
                        } else {
                            message.channel.send("Resposta inválida. Operação cancelada.");
                            confirmationCollector.stop();
                            collector.stop();
                        }
                    });
        
                    confirmationCollector.on("end", (collected, reason) => {
                        if (reason === "time") {
                            message.channel.send("Tempo expirado. A operação foi cancelada.");
                        }
                    });
                });
        
                collector.on("end", (collected, reason) => {
                    if (reason === "time") {
                        message.channel.send("Tempo expirado. A operação foi cancelada.");
                    }
                });
        
            } catch (error) {
                console.error("Erro ao listar personagens:", error);
                message.channel.send("Ocorreu um erro ao tentar listar os personagens.");
            }
        }  else if (command === "ligações") {
            try {
                const result = await session.run(`
                  MATCH ()-[r]->()
                  RETURN DISTINCT type(r) AS relationship
                `);
          
                if (result.records.length === 0) {
                  message.reply("Não há relacionamentos no banco.");
                  return;
                }
          
                let response = 'Tipos de ligações:\n';
                result.records.forEach((record, index) => {
                  response += `${index + 1}. ${record.get('relationship')}\n`;
                });
          
                const sentMessage = await message.reply(`${message.author}, ${response}`);
          
                const filter = (response) => response.author.id === message.author.id;
                const collector = message.channel.createMessageCollector({ filter, time: 15000 });
          
                collector.on('collect', async (responseMessage) => {
                  const selectedNumber = parseInt(responseMessage.content);
          
                  if (isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > result.records.length) {
                    return message.reply("Por favor, escolha um número válido da lista.");
                  }
          
                  const selectedRelationship = result.records[selectedNumber - 1].get('relationship');
          
                  const relationshipResult = await session.run(`
                    MATCH (a)-[r:${selectedRelationship}]->(b)
                    RETURN a, type(r) AS relationship, b
                  `);
          
                  if (relationshipResult.records.length === 0) {
                    return message.reply(`Não há ligações do tipo ${selectedRelationship} no banco.`);
                  }
          
                  let linksResponse = `Ligações de tipo ${selectedRelationship}:\n`;
                  relationshipResult.records.forEach((record, index) => {
                    const startNode = record.get('a').properties.descricao || record.get('a').properties.nome || `Node ${record.get('a').identity}`;
                    const endNode = record.get('b').properties.descricao || record.get('b').properties.nome || `Node ${record.get('b').identity}`;
          
                    const startNodeDescription = record.get('a').properties.descricao ? `Descrição: ${record.get('a').properties.descricao}` : '';
                    const startNodeName = record.get('a').properties.nome ? `Nome: ${record.get('a').properties.nome}` : '';
          
                    const endNodeDescription = record.get('b').properties.descricao ? `Descrição: ${record.get('b').properties.descricao}` : '';
                    const endNodeName = record.get('b').properties.nome ? `Nome: ${record.get('b').properties.nome}` : '';
          
                    linksResponse += `${index + 1}. ${startNodeDescription} ${startNodeName} -> ${record.get('relationship')} -> ${endNodeDescription} ${endNodeName}\n`;
                  });
          
                  message.reply(`${message.author}, ${linksResponse}`);
                  collector.stop();
                });
              } catch (error) {
                console.error(error);
                message.reply("Ocorreu um erro ao buscar as ligações.");
              }
            }   else if (command === "help") {
                message.channel.send("[Comandos disponíveis (●'◡'●)]\n\n" +
                    "    [oi]: Testa o funcionamento do bot\n" +
                    "    [mundo]: Entrega todas as informações sobre o mundo de nyteris\n" +
                    "    [personagens]: Gera uma lista dos personagens cadastrados, podendo escolher um pela sua numeração\n" +
                    "    [ligações]: Gera uma lista com as ligações feitas para entender melhor quem faz o que e etc\n\n" +
                    "    [Comandos disponíveis somente para adms ╰(*°▽°*)╯]\n\n" +
                    "        [adm create 'senha']: Faz a criação de personagem pelo chat do discord\n" +
                    "        [adm delete 'senha']: Deleta a existência de um personagem no banco\n"
                );
            }  else if(command === "adm" && args[0] === "export") {

                const senhaCorreta = process.env.SENHA_ADM;
                const inputSenha = args[1];
            
                if (inputSenha !== senhaCorreta) {
                    return message.channel.send("Senha incorreta! A operação foi cancelada.");
                }
            
                const session = neo4jDriver.session();
                try {
                    const result = await session.run('MATCH (n) RETURN n LIMIT 100'); 
                    const nodes = result.records.map(record => record.get('n'));
                    fs.writeFileSync('Neterys.json', JSON.stringify(nodes, null, 2));
                    message.channel.send(`${message.author}, exportação realizada com sucesso! 🚀`);
                    return 'Dados exportados com sucesso!';
                } catch (error) {
                    console.error('Erro ao exportar dados:', error);
                    return 'Erro ao exportar dados.';
                } finally {
                    await session.close();
                }
            }
            global.sendLongMessage = async (channel, content) => {
                const limit = 2000; 
                if (content.length <= limit) {
                    await channel.send(content);
                } else {
                    for (let i = 0; i < content.length; i += limit) {
                        await channel.send(content.slice(i, i + limit));
                    }
                }
            };
        }
        
    }
);