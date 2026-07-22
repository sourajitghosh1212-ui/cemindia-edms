//const bcrypt = require("bcrypt");
const session = require("express-session");
const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("./database/db");
const dashboardRoutes = require("./routes/dashboardRoutes");
const projectRoutes = require("./routes/projectRoutes");
const documentRoutes = require("./routes/documentRoutes");

const app = express();
function addLog(username, action, details) {

    db.run(
        "INSERT INTO audit_logs(username, action, details) VALUES(?,?,?)",
        [username, action, details]
    );

}
const PORT = process.env.PORT || 3000;

// =======================
// Middleware
// =======================

app.use(session({
    secret: "Cemindia-DMS-2026-Strong-Key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 30 * 60 * 1000
    }
}));

// ADD THESE LINES HERE
app.use( (req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

app.use(express.urlencoded({ extended: true }));
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
}
function requireAdmin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    next();

}
app.use(express.static("public"));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));
app.use("/uploads", express.static("public/uploads"));
app.use("/", dashboardRoutes);
app.use("/", projectRoutes);
app.use("/", documentRoutes);
app.set("view engine", "ejs");

// =======================
// Multer Configuration
// =======================

const storage = multer.diskStorage({

    destination: function(req, file, cb){
        cb(null, "public/uploads/");
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + "-" + file.originalname);
    }

});

const upload = multer({

    storage: storage,

    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, DOC, DOCX, XLS and XLSX files are allowed."));
        }

    }

});

// =======================
// Home
// =======================

app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.render("login");
});
app.post("/login", (req, res) => {

    const { username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE username=? AND password=?",
        [username, password],
        (err, user) => {

            if (err) {
                return res.send(err.message);
            }

            if (!user) {
                return res.send("Invalid Username or Password");
            }

            req.session.user = user;

            addLog(
                user.username,
                "LOGIN",
                "User logged into EDMS"
            );

            res.redirect("/dashboard");

        }
    );

});

// =======================
// Logout
// =======================

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// =======================
// Dashboard
// =======================

app.get("/dashboard", requireLogin, (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    db.get("SELECT COUNT(*) AS totalProjects FROM projects", (err, projectResult) => {

        if (err) return res.send(err.message);

        db.get("SELECT COUNT(*) AS totalDocuments FROM documents", (err, documentResult) => {

            if (err) return res.send(err.message);

            db.get("SELECT COUNT(*) AS incoming FROM incoming_documents", (err, incomingResult) => {

                if (err) return res.send(err.message);

                db.get("SELECT COUNT(*) AS outgoing FROM outgoing_documents", (err, outgoingResult) => {

                    if (err) return res.send(err.message);

                    db.get("SELECT COUNT(*) AS pending FROM documents WHERE status='Pending'", (err, pendingResult) => {

                        if (err) return res.send(err.message);

                        db.get("SELECT COUNT(*) AS approved FROM documents WHERE status='Approved'", (err, approvedResult) => {

                            if (err) return res.send(err.message);

                            res.render("dashboard", {
                                totalProjects: projectResult.totalProjects,
                                totalDocuments: documentResult.totalDocuments,
                                incoming: incomingResult.incoming,
                                outgoing: outgoingResult.outgoing,
                                pending: pendingResult.pending,
                                approved: approvedResult.approved
                            });

                        });

                    });

                });

            });

        });

    });

});

// =======================
// MDR Page
// =======================

app.get("/mdr", (req, res) => {
    res.render("mdr");
});

app.post("/mdr", (req, res) => {
    console.log(req.body);
    res.send("Document Saved Successfully");
});

// =======================
// Delete Document
// =======================

app.get("/delete-document/:id",(req,res)=>{

    db.run(

        "DELETE FROM documents WHERE id=?",

        [req.params.id],

        function(err){

            if(err){
                return res.send(err.message);
            }

            res.redirect("/document-list");

        }

    );
})
// =======================
// Incoming Register
// =======================

