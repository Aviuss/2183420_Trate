import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: "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"
});

console.log(await translate("What are you doing"))

async function translate(phrase, original_language, target_language) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
            { role: "developer", content: "You extract email addresses into JSON data." },
            {
                role: "user",
                content: "Feeling stuck? Send a message to help@mycompany.com.",
            },
        ],
        response_format: {
            // See /docs/guides/structured-outputs
            type: "json_schema",
            json_schema: {
                name: "email_schema",
                schema: {
                    type: "object",
                    properties: {
                        email: {
                            description: "The email address that appears in the input",
                            type: "string"
                        }
                    },
                    additionalProperties: false
                }
            }
        },
        store: true,
    });

    console.log(completion.choices[0].message.content);
    console.log(completion)
}
