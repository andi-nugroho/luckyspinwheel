const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const obfuscateMiddleware = require('./middlewares/obfuscator');
const htmlMinifyMiddleware = require('./middlewares/minifier');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const authMiddleware = require('./middlewares/auth');
const bcrypt = require('bcrypt');
const defaultPrizes = require('./data/seedPrizes');

const app = express();
const db = new sqlite3.Database('./database/lottery.db');

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const SALT_ROUNDS = 10;

app.set('view engine', 'ejs');
app.use(obfuscateMiddleware);
app.use(htmlMinifyMiddleware);
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function randomStringWithInt(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const randomInt = Math.floor(Math.random() * 1000); // random int 0–999
    return result + randomInt;
}

app.use(session({
    store: new SQLiteStore,
    secret: 'D5-SpinWheel',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

db.serialize(async () => {
    db.run("CREATE TABLE IF NOT EXISTS tokens (id TEXT PRIMARY KEY, prize_id INTEGER, used INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.run("CREATE TABLE IF NOT EXISTS prizes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, image_url TEXT, probability INTEGER, color TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.run("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
    
    db.get("SELECT COUNT(*) as count FROM prizes", [], (err, row) => {
        if (err) {
            console.error('Error checking prizes:', err);
            return;
        }
        
        if (row.count === 0) {
            console.log('Seeding default prizes...');
            const stmt = db.prepare("INSERT INTO prizes (name, description, probability, color, image_url) VALUES (?, ?, ?, ?, ?)");
            
            defaultPrizes.forEach(prize => {
                stmt.run([
                    prize.name,
                    prize.description,
                    prize.probability,
                    prize.color,
                    prize.image_url
                ], (err) => {
                    if (err) console.error('Error seeding prize:', err);
                });
            });
            
            stmt.finalize(() => {
                console.log('Prize seeding completed');
            });
        }
    });

    try {
        db.get("SELECT * FROM admins WHERE username = ?", [ADMIN_USERNAME], async (err, row) => {
            if (err) {
                console.error('Error checking admin:', err);
                return;
            }
            
            if (!row) {
                const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
                
                db.run("INSERT INTO admins (username, password) VALUES (?, ?)", 
                    [ADMIN_USERNAME, hashedPassword],
                    (err) => {
                        if (err) {
                            console.error('Error creating admin:', err);
                        } else {
                            console.log('Admin account created successfully');
                        }
                    }
                );
            }
        });
    } catch (err) {
        console.error('Error in admin initialization:', err);
    }
});

// Routes
app.get('/login', (req, res) => {
    if (req.session.isAuthenticated) {
        res.redirect('/admin');
    } else {
        res.render('login');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        db.get("SELECT * FROM admins WHERE username = ?", [username], async (err, admin) => {
            if (err) {
                console.error('Login error:', err);
                return res.render('login', { error: 'Internal server error' });
            }
            
            if (!admin) {
                return res.render('login', { error: 'Invalid credentials' });
            }
            
            const passwordMatch = await bcrypt.compare(password, admin.password);
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            console.log('Password match:', passwordMatch);
            console.log('Admin:', admin);
            console.log('Username:', username);
            console.log('Password:', password);
            console.log('Hashed Password:', hashedPassword);
            
            if (passwordMatch) {
                console.log('Login successful for admin:', admin.username);
                req.session.isAuthenticated = true;
                req.session.adminId = admin.id;
                res.redirect('/admin');
            } else {
                res.render('login', { error: 'Invalid credentials' });
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'Internal server error' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', (req, res) => {
    res.render('game');
});

app.get('/admin', authMiddleware, (req, res) => {
    db.all("SELECT * FROM prizes", [], (err, prizes) => {
        res.render('admin', { prizes });
    });
});

app.post('/generate-token', (req, res) => {
    const { prize, tokenCount = 1 } = req.body;
    const tokens = [];
    
    const stmt = db.prepare("INSERT INTO tokens (id, prize_id) VALUES (?, ?)");
    for (let i = 0; i < tokenCount; i++) {
        const token = `IDs-${randomStringWithInt(10).toUpperCase()}`;
        stmt.run([token, prize]);
        tokens.push(token);
    }
    stmt.finalize();
    
    res.json({ tokens });
});

app.post('/verify-token', (req, res) => {
    const { token } = req.body;
    db.get("SELECT * FROM tokens WHERE id = ? AND used = 0", [token], (err, row) => {
        if (row) {
            db.run("UPDATE tokens SET used = 1 WHERE id = ?", [token]);
            res.json({ valid: true, prize: row.prize_id });
        } else {
            res.json({ valid: false });
        }
    });
});

app.post('/admin/prize', authMiddleware, (req, res) => {
    const { name, description, imageUrl, probability, color } = req.body;
    db.run(
        "INSERT INTO prizes (name, description, image_url, probability, color) VALUES (?, ?, ?, ?, ?)",
        [name, description, imageUrl, probability, color],
        (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

app.put('/admin/prize/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, description, imageUrl, probability, color } = req.body;
    
    db.run(
        "UPDATE prizes SET name = ?, description = ?, image_url = ?, probability = ?, color = ? WHERE id = ?",
        [name, description, imageUrl, probability, color, id],
        (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

app.delete('/admin/prize/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM prizes WHERE id = ?", [id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

app.get('/prizes', (req, res) => {
    db.all("SELECT id, name, description, image_url, probability, color FROM prizes ORDER BY probability DESC", [], (err, prizes) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(prizes);
    });
});

app.get('/admin/tokens', authMiddleware, (req, res) => {
    db.all(`
        SELECT 
            t.id,
            t.used,
            t.created_at,
            p.name as prize_name,
            p.probability as prize_probability
        FROM tokens t
        LEFT JOIN prizes p ON t.prize_id = p.id
        ORDER BY t.created_at DESC
    `, [], (err, tokens) => {
        if (err) {
            console.error('Token fetch error:', err);
            res.status(500).json({ 
                error: err.message,
                data: []
            });
            return;
        }
        res.json({ 
            data: tokens.map(token => ({
                ...token,
                created_at: token.created_at || new Date().toISOString()
            }))
        });
    });
});

app.use((req, res) => {
    res.status(404).render('404');
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
