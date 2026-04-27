"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prompts = void 0;
function dataBlock(input) {
    return JSON.stringify(input, null, 2);
}
exports.prompts = {
    decision: (input) => `You are a senior e-commerce performance analyst.

Analyze the data below and make a strict decision:
- SCALE
- KILL
- TEST
- FIX

Rules:
- Be decisive.
- Base your answer on performance efficiency.
- Keep the reason short and practical.

Return JSON only.

Data:
${dataBlock(input)}`,
    diagnosis: (input) => `You are an expert in diagnosing e-commerce ad performance issues.

Identify the main problem.

Possible problems:
- creative problem
- targeting problem
- offer problem
- product problem
- funnel problem

Return JSON only.

Data:
${dataBlock(input)}`,
    actionPlan: (input) => `You are a performance marketing operator.

Give exactly 3 specific next actions.

Rules:
- No generic advice
- Each action must be concrete and executable
- Return JSON only

Data:
${dataBlock(input)}`,
    funnelLeak: (input) => `You are a funnel analyst.

Identify where users drop off the most.

Steps:
- impressions → clicks
- clicks → add to cart
- add to cart → purchase

Return JSON only.

Data:
${dataBlock(input)}`,
    breakEven: (input) => `You are a profitability analyst.

Calculate if this product can be profitable.

Given:
- product price
- cost
- CPC
- conversion rate

Return JSON only.

Data:
${dataBlock(input)}`,
    continueOrStop: (input) => `You are a performance decision expert.

Decide if the user should continue testing or stop.

Consider:
- spend
- conversions
- data volume
- stage

Return JSON only.

Data:
${dataBlock(input)}`,
    creativeGenerator: (input) => `You are a direct-response ad expert.

Generate 3 new ad angles for this product.

Each angle must include:
- hook idea
- concept
- target emotion

No generic ideas.
Return JSON only.

Product:
${input.product_description ?? input.product_name ?? "E-commerce product"}`,
    validation: (input) => `You are an e-commerce product validation expert.

Evaluate if this product has real potential based on performance data.

Consider:
- engagement
- cost efficiency
- early conversion signals

Return JSON only.

Data:
${dataBlock(input)}`,
};
