const express = require('express');
const app = express();
const pg = require('pg');
const cors = require('cors');

app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*',
}));
app.use(express.json());

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});



app.get('/healthcheck', async (req, res) => {
    res.json("Personal is working");
});

let ai_list = ['llama3.2:1b', 'gpt-4o'];

async function fetchDataPOST(url, req) {
    try {
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req)
        });
        let data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return { "error": error }
    }
}


async function fetchDataGET(url) {
    try {
        let response = await fetch(url);
        let data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return { "error": error }
    }
}


app.post('/email', async (req, res) => {
    if (!req.body?.uid) {
        res.status(400).json({ error: "Error: absent uid" })
        return;
    }

    const query = {
        text: 'SELECT * FROM user_credentials WHERE uid = $1',
        values: [req.body.uid]
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);
        res.json({ email: rows[0].email })


    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err });
    } finally {
        client.release();
    }
});

app.post('/gradeinfo', async (req, res) => {
    if (!req.body?.uid || !req.body?.authorization_token) {
        res.status(400).json({ error: "Error: absent uid or token" })
        return;
    }


    let authorization = await fetchDataPOST(process.env.AUTH_URL + "/uid/valid", req.body);
    if (!authorization.valid) {
        res.status(403).json({ "error": "wrong token" })
        return;
    }

    const query = {
        text: 'SELECT * FROM translations'
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);

        let submitedByUser = rows.filter(el => el.submituid === req.body.uid).map(el => el.id);
        rows = rows.filter(el => submitedByUser.includes(el.id))
        if (rows.length > 0) {
            let group_tasks = [];
            rows.forEach(el => {
                let _find = group_tasks.findIndex(e => e.id === el.id);
                if (_find === -1) {
                    group_tasks.push({
                        "id": el.id,
                        "original_text": el.original_text,
                        "original_lang": el.original_lang,
                        "translated_lang": el.translated_lang,
                        "translations": [
                            {
                                "who_translated": el.who_translated,
                                "translated_text": el.translated_text,
                            }
                        ]
                    })
                } else {
                    group_tasks[_find].translations.push({
                        "who_translated": el.who_translated,
                        "translated_text": el.translated_text,
                    })
                }
            })
            group_tasks = group_tasks.filter(el => el.translations.length >= 2);
            if (group_tasks.length > 0) {

                let amount_of_created_translations = 0;
                let amount_of_ai_translations = 0;
                let amount_of_translations_better_than_ai = 0;
                let total_amount_of_likes = 0;

                await Promise.all(group_tasks.map(async (el) => {
                    let human_translated_idx = el.translations.findIndex(e => !ai_list.includes(e.who_translated));
                    amount_of_created_translations++;
                    let ai_better = false;

                    for (let i = 0; i < el.translations.length; i++) {
                        if (ai_list.includes(el.translations[i].who_translated)) {
                            amount_of_ai_translations++;
                            let new_el = JSON.parse(JSON.stringify(el));
                            new_el.id = el.id + "_" + el.translations[human_translated_idx].who_translated + "_" + el.translations[i].who_translated
                            new_el.human_translated = el.translations[human_translated_idx];
                            new_el.ai_translated = el.translations[i];
                            new_el.translations = undefined;

                            let res = await fetchDataGET(process.env.GRADE_SECTION_URL + `/grade/${new_el.id}/likesamount`);
                            total_amount_of_likes += res.human_likes;
                            ai_better = ai_better || res.human_likes < res.ai_likes
                        }
                    }
                    if (ai_better) {
                        amount_of_translations_better_than_ai++;
                    }
                }))





                res.json({
                    "amount_of_created_translations": amount_of_created_translations,
                    "amount_of_ai_translations": amount_of_ai_translations,
                    "amount_of_translations_better_than_ai": amount_of_translations_better_than_ai,
                    "total_amount_of_likes": total_amount_of_likes
                })
            } else {

                res.json({
                    "amount_of_created_translations": 0,
                    "amount_of_ai_translations": 0,
                    "amount_of_translations_better_than_ai": 0,
                    "total_amount_of_likes": 0
                })
            }

        } else {
            res.json({
                "amount_of_created_translations": 0,
                "amount_of_ai_translations": 0,
                "amount_of_translations_better_than_ai": 0,
                "total_amount_of_likes": 0
            })
        }


    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err });
    } finally {
        client.release();
    }
});

app.post('/delete/me', async (req, res) => {
    if (!req.body?.uid || !req.body?.authorization_token) {
        res.status(400).json({ error: "Error: absent uid or token" })
        return;
    }


    let authorization = await fetchDataPOST(process.env.AUTH_URL + "/uid/valid", req.body);
    if (!authorization.valid) {
        res.status(403).json({ "error": "wrong token" })
        return;
    }
    const client = await pool.connect();
    const query1 = {
        text: 'DELETE FROM authorization_tokens WHERE uid=$1',
        values: [req.body.uid]
    };
    const query2 = {
        text: 'DELETE FROM user_credentials WHERE uid=$1',
        values: [req.body.uid]
    };

    try {
        await client.query(query1);
        await client.query(query2);
    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err });
    } finally {
        client.release();
    }
});

app.listen(5011, () => {
    console.log('Server is running');
});
