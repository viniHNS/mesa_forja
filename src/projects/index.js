// Registro dos tipos de projeto. Para adicionar um tipo: crie src/projects/<id>/index.js
// seguindo o descritor da mesa e acrescente aqui. O primeiro da lista é o padrão.
import mesa from './mesa/index.js';
import carrinho from './carrinho/index.js';

export const PROJECTS = [mesa, carrinho];

export const getProject = (id) => PROJECTS.find((p) => p.id === id) ?? PROJECTS[0];
