const db = require("../database/db");

exports.dashboard = (req, res) => {

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

};