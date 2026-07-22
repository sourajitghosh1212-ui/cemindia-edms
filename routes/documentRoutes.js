const express = require("express");
const router = express.Router();

const multer = require("multer");

const storage = multer.diskStorage({

    destination: function(req,file,cb){
        cb(null,"public/uploads/");
    },

    filename:function(req,file,cb){
        cb(null,Date.now()+"-"+file.originalname);
    }

});

const upload = multer({storage});

const documentController = require("../controllers/documentController");

router.get("/upload", documentController.showUpload);
router.get("/document-list", documentController.documentList);
router.get("/edit-document/:id", documentController.editDocumentPage);

router.post("/edit-document/:id", documentController.updateDocument);

router.post(
    "/upload",
    upload.single("document"),
    documentController.saveDocument
);

module.exports = router;