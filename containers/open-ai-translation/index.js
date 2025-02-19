import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY
});


async function translate(phrase, original_language, target_language) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "developer", content: "You translate sentences into JSON data." },
            {
                role: "user",
                content: `Translate sentences from ${original_language} to ${target_language}:
                
                ${phrase}`,
            },
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "translation_schema",
                schema: {
                    type: "object",
                    properties: {
                        translation: {
                            description: "The translation of the sentences provided in input",
                            type: "string"
                        }
                    },
                    additionalProperties: false
                }
            }
        },
        store: true,
    });

    return completion.choices[0].message.content;
}

import express from 'express';
const app = express();


app.get('/', async (req, res) => {
    res.json(await translate(`Jake rushed to catch the last train, but just as he reached the platform, the doors slid shut. He sighed in frustration, only to hear a soft voice behind him say, "Looks like we’re both stuck here." Turning around, he met the warm smile of a stranger, and suddenly, missing the train didn’t seem so bad.`, "english", "czech"))
});

app.listen(5001, () => {
    console.log('Server is running');
});