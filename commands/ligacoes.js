import { sendLongMessage } from '../utils.js';

const ligacoesCommand = async (message, neo4jDriver) => {
    const session = neo4jDriver.session();

    try {
        const result = await session.run(`
            MATCH ()-[r]->()
            RETURN DISTINCT type(r) AS relationship
        `);

        const ligacoes = result.records.map((record) => record.get("relationship"));

        if (ligacoes.length === 0) {
            return message.channel.send("Não há relacionamentos no banco.");
        }

        const listaLigacoes = ligacoes
            .map((ligacao, index) => `${index + 1}. ${ligacao}`)
            .join("\n");

        await message.channel.send(`Escolha um tipo de ligação digitando o número correspondente:\n${listaLigacoes}`);

        const collector = message.channel.createMessageCollector({
            filter: (m) => !m.author.bot,
            time: 15000
        });

        collector.on("collect", async (msg) => {
            const escolha = parseInt(msg.content, 10);
            if (isNaN(escolha) || escolha < 1 || escolha > ligacoes.length) {
                return msg.channel.send("Escolha inválida. Tente novamente digitando um número da lista.");
            }

            const ligacaoEscolhida = ligacoes[escolha - 1];

            const ligacaoResult = await session.run(`
                MATCH (a)-[r:${ligacaoEscolhida}]->(b)
                RETURN a, type(r) AS relationship, b
            `);

            if (ligacaoResult.records.length === 0) {
                return msg.channel.send(`Não há ligações do tipo ${ligacaoEscolhida} no banco.`);
            }

            let ligacoesResponse = `Ligações de tipo ${ligacaoEscolhida}:\n`;
            ligacaoResult.records.forEach((record, index) => {
                const startNode = record.get('a').properties.descricao || record.get('a').properties.nome || `Node ${record.get('a').identity}`;
                const endNode = record.get('b').properties.descricao || record.get('b').properties.nome || `Node ${record.get('b').identity}`;

                const startNodeDescription = record.get('a').properties.descricao ? `Descrição: ${record.get('a').properties.descricao}` : '';
                const startNodeName = record.get('a').properties.nome ? `Nome: ${record.get('a').properties.nome}` : '';

                const endNodeDescription = record.get('b').properties.descricao ? `Descrição: ${record.get('b').properties.descricao}` : '';
                const endNodeName = record.get('b').properties.nome ? `Nome: ${record.get('b').properties.nome}` : '';

                ligacoesResponse += `${index + 1}. ${startNodeDescription} ${startNodeName} -> ${record.get('relationship')} -> ${endNodeDescription} ${endNodeName}\n`;
            });

            await sendLongMessage(msg.channel, ligacoesResponse);
            collector.stop();
        });

        collector.on("end", () => {
            session.close();
        });

    } catch (error) {
        console.error("Erro ao buscar ligações:", error);
        message.channel.send("Ocorreu um erro ao buscar as ligações.");
    }
};

export default ligacoesCommand;