app.get("/incoming", (req, res) => {
    res.render("incoming");
});

app.post("/incoming", upload.single("document"), (req, res) => {

    const {
        transmittalNo,
        receivedDate,
        from,
        to,
        project,
        docNo,
        title,
        revision,
        discipline,
        status,
        remarks
    } = req.body;

    const filename = req.file ? req.file.filename : "";

    db.run(
        `INSERT INTO incoming_documents
        (transmittalNo, receivedDate, sender, receiver, project, docNo, title, revision, discipline, status, remarks, filename)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            transmittalNo,
            receivedDate,
            from,
            to,
            project,
            docNo,
            title,
            revision,
            discipline,
            status,
            remarks,
            filename
        ],
        function(err) {

            if (err) {
                console.log(err);
                return res.send(err.message);
            }

            res.redirect("/incoming-list");
        }
    );

});

// =======================
// Incoming List
// =======================

app.get("/incoming-list", requireLogin, (req, res) => {

    const search = req.query.search || "";

    db.all(
        `SELECT * FROM incoming_documents
         WHERE transmittalNo LIKE ?
         OR project LIKE ?
         OR docNo LIKE ?
         OR title LIKE ?
         OR status LIKE ?
         ORDER BY id DESC`,
        [
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`
        ],
        (err, rows) => {

            if (err) return res.send(err.message);

            res.render("incoming-list", {
                incoming: rows
            });

        }
    );

});

// =======================
// Edit Incoming
// =======================

app.get("/edit-incoming/:id", requireAdmin, (req, res) => {

    db.get(
        "SELECT * FROM incoming_documents WHERE id=?",
        [req.params.id],
        (err, row) => {

            if (err) return res.send(err.message);

            res.render("edit-incoming", {
                document: row
            });

        }
    );

});

app.post("/edit-incoming/:id", requireAdmin, (req, res) => {

    const {
        transmittalNo,
        receivedDate,
        from,
        to,
        project,
        docNo,
        title,
        revision,
        discipline,
        status,
        remarks
    } = req.body;

    db.run(
        `UPDATE incoming_documents
        SET
        transmittalNo=?,
        receivedDate=?,
        sender=?,
        receiver=?,
        project=?,
        docNo=?,
        title=?,
        revision=?,
        discipline=?,
        status=?,
        remarks=?
        WHERE id=?`,
        [
            transmittalNo,
            receivedDate,
            from,
            to,
            project,
            docNo,
            title,
            revision,
            discipline,
            status,
            remarks,
            req.params.id
        ],
        function(err) {

            if (err) return res.send(err.message);

            res.redirect("/incoming-list");

        }
    );

});

app.get("/delete-incoming/:id", requireAdmin, (req, res) => {

    db.run(
        "DELETE FROM incoming_documents WHERE id=?",
        [req.params.id],
        function(err) {

            if (err) return res.send(err.message);

            res.redirect("/incoming-list");

        }
    );

});

// =======================
// Outgoing Register
// =======================

app.get("/outgoing", (req, res) => {
    res.render("outgoing");
});

app.post("/outgoing", upload.single("document"), (req, res) => {

    const {
        transmittalNo,
        sentDate,
        receiver,
        project,
        docNo,
        title,
        revision,
        discipline,
        status,
        remarks
    } = req.body;

    const filename = req.file ? req.file.filename : "";

    db.run(
        `INSERT INTO outgoing_documents
        (transmittalNo, sentDate, receiver, project, docNo, title, revision, discipline, status, remarks, filename)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
            transmittalNo,
            sentDate,
            receiver,
            project,
            docNo,
            title,
            revision,
            discipline,
            status,
            remarks,
            filename
        ],
        function(err) {

            if (err) {
                console.log(err);
                return res.send(err.message);
            }

            res.redirect("/outgoing-list");

        }
    );

});

// =======================
// Outgoing List
// =======================

app.get("/outgoing-list", requireLogin, (req, res) => {

    const search = req.query.search || "";

    db.all(
        `SELECT * FROM outgoing_documents
         WHERE transmittalNo LIKE ?
         OR project LIKE ?
         OR docNo LIKE ?
         OR title LIKE ?
         OR status LIKE ?
         ORDER BY id DESC`,
        [
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`
        ],
        (err, rows) => {

            if (err) return res.send(err.message);

            res.render("outgoing-list", {
                outgoing: rows
            });

        }
    );

});

