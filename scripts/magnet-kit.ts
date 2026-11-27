// What scripts/magnet.mjs uses from the engine. esbuild bundles this file on demand, so the
// tool runs the same code as the Worker and the two cannot drift apart.
export { getMagnet } from "../src/magnets/registry";
export { checkBrief, checkDefinition } from "../src/magnets/types";
export { capMicroUsd, worstCaseMicroUsd } from "../src/lib/magnet/budget";
export { anthropicClient, callerFor } from "../src/lib/magnet/claude";
export { FIELD, answerField } from "../src/lib/magnet/contract";
export { writeFollowUps } from "../src/lib/magnet/followup";
export { newToken, parseSubmission } from "../src/lib/magnet/intake";
export { runLead } from "../src/lib/magnet/job";
export { followUpCall, screenCall, writerCall } from "../src/lib/magnet/prompt";
export { getLead, insertLead, putBrief } from "../src/lib/magnet/store";
