const express = require("express");
const apiResponse = require("../ultilities/apiResponse");
const { hash, compare, sign, verify } = require("../ultilities/encryption");
const Connection = require ("../connection/Connection");
const { randomString } = require("../ultilities/random");
const sendMail = require("../ultilities/mailer");
const router = express.Router();

router.post("/sign-up", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Contacts } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { username, email, password } = req.body;
    await Contacts.create({
      username: username.toLowerCase(), email: email.toLowerCase(), password: await hash(password.toLowerCase())
    }, {
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success"))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/sign-in", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Contacts } = connection.models;
  try{
    const { email, password } = req.body;
    const contact = await Contacts.findOne({
      where: {
        email: email.toLowerCase()
      }
    });
    if (!contact) {
      return res.send(apiResponse(404, "Contact not found"))
    }
    const { password: hash, randomPassword } = contact;
    let updatePassword = false;
    if (randomPassword && await compare(password.toLowerCase(), randomPassword)) {
      contact.password = randomPassword;
      contact.randomPassword = null;
      await contact.save();
      updatePassword = true;
    }
    if (await compare(password.toLowerCase(), hash) || updatePassword) {
      const contactData = contact.toJSON();
      delete contactData.password;
      contactData.token = await sign({ id: contactData.id });
      return res.send(apiResponse(200, "Success", contactData))
    }
    return res.send(apiResponse(400, "Sign in fail"))
  } catch(err) {
    next(err)
  }
});

router.post("/get-user", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Contacts } = connection.models;
  try{
    const { authorization } = req.headers;

    if (authorization) {
      const token = authorization.split(" ")[1];
      if (token) {
        const payload = await verify(token);
        if (payload) {
          const contact = await Contacts.findOne({
            where: { id: payload.id }
          })
          if (contact) {
            delete contact.password;
            return res.send(apiResponse(200, "Success", contact))
          }
        }
      }
    }
    return res.send(apiResponse(200, "Success"));
  } catch(err) {
    next(err)
  }
});

router.post("/forget-password", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Contacts } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { email } = req.body;
    const contact = await Contacts.findOne({
      where: {
        email: email.toLowerCase()
      }
    })
    if (!contact) {
      await transaction.commit();
      return res.send(apiResponse(404, "Email not exist"))
    }
    const randomPassword = randomString().toLocaleLowerCase();
    contact.randomPassword = await hash(randomPassword)
    await contact.save({
      transaction
    });
    await sendMail(email, "Random password", `${randomPassword}`)
    await transaction.commit();
    return res.send(apiResponse(200, "Success"))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/update-profile", async (req, res, next) => {
  const connection = Connection.getConnection();
  const transaction = await connection.transaction();
  try{
    const { username, email, old_password, password } = req.body;
    if (old_password && password) {
      if (!await compare(old_password.toLowerCase(), req.user.password)) {
        return res.send(apiResponse(400, "Old password not correct"));
      }
      req.user.password =  await hash(new_password.toLowerCase());
    }
    req.user.email = email.toLowerCase();
    req.user.username = username.toLowerCase();
    await req.user.save();
    await transaction.commit();
    return res.send(apiResponse(200, "Success", req.user))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

module.exports = router;