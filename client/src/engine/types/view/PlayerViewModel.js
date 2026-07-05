/**
 * @typedef {import('./CardViewModel').CardViewModel} CardViewModel
 * @typedef {Object} SkillDefinition
 * 
 * @typedef {Object} HeroViewModel
 * @property {string} id
 * @property {string} name
 * @property {number} maxHp
 * @property {string} faction
 * @property {string} gender
 * @property {string} [image]
 * @property {string} [emoji]
 * @property {Array<SkillDefinition>} skills
 * 
 * @typedef {Object} PlayerViewModel
 * @property {number} id
 * @property {string} displayName
 * @property {string} name
 * @property {string} faction
 * @property {number} hp
 * @property {number} maxHp
 * @property {string} hpText
 * @property {Array<HeroViewModel>} heroes
 * @property {Array<boolean>} revealedHeroes
 * @property {boolean} isRevealed
 * @property {Array<CardViewModel>} hand
 * @property {Array<CardViewModel>} equipment
 * @property {Array<CardViewModel>} judgementArea
 * @property {boolean} isAlive
 * @property {boolean} isFlipped
 * @property {boolean} isChained
 * @property {number} draftCount
 * @property {boolean} isBot
 * @property {number} maxHandSize
 * @property {boolean} [isVip]
 * @property {boolean} [isDaTam]
 * @property {boolean} [isSilenced]
 * @property {boolean} [drankWine]
 * @property {number} maxHp
 * @property {number} attackRange
 * @property {number} distanceFromMe
 * @property {Object.<number, number>} [distances]
 * @property {boolean} [hasDrafted]
 * @property {Array<HeroViewModel>} [draftHeroes]
 */

export {};
