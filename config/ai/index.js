const OpenAI = require("openai")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "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"
})

module.exports = {
  openai
}
