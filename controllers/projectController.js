const db = require("../database/db");

// Open Project Form
exports.showProjects = (req, res) => {
    res.render("projects");
};

// Save Project
exports.saveProject = (req, res) => {

    const {
        projectCode,
        projectName,
        client,
        status,
        startDate,
        endDate,
        description
    } = req.body;

    db.run(
        `INSERT INTO projects
        (code, name, client, status, startDate, endDate, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            projectCode,
            projectName,
            client,
            status,
            startDate,
            endDate,
            description
        ],
        function(err) {

            if (err) {
                return res.send(err.message);
            }

            res.redirect("/project-list");

        }

    );

};
// Project List
exports.projectList = (req, res) => {

    db.all("SELECT * FROM projects", [], (err, rows) => {

        if (err) {
            return res.send(err.message);
        }

        res.render("project-list", {
            projects: rows
        });

    });

};
// =======================
// Open Edit Project Page
// =======================

exports.editProjectPage = (req, res) => {

    db.get(
        "SELECT * FROM projects WHERE id=?",
        [req.params.id],
        (err, row) => {

            if (err) {
                return res.send(err.message);
            }

            res.render("edit-project", {
                project: row
            });

        }

    );
};

// =======================
// Update Project
// =======================

exports.updateProject = (req, res) => {

    const {
        projectCode,
        projectName,
        client,
        status,
        startDate,
        endDate,
        description
    } = req.body;

    db.run(
        `UPDATE projects
         SET
         code=?,
         name=?,
         client=?,
         status=?,
         startDate=?,
         endDate=?,
         description=?
         WHERE id=?`,
        [
            projectCode,
            projectName,
            client,
            status,
            startDate,
            endDate,
            description,
            req.params.id
        ],
        function(err) {

            if (err) {
                return res.send(err.message);
            }

            res.redirect("/project-list");

        }

    );

};
// =======================
// Delete Project
// =======================

exports.deleteProject = (req, res) => {

    db.run(
        "DELETE FROM projects WHERE id=?",
        [req.params.id],
        function(err){

            if(err){
                return res.send(err.message);
            }

            res.redirect("/project-list");

        }

    );

};
