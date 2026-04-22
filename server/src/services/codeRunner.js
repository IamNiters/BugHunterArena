/**
 * Service d'exécution de code sécurisée avec validation TDD
 * Utilise un sandbox Node.js via la VM native pour JavaScript.
 * Pour les autres langages (PHP, C++, C#, Mobile), les tests sont
 * des tests logiques en JavaScript qui simulent la validation.
 */

import { VM } from 'vm2';

const EXECUTION_TIMEOUT_MS = 5000;

/**
 * Exécute le code soumis par le joueur et lance la suite de tests TDD.
 * @param {string} code - Le code soumis par le joueur
 * @param {Array} testSuite - Tableau de tests { name, input, expected, type }
 * @param {string} technology - La technologie du challenge
 * @returns {{ passed: number, total: number, results: Array, error: string|null }}
 */
export function runTests(code, testSuite, technology) {
  const results = [];
  let passed = 0;

  for (const test of testSuite) {
    const result = runSingleTest(code, test, technology);
    results.push(result);
    if (result.passed) passed++;
  }

  return {
    passed,
    total: testSuite.length,
    results,
    error: null,
  };
}

function runSingleTest(code, test, technology) {
  try {
    if (technology === 'javascript') {
      return runJavaScriptTest(code, test);
    } else {
      // Pour les autres langages, on utilise des tests de validation logique
      return runLogicTest(code, test);
    }
  } catch (err) {
    return {
      name: test.name,
      passed: false,
      error: err.message,
      expected: test.expected,
      received: null,
    };
  }
}

/**
 * Exécution sécurisée de JavaScript via vm2
 */
function runJavaScriptTest(code, test) {
  const vm = new VM({
    timeout: EXECUTION_TIMEOUT_MS,
    sandbox: {},
    eval: false,
    wasm: false,
  });

  // Construire le script de test
  const testScript = `
    ${code}
    
    // Exécution du test
    (function() {
      try {
        const result = ${test.call};
        return JSON.stringify(result);
      } catch(e) {
        throw new Error('Erreur d\\'exécution : ' + e.message);
      }
    })()
  `;

  const rawResult = vm.run(testScript);
  const received = JSON.parse(rawResult);
  const expected = test.expected;
  const passed = deepEqual(received, expected);

  return {
    name: test.name,
    passed,
    expected,
    received,
    error: passed ? null : `Attendu: ${JSON.stringify(expected)}, Reçu: ${JSON.stringify(received)}`,
  };
}

/**
 * Test de validation logique pour les langages non-JS
 * Vérifie que le code contient les éléments clés attendus
 */
function runLogicTest(code, test) {
  // Vérifications basées sur des patterns attendus dans le code
  if (test.type === 'contains') {
    const patterns = Array.isArray(test.expected) ? test.expected : [test.expected];
    const allFound = patterns.every((pattern) => code.includes(pattern));
    return {
      name: test.name,
      passed: allFound,
      expected: patterns,
      received: patterns.filter((p) => code.includes(p)),
      error: allFound ? null : `Éléments manquants dans le code : ${patterns.filter((p) => !code.includes(p)).join(', ')}`,
    };
  }

  if (test.type === 'not_contains') {
    const patterns = Array.isArray(test.expected) ? test.expected : [test.expected];
    const noneFound = patterns.every((pattern) => !code.includes(pattern));
    return {
      name: test.name,
      passed: noneFound,
      expected: `Ne doit pas contenir : ${patterns.join(', ')}`,
      received: patterns.filter((p) => code.includes(p)),
      error: noneFound ? null : `Éléments interdits trouvés : ${patterns.filter((p) => code.includes(p)).join(', ')}`,
    };
  }

  if (test.type === 'regex') {
    const regex = new RegExp(test.expected, test.flags || 'i');
    const passed = regex.test(code);
    return {
      name: test.name,
      passed,
      expected: test.expected,
      received: passed ? 'Pattern trouvé' : 'Pattern non trouvé',
      error: passed ? null : `Le pattern "${test.expected}" n'a pas été trouvé dans le code`,
    };
  }

  return {
    name: test.name,
    passed: false,
    error: `Type de test inconnu : ${test.type}`,
  };
}

/**
 * Comparaison profonde de deux valeurs
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => deepEqual(a[key], b[key]));
}
