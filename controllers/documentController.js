const db = require("../database/db");

// Upload Page
exports.showUpload = (req, res) => {
    res.render("upload");
};

// Save Document
exports.saveDocument = (req, res) => {

    const { project, docNo, title, discipline, revision, status } = req.body;

    const filename = req.file.filename;

    db.get(
        "SELECT id FROM documents WHERE docNo=?",
        [docNo],
        (err, row) => {

            if (err) {
                return res.send(err.message);
            }

            if (row) {
                return res.send("Document Number already exists.");
            }

            db.run(
                `INSERT INTO documents
                (project, docNo, title, discipline, revision, status, filename)
                VALUES (?,?,?,?,?,?,?)`,
                [project, docNo, title, discipline, revision, status, filename],
                function(err) {

                    if (err) {
                        return res.send(err.message);
                    }

                    res.redirect("/document-list");

                }
            );

        }
    );

};
// Document List
exports.documentList = (req, res) => {

    const search = req.query.search || "";

    db.all(
        `SELECT * FROM documents
         WHERE project LIKE ?
         OR docNo LIKE ?
         OR title LIKE ?
         OR discipline LIKE ?
         OR revision LIKE ?
         OR status LIKE ?`,
        [
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`
        ],
        (err, rows) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("document-list", {
                documents: rows
            });

        }
    );

};
// Open Edit Page
exports.editDocumentPage = (req, res) => {

    db.get(
        "SELECT * FROM documents WHERE id=?",
        [req.params.id],
        (err, row) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("edit-document", {
                document: row
            });

        }
    );

};

// Save Updated Document
exports.updateDocument = (req, res) => {

    const { project, docNo, title, discipline, revision, status } = req.body;

    db.run(
        `UPDATE documents
         SET project=?, docNo=?, title=?, discipline=?, revision=?, status=?
         WHERE id=?`,
        [
            project,
            docNo,
            title,
            discipline,
            revision,
            status,
            req.params.id
        ],
        function(err) {

            if (err) {
                return res.send(err.message);
            }

            res.redirect("/document-list");

        }
    );

};