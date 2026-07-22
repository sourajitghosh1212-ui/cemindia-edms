const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");

router.get("/projects", projectController.showProjects);
router.post("/projects", projectController.saveProject);
router.get("/project-list", projectController.projectList);

router.get("/edit-project/:id", projectController.editProjectPage);
router.post("/edit-project/:id", projectController.updateProject);

router.get("/delete-project/:id", projectController.deleteProject);

module.exports = router;