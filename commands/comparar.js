import { sendLongMessage } from '../utils.js'; 

const compararCommand = async (message, neo4jDriver) => {
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

        await message.channel.send(
            `Escolha dois personagens para comparar, digitando os números correspondentes separados por espaço:\n${listaPersonagens}`
        );

        const collector = message.channel.createMessageCollector({
            filter: (m) => !m.author.bot,
            time: 60000,
        });

        collector.on("collect", async (msg) => {
            const escolhas = msg.content.split(" ").map(Number);

            if (
                escolhas.length !== 2 ||
                escolhas.some((e) => isNaN(e) || e < 1 || e > personagens.length)
            ) {
                return msg.channel.send(
                    "Escolha inválida. Certifique-se de digitar dois números válidos separados por espaço."
                );
            }

            const personagem1 = personagens[escolhas[0] - 1];
            const personagem2 = personagens[escolhas[1] - 1];

            const comparisonQuery = `
                MATCH (p1:Personagem {nome: $personagem1}), (p2:Personagem {nome: $personagem2})
                RETURN 
                    p1.nome AS nome1, p1.idade AS idade1, p1.genero AS genero1, p1.altura AS altura1, p1.\`comida favorita\` AS comida1,
                    p2.nome AS nome2, p2.idade AS idade2, p2.genero AS genero2, p2.altura AS altura2, p2.\`comida favorita\` AS comida2
`;

            const comparisonResult = await session.run(comparisonQuery, {
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
                let valor1 = record.get(`${atributo}1`);
                let valor2 = record.get(`${atributo}2`);

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
                    diferencas.push(
                        `- ${atributo}: ${personagem1} (${valor1 || "não informado"}), ${personagem2} (${valor2 || "não informado"})`
                    );
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

            await sendLongMessage(message.channel,(resposta));

            collector.stop();
        });

        collector.on("end", () => {
            session.close();
        });
    } catch (error) {
        console.error("Erro ao comparar personagens:", error);
        message.channel.send("Ocorreu um erro ao comparar os personagens.");
    }
};

export default compararCommand;
