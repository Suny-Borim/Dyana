import { sendLongMessage } from '../utils.js'; 

const mundoCommand = async (message, neo4jDriver) => {
    const session = neo4jDriver.session();

    try {
        const mundoResult = await session.run(
            "MATCH (m:Mundo) RETURN m.nome AS nome, m.descricao AS descricao"
        );

        if (mundoResult.records.length === 0) {
            return message.channel.send("Nenhum mundo encontrado no banco de dados.");
        }

        const mundo = mundoResult.records[0];
        const nomeMundo = mundo.get("nome") || "Desconhecido";
        const descricaoMundo = mundo.get("descricao") || "Sem descrição disponível";

        const responseMessage = `**História de ${nomeMundo}:**\n${descricaoMundo}`;

        await sendLongMessage(message.channel, responseMessage);

    } catch (error) {
        console.error("Erro ao buscar informações do mundo:", error);
        message.channel.send("Ocorreu um erro ao buscar as informações.");
    } finally {
        session.close();
    }
};

export default mundoCommand;
