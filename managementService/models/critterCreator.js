"use strict";

function generateAttribute() {
  return 1 + Math.floor(Math.random() * 10);
}

module.exports = function(additionalAttributes) {
  let attrs = {
    strength: generateAttribute(),
    agility: generateAttribute(),
    wit: generateAttribute(),
    senses: generateAttribute(),
  };

  // Mix-in any additional (or redundant) attributes
  if (Array.isArray(additionalAttributes)) {
    additionalAttributes.forEach(attr => {
      if (typeof attr !== 'string') return; // skip

      attrs[attr] = generateAttribute();
    });
  }

  return attrs;
};