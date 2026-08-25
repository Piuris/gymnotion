/* Configuração do Firebase.
 *
 * Só estes dois campos importam: o app fala com o Firebase pela API REST, sem
 * SDK. O trecho que o console do Firebase mostra ("import { initializeApp }
 * from 'firebase/app'") é do SDK modular e precisa de empacotador — colado num
 * <script> comum ele quebra o app. Os outros campos daquele trecho
 * (authDomain, storageBucket, messagingSenderId, appId, measurementId) só
 * servem ao SDK e ao Analytics, que não usamos.
 *
 * Enquanto estiverem vazios, o backup na nuvem fica desligado e o app funciona
 * normalmente, só com o backup em arquivo.
 *
 * Sobre a apiKey ser pública: é assim mesmo. A chave da Web identifica o
 * projeto, não autoriza acesso. Quem protege os dados são as regras em
 * firestore.rules, que só deixam cada conta ler e escrever o próprio
 * documento. Pode versionar este arquivo sem medo.
 */
const FIREBASE = {
  apiKey: 'AIzaSyBYh39NUVZThPypEcRyQ9SRBxMukImlhFE',
  projectId: 'gymnotion',
};
