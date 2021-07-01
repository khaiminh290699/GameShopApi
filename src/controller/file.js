const express = require("express");
const multer = require("multer");
const fs = require("fs");
const apiResponse = require("../ultilities/apiResponse");
 
const upload = multer({ dest: "public/images" })

const router = express.Router();

router.post("/upload", upload.single("image"), async (req, res, next) => {
  const { file } = req;
  return res.send(apiResponse(200, "Success", file));
})

router.post("/remove", async (req, res, next) => {
  try {
    const { file } = req.body;
    await new Promise((resolve, reject) => {
      fs.unlink(file, (err) => {
        if (err) return reject(err);
        resolve();
      })
    })
    return res.send(apiResponse(200, "Success", file));
  } catch (err) {
    next(err)
  }
})

module.exports = router;