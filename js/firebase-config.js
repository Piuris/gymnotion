/* Configuração do Firebase.
 *
 * Preencha os dois campos com os dados do SEU projeto e recarregue o app.
 * Enquanto estiverem vazios, o backup na nuvem fica desligado e o app funciona
 * exatamente como antes, só com o backup em arquivo.
 *
 * Onde achar:
 *   console.firebase.google.com → seu projeto → engrenagem (Configurações do
 *   projeto) → role até "Seus apps" → app da Web → Configuração do SDK.
 *
 * Sobre a apiKey ser pública: é assim mesmo. A chave da Web do Firebase serve
 * para identificar o projeto, não para autorizar acesso. Quem protege os dados
 * são as regras em firestore.rules, que só deixam cada conta ler e escrever o
 * próprio documento. Pode versionar este arquivo sem medo.
 */
const FIREBASE = {
  apiKey: '',
  projectId: '',
};
