import { sendLongMessage } from '../utils.js'; 

const personagensCommand = async (message, neo4jDriver) => {
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

        await message.channel.send(`Escolha um personagem digitando o número correspondente:\n${listaPersonagens}`);

        const collector = message.channel.createMessageCollector({
            filter: (m) => !m.author.bot,
            time: 60000
        });

        collector.on("collect", async (msg) => {
            const escolha = parseInt(msg.content, 10);
            if (isNaN(escolha) || escolha < 1 || escolha > personagens.length) {
                return msg.channel.send("Escolha inválida. Tente novamente digitando um número da lista.");
            }

            const personagemEscolhido = personagens[escolha - 1];

            const detailsResult = await session.run(
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

            await sendLongMessage(msg.channel,(`**Informações Gerais de ${nome}:**
- Nome: ${nome}
- Idade: ${idade}
- Par Romântico: ${parceiro}
- Sexualidade: ${sexualidade}
- Gênero: ${genero}
- País de Origem: ${pais}
- Região: ${regiao}
- Comida Favorita: ${comida}
- História: ${historia}`));

            collector.stop();
        });

        collector.on("end", () => {
            session.close();
        });

    } catch (error) {
        console.error("Erro ao buscar personagens:", error);
        message.channel.send("Ocorreu um erro ao buscar os personagens.");
    }
};

export default personagensCommand;
