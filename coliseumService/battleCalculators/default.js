"use strict";

/**
 * Battling critters for fun is a brutish sport.  The default battle type is battle of strength, agility, with, and
 * senses.  When two critters are about evenly matched in one attribute, the winner is determined by the next attribute.
 */

// A critter's attribute must be this many points larger than opponent's to win on that attribute
const ATTRIBUTE_SUPREMECY_MARGIN = 3;

function calcWinMargin(attrName, a, b) {
  let diff = b.attributes[attrName] - a.attributes[attrName];

  if (isNaN(diff) || Math.abs(diff) < ATTRIBUTE_SUPREMECY_MARGIN) return 0;

  return diff;
}

function generateResults(attrName, a, b) {
  let winMargin = calcWinMargin(attrName, a, b);

  if (winMargin === 0) return false;

  return winMargin < 0 ?
  { critter_a_won: true,
    critter_a_score: a.attributes[attrName],
    critter_b_score: b.attributes[attrName]
  } :
  { critter_a_won: false,
    critter_a_score: a.attributes[attrName],
    critter_b_score: b.attributes[attrName]
  };
}

module.exports = function(openBattleMessage) {
  function calcResults() {
    let critA = openBattleMessage.critters[0];
    let critB = openBattleMessage.critters[1];

    let attributeResults =
      generateResults('strength', critA, critB) ||
      generateResults('agility', critA, critB) ||
      generateResults('wit', critA, critB) ||
      generateResults('senses', critA, critB);

    if (attributeResults) return attributeResults;

    return {
      critter_a_won: critA.experience >= critB.experience, // In case of tie, challenger wins
      critter_a_score: critA.experience,
      critter_b_score: critB.experience
    };
  }

  return new Promise((resolve, reject) => {
    let result;

    try {
      result = calcResults();
    } catch(e) {
      reject(e);
    }

    // That was expensive.  Give the CPU some time to cool down.
    setTimeout(() => {
      resolve(result)
    }, 5000);
  });
};