// =======================
// Server
// =======================

// =======================
// Open Edit Outgoing
// =======================

app.get("/edit-outgoing/:id", requireAdmin, (req, res) => {

    db.get(
        "SELECT * FROM outgoing_documents WHERE id=?",
        [req.params.id],
        (err, row) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("edit-outgoing", {
                document: row
            });

        }
    );

});

// =======================
// Save Edited Outgoing
// =======================

app.post("/edit-outgoing/:id", requireAdmin, (req, res) => {

    const {
        transmittalNo,
        sentDate,
        receiver,
        project,
        docNo,
        title,
        revision,
        discipline,
        status,
        remarks
    } = req.body;

    db.run(
        `UPDATE outgoing_documents
        SET
        transmittalNo=?,
        sentDate=?,
        receiver=?,
        project=?,
        docNo=?,
        title=?,
        revision=?,
        discipline=?,
        status=?,
        remarks=?
        WHERE id=?`,
        [
            transmittalNo,
            sentDate,
            receiver,
            project,
            docNo,
            title,
            revision,
            discipline,
            status,
            remarks,
            req.params.id
        ],
        function(err){

            if(err){
                return res.send(err.message);
            }

            res.redirect("/outgoing-list");

        }

    );

});
// =======================
// Delete Outgoing
// =======================

app.get("/delete-outgoing/:id", requireAdmin, (req, res) => {

    db.run(
        "DELETE FROM outgoing_documents WHERE id=?",
        [req.params.id],
        function(err){

            if(err){
                return res.send(err.message);
            }

            res.redirect("/outgoing-list");

        }

    );

});
app.get("/generate-doc-number", (req, res) => {

    const projectCode = req.query.projectCode;
    const discipline = req.query.discipline;

    db.get(
        `SELECT COUNT(*) AS total
         FROM documents
         WHERE project = ? AND discipline = ?`,
        [projectCode, discipline],
        (err, row) => {

            if (err) {
                return res.json({ docNo: "" });
            }

            const nextNo = String(row.total + 1).padStart(4, "0");

            const docNo =
                projectCode +
                "-" +
                discipline.toUpperCase() +
                "-" +
                nextNo;

            res.json({ docNo });

        }
    );

});

app.get("/revision-history/:docNo", (req, res) => {

    db.all(
        "SELECT * FROM documents WHERE docNo=? ORDER BY revision DESC",
        [req.params.docNo],
        (err, rows) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("revision-history", {
                revisions: rows,
                docNo: req.params.docNo
            });

        }
    );

});
app.get("/users", requireAdmin, (req, res) => {

    db.all("SELECT * FROM users ", [], (err, rows) => {

        if (err) {
            return res.send(err.message);
        }

        res.json(rows );  // NOT res.render("users")

    });
});
app.get("/user-management", requireLogin, (req, res) => {

    db.all("SELECT * FROM users", [], (err, rows) => {

        if (err) {
            return res.send(err.message);
        }

        res.render("user-management", {
            users: rows
        });

    });

});
// =======================
// User Management
// =======================

app.get("/user-management", requireAdmin, (req, res) => {

    db.all("SELECT * FROM users", [], (err, rows) => {

        if (err) {
            return res.send(err.message);
        }

        res.render("user-management", {
            users: rows
        });

    });

});

// =======================
// Add User
// =======================

app.get("/add-user", requireAdmin, (req, res) => {
    res.render("add-user");
});

