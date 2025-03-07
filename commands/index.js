import personagensCommand from "./personagens.js";
import mundoCommand from "./mundo.js";
import compararCommand from "./comparar.js";
import ligacoesCommand from "./ligacoes.js";

const commands = {
    personagens: personagensCommand,
    mundo: mundoCommand,
    comparar: compararCommand,
    ligacoes: ligacoesCommand
};

export default commands;
