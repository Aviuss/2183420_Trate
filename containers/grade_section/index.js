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
    res.json("Auth is working");
});

let ai_list = ['llama3.2:1b', 'gpt-4o'];

app.post('/', async (req, res) => {
    if (!req.body?.uid) {
        res.status(400).json({ error: "Error: absent email or password or too short" })
        return;
    }


    const query = {
        text: 'SELECT * FROM translations'
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);

        let submitedByUser = rows.filter(el => el.submituid === req.body.uid).map(el => el.id);
        rows = rows.filter(el => !submitedByUser.includes(el.id))
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

                let group_task_expanded = [];
                group_tasks = group_tasks.map(el => {
                    let human_translated_idx = el.translations.findIndex(e => !ai_list.includes(e.who_translated));
                    for (let i = 0; i < el.translations.length; i++) {
                        if (ai_list.includes(el.translations[i].who_translated)) {
                            let new_el = JSON.parse(JSON.stringify(el));
                            new_el.id = el.id + "_" + el.translations[human_translated_idx].who_translated + "_" + el.translations[i].who_translated
                            new_el.human_translated = el.translations[human_translated_idx];
                            new_el.ai_translated = el.translations[i];
                            new_el.translations = undefined;
                            group_task_expanded.push(new_el)
                        }
                    }
                    return el
                })



                res.json({ grade: shuffle(group_task_expanded) })
            } else {
                res.json({ grade: [] })
            }

        } else {
            res.json({ grade: [] })
        }


    } catch (err) {
        console.log(err);
        res.json({ error: err });
    } finally {
        client.release();
    }
});


app.post('/grade/:id/human/like', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    if (!data?.uid) {
        res.json({ "error": "empty uid" })
    }

    /*
    CREATE TABLE IF NOT EXISTS translations_grade (
        np SERIAL PRIMARY KEY,
        id TEXT NOT NULL,
        ai_grade INTEGER NOT NULL,
        human_grade INTEGER NOT NULL,
        uid_grading TEXT NOT NULL
    );
    
    */
    let query = {
        text: 'SELECT * FROM translations_grade WHERE id = $1 AND uid_grading = $2',
        values: [id, data.uid],
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);
        let ai_grade = 0;
        let waserror = false;
        if (rows.length != 0) {
            ai_grade = rows[0]?.ai_grade || 0;
            query = {
                text: `DELETE FROM translations_grade WHERE id = $1 AND uid_grading = $2`,
                values: [id, data.uid]
            }
            try {
                await client.query(query)
            } catch (err) {
                res.json({ error: err })
                waserror = true;
            }
        }
        if (!waserror) {
            query = {
                text: 'INSERT INTO translations_grade(id, ai_grade, human_grade, uid_grading) VALUES($1, $2, $3, $4)',
                values: [id, ai_grade, 1, data.uid],
            }
            try {
                await client.query(query);
                res.json({ message: "added" })
            } catch (err) {
                res.json({ error: err })
            }
        }
    } catch (err) {
        console.log(err);
        res.json({ error: err });
    } finally {
        client.release();
    }


});


app.post('/grade/:id/ai/like', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    if (!data?.uid) {
        res.json({ "error": "empty uid" })
    }

    /*
    CREATE TABLE IF NOT EXISTS translations_grade (
        np SERIAL PRIMARY KEY,
        id TEXT NOT NULL,
        ai_grade INTEGER NOT NULL,
        human_grade INTEGER NOT NULL,
        uid_grading TEXT NOT NULL
    );
    
    */
    let query = {
        text: 'SELECT * FROM translations_grade WHERE id = $1 AND uid_grading = $2',
        values: [id, data.uid],
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);
        let human_grade = 0;
        let waserror = false;
        if (rows.length != 0) {
            human_grade = rows[0]?.human_grade || 0;
            query = {
                text: `DELETE FROM translations_grade WHERE id = $1 AND uid_grading = $2`,
                values: [id, data.uid]
            }
            try {
                await client.query(query)
            } catch (err) {
                res.json({ error: err })
                waserror = true;
            }
        }
        if (!waserror) {
            query = {
                text: 'INSERT INTO translations_grade(id, ai_grade, human_grade, uid_grading) VALUES($1, $2, $3, $4)',
                values: [id, 1, human_grade, data.uid],
            }
            try {
                await client.query(query);
                res.json({ message: "added" })
            } catch (err) {
                res.json({ error: err })
            }
        }
    } catch (err) {
        console.log(err);
        res.json({ error: err });
    } finally {
        client.release();
    }


});


