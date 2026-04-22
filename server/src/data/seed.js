import 'dotenv/config';
import { initDatabase, dbHelpers, getDb } from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

const MCQ_QUESTIONS = [
  { technology: 'javascript', difficulty: 1, title: 'Quel est le résultat de typeof null ?', description: 'En JavaScript, quel type retourne `typeof null` ?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], correct_answer: 2, explanation: "C'est un bug historique de JavaScript : `typeof null` retourne `\"object\"` depuis la première version du langage.", points: 100 },
  { technology: 'javascript', difficulty: 1, title: 'Différence entre == et ===', description: 'Que retourne `"5" == 5` en JavaScript ?', options: ['false', 'true', 'undefined', 'TypeError'], correct_answer: 1, explanation: "`==` effectue une coercition de type. `\"5\"` est converti en `5` avant la comparaison, donc le résultat est `true`. Avec `===`, ce serait `false`.", points: 100 },
  { technology: 'javascript', difficulty: 2, title: 'Closure et boucle for', description: "Que va afficher ce code ?\n```js\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n```", options: ['0, 1, 2', '3, 3, 3', '0, 0, 0', 'undefined, undefined, undefined'], correct_answer: 1, explanation: "Avec `var`, `i` est partagé par toutes les closures. Quand les callbacks s'exécutent, la boucle est terminée et `i` vaut 3.", points: 150 },
  { technology: 'javascript', difficulty: 2, title: 'Promise.all vs Promise.race', description: 'Quelle méthode retourne la première Promise résolue ou rejetée ?', options: ['Promise.all', 'Promise.allSettled', 'Promise.race', 'Promise.any'], correct_answer: 2, explanation: '`Promise.race` retourne une Promise qui se résout ou se rejette dès que la première des Promises passées se résout ou se rejette.', points: 150 },
  { technology: 'javascript', difficulty: 3, title: 'Event Loop - Microtask vs Macrotask', description: "Dans quel ordre s'affichent les logs ?\n```js\nconsole.log(\"1\");\nsetTimeout(() => console.log(\"2\"), 0);\nPromise.resolve().then(() => console.log(\"3\"));\nconsole.log(\"4\");\n```", options: ['1, 2, 3, 4', '1, 4, 2, 3', '1, 4, 3, 2', '1, 3, 4, 2'], correct_answer: 2, explanation: "L'ordre est : synchrone (1, 4), puis microtasks/Promises (3), puis macrotasks/setTimeout (2).", points: 200 },
  { technology: 'php', difficulty: 1, title: 'Opérateur de comparaison PHP', description: 'Que retourne `var_dump(0 == "foo")` en PHP 7 ?', options: ['bool(true)', 'bool(false)', 'int(0)', 'NULL'], correct_answer: 0, explanation: 'En PHP 7 et antérieur, comparer un entier à une chaîne non numérique convertit la chaîne en 0.', points: 100 },
  { technology: 'php', difficulty: 2, title: 'Différence entre include et require', description: 'Quelle est la différence principale entre `include` et `require` en PHP ?', options: ['include est plus rapide que require', 'require génère une erreur fatale si le fichier est introuvable, include génère un warning', "include ne peut être utilisé qu'une fois, require peut être répété", "Il n'y a aucune différence"], correct_answer: 1, explanation: '`require` produit une erreur fatale (E_COMPILE_ERROR) et arrête le script si le fichier est introuvable.', points: 150 },
  { technology: 'cpp', difficulty: 1, title: 'Pointeurs et références', description: 'Quelle est la différence entre un pointeur et une référence en C++ ?', options: ['Un pointeur peut être null, une référence ne peut pas', 'Une référence peut être réassignée, un pointeur non', 'Les pointeurs sont plus rapides que les références', "Il n'y a aucune différence en pratique"], correct_answer: 0, explanation: 'Un pointeur peut être `nullptr` et peut être réassigné. Une référence doit être initialisée à la déclaration.', points: 100 },
  { technology: 'cpp', difficulty: 2, title: 'RAII et gestion mémoire', description: 'Que signifie RAII en C++ ?', options: ['Random Access Iterator Interface', 'Resource Acquisition Is Initialization', 'Runtime Array Index Inspection', 'Recursive Allocation and Initialization'], correct_answer: 1, explanation: "RAII (Resource Acquisition Is Initialization) est un idiome C++ où l'acquisition d'une ressource est liée à l'initialisation d'un objet.", points: 150 },
  { technology: 'csharp', difficulty: 1, title: 'Value types vs Reference types', description: 'Lequel de ces types est un value type en C# ?', options: ['string', 'class', 'struct', 'interface'], correct_answer: 2, explanation: 'En C#, `struct` est un value type (stocké sur la pile). `string`, `class` et `interface` sont des reference types.', points: 100 },
  { technology: 'csharp', difficulty: 2, title: 'async/await en C#', description: "Que retourne une méthode `async` qui ne retourne rien explicitement ?", options: ['void', 'Task', 'Task<void>', 'null'], correct_answer: 1, explanation: "Une méthode `async` sans valeur de retour doit retourner `Task` (et non `void`, sauf pour les event handlers).", points: 150 },
  { technology: 'mobile', difficulty: 1, title: 'React Native - useState', description: 'Comment mettre à jour correctement un état tableau dans React Native ?', options: ['state.push(newItem)', 'setState(state.push(newItem))', 'setState([...state, newItem])', 'setState(state + newItem)'], correct_answer: 2, explanation: "En React (et React Native), il ne faut jamais muter l'état directement. On crée un nouveau tableau avec le spread operator.", points: 100 },
];

const CODE_QUESTIONS = [
  {
    technology: 'javascript', difficulty: 1,
    title: 'Inverser une chaîne de caractères',
    description: '## Défi : Inverser une chaîne\n\nÉcrivez une fonction `reverseString(str)` qui prend une chaîne de caractères en paramètre et retourne cette chaîne inversée.\n\n**Exemples :**\n- `reverseString("hello")` → `"olleh"`\n- `reverseString("JavaScript")` → `"tpircSavaJ"`\n- `reverseString("")` → `""`',
    starter_code: '/**\n * Inverse une chaîne de caractères\n * @param {string} str - La chaîne à inverser\n * @returns {string} La chaîne inversée\n */\nfunction reverseString(str) {\n  // Votre code ici\n  \n}',
    solution_code: "function reverseString(str) {\n  return str.split('').reverse().join('');\n}",
    test_suite: [
      { name: 'Inverser "hello"', call: 'reverseString("hello")', expected: 'olleh' },
      { name: 'Inverser "JavaScript"', call: 'reverseString("JavaScript")', expected: 'tpircSavaJ' },
      { name: 'Chaîne vide', call: 'reverseString("")', expected: '' },
      { name: 'Un seul caractère', call: 'reverseString("a")', expected: 'a' },
      { name: 'Palindrome', call: 'reverseString("racecar")', expected: 'racecar' },
    ],
    hints: ['Pensez à convertir la chaîne en tableau', 'La méthode .reverse() fonctionne sur les tableaux', 'Vous pouvez aussi utiliser une boucle for'],
    points: 200, time_limit_seconds: 180,
  },
  {
    technology: 'javascript', difficulty: 2,
    title: 'FizzBuzz',
    description: '## Défi : FizzBuzz\n\nÉcrivez une fonction `fizzBuzz(n)` qui retourne un tableau de 1 à n où :\n- Les multiples de 3 sont remplacés par `"Fizz"`\n- Les multiples de 5 sont remplacés par `"Buzz"`\n- Les multiples de 3 ET 5 sont remplacés par `"FizzBuzz"`\n- Les autres nombres restent tels quels',
    starter_code: "/**\n * Génère le tableau FizzBuzz jusqu'à n\n * @param {number} n - La limite supérieure\n * @returns {Array} Le tableau FizzBuzz\n */\nfunction fizzBuzz(n) {\n  // Votre code ici\n  \n}",
    solution_code: "function fizzBuzz(n) {\n  return Array.from({ length: n }, (_, i) => {\n    const num = i + 1;\n    if (num % 15 === 0) return 'FizzBuzz';\n    if (num % 3 === 0) return 'Fizz';\n    if (num % 5 === 0) return 'Buzz';\n    return num;\n  });\n}",
    test_suite: [
      { name: 'Multiple de 3 → Fizz', call: 'fizzBuzz(3)[2]', expected: 'Fizz' },
      { name: 'Multiple de 5 → Buzz', call: 'fizzBuzz(5)[4]', expected: 'Buzz' },
      { name: 'Multiple de 15 → FizzBuzz', call: 'fizzBuzz(15)[14]', expected: 'FizzBuzz' },
      { name: 'Nombre normal', call: 'fizzBuzz(7)[6]', expected: 7 },
      { name: 'Taille du tableau', call: 'fizzBuzz(10).length', expected: 10 },
    ],
    hints: ["Vérifiez d'abord le cas FizzBuzz (multiple de 15)", "Utilisez l'opérateur modulo %"],
    points: 250, time_limit_seconds: 240,
  },
  {
    technology: 'javascript', difficulty: 3,
    title: 'Debounce',
    description: "## Défi : Implémenter Debounce\n\nImplémentez une fonction `debounce(fn, delay)` qui retourne une version \"debounced\" de la fonction `fn`.\nLa fonction ne s'exécute qu'après `delay` millisecondes sans appel.",
    starter_code: "/**\n * Crée une version debounced d'une fonction\n * @param {Function} fn - La fonction à debouncer\n * @param {number} delay - Le délai en millisecondes\n * @returns {Function} La fonction debounced avec méthode .cancel()\n */\nfunction debounce(fn, delay) {\n  // Votre code ici\n  \n}",
    solution_code: "function debounce(fn, delay) {\n  let timer = null;\n  function debounced(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => { fn.apply(this, args); timer = null; }, delay);\n  }\n  debounced.cancel = function() { clearTimeout(timer); timer = null; };\n  return debounced;\n}",
    test_suite: [
      { name: 'Retourne une fonction', call: 'typeof debounce(() => {}, 100)', expected: 'function' },
      { name: 'Possède une méthode cancel', call: 'typeof debounce(() => {}, 100).cancel', expected: 'function' },
    ],
    hints: ['Utilisez setTimeout et clearTimeout', 'Stockez la référence du timer dans une closure'],
    points: 400, time_limit_seconds: 360,
  },
  {
    technology: 'php', difficulty: 1,
    title: 'Corriger une fonction PHP buguée',
    description: '## Bug à corriger : Calcul de la moyenne\n\nLa fonction suivante contient un bug. Corrigez-la.\n\n```php\nfunction calculerMoyenne($nombres) {\n    $somme = 0;\n    foreach ($nombres as $nombre) {\n        $somme += $nombre;\n    }\n    return $somme / count($nombre); // BUG ICI\n}\n```',
    starter_code: '<?php\nfunction calculerMoyenne($nombres) {\n    $somme = 0;\n    foreach ($nombres as $nombre) {\n        $somme += $nombre;\n    }\n    return $somme / count($nombre); // BUG ICI - corrigez cette ligne\n}\n?>',
    solution_code: '<?php\nfunction calculerMoyenne($nombres) {\n    $somme = 0;\n    foreach ($nombres as $nombre) {\n        $somme += $nombre;\n    }\n    return $somme / count($nombres);\n}\n?>',
    test_suite: [
      { name: 'Correction du bug : count($nombres)', type: 'contains', expected: 'count($nombres)' },
      { name: 'Pas de count($nombre) sans s', type: 'not_contains', expected: 'count($nombre);' },
      { name: 'La boucle foreach est présente', type: 'contains', expected: 'foreach' },
    ],
    hints: ['Regardez attentivement la variable utilisée dans count()', 'La variable du foreach est $nombre (singulier), mais le tableau est $nombres (pluriel)'],
    points: 200, time_limit_seconds: 180,
  },
  {
    technology: 'cpp', difficulty: 2,
    title: 'Corriger une fuite mémoire',
    description: '## Bug à corriger : Fuite mémoire en C++\n\nLe code suivant contient une fuite mémoire. Ajoutez la libération correcte de la mémoire.',
    starter_code: '#include <iostream>\nusing namespace std;\n\nclass Node {\npublic:\n    int value;\n    Node* next;\n    Node(int v) : value(v), next(nullptr) {}\n};\n\nvoid addNode(Node* head, int value) {\n    Node* newNode = new Node(value);\n    head->next = newNode;\n}\n\n// Ajoutez une fonction pour libérer la mémoire\n\nint main() {\n    Node* head = new Node(1);\n    addNode(head, 2);\n    addNode(head, 3);\n    // Appelez votre fonction de libération ici\n    return 0;\n}',
    solution_code: '#include <iostream>\nusing namespace std;\n\nclass Node {\npublic:\n    int value;\n    Node* next;\n    Node(int v) : value(v), next(nullptr) {}\n};\n\nvoid addNode(Node* head, int value) {\n    Node* newNode = new Node(value);\n    head->next = newNode;\n}\n\nvoid freeList(Node* head) {\n    while (head != nullptr) {\n        Node* temp = head;\n        head = head->next;\n        delete temp;\n    }\n}\n\nint main() {\n    Node* head = new Node(1);\n    addNode(head, 2);\n    addNode(head, 3);\n    freeList(head);\n    return 0;\n}',
    test_suite: [
      { name: 'Utilisation de delete', type: 'contains', expected: 'delete' },
      { name: 'Fonction de libération présente', type: 'regex', expected: 'void\\s+free', flags: 'i' },
      { name: 'Appel de freeList dans main', type: 'contains', expected: 'freeList(head)' },
    ],
    hints: ['Créez une fonction qui parcourt la liste chaînée', 'Utilisez un pointeur temporaire avant de delete'],
    points: 300, time_limit_seconds: 300,
  },
  {
    technology: 'csharp', difficulty: 2,
    title: 'Corriger un bug async/await',
    description: '## Bug à corriger : Deadlock async/await\n\nLe code suivant provoque un deadlock. Corrigez la méthode `GetData` pour éviter le deadlock.',
    starter_code: 'using System.Threading.Tasks;\n\npublic class DataService {\n    public async Task<string> GetDataAsync() {\n        await Task.Delay(100);\n        return "données";\n    }\n    \n    // Corrigez cette méthode pour éviter le deadlock\n    public string GetData() {\n        return GetDataAsync().Result; // DEADLOCK !\n    }\n}',
    solution_code: 'using System.Threading.Tasks;\n\npublic class DataService {\n    public async Task<string> GetDataAsync() {\n        await Task.Delay(100);\n        return "données";\n    }\n    \n    public async Task<string> GetData() {\n        return await GetDataAsync();\n    }\n}',
    test_suite: [
      { name: 'Utilisation de async', type: 'contains', expected: 'async Task<string> GetData' },
      { name: 'Utilisation de await', type: 'contains', expected: 'await GetDataAsync()' },
      { name: 'Suppression de .Result', type: 'not_contains', expected: '.Result' },
    ],
    hints: ['La méthode GetData doit aussi devenir async', 'Utilisez await au lieu de .Result'],
    points: 300, time_limit_seconds: 240,
  },
  {
    technology: 'mobile', difficulty: 2,
    title: 'Corriger un bug de re-render infini',
    description: "## Bug à corriger : Re-render infini React Native\n\nLe composant suivant provoque un re-render infini. Identifiez et corrigez le bug dans le useEffect.",
    starter_code: "import React, { useState, useEffect } from 'react';\nimport { Text } from 'react-native';\n\nfunction UserList() {\n  const [users, setUsers] = useState([]);\n  \n  useEffect(() => {\n    fetch('/api/users')\n      .then(res => res.json())\n      .then(data => setUsers(data));\n  }); // BUG ICI - corrigez le useEffect\n  \n  return users.map(u => <Text key={u.id}>{u.name}</Text>);\n}\n\nexport default UserList;",
    solution_code: "import React, { useState, useEffect } from 'react';\nimport { Text } from 'react-native';\n\nfunction UserList() {\n  const [users, setUsers] = useState([]);\n  \n  useEffect(() => {\n    fetch('/api/users')\n      .then(res => res.json())\n      .then(data => setUsers(data));\n  }, []);\n  \n  return users.map(u => <Text key={u.id}>{u.name}</Text>);\n}\n\nexport default UserList;",
    test_suite: [
      { name: 'useEffect avec tableau de dépendances vide', type: 'regex', expected: 'useEffect\\s*\\([^)]+\\s*,\\s*\\[\\s*\\]' },
      { name: 'Présence de useState', type: 'contains', expected: 'useState' },
      { name: "Fetch de l'API", type: 'contains', expected: "fetch('/api/users')" },
    ],
    hints: ["useEffect sans tableau de dépendances s'exécute après chaque render", 'Un tableau vide [] signifie "exécuter une seule fois au montage"'],
    points: 250, time_limit_seconds: 240,
  },
];

const DEMO_TEAMS = [
  { name: 'Team Alpha', color: '#6366f1', players: [{ name: 'Alice', technology: 'javascript' }, { name: 'Bob', technology: 'php' }, { name: 'Charlie', technology: 'cpp' }, { name: 'Diana', technology: 'csharp' }, { name: 'Eve', technology: 'mobile' }] },
  { name: 'Team Beta', color: '#f43f5e', players: [{ name: 'Frank', technology: 'javascript' }, { name: 'Grace', technology: 'php' }, { name: 'Henry', technology: 'cpp' }, { name: 'Iris', technology: 'csharp' }, { name: 'Jack', technology: 'mobile' }] },
  { name: 'Team Gamma', color: '#10b981', players: [{ name: 'Kate', technology: 'javascript' }, { name: 'Liam', technology: 'php' }, { name: 'Mia', technology: 'cpp' }, { name: 'Noah', technology: 'csharp' }, { name: 'Olivia', technology: 'mobile' }] },
];

async function seed() {
  await initDatabase();
  const db = getDb();

  console.log('🌱 Démarrage du seed...');

  // Réinitialiser les données
  db.data.submissions = [];
  db.data.session_scores = [];
  db.data.rounds = [];
  db.data.game_sessions = [];
  db.data.players = [];
  db.data.teams = [];
  db.data.mcq_questions = [];
  db.data.code_questions = [];
  await db.write();

  console.log('👥 Insertion des équipes...');
  for (const team of DEMO_TEAMS) {
    const teamId = uuidv4();
    await dbHelpers.insertTeam({ id: teamId, name: team.name, color: team.color, score: 0, created_at: new Date().toISOString() });
    for (const player of team.players) {
      await dbHelpers.insertPlayer({ id: uuidv4(), team_id: teamId, name: player.name, technology: player.technology, created_at: new Date().toISOString() });
    }
  }

  console.log('❓ Insertion des questions MCQ...');
  for (const q of MCQ_QUESTIONS) {
    await dbHelpers.insertMCQ({ id: uuidv4(), ...q, options: JSON.stringify(q.options), created_at: new Date().toISOString() });
  }

  console.log('💻 Insertion des questions de code...');
  for (const q of CODE_QUESTIONS) {
    await dbHelpers.insertCode({
      id: uuidv4(), ...q,
      test_suite: JSON.stringify(q.test_suite),
      hints: JSON.stringify(q.hints),
      created_at: new Date().toISOString()
    });
  }

  console.log('✅ Seed terminé !');
  console.log('   - ' + DEMO_TEAMS.length + ' équipes créées');
  console.log('   - ' + MCQ_QUESTIONS.length + ' questions MCQ créées');
  console.log('   - ' + CODE_QUESTIONS.length + ' questions de code créées');
  console.log('\n🔑 Connexion admin : mot de passe "admin2025"');
  process.exit(0);
}

seed().catch((err) => { console.error('Erreur de seed :', err); process.exit(1); });
