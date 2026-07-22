const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./database/document.db", (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to SQLite Database");
    }
});

db.serialize(() => {
    db.run(`
CREATE TABLE IF NOT EXISTS transmittals(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transmittalNo TEXT,
    transDate TEXT,
    toCompany TEXT,
    attention TEXT,
    subject TEXT,
    remarks TEXT
)
`);
    db.run(`
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
)
`);
db.get(
"SELECT * FROM users WHERE username='admin'",
async (err, row) => {

    if (!row) {

        const hash = await bcrypt.hash("admin123", 10);

        db.run(
        `INSERT INTO users
        (fullname, username, password, role)
        VALUES (?,?,?,?)`,
        [
            "Administrator",
            "admin",
            hash,
            "Admin"
        ]);

    }

});
    // Projects Table
    db.run(`
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT,
        name TEXT,
        client TEXT,
        status TEXT,
        startDate TEXT,
        endDate TEXT,
        description TEXT
    )
    `);
db.run("ALTER TABLE projects ADD COLUMN status TEXT",()=>{});
db.run("ALTER TABLE projects ADD COLUMN startDate TEXT",()=>{});
db.run("ALTER TABLE projects ADD COLUMN endDate TEXT",()=>{});
db.run("ALTER TABLE projects ADD COLUMN description TEXT",()=>{});
    

    // Documents Table
    db.run(`
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT,
        docNo TEXT,
        title TEXT,
        discipline TEXT,
        revision TEXT,
        status TEXT,
        filename TEXT
    )
    `);

    // Incoming Documents Table
    db.run(`
    CREATE TABLE IF NOT EXISTS incoming_documents(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transmittalNo TEXT,
        receivedDate TEXT,
        sender TEXT,
        receiver TEXT,
        project TEXT,
        docNo TEXT,
        title TEXT,
        revision TEXT,
        discipline TEXT,
        status TEXT,
        remarks TEXT,
        filename TEXT
    )
    `);

    // Outgoing Documents Table
    db.run(`
    CREATE TABLE IF NOT EXISTS outgoing_documents(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transmittalNo TEXT,
        sentDate TEXT,
        receiver TEXT,
        project TEXT,
        docNo TEXT,
        title TEXT,
        revision TEXT,
        discipline TEXT,
        status TEXT,
        remarks TEXT,
        filename TEXT
    )
    `);

    // Add new columns for revision control
    db.run("ALTER TABLE documents ADD COLUMN revisionDate TEXT", () => {});
    db.run("ALTER TABLE documents ADD COLUMN uploadedBy TEXT", () => {});
    db.run("ALTER TABLE documents ADD COLUMN remarks TEXT", () => {});

    db.run(`
CREATE TABLE IF NOT EXISTS audit_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    action TEXT,
    details TEXT,
    logTime DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);
});

module.exports = db;