app.get('/grade/:id/likesamount', async (req, res) => {
    const { id } = req.params;


    const query = {
        text: 'SELECT * FROM translations_grade WHERE id = $1',
        values: [id]
    };
    let ai_likes = 0;
    let human_likes = 0;
    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);
        rows.forEach(element => {
            human_likes += element.human_grade;
            ai_likes += element.ai_grade;
        });

        res.json({ human_likes: human_likes, ai_likes: ai_likes })
    } catch (err) {
        console.log(err);
        res.json({ error: err });
        client.release();
        return;
    } finally {
        client.release();
    }


});


app.post('/grade/:id/human/unlike', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    if (!data?.uid) {
        res.json({ "error": "empty uid" })
    }

    /*
    CREATE TABLE IF NOT EXISTS translations_grade (
        np SERIAL PRIMARY KEY,
        id TEXT NOT NULL,
        ai_grade INTEGER NOT NULL,
        human_grade INTEGER NOT NULL,
        uid_grading TEXT NOT NULL
    );
    
    */
    let query = {
        text: 'SELECT * FROM translations_grade WHERE id = $1 AND uid_grading = $2',
        values: [id, data.uid],
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);
        let ai_grade = 0;
        let waserror = false;
        if (rows.length != 0) {
            ai_grade = rows[0]?.ai_grade || 0;
            query = {
                text: `DELETE FROM translations_grade WHERE id = $1 AND uid_grading = $2`,
                values: [id, data.uid]
            }
            try {
                await client.query(query)
            } catch (err) {
                res.json({ error: err })
                waserror = true;
            }
        }
        if (!waserror) {
            query = {
                text: 'INSERT INTO translations_grade(id, ai_grade, human_grade, uid_grading) VALUES($1, $2, $3, $4)',
                values: [id, ai_grade, 0, data.uid],
            }
            try {
                await client.query(query);
                res.json({ message: "added" })
            } catch (err) {
                res.json({ error: err })
            }
        }
    } catch (err) {
        console.log(err);
        res.json({ error: err });
    } finally {
        client.release();
    }


});


app.post('/grade/:id/ai/unlike', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    if (!data?.uid) {
        res.json({ "error": "empty uid" })
    }

    /*
    CREATE TABLE IF NOT EXISTS translations_grade (
        np SERIAL PRIMARY KEY,
        id TEXT NOT NULL,
        ai_grade INTEGER NOT NULL,
        human_grade INTEGER NOT NULL,
        uid_grading TEXT NOT NULL
    );
    
    */
    let query = {
        text: 'SELECT * FROM translations_grade WHERE id = $1 AND uid_grading = $2',
        values: [id, data.uid],
    };

    const client = await pool.connect();
    try {
        let { rows } = await client.query(query);
        let human_grade = 0;
        let waserror = false;
        if (rows.length != 0) {
            human_grade = rows[0]?.human_grade || 0;
            query = {
                text: `DELETE FROM translations_grade WHERE id = $1 AND uid_grading = $2`,
                values: [id, data.uid]
            }
            try {
                await client.query(query)
            } catch (err) {
                res.json({ error: err })
                waserror = true;
            }
        }
        if (!waserror) {
            query = {
                text: 'INSERT INTO translations_grade(id, ai_grade, human_grade, uid_grading) VALUES($1, $2, $3, $4)',
                values: [id, 0, human_grade, data.uid],
            }
            try {
                await client.query(query);
                res.json({ message: "added" })
            } catch (err) {
                res.json({ error: err })
            }
        }
    } catch (err) {
        console.log(err);
        res.json({ error: err });
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