app.post("/add-user", requireAdmin, (req, res) => {

    const { fullname, username, password, role } = req.body;

    db.run(
        "INSERT INTO users(fullname, username, password, role) VALUES(?,?,?,?)",
        [fullname, username, password, role],
        function(err) {

            if (err) {
                return res.send(err.message);
            }

            res.redirect("/user-management");

        }
    );

});

// =======================
// Edit User
// =======================

// Open Edit User page
app.get("/edit-user/:id", requireAdmin, (req, res) => {

    db.get(
        "SELECT * FROM users WHERE id=?",
        [req.params.id],
        (err, row) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("edit-user", {
                user: row
            });

        }
    );

});

// Save Updated User
app.post("/edit-user/:id", requireAdmin, (req, res) => {

    const { fullname, username, password, role } = req.body;

    db.run(
        `UPDATE users
         SET fullname=?, username=?, password=?, role=?
         WHERE id=?`,
        [
            fullname,
            username,
            password,
            role,
            req.params.id
        ],
        function(err) {

            if (err) {
                return res.send(err.message);
            }

            res.redirect("/user-management");

        }
    );

});
// =======================
// Delete User
// =======================

app.get("/delete-user/:id", requireAdmin, (req, res) => {

    db.run(
        "DELETE FROM users WHERE id=?",
        [req.params.id],
        function(err) {

            if (err) {
                return res.send(err.message);
            }

            res.redirect("/user-management");

        }
    );

});
// =======================
// Transmittals
// =======================

// Open Form
app.get("/transmittals", (req, res) => {
    res.render("transmittals");
});

// Save Transmittal
app.post("/transmittals", (req, res) => {

    const {
        transmittalNo,
        transDate,
        toCompany,
        attention,
        subject,
        remarks
    } = req.body;

    db.run(
        `INSERT INTO transmittals
        (transmittalNo, transDate, toCompany, attention, subject, remarks)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            transmittalNo,
            transDate,
            toCompany,
            attention,
            subject,
            remarks
        ],
        function(err) {

            if (err) {
                return res.send(err.message);
            }

            res.send("Transmittal Saved Successfully");

        }
    );

});
app.get("/transmittal-register", (req, res) => {

    db.all(
        "SELECT * FROM transmittals ORDER BY id DESC",
        [],
        (err, rows) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("transmittal-register", {
                transmittals: rows
            });

        }
    );

});
// =======================
// Edit Transmittal
// =======================

app.get("/edit-transmittal/:id", (req, res) => {

    db.get(
        "SELECT * FROM transmittals WHERE id=?",
        [req.params.id],
        (err, row) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("edit-transmittal", {
                transmittal: row
            });

        }

    );

});
// =======================
// Update Transmittal
// =======================

app.post("/edit-transmittal/:id", (req, res) => {

    const {
        transmittalNo,
        transDate,
        toCompany,
        attention,
        subject,
        remarks
    } = req.body;

    db.run(
        `UPDATE transmittals
        SET
        transmittalNo=?,
        transDate=?,
        toCompany=?,
        attention=?,
        subject=?,
        remarks=?
        WHERE id=?`,
        [
            transmittalNo,
            transDate,
            toCompany,
            attention,
            subject,
            remarks,
            req.params.id
        ],
        function(err){

            if(err){
                return res.send(err.message);
            }

            res.redirect("/transmittal-register");

        }

    );

});
// =======================
// Delete Transmittal
// =======================

app.get("/delete-transmittal/:id", (req, res) => {

    db.run(
        "DELETE FROM transmittals WHERE id=?",
        [req.params.id],
        function(err){

            if(err){
                return res.send(err.message);
            }

            res.redirect("/transmittal-register");

        }

    );

});
// =======================
// Upload Error Handler
// =======================

app.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {
        return res.send("Upload Error: " + err.message);
    }

    if (err) {
        return res.send(err.message);
    }

    next();

});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});