const express = require('express');
const app = express();
const pg = require('pg');
var randomstring = require("randomstring");
const { sha256 } = require('js-sha256');

app.use(express.json());

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});



app.get('/healthcheck', async (req, res) => {
    res.json("Auth is working");
});



app.post('/', async (req, res) => {
    if (!req.body?.uid) {
        res.status(400).json("Error: absent email or password or too short")
        return;
    }


    const query = {
        text: 'SELECT * FROM translations'
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);

        let gradedByUser = rows.filter(el => el.who_translated === req.body.uid).map(el => el.id);
        rows = rows.filter(el => !gradedByUser.includes(el.id))
        if (rows.length > 0) {
            let group_tasks = [];
            rows.forEach(el => {
                let _find = group_tasks.findIndex(e => e.id === el.id);
                if (_find === -1) {
                    group_tasks.push({
                        "id": el.id,
                        "submituid": el.submituid,
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
            group_tasks = group_tasks.filter(el => el.translations.length >= 3)
            if (group_tasks.length === 0) {

                res.json({ result: false, grade: {} })
            } else {

                group_tasks = group_tasks.map(el => {
                    el.translations = shuffle(el.translations);
                    return [el[0], el[1], el[2]];
                })


                res.json({ result: true, grade: shuffle(group_tasks)[0] })
            }
        } else {
            res.json({ result: false, grade: {} })
        }


    } catch (err) {
        console.log(err);
        res.json("error");
    } finally {
        client.release();
    }
});





app.listen(5010, () => {
    console.log('Server is running');
});

const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}; 