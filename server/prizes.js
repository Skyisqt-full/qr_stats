// server/prizes.js
const { ALL_PRIZES, ALLOWED_PRIZES } = require('./config');

function assertPrizeConfig() {
  for (const p of ALLOWED_PRIZES) {
    if (!ALL_PRIZES.includes(p)) {
      throw new Error(`ALLOWED_PRIZES содержит приз "${p}", которого нет в ALL_PRIZES`);
    }
  }
  if (ALLOWED_PRIZES.length === 0) {
    throw new Error('ALLOWED_PRIZES пуст — нечего выдавать');
  }
}

/**
 * Детерминированный (запрограммированный) приз:
 * round-robin по ALLOWED_PRIZES в зависимости от submissionId.
 *
 * submissionId=1 -> ALLOWED[0]
 * submissionId=2 -> ALLOWED[1]
 * ...
 */
function getProgrammedPrize(submissionId) {
  assertPrizeConfig();
  const idNum = Number(submissionId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    throw new Error('Invalid submissionId');
  }
  const idx = (idNum - 1) % ALLOWED_PRIZES.length;
  return ALLOWED_PRIZES[idx];
}

module.exports = { getProgrammedPrize };
